import json

import pytest

from intsoccer.data.snapshot import load_snapshot
from intsoccer.model import GoalsModel
from intsoccer.montecarlo import run
from intsoccer.report import build_report
from intsoccer.report import site
from intsoccer.tournament import load_tournament

MODEL = GoalsModel(a=0.136, b=0.00176)
N = 300


@pytest.fixture(scope="module")
def wc():
    return load_tournament("wc2026")


@pytest.fixture(scope="module")
def names(wc):
    # tests must not need data/raw: codes double as names, plus the two overrides
    return {c: c for c in wc.teams}


@pytest.fixture(scope="module")
def built(wc, names, tmp_path_factory):
    out = tmp_path_factory.mktemp("run") / "wc2026"
    run(wc, load_snapshot(wc.ratings_snapshot), MODEL, n_sims=N, seed=11, out_dir=out)
    views = build_report(out, names=names)
    return views, out / "report"


def test_iso_map_covers_every_2026_team_and_the_trap_codes(wc):
    assert set(wc.teams) <= set(site.ISO)
    assert site.ISO["SQ"] == "gb-sct" and site.ISO["EN"] == "gb-eng" and site.ISO["IR"] == "ir"


def test_display_name_overrides():
    names = {"US": "United States", "BA": "Bosnia and Herzegovina", "ES": "Spain"}
    assert site.display_name("US", names) == "USA"
    assert site.display_name("BA", names) == "Bosnia & Herz."
    assert site.display_name("ES", names) == "Spain"


def test_teams_index_is_written_sorted_by_title_chance(built, wc):
    views, out = built
    rows = json.loads((out / "teams.json").read_text())
    assert len(rows) == 48 and rows == views["teams"]
    assert [r["code"] for r in rows] == sorted(wc.teams, key=lambda c: -views["fate_table"].set_index("team").loc[c, "champion"])
    assert set(rows[0]) == {"code", "iso", "name", "group", "elo", "champion_pct"}
    assert all(r["iso"] == site.ISO[r["code"]] for r in rows)
