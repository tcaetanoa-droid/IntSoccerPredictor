"""The scoring rules of docs/BACKTEST.md as pure functions over probabilities.

`p` is a forecast over K outcomes (a length-K array summing to one); `observed` is the index of
the outcome that happened. A ladder is a forecast over ordered outcomes (the nine fates).
"""

from __future__ import annotations

import numpy as np

LOG_FLOOR = 1e-6    # a zero-count frequency scores -ln(1e-6), not infinity


def _one_hot(p: np.ndarray, observed: int) -> np.ndarray:
    o = np.zeros_like(p)
    o[observed] = 1.0
    return o


def brier(p, observed: int) -> float:
    p = np.asarray(p, dtype=float)
    return float(((p - _one_hot(p, observed)) ** 2).sum())


def logloss(p, observed: int, floor: float = LOG_FLOOR) -> float:
    p = np.asarray(p, dtype=float)
    return float(-np.log(max(float(p[observed]), floor)))


def rps(ladder, observed: int) -> float:
    """Ranked probability score: mean squared gap between the cumulative forecast and the
    cumulative outcome over the first K-1 rungs. One rung off costs 1/(K-1); K-1 rungs off, 1."""
    p = np.asarray(ladder, dtype=float)
    cum_forecast = np.cumsum(p)[:-1]                       # F_k in the spec's formula
    cum_observed = np.cumsum(_one_hot(p, observed))[:-1]   # O_k
    return float(((cum_forecast - cum_observed) ** 2).sum() / (len(p) - 1))


def skill(score: float, baseline: float) -> float:
    """1 - score / baseline: 0 is no better than the baseline, 1 perfect, negative worse."""
    return 1.0 - score / baseline
