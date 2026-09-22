import json

import numpy as np
import pandas as pd
import pytest

from intsoccer.backtest import fates, forecasts
from intsoccer.data.snapshot import load_snapshot
from intsoccer.model import GoalsModel, simulate_match
from intsoccer.montecarlo import run
from intsoccer.report import bracket, tables
from intsoccer.report.tables import fate_order
from intsoccer.tournament import load_tournament
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


SMALL_MODEL = GoalsModel(a=0.136, b=0.00176)
N = 300


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


@pytest.fixture(scope="module")
def ctx(wc, tmp_path_factory):
    out = tmp_path_factory.mktemp("run") / "wc2026"
    r = run(wc, load_snapshot(wc.ratings_snapshot), SMALL_MODEL, n_sims=N, seed=11, out_dir=out)
    return tables.context(r)


@pytest.fixture(scope="module")
def real(ctx):
    return bracket.replay_real(ctx, RESULTS)


@pytest.fixture(scope="module")
def results(real):
    return forecasts.with_outcomes(forecasts.load_results(RESULTS), real["matches"])


def test_with_outcomes_reads_the_score_and_the_replayed_tie_winners(results):
    assert results["outcome"].where(results["ways"] == 3).dropna().isin(["H", "D", "A"]).all()
    ko = results[results["ways"] == 2]
    assert (ko["outcome"] == ko["home"]).sum() + (ko["outcome"] == ko["away"]).sum() == 32
    final = results[results["stage"] == "F"].iloc[0]
    assert final["outcome"] == "ES" and final["observed"] == 0
    de_py = results[(results["stage"] == "R32") & (results["home"] == "DE")].iloc[0]
    assert de_py["home_goals"] == de_py["away_goals"] and de_py["outcome"] in ("DE", "PY")


def test_run_counts_cover_every_stored_fixture_once(ctx):
    counts = forecasts.run_counts(ctx)
    assert counts["n"].sum() == N * 104
    assert (counts["hw"] + counts["dr"] <= counts["n"]).all()
    group = counts.loc["group"]
    assert group["n"].sum() == N * 72 and (group["tw"] == 0).all()
    ko = counts.drop("group", level=0)
    assert (ko["tw"] <= ko["n"]).all()


def test_runs_frequency_reads_from_the_named_side_and_flips_stored_sides(ctx):
    counts = forecasts.run_counts(ctx)
    p, n = forecasts.runs_frequency(counts, "group", "MX", "ZA", 3)
    q, m = forecasts.runs_frequency(counts, "group", "ZA", "MX", 3)
    assert n == m == N and p.sum() == pytest.approx(1.0)
    assert list(q) == pytest.approx([p[2], p[1], p[0]])
    assert p[0] > 0.6
    never, k = forecasts.runs_frequency(counts, "F", "QA", "CW", 2)
    assert k == 0 and list(never) == pytest.approx([0.5, 0.5])


def test_match_table_has_one_scored_row_per_real_match(ctx, results, model):
    t = forecasts.match_table(ctx, results, model, draw_rate=0.234)
    assert len(t) == 104
    for name in forecasts.FORECASTS:
        assert t[f"{name}_brier"].between(0, 2).all()
        assert (t[f"{name}_logloss"] >= 0).all()
        three = t[t["ways"] == 3]
        total = three[f"{name}_p_home"] + three[f"{name}_p_draw"] + three[f"{name}_p_away"]
        # Poisson truncation at max_goals, as test_goals_model does
        assert np.allclose(total, 1.0, atol=1e-6)
        assert t.loc[t["ways"] == 2, f"{name}_p_draw"].isna().all()
    assert t["runs_n"].between(0, N).all()
    assert (t["sparse"] == (t["runs_n"] < forecasts.SPARSE_RUNS)).all()
    assert t["shrug_brier"][t["ways"] == 3].round(9).eq(round(2 / 3, 9)).all()
    assert list(t.columns[:9]) == ["date", "stage", "group", "home", "away", "home_goals",
                                   "away_goals", "outcome", "ways"]
    assert list(t["home"]) == list(results["home"])


def test_match_summary_averages_and_skills(ctx, results, model):
    t = forecasts.match_table(ctx, results, model, draw_rate=0.234)
    s = forecasts.match_summary(t)
    assert set(s) == set(forecasts.FORECASTS)
    assert s["shrug"]["group"]["brier"] == pytest.approx(2 / 3)
    assert s["shrug"]["knockout"]["brier"] == pytest.approx(0.5)
    assert s["dayof"]["all"]["n"] == 104 and s["dayof"]["group"]["n"] == 72
    assert s["dayof"]["knockout"]["n"] == 32
    sk = s["dayof"]["all"]["skill"]
    assert set(sk) == {"brier_vs_shrug", "brier_vs_elo", "logloss_vs_shrug", "logloss_vs_elo"}
    assert sk["brier_vs_shrug"] == pytest.approx(1 - s["dayof"]["all"]["brier"]
                                                 / s["shrug"]["all"]["brier"])
    assert "skill" not in s["shrug"]["all"] and "skill" not in s["elo"]["all"]


