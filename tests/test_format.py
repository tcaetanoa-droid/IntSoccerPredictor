import csv
from collections import defaultdict

import pytest
import yaml

from intsoccer.data.snapshot import load_snapshot
from intsoccer.tournament import (GroupSlot, MatchRef, ThirdSlot, build_tournament, format_slot,
                                  load_tournament, parse_slot)
from intsoccer.tournament.format import TOURNAMENT_DIR


def test_parse_slot_round_trips():
    for text, slot in [("1A", GroupSlot(1, "A")), ("2L", GroupSlot(2, "L")),
                       ("3:ABCDF", ThirdSlot(frozenset("ABCDF"))),
                       ("W74", MatchRef(True, 74)), ("L101", MatchRef(False, 101))]:
        assert parse_slot(text) == slot
        assert format_slot(slot) == text


@pytest.mark.parametrize("bad", ["A1", "3rd:ABC", "W", "1a", "", "3:"])
def test_parse_slot_rejects_other_notation(bad):
    with pytest.raises(ValueError):
        parse_slot(bad)


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


def test_wc2026_groups_and_settings(wc):
    assert len(wc.groups) == 12 and all(len(g) == 4 for g in wc.groups.values())
    assert len(set(wc.teams)) == 48
    assert wc.k == 60 and wc.match_type == "WC"
    assert wc.tiebreakers == "head_to_head_first"
    assert wc.hosts == {"US": "US", "CA": "CA", "MX": "MX"}
    assert wc.group_of("SQ") == "C"          # SQ is Scotland
    assert wc.group_of("NO") == "I"          # quoted in YAML, not False
    assert wc.start_date == "2026-06-11"
    assert wc.top_n == 2 and wc.best_thirds == 8 and wc.extra_time_and_penalties


def test_wc2026_bracket(wc):
    assert len(wc.matches) == 32
    assert {r: len(m) for r, m in wc.rounds.items()} == \
        {"R32": 16, "R16": 8, "QF": 4, "SF": 2, "3P": 1, "F": 1}
    assert wc.matches[74] == (GroupSlot(1, "E"), ThirdSlot(frozenset("ABCDF")))
    assert wc.matches[103] == (MatchRef(False, 101), MatchRef(False, 102))
    assert wc.matches[104] == (MatchRef(True, 101), MatchRef(True, 102))
    assert wc.round_of(104) == "F" and wc.round_of(73) == "R32"
    assert sorted(wc.third_slots()) == ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"]


def test_wc2026_third_place_table(wc):
    assert len(wc.third_place_table) == 495
    # the real 2026 case, docs/WC2026_FORMAT.md section 3
    real = wc.third_place_table[frozenset("BDEFIJKL")]
    assert real == {"1E": "D", "1I": "F", "1A": "E", "1L": "K",
                    "1D": "B", "1G": "I", "1B": "J", "1K": "L"}


def test_wc2026_snapshot_covers_every_team(wc):
    ratings = load_snapshot(wc.ratings_snapshot)
    assert set(wc.teams) <= set(ratings)


def test_wc2026_groups_agree_with_real_results(wc):
    seen = defaultdict(set)
    with open(TOURNAMENT_DIR / "wc2026_results.csv", newline="") as fh:
        for row in csv.DictReader(fh):
            if row["stage"] == "group":
                seen[row["group"]].update([row["home"], row["away"]])
    assert {g: set(codes) for g, codes in wc.groups.items()} == dict(seen)


# --- validation ---------------------------------------------------------------------------

def raw_wc():
    return yaml.safe_load((TOURNAMENT_DIR / "wc2026.yaml").read_text())


def dup_team(raw):
    raw["groups"]["B"][0] = "MX"


def unknown_group(raw):
    raw["knockout"]["matches"][73] = ["2A", "2M"]


def forward_ref(raw):
    raw["knockout"]["matches"][73] = ["2A", "W89"]


def bad_ruleset(raw):
    raw["tiebreakers"] = "fifa"


def thirds_mismatch(raw):
    raw["advance"]["best_thirds"] = 7


def unrounded_match(raw):
    raw["knockout"]["rounds"]["F"] = []


def host_not_playing(raw):
    raw["hosts"]["XX"] = "XX"


def winner_used_twice(raw):
    raw["knockout"]["matches"][104] = ["W101", "W101"]


@pytest.mark.parametrize("mutate, message", [
    (dup_team, "appears in groups"),
    (unknown_group, "no group 'M'"),
    (forward_ref, "not in an earlier round"),
    (bad_ruleset, "unknown tiebreakers"),
    (thirds_mismatch, "third-placed slots"),
    (unrounded_match, "rounds list matches"),
    (host_not_playing, "host 'XX'"),
    (winner_used_twice, "more than once"),
])
def test_inconsistent_definitions_are_rejected(mutate, message):
    raw = raw_wc()
    mutate(raw)
    with pytest.raises(ValueError, match=message):
        build_tournament(raw)


def tampered_table(tmp_path, edit):
    src = TOURNAMENT_DIR / "wc2026_third_place_table.csv"
    lines = src.read_text().splitlines()
    lines = edit(lines)
    dst = tmp_path / "table.csv"
    dst.write_text("\n".join(lines) + "\n")
    raw = raw_wc()
    raw["knockout"]["third_place_table"] = str(dst)
    return raw


def test_third_place_table_missing_row(tmp_path):
    raw = tampered_table(tmp_path, lambda lines: lines[:-1])
    with pytest.raises(ValueError, match="1 group combinations missing"):
        build_tournament(raw)


def test_third_place_table_disallowed_slot(tmp_path):
    # row 67 (BDEFIJKL): swap 1A<-E and 1B<-J; 1A only accepts C/E/F/H/I so 3J there is illegal
    def edit(lines):
        assert lines[67].startswith("67,BDEFIJKL,E,J,")
        lines[67] = lines[67].replace("67,BDEFIJKL,E,J,", "67,BDEFIJKL,J,E,")
        return lines
    raw = tampered_table(tmp_path, edit)
    with pytest.raises(ValueError, match="sends 3J to 1A"):
        build_tournament(raw)


def test_third_place_table_required_when_thirds_advance():
    raw = raw_wc()
    del raw["knockout"]["third_place_table"]
    with pytest.raises(ValueError, match="needs knockout.third_place_table"):
        build_tournament(raw)


@pytest.mark.parametrize("name", ["euro2028", "copa2028"])
def test_placeholder_tournaments_have_valid_brackets_but_no_teams_yet(name):
    # bracket and third-place table are checked before team codes, so reaching the TBD
    # complaint means the knockout structure itself is consistent
    with pytest.raises(ValueError, match="'TBD' appears in groups"):
        load_tournament(name)
