import numpy as np
import pytest

from intsoccer.elo import expected_score, rating_diff
from intsoccer.model import (EXTRA_TIME, PENALTIES, REGULAR, GoalsModel, outcome_probs,
                             simulate_match)

MODEL = GoalsModel(a=0.136, b=0.00176)
N = 200_000


def test_reproducible_from_seed():
    r1 = simulate_match(1900, 1800, 60, MODEL, np.random.default_rng(7), knockout=True)
    r2 = simulate_match(1900, 1800, 60, MODEL, np.random.default_rng(7), knockout=True)
    assert np.array_equal(r1.goals_a, r2.goals_a) and np.array_equal(r1.a_wins, r2.a_wins)


def test_group_match_frequencies_match_poisson_model():
    rng = np.random.default_rng(0)
    r = simulate_match(np.full(N, 2000.0), np.full(N, 1800.0), 60, MODEL, rng)
    lam_a, lam_b = MODEL.expected_goals(2000, 1800)
    assert r.goals_a.mean() == pytest.approx(lam_a, abs=0.01)
    assert r.goals_b.mean() == pytest.approx(lam_b, abs=0.01)
    p_win, p_draw, _ = outcome_probs(lam_a, lam_b)
    assert r.a_wins.mean() == pytest.approx(p_win[0], abs=0.005)
    assert r.draw.mean() == pytest.approx(p_draw[0], abs=0.005)
    assert (r.decided_by == REGULAR).all()


def test_knockout_always_produces_a_winner_and_uses_extra_time_and_pens():
    rng = np.random.default_rng(1)
    r = simulate_match(np.full(N, 1850.0), np.full(N, 1850.0), 60, MODEL, rng, knockout=True)
    assert not r.draw.any()
    lam, _ = MODEL.expected_goals(1850, 1850)
    _, p_draw90, _ = outcome_probs(lam, lam)
    went_to_et = np.isin(r.decided_by, [EXTRA_TIME, PENALTIES]).mean()
    assert went_to_et == pytest.approx(p_draw90[0], abs=0.005)
    _, p_draw_et, _ = outcome_probs(lam / 3, lam / 3)
    assert (r.decided_by == PENALTIES).mean() == pytest.approx(p_draw90[0] * p_draw_et[0], abs=0.005)
    # equal teams: shootout is a coin flip, so overall A wins ~50%
    assert r.a_wins.mean() == pytest.approx(0.5, abs=0.005)
    # score after extra time is level exactly when it went to penalties
    assert np.array_equal(r.goals_a == r.goals_b, r.decided_by == PENALTIES)


def test_elo_update_uses_et_score_and_treats_shootout_as_draw():
    rng = np.random.default_rng(2)
    r = simulate_match(np.full(N, 1900.0), np.full(N, 1800.0), 60, MODEL, rng, knockout=True)
    pens = r.decided_by == PENALTIES
    we = expected_score(rating_diff(1900, 1800))
    # shootout: W = 0.5 regardless of who won the pens, G = 1
    assert np.allclose(r.new_rating_a[pens] - 1900, 60 * (0.5 - we))
    # zero-sum everywhere
    assert np.allclose(r.new_rating_a + r.new_rating_b, 3700)
    # winners in regular time gained, losers lost
    reg_a = (r.decided_by == REGULAR) & r.a_wins
    assert (r.new_rating_a[reg_a] > 1900).all()


def test_home_advantage_shifts_goals():
    rng = np.random.default_rng(3)
    home = simulate_match(np.full(N, 1800.0), np.full(N, 1800.0), 60, MODEL, rng, home_sign=1)
    lam_home, lam_away = MODEL.expected_goals(1800, 1800, home_sign=1)
    assert home.goals_a.mean() == pytest.approx(lam_home, abs=0.01)
    assert home.goals_b.mean() == pytest.approx(lam_away, abs=0.01)
    # draws take ~27% of matches, so compare home wins with away wins rather than with 0.5
    assert home.a_wins.mean() > (home.goals_b > home.goals_a).mean() + 0.15


def test_scalar_inputs_give_length_one_arrays():
    r = simulate_match(1900, 1800, 60, MODEL, np.random.default_rng(4))
    assert r.goals_a.shape == (1,) and r.new_rating_a.shape == (1,)
