import json

import numpy as np
import pytest

from intsoccer.backtest import forecasts
from intsoccer.model import GoalsModel, simulate_match
from intsoccer.tournament.format import TOURNAMENT_DIR

RESULTS = TOURNAMENT_DIR / "wc2026_results.csv"


@pytest.fixture(scope="module")
def model():
    return GoalsModel.load()


def test_load_results_marks_ways_and_home_sign():
    df = forecasts.load_results(RESULTS)
    assert len(df) == 104
    assert (df["ways"] == 3).sum() == 72 and (df["ways"] == 2).sum() == 32
    assert df["home_sign"].isin([0, 1]).all()
    opener = df[(df["home"] == "MX") & (df["away"] == "ZA")].iloc[0]
    assert opener["home_sign"] == 1 and opener["ways"] == 3
    assert (df[df["neutral"]]["home_sign"] == 0).all()


def test_hosts_opener_day_of_forecast_matches_the_brainstorm_figures(model):
    p = forecasts.dayof(model, 1875, 1518, 1, 3)
    assert p.sum() == pytest.approx(1.0)
    assert p[0] == pytest.approx(0.816, abs=0.001)
    assert p[1] == pytest.approx(0.130, abs=0.001)
    assert p[2] == pytest.approx(0.054, abs=0.001)


def test_neutral_match_between_equals_carries_no_home_edge(model):
    p = forecasts.dayof(model, 1800, 1800, 0, 3)
    assert p[0] == pytest.approx(p[2])
    at_home = forecasts.dayof(model, 1800, 1800, 1, 3)
    assert at_home[0] > p[0]


def test_knockout_two_way_forecast_matches_the_engine(model):
    p = forecasts.knockout_win_prob(model, 1900, 1800, 0)
    r = simulate_match(np.full(200_000, 1900.0), np.full(200_000, 1800.0), 60, model,
                       np.random.default_rng(12), knockout=True)
    assert p == pytest.approx(r.a_wins.mean(), abs=0.01)
    assert forecasts.knockout_win_prob(model, 1850, 1850) == pytest.approx(0.5)
    two_way = forecasts.dayof(model, 1900, 1800, 0, 2)
    assert two_way[0] == pytest.approx(p) and two_way.sum() == pytest.approx(1.0)


def test_shrug_and_elo_baselines():
    assert list(forecasts.shrug(3)) == pytest.approx([1 / 3] * 3)
    assert list(forecasts.shrug(2)) == pytest.approx([0.5, 0.5])
    equal = forecasts.elo_baseline(1800, 1800, 0, 3, draw_rate=0.234)
    assert list(equal) == pytest.approx([0.5 * 0.766, 0.234, 0.5 * 0.766])
    assert forecasts.elo_baseline(1800, 1800, 1, 3, 0.234)[0] > equal[0]
    two = forecasts.elo_baseline(2000, 1800, 0, 2, 0.234)
    assert two.sum() == pytest.approx(1.0) and two[0] > 0.5


def test_draw_rate_is_the_match_weighted_mean_of_obs_draw(tmp_path):
    cal = tmp_path / "calibration.json"
    cal.write_text(json.dumps([{"bin": 0, "n": 10, "obs_draw": 0.2},
                               {"bin": 100, "n": 30, "obs_draw": 0.3}]))
    assert forecasts.draw_rate(cal) == pytest.approx(0.275)
