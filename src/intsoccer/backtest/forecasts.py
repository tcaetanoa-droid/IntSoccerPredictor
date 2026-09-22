"""The two forecasts and the two baselines for every real match (spec section 4), and the
match table with their scores (section 5).

A forecast is a length-3 array (home win, draw, away win) for a group match and a length-2
array (home side wins the tie, away side wins the tie) for a knockout; "home" is the side the
results file names first, and `home_sign` is 1 when it played in its own country.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from ..elo import expected_score, rating_diff
from ..model import GoalsModel, outcome_probs
from ..model.match import EXTRA_TIME_FRACTION

FORECASTS = ("dayof", "runs", "shrug", "elo")
SPARSE_RUNS = 500      # a knockout pairing seen fewer times than this is scored but flagged
GROUP_OUTCOME = {"H": 0, "D": 1, "A": 2}


# --- the real matches --------------------------------------------------------------------

def load_results(path: Path) -> pd.DataFrame:
    """The results CSV with `ways` (3 group, 2 knockout) and `home_sign` (1 when the named home
    side played in its own country, else 0)."""
    df = pd.read_csv(path)
    df["neutral"] = df["neutral"].astype(bool)
    df["ways"] = np.where(df["stage"] == "group", 3, 2)
    df["home_sign"] = np.where(df["neutral"], 0, 1)
    return df


def with_outcomes(results: pd.DataFrame, real_matches: list[dict]) -> pd.DataFrame:
    """Adds `outcome` (H/D/A, or the tie winner's code) and `observed` (its index in the
    forecast). Knockout winners come from the report's replay, which resolves shootouts."""
    winners = {(m["round"], frozenset((m["home"], m["away"]))): m["winner"] for m in real_matches}
    df = results.copy()
    outcome, observed = [], []
    for r in df.itertuples(index=False):
        if r.ways == 3:
            o = "H" if r.home_goals > r.away_goals else "A" if r.home_goals < r.away_goals else "D"
            outcome.append(o)
            observed.append(GROUP_OUTCOME[o])
        else:
            w = winners[(r.stage, frozenset((r.home, r.away)))]
            outcome.append(w)
            observed.append(0 if w == r.home else 1)
    df["outcome"], df["observed"] = outcome, observed
    return df


# --- the model on the day -----------------------------------------------------------------

def knockout_win_prob(model: GoalsModel, rating_home, rating_away, home_sign: int = 0) -> float:
    """P(home side wins the tie), extended exactly as the engine plays it (model/match.py):
    extra time is a fresh Poisson draw at 30/90 of each rate, a shootout is a fair coin."""
    la, lb = model.expected_goals(rating_home, rating_away, home_sign)
    w, d, _ = outcome_probs(la, lb, model.max_goals)
    w_et, d_et, _ = outcome_probs(la * EXTRA_TIME_FRACTION, lb * EXTRA_TIME_FRACTION,
                                  model.max_goals)
    return float(w[0] + d[0] * (w_et[0] + 0.5 * d_et[0]))


def dayof(model: GoalsModel, rating_home, rating_away, home_sign: int, ways: int) -> np.ndarray:
    if ways == 3:
        la, lb = model.expected_goals(rating_home, rating_away, home_sign)
        w, d, loss = outcome_probs(la, lb, model.max_goals)
        return np.array([w[0], d[0], loss[0]])
    p = knockout_win_prob(model, rating_home, rating_away, home_sign)
    return np.array([p, 1.0 - p])


# --- the baselines ------------------------------------------------------------------------

def shrug(ways: int) -> np.ndarray:
    return np.full(ways, 1.0 / ways)


def elo_baseline(rating_home, rating_away, home_sign: int, ways: int,
                 draw_rate: float) -> np.ndarray:
    """Plain Elo: We with the +100 home edge, the draw share taken off both sides three-way."""
    we = float(expected_score(rating_diff(rating_home, rating_away, home_sign)))
    if ways == 3:
        return np.array([we * (1 - draw_rate), draw_rate, (1 - we) * (1 - draw_rate)])
    return np.array([we, 1.0 - we])


def draw_rate(calibration_path: Path) -> float:
    """The fitted set's observed draw rate: the match-weighted mean of the calibration
    records' `obs_draw` (data/calibration.json, written by `intsoccer fit`)."""
    rows = json.loads(Path(calibration_path).read_text())
    n = np.array([r["n"] for r in rows], dtype=float)
    obs = np.array([r["obs_draw"] for r in rows], dtype=float)
    return float((n * obs).sum() / n.sum())
