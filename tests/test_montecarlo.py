import numpy as np
import pandas as pd
import pytest

from intsoccer.data.snapshot import load_snapshot
from intsoccer.model import GoalsModel
from intsoccer.montecarlo import load_run, regenerate, run, sim_rng
from intsoccer.tournament import load_tournament, simulate_tournament

MODEL = GoalsModel(a=0.136, b=0.00176)
N = 40


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


@pytest.fixture(scope="module")
def ratings(wc):
    return load_snapshot(wc.ratings_snapshot)


@pytest.fixture(scope="module")
def saved(wc, ratings, tmp_path_factory):
    out = tmp_path_factory.mktemp("run") / "wc2026_test"
    r = run(wc, ratings, MODEL, n_sims=N, seed=123, out_dir=out)
    return r, out


def test_every_match_and_every_team_of_every_simulation_is_stored(saved, wc):
    r, _ = saved
    assert len(r.matches) == N * 104 and len(r.teams) == N * 48 and len(r.sims) == N
    assert r.matches.groupby("sim").size().eq(104).all()
    assert (r.matches["stage"] == "group").sum() == N * 72
    assert r.matches.loc[r.matches["stage"] == "group", "group"].notna().all()
    assert r.matches.loc[r.matches["stage"] != "group", "group"].isna().all()
    r32 = r.matches.loc[r.matches["stage"] == "R32", "number"]
    assert set(r32.unique()) == set(wc.rounds["R32"])
    per_sim = r.teams.groupby("sim")["group_pos"]
    assert per_sim.apply(lambda s: sorted(s) == sorted([1, 2, 3, 4] * 12)).all()
    assert r.teams["third_rank"].between(0, 12).all()
    assert (r.teams["third_rank"] > 0).sum() == N * 12
    ko = r.matches[r.matches["stage"] != "group"]
    assert ko["winner"].notna().all()
    assert r.matches.loc[r.matches["stage"] == "group", "winner"].isna().all()
    assert ((ko["winner"] == ko["home"]) | (ko["winner"] == ko["away"])).all()
    level = ko["home_goals"] == ko["away_goals"]
    assert (ko.loc[level, "decided_by"] == 2).all()
    decided = ko[~level]
    home_won = decided["home_goals"] > decided["away_goals"]
    assert (decided["winner"] == decided["home"].where(home_won, decided["away"])).all()


def test_tables_agree_with_each_other(saved):
    r, _ = saved
    for _, s in r.sims.iterrows():
        team_rows = r.teams[r.teams["sim"] == s["sim"]].set_index("team")
        assert team_rows.loc[s["champion"], "place"] == 1
        assert team_rows.loc[s["runner_up"], "place"] == 2
        assert team_rows.loc[s["third"], "place"] == 3
        assert team_rows.loc[s["fourth"], "place"] == 4
        assert team_rows.loc[s["champion"], "reached"] == "F"
        final = r.matches[(r.matches["sim"] == s["sim"]) & (r.matches["number"] == 104)].iloc[0]
        assert {final["home"], final["away"]} == {s["champion"], s["runner_up"]}
    # exactly 32 teams per sim reach the R32 and 1 is champion
    assert r.teams.groupby("sim")["reached"].apply(lambda s: (s != "group").sum()).eq(32).all()
    assert r.teams.groupby("sim")["place"].apply(lambda s: (s == 1).sum()).eq(1).all()


def test_any_single_simulation_can_be_regenerated_from_the_seed(saved, wc, ratings):
    r, _ = saved
    i = 7
    sim = regenerate(r, i, MODEL)
    direct = simulate_tournament(wc, ratings, MODEL, sim_rng(123, i))
    assert sim == direct
    stored = r.matches[r.matches["sim"] == i]
    ko = stored[stored["stage"] != "group"].set_index("number")
    for number, m in sim.knockout.items():
        row = ko.loc[number]
        assert (row["home"], row["away"]) == (m.home, m.away)
        assert (row["home_goals"], row["away_goals"]) == sim.knockout_scores[number][:2]
        assert row["winner"] == m.winner
    assert r.sims.set_index("sim").loc[i, "champion"] == sim.champion
    group_a = stored[stored["group"] == "A"]
    assert [(h, a, hg, ag) for h, a, hg, ag in
            zip(group_a["home"], group_a["away"], group_a["home_goals"], group_a["away_goals"])] \
        == [tuple(res) for res in sim.group_results["A"]]


def test_saved_run_round_trips_through_parquet(saved):
    r, out = saved
    back = load_run(out)
    assert back.meta == r.meta
    for a, b in ((back.matches, r.matches), (back.teams, r.teams), (back.sims, r.sims)):
        pd.testing.assert_frame_equal(a, b, check_categorical=False, check_dtype=False)
    assert (out / "summary.csv").exists()


def test_summary_probabilities_are_consistent(saved):
    r, _ = saved
    s = r.summary.set_index("team")
    assert len(s) == 48
    assert s["champion"].sum() == pytest.approx(1.0)
    assert np.allclose(s[["group_1", "group_2", "group_3", "group_4"]].sum(axis=1), 1.0)
    assert s["reach_R32"].sum() == pytest.approx(32.0)
    assert (s["reach_R32"] >= s["reach_R16"]).all() and (s["reach_SF"] >= s["reach_F"]).all()
    assert (s["reach_F"] >= s["champion"]).all()
    assert "reach_3P" not in s.columns
    assert s.loc["ES", "champion"] > s.loc["HT", "champion"]


def test_runs_with_different_seeds_differ_and_same_seed_repeats(wc, ratings):
    a = run(wc, ratings, MODEL, n_sims=3, seed=1)
    b = run(wc, ratings, MODEL, n_sims=3, seed=1)
    c = run(wc, ratings, MODEL, n_sims=3, seed=2)
    pd.testing.assert_frame_equal(a.matches, b.matches)
    assert not a.matches["home_goals"].equals(c.matches["home_goals"])


def test_resolve_meta_path_falls_back_to_this_checkouts_data_folder(tmp_path):
    from intsoccer.montecarlo import resolve_meta_path
    from intsoccer.tournament.format import TOURNAMENT_DIR

    stale = "/Users/someone/OldPlace/IntSoccerPredictor/data/tournaments/wc2026.yaml"
    assert resolve_meta_path(stale) == TOURNAMENT_DIR / "wc2026.yaml"
    stale_snapshot = "/Users/someone/OldPlace/data/snapshots/2026-06-10_wc2026.csv"
    assert resolve_meta_path(stale_snapshot).name == "2026-06-10_wc2026.csv"
    assert resolve_meta_path(stale_snapshot).exists()
    here = tmp_path / "meta.yaml"
    here.write_text("x")
    assert resolve_meta_path(here) == here
    with pytest.raises(FileNotFoundError):
        resolve_meta_path("/nowhere/data/tournaments/no_such_tournament.yaml")