@pytest.fixture(scope="module")
def real_fates(ctx, real):
    return fates.real_fates(ctx, real)


def test_real_fates_are_exactly_48_and_match_the_replay(real_fates, wc, real):
    assert len(real_fates) == 48 and set(real_fates) == set(wc.teams)
    by_fate = pd.Series(real_fates).value_counts()
    assert by_fate["champion"] == 1 and real_fates["ES"] == "champion"
    assert real_fates["AR"] == "runner_up"
    assert real_fates["EN"] == "third" and real_fates["FR"] == "fourth"
    assert by_fate["gs4"] == 12 and by_fate["gs3_out"] == 4
    assert by_fate["r32"] == 16 and by_fate["r16"] == 8 and by_fate["qf"] == 4
    for m in real["matches"]:
        if m["round"] == "R32":
            loser = m["away"] if m["winner"] == m["home"] else m["home"]
            assert real_fates[loser] == "r32"


def test_structural_shrug_is_the_slot_counts(real_fates, wc):
    order = fate_order(list(wc.rounds))
    s = fates.structural_shrug(real_fates, order)
    assert list(s * 48) == pytest.approx([12, 4, 16, 8, 4, 1, 1, 1, 1])


def test_team_table_ladders_sum_to_one_and_reach_columns_nest(ctx, real_fates, wc):
    t = fates.team_table(ctx, real_fates, names={"ES": "Spain"})
    order = fate_order(list(wc.rounds))
    assert len(t) == 48 and list(t.columns[:5]) == ["team", "name", "group", "elo_snapshot",
                                                     "real_fate"]
    assert t.set_index("team").loc["ES", "name"] == "Spain"
    assert t.set_index("team").loc["AR", "name"] == "AR"
    assert t[order].sum(axis=1).round(9).eq(1).all()
    reach = t[[f"reach_{r}" for r in fates.THRESHOLDS]]
    assert (reach.diff(axis=1).iloc[:, 1:] <= 1e-12).all().all()      # r32 >= r16 >= ... >= w
    assert (t["reach_w"] == t["champion"]).all()
    assert (t["reach_sf"] == t[["fourth", "third", "runner_up", "champion"]].sum(axis=1)).all()
    es = t.set_index("team").loc["ES"]
    assert es["reached_w"] == 1 and es["reached_r32"] == 1
    assert t["reached_r32"].sum() == 32 and t["reached_sf"].sum() == 4 and t["reached_w"].sum() == 1
    assert (t["rps"] >= 0).all() and (t["rps_shrug"] > 0).all()
    ladder = es[order].to_numpy(dtype=float)
    from intsoccer.backtest import scores
    assert es["rps"] == pytest.approx(scores.rps(ladder, order.index("champion")))


def test_hits_name_the_modal_and_the_real(ctx, real, real_fates, model):
    t = fates.team_table(ctx, real_fates, names={})
    modal = bracket.modal_bracket(ctx, model)
    h = fates.hits(real, t, modal)
    assert h["champion"]["real"] == "ES"
    assert h["champion"]["hit"] == (h["champion"]["modal"] == "ES")
    assert len(h["semi_finalists"]["modal"]) == 4 and len(h["semi_finalists"]["real"]) == 4
    assert 0 <= h["semi_finalists"]["matched"] <= 4
    assert h["r32_pairings"]["of"] == 16 and 0 <= h["r32_pairings"]["matched"] <= 16
    assert h["r32_pairings"]["matched"] == len(h["r32_pairings"]["pairs"])


def test_calibration_bins_cover_all_288_predictions(ctx, real_fates, wc):
    t = fates.team_table(ctx, real_fates, names={})
    order = fate_order(list(wc.rounds))
    c = fates.calibration(t, fates.structural_shrug(real_fates, order), order)
    assert [b["bin"] for b in c["bins"]] == list(fates.BIN_LABELS)
    assert sum(b["n"] for b in c["bins"]) == 288
    assert all(0 <= b["observed"] <= 1 and 0 <= b["mean_p"] <= 1 for b in c["bins"] if b["n"])
    assert [r["bin"] for r in c["thresholds"]] == [f"reach_{r}" for r in fates.THRESHOLDS]
    assert all(r["n"] == 48 for r in c["thresholds"])
    assert c["thresholds"][0]["observed"] == pytest.approx(32 / 48)
    assert c["thresholds"][-1]["observed"] == pytest.approx(1 / 48)
    assert 0 <= c["brier"] <= 1 and 0 < c["brier_shrug"] <= 1
    assert c["skill"] == pytest.approx(1 - c["brier"] / c["brier_shrug"])
