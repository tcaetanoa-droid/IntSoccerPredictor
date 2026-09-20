"""Build every report view of docs/REPORTS.md for a run: `output/<name>/report/*.csv|json`."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from ..montecarlo import Run, load_run
from ..tournament.format import TOURNAMENT_DIR
from . import bracket, site, tables

# Editorial choices per tournament (which giants, which pairs, where the real results live).
FOCUS = {
    "wc2026": {
        "giants": ["DE", "UY"],
        "absent_giants": ["IT"],
        "paradox_a": ("AR", "FR"),
        "paradox_b": [("AT", "US"), ("UY", "MX")],
        "results": TOURNAMENT_DIR / "wc2026_results.csv",
    },
}


def _json(obj):
    if isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient="records")
    return obj


def _load_names() -> dict[str, str]:
    """Team names from the cached en.teams.tsv; codes stand in if it was never fetched."""
    from ..data import fetch, parse
    path = fetch.RAW_DIR / "en.teams.tsv"
    return parse.load_team_names(path) if path.exists() else {}


def build_report(run: Run | Path, out_dir: Path | None = None, focus: dict | None = None,
                 name: str | None = None, names: dict | None = None) -> dict:
    """Compute all views; write them under out_dir (default <run dir>/report) if given a path."""
    run_dir = None
    if not isinstance(run, Run):
        run_dir = Path(run)
        run = load_run(run_dir)
    name = name or (run_dir.name if run_dir else Path(run.meta["tournament_yaml"]).stem)
    focus = focus or FOCUS[name]
    ctx = tables.context(run)
    if names is None:
        names = _load_names()

    views = {
        "group_advance": tables.group_advance(ctx),
        "fate_table": tables.fate_table(ctx),
        "weakest_teams": tables.weakest_teams(ctx),
        "lowest_elo_teams": tables.lowest_elo_teams(ctx),
        "first_time_champions": tables.first_time_champions(ctx),
        "trophy_paradox": tables.trophy_paradox(ctx, focus["giants"], focus["absent_giants"]),
        "hosts_exit": tables.hosts_exit(ctx),
        "paradoxes": tables.paradoxes(ctx, focus["paradox_a"], focus["paradox_b"]),
        **site.team_pages(ctx, names),
        "bracket": bracket.modal_bracket(ctx),
        "reality": bracket.reality(ctx, Path(focus["results"])),
        "teams": site.teams_index(ctx, names),
    }
    if out_dir is None and run_dir is not None:
        out_dir = run_dir / "report"
    if out_dir is not None:
        out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        for key, view in views.items():
            if isinstance(view, pd.DataFrame):
                view.to_csv(out_dir / f"{key}.csv", index=False, float_format="%.5f")
            else:
                (out_dir / f"{key}.json").write_text(json.dumps(view, indent=1))
        bundle = {"meta": run.meta, **{k: _json(v) for k, v in views.items()}}
        (out_dir / "report.json").write_text(json.dumps(bundle, indent=1))
    return views
