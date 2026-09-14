"""Simulate one match (or the same match across many simulations) and update Elo ratings.

All inputs may be scalars or 1-D arrays of equal length n (one entry per simulation); outputs
are arrays of length n. Knockout matches that are level after 90' get extra time (Poisson rates
scaled by 30/90) and then a penalty shootout. The Elo update always uses the score after extra
time, and a shootout counts as a draw, exactly as eloratings.net does.
"""

from __future__ import annotations

from typing import NamedTuple

import numpy as np

from ..elo import update
from .goals import GoalsModel

EXTRA_TIME_FRACTION = 30.0 / 90.0

# how the match was decided
REGULAR, EXTRA_TIME, PENALTIES = 0, 1, 2


class MatchResult(NamedTuple):
    goals_a: np.ndarray        # after extra time if played
    goals_b: np.ndarray
    a_wins: np.ndarray         # bool; for group matches False on a draw
    draw: np.ndarray           # bool; always False for knockout matches
    decided_by: np.ndarray     # REGULAR / EXTRA_TIME / PENALTIES
    new_rating_a: np.ndarray
    new_rating_b: np.ndarray


def simulate_match(rating_a, rating_b, k, model: GoalsModel, rng: np.random.Generator,
                   home_sign=0, knockout: bool = False,
                   shootout_p_a: float = 0.5) -> MatchResult:
    rating_a = np.atleast_1d(np.asarray(rating_a, dtype=float))
    rating_b = np.atleast_1d(np.asarray(rating_b, dtype=float))
    n = max(rating_a.shape[0], rating_b.shape[0])
    rating_a, rating_b = np.broadcast_to(rating_a, n), np.broadcast_to(rating_b, n)

    lam_a, lam_b = model.expected_goals(rating_a, rating_b, home_sign)
    lam_a, lam_b = np.broadcast_to(lam_a, n), np.broadcast_to(lam_b, n)
    goals_a = rng.poisson(lam_a)
    goals_b = rng.poisson(lam_b)
    decided_by = np.full(n, REGULAR)

    if knockout:
        level = goals_a == goals_b
        if level.any():
            et_a = rng.poisson(lam_a * EXTRA_TIME_FRACTION)
            et_b = rng.poisson(lam_b * EXTRA_TIME_FRACTION)
            goals_a = goals_a + np.where(level, et_a, 0)
            goals_b = goals_b + np.where(level, et_b, 0)
            decided_by = np.where(level, EXTRA_TIME, decided_by)
            still_level = goals_a == goals_b
            decided_by = np.where(still_level, PENALTIES, decided_by)
            pens_a = rng.random(n) < shootout_p_a
        else:
            still_level = level
            pens_a = np.zeros(n, dtype=bool)
        a_wins = np.where(still_level, pens_a, goals_a > goals_b)
        draw = np.zeros(n, dtype=bool)
    else:
        a_wins = goals_a > goals_b
        draw = goals_a == goals_b

    upd = update(rating_a, rating_b, goals_a, goals_b, k, home_sign)
    return MatchResult(goals_a, goals_b, a_wins, draw, decided_by,
                       np.asarray(upd.new_a), np.asarray(upd.new_b))
