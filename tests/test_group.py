import csv
from collections import defaultdict

import numpy as np
import pytest

from intsoccer.data.snapshot import load_snapshot
from intsoccer.tournament import load_tournament
from intsoccer.tournament.group import Result, rank_group, rank_thirds, table
from intsoccer.tournament.format import TOURNAMENT_DIR

RULES = "head_to_head_first"


def real_group_results() -> dict[str, list[Result]]:
    out = defaultdict(list)
    with open(TOURNAMENT_DIR / "wc2026_results.csv", newline="") as fh:
        for r in csv.DictReader(fh):
            if r["stage"] == "group":
                out[r["group"]].append(Result(r["home"], r["away"],
                                              int(r["home_goals"]), int(r["away_goals"])))
    return dict(out)


def real_r32_teams() -> set[str]:
    with open(TOURNAMENT_DIR / "wc2026_results.csv", newline="") as fh:
        return {t for r in csv.DictReader(fh) if r["stage"] == "R32"
                for t in (r["home"], r["away"])}


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


@pytest.fixture(scope="module")
def ratings(wc):
    return load_snapshot(wc.ratings_snapshot)


def test_real_2026_group_stage_reproduces_the_32_round_of_32_teams(wc, ratings):
    results = real_group_results()
    rng = np.random.default_rng(0)
    winners, runners_up, thirds = [], [], {}
    for letter, teams in wc.groups.items():
        st = rank_group(list(teams), results[letter], wc.tiebreakers, ratings, rng)
        assert st.depth <= 2, f"group {letter} needed Elo/lots; reality did not"
        winners.append(st.order[0])
        runners_up.append(st.order[1])
        thirds[letter] = (st.order[2], st.rows[st.order[2]])
    best = rank_thirds(thirds, ratings, rng)[:wc.best_thirds]
    qualified = set(winners) | set(runners_up) | {code for _, code in best}
    assert len(qualified) == 32
    assert qualified == real_r32_teams()
    # docs/WC2026_FORMAT.md section 2: Senegal 8th and in, Iran 9th and out
    ranked = rank_thirds(thirds, ratings, rng)
    assert [c for _, c in ranked[:9]] == ["CD", "SE", "EC", "GH", "BA", "DZ", "PY", "SN", "IR"] \
        or [c for _, c in ranked[:9]] == ["CD", "SE", "GH", "EC", "BA", "DZ", "PY", "SN", "IR"]
    assert [c for _, c in ranked[8:]] == ["IR", "KR", "SQ", "UY"]


def test_real_2026_group_tables(wc, ratings):
    results = real_group_results()
    rng = np.random.default_rng(0)
    st = rank_group(list(wc.groups["I"]), results["I"], RULES, ratings, rng)
    assert st.order == ["FR", "NO", "SN", "IQ"]
    sn = st.rows["SN"]
    assert (sn.points, sn.gd, sn.gf) == (3, 2, 8)
    st = rank_group(list(wc.groups["G"]), results["G"], RULES, ratings, rng)
    assert st.order == ["BE", "EG", "IR", "NZ"]      # BE and EG both 5 pts; h2h drawn 1-1, so GD
    assert st.depth == 2


# --- synthetic tiebreak cases ----------------------------------------------------------------

TEAMS = ["A", "B", "C", "D"]
ELO = {"A": 2000.0, "B": 1900.0, "C": 1800.0, "D": 1700.0}


def test_head_to_head_before_overall_goal_difference():
    # A and B both on 6 points (C and D on 3). Overall GD: B +6, A +2. Head to head: A beat B.
    # WC 2026 / UEFA: A first. CONMEBOL: B first.
    results = [Result("A", "B", 1, 0), Result("B", "D", 5, 0), Result("A", "D", 0, 1),
               Result("A", "C", 2, 0), Result("B", "C", 2, 0), Result("D", "C", 0, 1)]
    rows = table(TEAMS, results)
    assert rows["A"].points == rows["B"].points == 6
    h2h = rank_group(TEAMS, results, "head_to_head_first", ELO, np.random.default_rng(0))
    assert h2h.order[:2] == ["A", "B"] and h2h.depth == 1
    ovr = rank_group(TEAMS, results, "overall_first", ELO, np.random.default_rng(0))
    assert ovr.order[:2] == ["B", "A"] and ovr.depth == 1


