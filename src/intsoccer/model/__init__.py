"""Goals model: Elo difference -> expected goals -> Poisson scorelines. See docs/ELO_FORMULA.md."""

from .goals import GoalsModel, outcome_probs
from .match import EXTRA_TIME, PENALTIES, REGULAR, MatchResult, simulate_match

__all__ = ["GoalsModel", "outcome_probs", "MatchResult", "simulate_match",
           "REGULAR", "EXTRA_TIME", "PENALTIES"]
