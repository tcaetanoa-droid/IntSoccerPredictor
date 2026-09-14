import numpy as np
import pytest

from intsoccer.data.snapshot import load_snapshot
from intsoccer.model import PENALTIES, REGULAR, GoalsModel
from intsoccer.tournament import load_tournament, simulate_tournament
from intsoccer.tournament import simulate as simmod
from intsoccer.tournament.simulate import group_venue, home_sign

MODEL = GoalsModel(a=0.136, b=0.00176)


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


@pytest.fixture(scope="module")
def ratings(wc):
    return load_snapshot(wc.ratings_snapshot)


def test_home_advantage_only_for_a_host_in_its_own_country(wc):
    assert group_venue(wc, "MX", "KR") == "MX" and group_venue(wc, "KR", "MX") == "MX"
    assert group_venue(wc, "KR", "CZ") is None
    assert home_sign(wc, "MX", "KR", "MX") == 1 and home_sign(wc, "KR", "MX", "MX") == -1
    assert home_sign(wc, "KR", "CZ", None) == 0
    assert len(wc.venues) == 32
    assert home_sign(wc, "CA", "ZA", wc.venues[73]) == 0     # Canada's R32 was in the USA
    assert home_sign(wc, "CA", "DZ", wc.venues[85]) == 1     # match 85 is in Canada
    assert home_sign(wc, "MX", "EC", wc.venues[79]) == 1
    assert home_sign(wc, "BA", "US", wc.venues[81]) == -1
    assert home_sign(wc, "ES", "AR", wc.venues[104]) == 0


def test_simulation_is_complete_consistent_and_reproducible(wc, ratings):
    a = simulate_tournament(wc, ratings, MODEL, np.random.default_rng(3))
    b = simulate_tournament(wc, ratings, MODEL, np.random.default_rng(3))
    assert a == b
    assert sum(len(r) for r in a.group_results.values()) == 72
    assert all(len(s.order) == 4 for s in a.standings.values())
    assert len(a.third_ranking) == 12 and len(a.knockout) == 32 and len(a.knockout_scores) == 32
    assert a.champion == a.knockout[104].winner
    assert a.knockout[103].home == a.knockout[101].loser
    assert a.knockout[103].away == a.knockout[102].loser
    r32 = {c for n in wc.rounds["R32"] for c in (a.knockout[n].home, a.knockout[n].away)}
    expected = {c for s in a.standings.values() for c in s.order[:2]} \
        | {c for _, c in a.third_ranking[:8]}
    assert r32 == expected
    # every knockout score has a winner: a draw after extra time went to penalties
    for n, m in a.knockout.items():
        hg, ag, how = a.knockout_scores[n]
        winner_is_home = m.winner == m.home
        assert (hg > ag) == winner_is_home or (hg == ag and how == PENALTIES)
    # Elo is zero-sum and every team's rating moved
    assert sum(a.ratings.values()) == pytest.approx(sum(ratings[c] for c in wc.teams))
    assert all(a.ratings[c] != ratings[c] for c in wc.teams)


def test_group_matches_pass_the_hosts_home_sign_to_the_match_simulator(wc, ratings, monkeypatch):
    calls = []
    real = simmod.simulate_match

    def spy(rating_a, rating_b, k, model, rng, home_sign=0, **kw):
        calls.append((float(rating_a), float(rating_b), home_sign, kw.get("knockout")))
        return real(rating_a, rating_b, k, model, rng, home_sign, **kw)

    monkeypatch.setattr(simmod, "simulate_match", spy)
    simulate_tournament(wc, ratings, MODEL, np.random.default_rng(0))
    assert len(calls) == 104
    group_calls, knockout_calls = calls[:72], calls[72:]
    assert all(c[3] is False for c in group_calls) and all(c[3] is True for c in knockout_calls)
    # the first group-A match is MX v KR at home; the second, CZ v ZA, is neutral
    assert group_calls[0][2] == 1 and group_calls[1][2] == 0
    assert sum(c[2] != 0 for c in group_calls) == 9           # three hosts x three matches


def test_ratings_carry_from_match_to_match(wc, ratings):
    sim = simulate_tournament(wc, ratings, MODEL, np.random.default_rng(1))
    # the champion's rating after the final is the snapshot rating plus every update; a team
    # that won the tournament almost surely gained overall
    assert sim.ratings[sim.champion] > ratings[sim.champion]


def test_overwhelming_favourite_usually_wins():
    wc = load_tournament("wc2026")
    stacked = {c: 1500.0 for c in wc.teams}
    stacked["BR"] = 2600.0
    wins = sum(simulate_tournament(wc, stacked, MODEL, np.random.default_rng(s)).champion == "BR"
               for s in range(60))
    assert wins >= 50


def test_knockout_decided_by_is_recorded(wc, ratings):
    hows = set()
    for s in range(15):
        sim = simulate_tournament(wc, ratings, MODEL, np.random.default_rng(s))
        hows |= {sc.decided_by for sc in sim.knockout_scores.values()}
    assert REGULAR in hows and PENALTIES in hows
