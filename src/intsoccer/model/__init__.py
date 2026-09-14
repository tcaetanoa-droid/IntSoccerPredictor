"""Goals model: Elo difference -> expected goals -> Poisson scorelines. See docs/ELO_FORMULA.md."""

from .goals import GoalsModel, outcome_probs

__all__ = ["GoalsModel", "outcome_probs"]
