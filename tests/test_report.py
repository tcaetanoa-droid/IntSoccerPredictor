import json

import pandas as pd
import pytest

from intsoccer.data.snapshot import load_snapshot
from intsoccer.model import GoalsModel
from intsoccer.montecarlo import OUTPUT_DIR, run
from intsoccer.report import FOCUS, build_report
from intsoccer.report import tables
from intsoccer.tournament import load_tournament

MODEL = GoalsModel(a=0.136, b=0.00176)
N = 300


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


@pytest.fixture(scope="module")
def built(wc, tmp_path_factory):
    out = tmp_path_factory.mktemp("run") / "wc2026"
    run(wc, load_snapshot(wc.ratings_snapshot), MODEL, n_sims=N, seed=11, out_dir=out)
    views = build_report(out)
    return views, out / "report"


def test_all_view_files_are_written(built):
    views, out = built
    for key, view in views.items():
        ext = "csv" if isinstance(view, pd.DataFrame) else "json"
        assert (out / f"{key}.{ext}").exists(), key
    bundle = json.loads((out / "report.json").read_text())
    assert set(bundle) == set(views) | {"meta"}


def test_group_advance(built, wc):
    ga = built[0]["group_advance"]
    assert len(ga) == 48 and ga["adv_pct"].between(0, 1).all()
    assert ga["third_shaded"].sum() == 8 * 4          # 8 groups x 4 rows flagged
    assert ga.groupby("group")["third_shaded"].nunique().eq(1).all()
    assert ga.groupby("group")["modal_pos"].apply(lambda s: sorted(s) == [1, 2, 3, 4]).all()
    for _, g in ga.groupby("group"):
        assert list(g["adv_pct"]) == sorted(g["adv_pct"], reverse=True)


def test_fate_table_rows_sum_to_n_and_sort_by_champion(built):
    ft = built[0]["fate_table"]
    fates = ["gs4", "gs3_out", "r32", "r16", "qf", "fourth", "third", "runner_up", "champion"]
    assert list(ft.columns[:3]) == ["team", "group", "elo"]
    assert ft[fates].sum(axis=1).eq(N).all()
    assert (ft["advanced"] == ft[fates[2:]].sum(axis=1)).all()
    assert (ft["group_third"] >= ft["gs3_out"]).all()
    assert ft["champion"].sum() == N
    assert list(ft["champion"]) == sorted(ft["champion"], reverse=True)


def test_weakest_and_lowest_elo(built):
    w, low = built[0]["weakest_teams"], built[0]["lowest_elo_teams"]
    assert len(w) == 5 and list(w["escape_pct"]) == sorted(w["escape_pct"])
    assert len(low) == 5 and list(low["elo"]) == sorted(low["elo"])
    assert set(w.columns) == {"team", "elo", "escape_pct", "gs4_pct", "gs3_out_pct", "champion_pct"}
    assert ((w["gs4_pct"] + w["gs3_out_pct"] + w["escape_pct"]).round(9) == 1).all()


def test_first_timers_and_trophy_paradox(built, wc):
    ft = built[0]["first_time_champions"]
    assert len(ft) == 3 and not ft["team"].isin(wc.past_champions).any()
    assert list(ft["champion_pct"]) == sorted(ft["champion_pct"], reverse=True)
    tp = built[0]["trophy_paradox"]
    assert list(tp[tp["side"] == "first_timer"]["team"]) == list(ft["team"])
    giants = tp[tp["side"] == "giant"].set_index("team")
    assert giants.loc["DE", "titles"] == 4 and giants.loc["UY", "titles"] == 2
    assert giants.loc["IT", "titles"] == 4 and not giants.loc["IT", "qualified"]
    assert giants.loc["IT", "champion_pct"] == 0


def test_hosts_exit_sums_to_one_per_host(built):
    h = built[0]["hosts_exit"]
    assert set(h["team"]) == {"MX", "CA", "US"}
    assert h.groupby("team")["pct"].sum().round(9).eq(1).all()
    assert h.groupby("team").size().eq(9).all()


def test_paradoxes_have_both_panels(built):
    p = built[0]["paradoxes"]
    assert list(p[p["panel"] == "A"]["team"]) == ["AR", "FR"]
    assert list(p[p["panel"] == "B"]["team"]) == ["AT", "US", "UY", "MX"]
    assert p[p["panel"] == "A"]["reason"].str.contains("most common R32 opponent").all()
    assert p.set_index("team").loc["US", "reason"].startswith("host")
    assert p["value"].between(0, 1).all()


