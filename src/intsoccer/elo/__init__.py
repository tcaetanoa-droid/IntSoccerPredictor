"""Elo core: pure functions implementing the eloratings.net formula.

    Rn = Ro + K * G * (W - We),   We = 1 / (10 ** (-dr / 400) + 1)

All functions accept scalars or numpy arrays and never do I/O. See docs/ELO_FORMULA.md.
"""

from .core import (
    HOME_ADVANTAGE,
    expected_score,
    goal_multiplier,
    k_factor,
    rating_diff,
    result_score,
    update,
)

__all__ = [
    "HOME_ADVANTAGE", "expected_score", "goal_multiplier", "k_factor",
    "rating_diff", "result_score", "update",
]
