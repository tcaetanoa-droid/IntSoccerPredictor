import csv
from collections import defaultdict

import numpy as np
import pytest

from intsoccer.data.snapshot import load_snapshot
from intsoccer.tournament import load_tournament, rank_group, rank_thirds
from intsoccer.tournament.format import TOURNAMENT_DIR
from intsoccer.tournament.group import Result
from intsoccer.tournament.knockout import play_knockout, third_assignment


def real_results():
    groups, knockout = defaultdict(list), defaultdict(list)
    with open(TOURNAMENT_DIR / "wc2026_results.csv", newline="") as fh:
        for r in csv.DictReader(fh):
            res = Result(r["home"], r["away"], int(r["home_goals"]), int(r["away_goals"]))
            if r["stage"] == "group":
                groups[r["group"]].append(res)
            else:
                knockout[r["stage"]].append(res)
    return dict(groups), dict(knockout)


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


@pytest.fixture(scope="module")
def real_standings(wc):
    """Group orders and best thirds computed by component 7 from the real group results."""
    groups, _ = real_results()
    ratings = load_snapshot(wc.ratings_snapshot)
    rng = np.random.default_rng(0)
    orders, thirds = {}, {}
    for letter, teams in wc.groups.items():
        st = rank_group(list(teams), groups[letter], wc.tiebreakers, ratings, rng)
        orders[letter] = st.order
        thirds[letter] = (st.order[2], st.rows[st.order[2]])
    best = rank_thirds(thirds, ratings, rng)[:wc.best_thirds]
    return orders, best


def test_real_2026_standings_produce_every_real_knockout_pairing(wc, real_standings):
    orders, best = real_standings
    _, knockout = real_results()

    def real_winner(number, round_name, home, away):
        rows = [r for r in knockout[round_name] if {r.home, r.away} == {home, away}]
        assert rows, f"match {number} ({round_name}): {home} v {away} was not a real pairing"
        r = rows[0]
        if r.home_goals != r.away_goals:
            return r.home if r.home_goals > r.away_goals else r.away
        # drawn after 90': the winner on penalties is whoever played in a later round
        order = list(wc.rounds)
        after = {c for s in order[order.index(round_name) + 1:] for rr in knockout.get(s, [])
                 for c in (rr.home, rr.away)}
        winners = {home, away} & after
        assert len(winners) == 1, (number, home, away)
        return winners.pop()

    played = play_knockout(wc, orders, best, real_winner)
    assert len(played) == 32 and set(played) == set(wc.matches)
    # the docs' spot checks
    m = {n: (p.home, p.away) for n, p in played.items()}
    assert m[74] == ("DE", "PY") and m[77] == ("FR", "SE") and m[79] == ("MX", "EC")
    assert m[89] == ("PY", "FR") and m[90] == ("CA", "MA")       # R16 FR–PY, MA–CA
    assert m[97] == ("FR", "MA") and m[98] == ("ES", "BE")       # QF
    assert m[101] == ("FR", "ES") and m[102] == ("EN", "AR")     # SF
    assert m[103] == ("FR", "EN") and played[103].winner == "EN"
    assert m[104] == ("ES", "AR") and played[104].winner == "ES"


def test_third_assignment_uses_the_table_for_the_real_combination(wc, real_standings):
    orders, best = real_standings
    assert sorted(g for g, _ in best) == list("BDEFIJKL")
    got = third_assignment(wc, best)
    # docs/WC2026_FORMAT.md: 1E–3D, 1I–3F, 1A–3E, 1L–3K, 1D–3B, 1G–3I, 1B–3J, 1K–3L
    expected_groups = {"1E": "D", "1I": "F", "1A": "E", "1L": "K",
                       "1D": "B", "1G": "I", "1B": "J", "1K": "L"}
    assert got == {slot: orders[g][2] for slot, g in expected_groups.items()}


def test_third_assignment_rejects_wrong_count_or_duplicate_group(wc):
    with pytest.raises(ValueError, match="best thirds given"):
        third_assignment(wc, [("A", "x")])
    dup = [("A", "a"), ("A", "b")] + [(g, g.lower()) for g in "CDEFGH"]
    with pytest.raises(ValueError, match="same group"):
        third_assignment(wc, dup)


def test_play_knockout_resolves_winners_and_losers_of_earlier_matches(wc):
    orders = {g: [f"{g}1", f"{g}2", f"{g}3", f"{g}4"] for g in wc.groups}
    best = [(g, f"{g}3") for g in "ABCDEFGH"]     # table row 1 exists for any 8 groups
    seen = []

    def home_wins(number, round_name, home, away):
        seen.append((number, round_name))
        return home

    played = play_knockout(wc, orders, best, home_wins)
    assert [n for n, _ in seen] == [n for numbers in wc.rounds.values() for n in numbers]
    assert played[104].winner == played[101].winner == played[97].winner == played[89].winner
    assert played[103].home == played[101].loser and played[103].away == played[102].loser
    third_teams = {m.away for n, m in played.items() if n in (74, 77, 79, 80, 81, 82, 85, 87)}
    assert third_teams == {f"{g}3" for g in "ABCDEFGH"}
    with pytest.raises(ValueError, match="is not"):
        play_knockout(wc, orders, best, lambda n, r, h, a: "ZZ")