def test_team_page(built):
    page = built[0]["team_ES"]
    assert page["team"] == "ES" and page["group"] == "H" and page["elo"] == 2157
    assert sum(page["fates"].values()) == pytest.approx(1.0)
    reach = [page["reach"][r] for r in ["R32", "R16", "QF", "SF", "F"]]
    assert reach == sorted(reach, reverse=True) and page["reach"]["F"] >= page["champion_pct"]
    assert sum(x["pct"] for x in page["knocked_out_by"]) <= 1.0 + 1e-9
    assert set(page["opponents_by_round"]) == {"R32", "R16", "QF", "SF", "3P", "F"}
    ex = page["first_round_excerpt"]
    assert ex["opponent"] == page["knocked_out_by"][0]["team"] and 0 <= ex["meet_in_r32_pct"] <= 1


def test_modal_bracket_is_a_complete_consistent_bracket(built, wc):
    b = built[0]["bracket"]
    assert len(b["matches"]) == 32 and len(b["best_third_groups"]) == 8
    assert all(m["winner"] in (m["home"], m["away"]) for m in b["matches"])
    assert all(0 <= m["p_home"] <= 1 for m in b["matches"])
    assert all((m["p_home"] >= 0.5) == (m["winner"] == m["home"]) for m in b["matches"])
    by_number = {m["number"]: m for m in b["matches"]}
    assert b["champion"] == by_number[104]["winner"]
    assert {by_number[104]["home"], by_number[104]["away"]} == \
        {by_number[101]["winner"], by_number[102]["winner"]}
    for g, rows in b["groups"].items():
        assert [r["pos"] for r in rows] == [1, 2, 3, 4]
        assert {r["team"] for r in rows} == set(wc.groups[g])
    r32_teams = {c for m in b["matches"] if m["round"] == "R32" for c in (m["home"], m["away"])}
    expected = {r["team"] for rows in b["groups"].values() for r in rows[:2]} \
        | {b["groups"][g][2]["team"] for g in b["best_third_groups"]}
    assert r32_teams == expected


def test_reality_view(built):
    r = built[0]["reality"]
    real = r["real"]
    assert real["champion"] == "ES" and len(real["matches"]) == 32
    assert real["matches"][-1]["home"] == "ES" and real["matches"][-1]["away"] == "AR"
    finals = r["top_finals"]
    assert sum(f["real"] for f in finals) == 1 and sum(f["pct"] for f in finals) <= 1
    closest = r["closest"]
    for key in ("closest_group_stage", "closest_knockouts", "closest_final_eight"):
        c = closest[key]
        assert len(c["matches"]) == 32 and len(c["orders"]) == 12
        assert 0 <= c["scores"]["group_positions"] <= 48
        assert c["scores"]["knockout_results"] == sum(m["matches_reality"] for m in c["matches"])
    assert closest["maxima"] == {"group_positions": 48, "knockout_results": 32, "final_eight": 16}


FULL_RUN = OUTPUT_DIR / "wc2026"


@pytest.mark.skipif(not (FULL_RUN / "matches.parquet").exists(), reason="no 100k run on disk")
def test_full_run_matches_the_numbers_in_docs_reports(wc):
    """The numbers quoted in docs/REPORTS.md, checked against the real 100k run when present."""
    from intsoccer.montecarlo import load_run
    r = load_run(FULL_RUN)
    if r.meta["n_sims"] != 100_000 or r.meta["seed"] != 2026:
        pytest.skip("output/wc2026 is not the seed-2026 100k run")
    ctx = tables.context(r)
    ft = tables.fate_table(ctx).set_index("team")
    assert ft.loc["ES", "champion"] == pytest.approx(18_600, abs=100)
    assert list(ft.index[:3]) == ["ES", "AR", "FR"]
    ga = tables.group_advance(ctx)
    assert sorted(ga[ga["third_shaded"]]["group"].unique()) == list("ACDEFGIL")
    ftc = tables.first_time_champions(ctx)
    assert list(ftc["team"]) == ["PT", "CO", "NL"]
    from intsoccer.report import bracket as br
    b = br.modal_bracket(ctx)
    final = b["matches"][-1]
    assert {final["home"], final["away"]} == {"ES", "AR"} and final["winner"] == "ES"
    semis = {(m["home"], m["away"]) for m in b["matches"] if m["round"] == "SF"}
    assert semis == {("FR", "ES"), ("EN", "AR")}
    page = tables.team_page(ctx, "ES")
    assert page["knocked_out_by"][0]["team"] == "AR"
    assert page["first_round_excerpt"]["meet_in_r32_pct"] == pytest.approx(0.276, abs=0.005)
    real = br.reality(ctx, FOCUS["wc2026"]["results"])
    top = real["top_finals"][0]
    assert top["real"] and top["pct"] == pytest.approx(0.0304, abs=0.001)
