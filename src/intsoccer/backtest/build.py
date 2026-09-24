"""Score a saved run against the real results: output/<name>/backtest/{matches,teams,
calibration}.csv + summary.json (elsewhere with `out_dir`). The record is written up in
docs/BACKTEST.md."""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pandas as pd

from ..model import GoalsModel
from ..montecarlo import load_run
from ..report import bracket, tables
from ..report.build import _load_names
from ..report.tables import fate_order
from . import fates, forecasts, scores

CALIBRATION_PATH = Path(__file__).resolve().parents[3] / "data" / "calibration.json"


def build_backtest(run_dir: Path, results: Path, out_dir: Path | None = None,
                   calibration: Path = CALIBRATION_PATH, names: dict | None = None) -> dict:
    run_dir, results = Path(run_dir), Path(results)
    run = load_run(run_dir)
    ctx = tables.context(run)
    model = GoalsModel(**run.meta["goals_model"])
    names = _load_names() if names is None else names

    real = bracket.replay_real(ctx, results)
    res = forecasts.with_outcomes(forecasts.load_results(results), real["matches"])
    draw_rate = forecasts.draw_rate(calibration)
    matches = forecasts.match_table(ctx, res, model, draw_rate)

    order = fate_order(ctx.rounds)
    real_fates = fates.real_fates(ctx, real)
    shrug = fates.structural_shrug(real_fates, order)
    teams = fates.team_table(ctx, real_fates, names)
    modal = bracket.modal_bracket(ctx, model)
    cal = fates.calibration(teams, shrug, order)

    sparse = matches[matches["sparse"]]
    rps, rps_shrug = float(teams["rps"].mean()), float(teams["rps_shrug"].mean())
    summary = {
        "meta": {"run": str(run_dir), "n_sims": int(run.meta["n_sims"]),
                 "seed": int(run.meta["seed"]), "results": str(results),
                 "goals_model": run.meta["goals_model"], "log_floor": scores.LOG_FLOOR,
                 "draw_rate": draw_rate, "built": dt.date.today().isoformat()},
        "matches": forecasts.match_summary(matches),
        "sparse_pairings": {"count": int(len(sparse)),
                            "pairings": [{"stage": r.stage, "home": r.home, "away": r.away,
                                          "runs_n": int(r.runs_n)}
                                         for r in sparse.itertuples(index=False)]},
        "tournament": {"rps": rps, "rps_shrug": rps_shrug,
                       "rps_skill": scores.skill(rps, rps_shrug),
                       "hits": fates.hits(real, teams, modal)},
        "calibration": cal,
    }
    calibration_rows = pd.DataFrame(cal["bins"] + cal["thresholds"])

    out = Path(out_dir) if out_dir is not None else run_dir / "backtest"
    out.mkdir(parents=True, exist_ok=True)
    matches.to_csv(out / "matches.csv", index=False, float_format="%.5f")
    teams.to_csv(out / "teams.csv", index=False, float_format="%.5f")
    calibration_rows.to_csv(out / "calibration.csv", index=False, float_format="%.5f")
    (out / "summary.json").write_text(json.dumps(summary, indent=1))
    return {"matches": matches, "teams": teams, "calibration": calibration_rows,
            "summary": summary}
