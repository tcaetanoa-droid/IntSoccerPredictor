"""Fit the goals model by Poisson maximum likelihood on real match histories."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from ..data import fetch, parse, snapshot
from ..elo import expected_score
from .goals import GoalsModel, outcome_probs

FRIENDLY_TYPES = {"F", "FT"}


def build_training_set(codes: list[str], names: dict[str, str], start: str, end: str,
                       raw_dir: Path = fetch.RAW_DIR) -> pd.DataFrame:
    """One row per (match, team): dr from that team's view, goals for, is_friendly.

    Uses every match in the histories of `codes` (opponents need not be in `codes`),
    deduplicated, with start <= date < end. Pre-match ratings come from the history itself.
    """
    frames = []
    for code in codes:
        hist = snapshot.load_history(code, names, raw_dir)
        frames.append(hist[(hist["date"] >= pd.Timestamp(start)) & (hist["date"] < pd.Timestamp(end))])
    m = pd.concat(frames).drop_duplicates(subset=["date", "home", "away"]).reset_index(drop=True)
    home_sign = np.where(m["neutral"], 0, 1)
    friendly = m["match_type"].isin(FRIENDLY_TYPES).to_numpy()
    dr_home = (m["home_rating_before"] - m["away_rating_before"] + 100 * home_sign).to_numpy(float)
    rows = pd.DataFrame({
        "date": np.concatenate([m["date"], m["date"]]),
        "team": np.concatenate([m["home"], m["away"]]),
        "opponent": np.concatenate([m["away"], m["home"]]),
        "dr": np.concatenate([dr_home, -dr_home]),
        "goals": np.concatenate([m["home_goals"], m["away_goals"]]).astype(int),
        "goals_against": np.concatenate([m["away_goals"], m["home_goals"]]).astype(int),
        "friendly": np.concatenate([friendly, friendly]),
        "match_type": np.concatenate([m["match_type"], m["match_type"]]),
    })
    return rows


DR_SCALE = 1000.0   # optimise on dr/1000 so all three parameters are O(1)


def _nll_and_grad(params, z, goals, friendly):
    """Poisson negative log-likelihood (up to a constant) and its exact gradient."""
    a, b, c = params
    log_lam = a + b * z + c * friendly
    lam = np.exp(log_lam)
    nll = float(np.sum(lam - goals * log_lam))
    resid = lam - goals
    grad = np.array([resid.sum(), (resid * z).sum(), (resid * friendly).sum()])
    return nll, grad


def fit_goals_model(rows: pd.DataFrame, with_friendly_term: bool = True) -> GoalsModel:
    z = rows["dr"].to_numpy(float) / DR_SCALE
    goals = rows["goals"].to_numpy(float)
    friendly = rows["friendly"].to_numpy(float) if with_friendly_term else np.zeros(len(rows))
    x0 = np.array([np.log(goals.mean()), 1.0, 0.0])
    res = minimize(_nll_and_grad, x0, args=(z, goals, friendly), jac=True, method="L-BFGS-B",
                   bounds=[(-5, 5), (-10, 10), (-3, 3)])
    if not res.success:
        raise RuntimeError(f"fit failed: {res.message}")
    a, b, c = res.x
    return GoalsModel(a=float(a), b=float(b / DR_SCALE),
                      c_friendly=float(c) if with_friendly_term else 0.0)


def diagnostics(rows: pd.DataFrame, model: GoalsModel, bin_width: int = 100) -> pd.DataFrame:
    """Observed vs predicted goals and outcomes, binned by Elo advantage dr."""
    df = rows.copy()
    lam_for = model.rate(df["dr"], df["friendly"])
    lam_against = model.rate(-df["dr"], df["friendly"])
    p_win, p_draw, p_loss = outcome_probs(lam_for, lam_against, model.max_goals)
    df["pred_goals"] = lam_for
    df["p_win"], df["p_draw"], df["p_loss"] = p_win, p_draw, p_loss
    df["elo_we"] = expected_score(df["dr"])
    df["won"] = (df["goals"] > df["goals_against"]).astype(float)
    df["drew"] = (df["goals"] == df["goals_against"]).astype(float)
    df["bin"] = (np.floor(df["dr"] / bin_width) * bin_width).astype(int)
    g = df.groupby("bin")
    out = pd.DataFrame({
        "n": g.size(),
        "obs_goals": g["goals"].mean(),
        "pred_goals": g["pred_goals"].mean(),
        "obs_win": g["won"].mean(),
        "pred_win": g["p_win"].mean(),
        "obs_draw": g["drew"].mean(),
        "pred_draw": g["p_draw"].mean(),
        "elo_we": g["elo_we"].mean(),
        "obs_score": (g["won"].mean() + 0.5 * g["drew"].mean()),
    })
    return out.round(3)


def plot_diagnostics(diag: pd.DataFrame, out_path: Path, min_n: int = 30) -> Path:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    d = diag[diag["n"] >= min_n]
    x = d.index + 50
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
    axes[0].plot(x, d["obs_goals"], "o", label="observed mean goals")
    axes[0].plot(x, d["pred_goals"], "-", label="model λ")
    axes[0].set_xlabel("Elo advantage (incl. home +100)"); axes[0].set_ylabel("goals for")
    axes[0].set_title("Expected goals vs Elo gap"); axes[0].legend(); axes[0].grid(alpha=0.3)
    axes[1].plot(x, d["obs_win"], "o", color="C0", label="observed win rate")
    axes[1].plot(x, d["pred_win"], "-", color="C0", label="Poisson P(win)")
    axes[1].plot(x, d["obs_draw"], "s", color="C1", label="observed draw rate")
    axes[1].plot(x, d["pred_draw"], "-", color="C1", label="Poisson P(draw)")
    axes[1].plot(x, d["elo_we"], "--", color="gray", label="Elo We (expected score)")
    axes[1].plot(x, d["obs_score"], "^", color="gray", label="observed score (W + D/2)")
    axes[1].set_xlabel("Elo advantage (incl. home +100)"); axes[1].set_ylabel("probability")
    axes[1].set_title("Outcomes vs Elo gap"); axes[1].legend(fontsize=8); axes[1].grid(alpha=0.3)
    fig.tight_layout()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=130)
    plt.close(fig)
    return out_path
