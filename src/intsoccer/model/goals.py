"""Expected goals from the Elo gap, and outcome probabilities from two Poisson rates.

    lambda_team = exp(a + b * dr_team + c * is_friendly)

dr_team is the rating difference from that team's perspective, including the +100 home term,
so the two teams' rates are mirror images: lambda_A uses +dr, lambda_B uses -dr. The friendly
offset c is estimated so friendlies can inform a and b without biasing tournament predictions;
the simulator always uses is_friendly = False.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import yaml
from scipy.stats import poisson

from ..elo import rating_diff

PARAMS_PATH = Path(__file__).resolve().parents[3] / "data" / "model_params.yaml"


@dataclass(frozen=True)
class GoalsModel:
    a: float          # log expected goals for two equal teams at a neutral venue
    b: float          # log-rate change per Elo point of advantage
    c_friendly: float = 0.0
    max_goals: int = 15

    def rate(self, dr, friendly=False) -> np.ndarray:
        """Expected goals for a team with rating edge dr (array-friendly)."""
        return np.exp(self.a + self.b * np.asarray(dr, dtype=float)
                      + self.c_friendly * np.asarray(friendly, dtype=float))

    def expected_goals(self, rating_a, rating_b, home_sign=0, friendly=False):
        """(lambda_a, lambda_b) for a match between A and B."""
        dr = rating_diff(rating_a, rating_b, home_sign)
        return self.rate(dr, friendly), self.rate(-dr, friendly)

    def save(self, path: Path = PARAMS_PATH, meta: dict | None = None) -> Path:
        payload = {"goals_model": asdict(self), **(meta or {})}
        path.write_text(yaml.safe_dump(payload, sort_keys=False))
        return path

    @classmethod
    def load(cls, path: Path = PARAMS_PATH) -> "GoalsModel":
        return cls(**yaml.safe_load(path.read_text())["goals_model"])


def outcome_probs(lam_a, lam_b, max_goals: int = 15) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """P(A wins), P(draw), P(B wins) assuming independent Poisson goal counts.

    Works on scalars or 1-D arrays of rates. Goals are truncated at max_goals (mass beyond it
    is negligible for any realistic rate).
    """
    lam_a = np.atleast_1d(np.asarray(lam_a, dtype=float))
    lam_b = np.atleast_1d(np.asarray(lam_b, dtype=float))
    k = np.arange(max_goals + 1)
    pa = poisson.pmf(k[None, :], lam_a[:, None])   # (n, K)
    pb = poisson.pmf(k[None, :], lam_b[:, None])
    joint = pa[:, :, None] * pb[:, None, :]         # (n, K, K): P(A=i, B=j)
    i, j = np.meshgrid(k, k, indexing="ij")
    p_win = (joint * (i > j)).sum(axis=(1, 2))
    p_draw = (joint * (i == j)).sum(axis=(1, 2))
    p_loss = (joint * (i < j)).sum(axis=(1, 2))
    return p_win, p_draw, p_loss
