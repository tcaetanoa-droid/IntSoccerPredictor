import json

import pytest

from intsoccer.data.snapshot import load_snapshot
from intsoccer.model import GoalsModel
from intsoccer.montecarlo import run
from intsoccer.report import build_report
from intsoccer.report import site
from intsoccer.tournament import load_tournament

MODEL = GoalsModel(a=0.136, b=0.00176)
N = 300


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


@pytest.fixture(scope="module")
def names(wc):
    # tests must not need data/raw: codes double as names, plus the two overrides
    return {c: c for c in wc.teams}


@pytest.fixture(scope="module")
def built(wc, names, tmp_path_factory):
    out = tmp_path_factory.mktemp("run") / "wc2026"
    run(wc, load_snapshot(wc.ratings_snapshot), MODEL, n_sims=N, seed=11, out_dir=out)
    views = build_report(out, names=names)
    return views, out / "report"


def test_iso_map_covers_every_2026_team_and_the_trap_codes(wc):
    assert set(wc.teams) <= set(site.ISO)
    assert site.ISO["SQ"] == "gb-sct" and site.ISO["EN"] == "gb-eng" and site.ISO["IR"] == "ir"


def test_display_name_overrides():
    names = {"US": "United States", "BA": "Bosnia and Herzegovina", "ES": "Spain"}
    assert site.display_name("US", names) == "USA"
    assert site.display_name("BA", names) == "Bosnia & Herz."
    assert site.display_name("ES", names) == "Spain"


def test_teams_index_is_written_sorted_by_title_chance(built, wc):
    views, out = built
    rows = json.loads((out / "teams.json").read_text())
    assert len(rows) == 48 and rows == views["teams"]
    champion = views["fate_table"].set_index("team")["champion"]
    assert [r["code"] for r in rows] == sorted(wc.teams, key=lambda c: -champion.loc[c])
    assert set(rows[0]) == {"code", "iso", "name", "group", "elo", "champion_pct"}
    assert all(r["iso"] == site.ISO[r["code"]] for r in rows)


def _page(team, fates, conq, ex):
    return {"team": team, "fates": fates, "knocked_out_by": conq, "first_round_excerpt": ex}


FATES_ES = {"gs4": .004, "gs3_out": .003, "r32": .247, "r16": .189, "qf": .132, "fourth": .043,
            "third": .093, "runner_up": .102, "champion": .186}
NAMES = {"ES": "Spain", "AR": "Argentina", "QA": "Qatar", "CH": "Switzerland", "BR": "Brazil"}


def test_excerpt_knockout_branch_names_the_risk_the_conqueror_and_the_meeting():
    page = _page("ES", FATES_ES, [{"team": "AR", "pct": .192}],
                 {"opponent": "AR", "meet_in_r32_pct": .276, "win_pct_when_met": .548})
    text = site.excerpt_text(page, NAMES)
    assert text == ("Spain's single biggest risk is the round of 32, where 24.7% of its runs "
                    "end. Argentina is the team that ends its tournament most often, 19.2% of "
                    "eliminations. The two meet in the round of 32 in 27.6% of all runs, and "
                    "Spain wins 55% of those meetings.")


def test_excerpt_group_stage_branch():
    fates = {"gs4": .68, "gs3_out": .13, "r32": .16, "r16": .024, "qf": .004, "fourth": 0,
             "third": 0, "runner_up": 0, "champion": 0}
    ex = {"opponent": "CH", "meet_in_r32_pct": .05, "win_pct_when_met": .2}
    page = _page("QA", fates, [{"team": "CH", "pct": .31}], ex)
    text = site.excerpt_text(page, NAMES)
    assert text == ("Qatar's most common ending is fourth in its group, 68.0% of its runs. "
                    "It got out of the group in 19.0% of them, and when it did, Switzerland "
                    "was the team that ended its tournament most often (31.0% of eliminations).")


def test_excerpt_champion_branch_and_no_meeting_line_when_conqueror_differs():
    fates = dict(FATES_ES, champion=.40, r32=.10)
    ex = {"opponent": "CH", "meet_in_r32_pct": .1, "win_pct_when_met": .5}
    page = _page("BR", fates, [{"team": "AR", "pct": .2}], ex)
    text = site.excerpt_text(page, NAMES)
    assert text.startswith("Brazil's most common ending is the trophy: it won 40.0% of its runs.")
    assert "meet" not in text and text.endswith("(20.0% of eliminations).")


def test_a_team_file_is_written_for_all_48_with_text(built, wc):
    views, out = built
    files = sorted(p.name for p in out.glob("team_*.json"))
    assert files == sorted(f"team_{c}.json" for c in wc.teams)
    page = json.loads((out / "team_ES.json").read_text())
    assert page["name"] == "ES" and page["excerpt_text"].startswith("ES")
    assert "team_ES" in views and views["team_ES"]["excerpt_text"] == page["excerpt_text"]


def test_copy_site_data_copies_only_what_the_site_reads(built, tmp_path):
    _, out = built
    cal = tmp_path / "calibration.json"
    cal.write_text("[]")
    written = site.copy_site_data(out, tmp_path / "site", "wc2026", calibration=cal)
    dest = tmp_path / "site" / "data" / "wc2026"
    names = sorted(p.name for p in dest.iterdir())
    assert "report.json" in names and "teams.json" in names and "calibration.json" in names
    assert len([n for n in names if n.startswith("team_")]) == 48
    assert not any(n.endswith(".csv") for n in names) and "reality.json" not in names
    assert sorted(written) == sorted(dest.iterdir())


def test_copy_site_data_publishes_file_names_not_local_paths(tmp_path):
    report_dir = tmp_path / "report"
    report_dir.mkdir()
    meta = {"tournament": "FIFA World Cup 2026",
            "tournament_yaml": "/Users/someone/IntSoccerPredictor/data/tournaments/wc2026.yaml",
            "ratings_snapshot": "/Users/someone/IntSoccerPredictor/data/snapshots/"
                                "2026-06-10_wc2026.csv",
            "seed": 2026}
    source_text = json.dumps({"meta": meta, "teams": []}, indent=1)
    (report_dir / "report.json").write_text(source_text)
    (report_dir / "teams.json").write_text("[]")

    site.copy_site_data(report_dir, tmp_path / "site", "wc2026",
                        calibration=tmp_path / "missing.json")

    copied = json.loads((tmp_path / "site" / "data" / "wc2026" / "report.json").read_text())
    assert copied["meta"]["tournament_yaml"] == "wc2026.yaml"
    assert copied["meta"]["ratings_snapshot"] == "2026-06-10_wc2026.csv"
    assert copied["meta"]["tournament"] == "FIFA World Cup 2026" and copied["meta"]["seed"] == 2026
    assert (report_dir / "report.json").read_text() == source_text
