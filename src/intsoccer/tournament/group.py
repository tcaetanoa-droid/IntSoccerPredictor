"""Group standings and the ranking of third-placed teams, for one simulation at a time.

Rules text: docs/WC2026_FORMAT.md sections 1 and 2. Two rulesets:

    head_to_head_first  World Cup 2026, UEFA: points; then among the tied teams points, GD, GF
                        (re-applied to any subset still level); then overall GD, GF.
    overall_first       CONMEBOL: points; overall GD, GF; then head-to-head among the tied teams.

Fair play and FIFA ranking cannot be simulated, so both rulesets end with the pre-tournament Elo
rating (higher first) and finally a seeded draw of lots. `Standings.depth` records the deepest
stage that was needed, so a Monte Carlo run can report how often the fallbacks fired.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from typing import NamedTuple

import numpy as np


class Result(NamedTuple):
    home: str
    away: str
    home_goals: int
    away_goals: int


@dataclass
class Row:
    played: int = 0
    won: int = 0
    drawn: int = 0
    lost: int = 0
    gf: int = 0
    ga: int = 0

    @property
    def points(self) -> int:
        return 3 * self.won + self.drawn

    @property
    def gd(self) -> int:
        return self.gf - self.ga

    def add(self, scored: int, conceded: int) -> None:
        self.played += 1
        self.gf += scored
        self.ga += conceded
        if scored > conceded:
            self.won += 1
        elif scored == conceded:
            self.drawn += 1
        else:
            self.lost += 1


def table(teams: Iterable[str], results: Iterable[Result]) -> dict[str, Row]:
    rows = {t: Row() for t in teams}
    for home, away, hg, ag in results:
        rows[home].add(hg, ag)
        rows[away].add(ag, hg)
    return rows


class Standings(NamedTuple):
    order: list[str]           # best first
    rows: dict[str, Row]
    depth: int                 # deepest tiebreak stage used; see STAGE_NAMES


# A stage maps (team, tied teams) -> sort key, higher is better. `restart` means that when the
# stage separates some of the tied teams, the still-level subsets are re-ranked from stage 0
# (FIFA: head-to-head criteria are re-applied to any subset still level); otherwise the subsets
# continue with the next stage.
Stage = tuple[str, Callable[[str, list[str]], tuple], bool]


def _ruleset(ruleset: str, results: list[Result], rows: dict[str, Row],
             ratings: dict[str, float], rng: np.random.Generator) -> list[Stage]:
    def head_to_head(team, tied):
        sub = table(tied, [r for r in results if r.home in tied and r.away in tied])[team]
        return (sub.points, sub.gd, sub.gf)

    def overall(team, tied):
        return (rows[team].gd, rows[team].gf)

    def elo(team, tied):
        return (ratings[team],)

    lots = {t: x for t, x in zip(rows, rng.random(len(rows)))}

    def draw(team, tied):
        return (lots[team],)

    points: Stage = ("points", lambda t, tied: (rows[t].points,), False)
    h2h: Stage = ("head_to_head", head_to_head, True)
    ovr: Stage = ("overall_gd_gf", overall, False)
    tail = [("elo", elo, False), ("lots", draw, False)]
    if ruleset == "head_to_head_first":
        return [points, h2h, ovr, *tail]
    if ruleset == "overall_first":
        return [points, ovr, h2h, *tail]
    raise ValueError(f"unknown tiebreaker ruleset {ruleset!r}")


STAGE_NAMES = {
    "head_to_head_first": ["points", "head_to_head", "overall_gd_gf", "elo", "lots"],
    "overall_first": ["points", "overall_gd_gf", "head_to_head", "elo", "lots"],
}


def _rank(tied: list[str], stages: list[Stage], start: int) -> tuple[list[str], int]:
    """Order `tied` using stages[start:], returning (order, deepest stage index used)."""
    if len(tied) == 1:
        return tied, start - 1
    for i in range(start, len(stages)):
        _, key, restart = stages[i]
        keys = {t: key(t, tied) for t in tied}
        groups: list[list[str]] = []
        for k in sorted(set(keys.values()), reverse=True):
            groups.append([t for t in tied if keys[t] == k])
        if len(groups) > 1:
            order, depth = [], i
            for g in groups:
                sub_order, sub_depth = _rank(g, stages, 0 if restart else i + 1)
                order += sub_order
                depth = max(depth, sub_depth)
            return order, depth
    raise AssertionError("lots always separate teams")   # pragma: no cover


def rank_group(teams: list[str], results: list[Result], ruleset: str,
               ratings: dict[str, float], rng: np.random.Generator) -> Standings:
    """Final group order under `ruleset` (a key of STAGE_NAMES)."""
    rows = table(teams, results)
    stages = _ruleset(ruleset, results, rows, ratings, rng)
    order, depth = _rank(list(teams), stages, 0)
    return Standings(order, rows, depth)


def rank_thirds(thirds: dict[str, tuple[str, Row]], ratings: dict[str, float],
                rng: np.random.Generator) -> list[tuple[str, str]]:
    """Rank third-placed teams across groups: points, overall GD, GF, then Elo, then lots.

    `thirds` maps group letter -> (team code, its group Row). Returns [(group, code), ...] best
    first; the caller takes the first `best_thirds`.
    """
    lots = rng.random(len(thirds))
    keyed = sorted(((row.points, row.gd, row.gf, ratings[code], lot), group, code)
                   for lot, (group, (code, row)) in zip(lots, thirds.items()))
    return [(group, code) for _, group, code in reversed(keyed)]
