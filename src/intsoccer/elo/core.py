from __future__ import annotations

from typing import NamedTuple

import numpy as np

from ..data.schema import K_BY_MATCH_TYPE, K_DEFAULT

HOME_ADVANTAGE = 100.0


def rating_diff(rating_a, rating_b, home_sign=0):
    """Rating difference from team A's perspective.

    home_sign: +1 if A plays at home, -1 if B plays at home, 0 for a neutral venue.
    """
    return np.asarray(rating_a, dtype=float) - np.asarray(rating_b, dtype=float) \
        + HOME_ADVANTAGE * np.asarray(home_sign, dtype=float)


def expected_score(dr):
    """We: expected result (win 1, draw 0.5, loss 0) for the team with rating edge dr."""
    return 1.0 / (10.0 ** (-np.asarray(dr, dtype=float) / 400.0) + 1.0)


def result_score(goals_a, goals_b):
    """W for team A: 1 win, 0.5 draw, 0 loss. Shootouts are draws: pass the score after ET."""
    ga = np.asarray(goals_a)
    gb = np.asarray(goals_b)
    return np.where(ga > gb, 1.0, np.where(ga == gb, 0.5, 0.0))


def goal_multiplier(goals_a, goals_b):
    """G: 1 for a margin of 0 or 1, 1.5 for 2, (11 + N) / 8 for N >= 3."""
    n = np.abs(np.asarray(goals_a, dtype=float) - np.asarray(goals_b, dtype=float))
    return np.where(n <= 1, 1.0, np.where(n == 2, 1.5, (11.0 + n) / 8.0))


def k_factor(match_type: str) -> int:
    """K weight for an eloratings.net match-type code (WC 60, EC/CA 50, WQ 40, F 20, ...)."""
    return K_BY_MATCH_TYPE.get(match_type, K_DEFAULT)


class Update(NamedTuple):
    new_a: np.ndarray | float
    new_b: np.ndarray | float
    delta: np.ndarray | float  # points gained by A (B loses the same)


def update(rating_a, rating_b, goals_a, goals_b, k, home_sign=0) -> Update:
    """Apply one match result to both ratings. Zero-sum; ratings stay unrounded."""
    dr = rating_diff(rating_a, rating_b, home_sign)
    delta = np.asarray(k, dtype=float) * goal_multiplier(goals_a, goals_b) \
        * (result_score(goals_a, goals_b) - expected_score(dr))
    return Update(np.asarray(rating_a, dtype=float) + delta,
                  np.asarray(rating_b, dtype=float) - delta, delta)