def test_three_way_tie_reapplies_head_to_head_to_the_subset_still_level():
    # A, B, C each beat one another 1-0 in a cycle (all 3 pts, 0 GD, 1 GF among themselves),
    # and all beat D. Overall GD separates C (+3) from A and B (+1 each); A beat B head to head
    # and FIFA continues with overall goals (A 2, B 2, level), so it falls to Elo: A first.
    results = [Result("A", "B", 1, 0), Result("B", "C", 1, 0), Result("C", "A", 1, 0),
               Result("A", "D", 1, 0), Result("B", "D", 1, 0), Result("C", "D", 3, 0)]
    st = rank_group(TEAMS, results, "head_to_head_first", ELO, np.random.default_rng(0))
    assert st.order == ["C", "A", "B", "D"]
    assert st.depth == 3     # Elo


def test_head_to_head_subset_is_recomputed_after_a_partial_split():
    # A, B, C all on 4 pts and 0 GD overall. Sub-table among the three: all 3 pts, 0 GD, but
    # goals B 2, C 2, A 1 -> A drops to third and {B, C} are re-ranked on their own match, which
    # B won 2-1. Without the restart, overall goals (C 3, B 2) would put C ahead.
    results = [Result("A", "B", 1, 0), Result("B", "C", 2, 1), Result("C", "A", 1, 0),
               Result("A", "D", 1, 1), Result("B", "D", 0, 0), Result("C", "D", 1, 1)]
    rows = table(TEAMS, results)
    assert [(rows[t].points, rows[t].gd) for t in "ABC"] == [(4, 0)] * 3
    st = rank_group(TEAMS, results, "head_to_head_first", ELO, np.random.default_rng(0))
    assert st.order == ["B", "C", "A", "D"] and st.depth == 1


def test_all_level_falls_to_elo_then_lots():
    results = [Result(h, a, 1, 1) for h, a in
               [("A", "B"), ("C", "D"), ("A", "C"), ("B", "D"), ("A", "D"), ("B", "C")]]
    st = rank_group(TEAMS, results, RULES, ELO, np.random.default_rng(0))
    assert st.order == ["A", "B", "C", "D"] and st.depth == 3
    equal = {t: 1800.0 for t in TEAMS}
    orders = {tuple(rank_group(TEAMS, results, RULES, equal, np.random.default_rng(s)).order)
              for s in range(20)}
    assert len(orders) > 1
    assert all(rank_group(TEAMS, results, RULES, equal, np.random.default_rng(s)).depth == 4
               for s in range(3))
    same = [rank_group(TEAMS, results, RULES, equal, np.random.default_rng(7)).order
            for _ in range(2)]
    assert same[0] == same[1]


def test_rank_thirds_orders_by_points_gd_gf_then_elo():
    from intsoccer.tournament.group import Row
    thirds = {"A": ("a", Row(won=1, drawn=0, lost=2, gf=2, ga=3)),
              "B": ("b", Row(won=1, drawn=1, lost=1, gf=1, ga=1)),
              "C": ("c", Row(won=1, drawn=1, lost=1, gf=4, ga=4)),
              "D": ("d", Row(won=1, drawn=1, lost=1, gf=4, ga=4))}
    elo = {"a": 1500.0, "b": 1500.0, "c": 1600.0, "d": 1700.0}
    ranked = rank_thirds(thirds, elo, np.random.default_rng(0))
    assert ranked == [("D", "d"), ("C", "c"), ("B", "b"), ("A", "a")]
