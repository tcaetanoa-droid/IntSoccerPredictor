import numpy as np
import pandas as pd
import pytest

from intsoccer.model import GoalsModel, outcome_probs
from intsoccer.model.fit import diagnostics, fit_goals_model


def test_expected_goals_are_mirror_images_and_monotonic():
    m = GoalsModel(a=np.log(1.3), b=0.002)
    la, lb = m.expected_goals(1800, 1800, home_sign=0)
    assert la == pytest.approx(1.3) and lb == pytest.approx(1.3)
    la2, lb2 = m.expected_goals(2000, 1800, home_sign=0)
    assert la2 > la and lb2 < lb
    la3, _ = m.expected_goals(1800, 1800, home_sign=1)   # home advantage lifts the rate
    assert la3 > la


def test_outcome_probs_sum_to_one_and_are_symmetric():
    w, d, l = outcome_probs([1.5, 1.0], [1.0, 1.5])
    assert np.allclose(w + d + l, 1.0, atol=1e-6)
    assert w[0] == pytest.approx(l[1]) and d[0] == pytest.approx(d[1])
    assert w[0] > l[0]


def test_equal_teams_draw_more_often_than_elo_implies():
    w, d, l = outcome_probs(1.3, 1.3)
    assert d[0] > 0.2 and w[0] == pytest.approx(l[0])


def test_fit_recovers_known_parameters():
    rng = np.random.default_rng(0)
    n = 40_000
    dr = rng.uniform(-600, 600, n)
    friendly = rng.random(n) < 0.3
    true = GoalsModel(a=0.25, b=0.0018, c_friendly=0.1)
    goals = rng.poisson(true.rate(dr, friendly))
    rows = pd.DataFrame({"dr": dr, "goals": goals, "goals_against": goals, "friendly": friendly})
    m = fit_goals_model(rows)
    assert m.a == pytest.approx(true.a, abs=0.03)
    assert m.b == pytest.approx(true.b, abs=0.0001)
    assert m.c_friendly == pytest.approx(true.c_friendly, abs=0.03)


def test_diagnostics_shape():
    rng = np.random.default_rng(1)
    n = 2000
    dr = rng.uniform(-300, 300, n)
    m = GoalsModel(a=0.25, b=0.0018)
    g = rng.poisson(m.rate(dr)); ga = rng.poisson(m.rate(-dr))
    rows = pd.DataFrame({"dr": dr, "goals": g, "goals_against": ga, "friendly": False})
    d = diagnostics(rows, m)
    assert {"n", "obs_goals", "pred_goals", "obs_win", "pred_win", "elo_we"} <= set(d.columns)
    assert d["n"].sum() == n


def test_save_and_load_roundtrip(tmp_path):
    m = GoalsModel(a=0.3, b=0.002, c_friendly=-0.05)
    p = m.save(tmp_path / "params.yaml", meta={"note": "test"})
    assert GoalsModel.load(p) == m


def test_calibration_records_drop_small_bins_and_keep_bin_as_a_column():
    import pandas as pd
    from intsoccer.model import fit as fitmod
    diag = pd.DataFrame({
        "n": [10, 40, 1000], "obs_goals": [0.1, 0.5, 1.2], "pred_goals": [0.2, 0.5, 1.2],
        "obs_win": [0, .1, .4], "pred_win": [0, .1, .4], "obs_draw": [0, .1, .3],
        "pred_draw": [0, .1, .28], "elo_we": [.1, .2, .5], "obs_score": [0, .15, .55],
    }, index=pd.Index([-1000, -500, 0], name="bin"))
    recs = fitmod.calibration_records(diag, min_n=30)
    assert [r["bin"] for r in recs] == [-500, 0]
    assert recs[1]["n"] == 1000 and recs[1]["pred_draw"] == 0.28
    assert all(isinstance(r["bin"], int) and isinstance(r["obs_goals"], float) for r in recs)
