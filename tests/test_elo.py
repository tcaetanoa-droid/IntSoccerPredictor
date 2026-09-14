from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from intsoccer.data import parse
from intsoccer.elo import (HOME_ADVANTAGE, expected_score, goal_multiplier, k_factor,
                           rating_diff, result_score, update)

FIX = Path(__file__).parent / "fixtures"


def test_expected_score_symmetry_and_examples():
    assert expected_score(0) == 0.5
    assert expected_score(154) + expected_score(-154) == pytest.approx(1.0)
    # Vatican (692) at home vs Greenland (946): dr = -254 + 100 = -154 -> ~0.29
    assert expected_score(rating_diff(692, 946, home_sign=1)) == pytest.approx(0.291, abs=0.002)
    # Vatican away at North Korea (1375): dr = -683 - 100 -> ~0.01
    assert expected_score(rating_diff(692, 1375, home_sign=-1)) == pytest.approx(0.011, abs=0.002)


def test_rating_diff_home_sign():
    assert rating_diff(1500, 1500, 1) == HOME_ADVANTAGE
    assert rating_diff(1500, 1500, -1) == -HOME_ADVANTAGE
    assert rating_diff(1500, 1500, 0) == 0


def test_result_and_goal_multiplier():
    assert list(result_score([2, 1, 0], [1, 1, 3])) == [1.0, 0.5, 0.0]
    assert list(goal_multiplier([1, 2, 3, 4, 5, 0], [0, 0, 0, 0, 0, 0])) == \
        [1.0, 1.5, 1.75, 1.875, 2.0, 1.0]
    assert goal_multiplier(0, 3) == 1.75  # margin is absolute


def test_k_factor():
    assert (k_factor("WC"), k_factor("EC"), k_factor("WQ"), k_factor("F")) == (60, 50, 40, 20)
    assert k_factor("XYZ") == 30


def test_update_2026_final():
    # Spain 2232 vs Argentina 2200, neutral, 1-0, K=60 -> +27 for Spain (site value)
    res = update(2232, 2200, 1, 0, k=60, home_sign=0)
    assert res.delta == pytest.approx(27.2, abs=0.1)
    assert res.new_a + res.new_b == pytest.approx(2232 + 2200)  # zero-sum


def test_update_is_vectorised():
    res = update(np.array([2000.0, 1500.0]), np.array([1800.0, 1700.0]),
                 np.array([3, 0]), np.array([0, 1]), k=60, home_sign=np.array([1, 0]))
    assert res.new_a.shape == (2,)
    assert res.delta[0] > 0 and res.delta[1] < 0


@pytest.mark.parametrize("fixture", ["spain_2022plus.tsv", "argentina_2022plus.tsv"])
def test_reproduces_site_points_exchanged(fixture):
    """Real rows: reconstruct pre-match ratings, apply the formula, match column 'points'."""
    df = parse.load_matches(FIX / fixture)
    home_sign = np.where(df["neutral"], 0, 1)
    k = df["match_type"].map(k_factor).to_numpy()
    res = update(df["home_rating_before"], df["away_rating_before"],
                 df["home_goals"], df["away_goals"], k=k, home_sign=home_sign)
    err = np.abs(res.delta - df["points"].to_numpy())
    # Site stores unrounded ratings; reconstructing from rounded values allows +-1.
    worst = pd.DataFrame({"date": df["date"], "home": df["home"], "away": df["away"],
                          "site": df["points"], "ours": np.round(res.delta, 1), "err": err})
    assert err.max() <= 1.5, worst.sort_values("err").tail(5).to_string()
    assert (err <= 1.0).mean() >= 0.95
