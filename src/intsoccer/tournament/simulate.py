"""One complete tournament simulation: group stage, standings, knockout bracket.

Elo ratings are updated after every simulated match and carried into the next one, so a team
that over-performs in the groups enters the knockouts with a higher rating. Group standings and
the third-place ranking use the *pre-tournament* ratings for their Elo fallback, as documented
in docs/WC2026_FORMAT.md. Home advantage: a host gets +100 in every group match (hosts play those
at home) and in a knockout match whose `venues` entry is its own country.
"""

from __future__ import annotations

from itertools import combinations
from typing import NamedTuple

import numpy as np

from ..model import GoalsModel, simulate_match
from .format import Tournament
from .group import Result, Standings, rank_group, rank_thirds
from .knockout import KnockoutMatch, play_knockout

# FIFA match-day pattern for a group of four (indices into the group's team list)
GROUP_OF_FOUR = [(0, 1), (2, 3), (0, 2), (3, 1), (3, 0), (1, 2)]


def schedule(n: int) -> list[tuple[int, int]]:
    return GROUP_OF_FOUR if n == 4 else list(combinations(range(n), 2))


def group_venue(t: Tournament, home: str, away: str) -> str | None:
    """Country of a group match: a host's own country, None (neutral) otherwise."""
    if home in t.hosts and away in t.hosts:
        return None
    return t.hosts.get(home) or t.hosts.get(away)


def home_sign(t: Tournament, home: str, away: str, venue: str | None) -> int:
    """+1 if `home` plays in its own country, -1 if `away` does, else 0."""
    if venue is None:
        return 0
    return int(t.hosts.get(home) == venue) - int(t.hosts.get(away) == venue)


class KnockoutScore(NamedTuple):
    home_goals: int      # after extra time
    away_goals: int
    decided_by: int      # model.match REGULAR / EXTRA_TIME / PENALTIES


class SimulatedTournament(NamedTuple):
    group_results: dict[str, list[Result]]
    standings: dict[str, Standings]
    third_ranking: list[tuple[str, str]]     # every third-placed (group, code), best first
    knockout: dict[int, KnockoutMatch]
    knockout_scores: dict[int, KnockoutScore]
    champion: str
    ratings: dict[str, float]                # after the final


def simulate_tournament(t: Tournament, ratings: dict[str, float], model: GoalsModel,
                        rng: np.random.Generator, shootout_p_home: float = 0.5
                        ) -> SimulatedTournament:
    live = {code: float(ratings[code]) for code in t.teams}

    def play(home: str, away: str, venue: str | None, knockout: bool):
        res = simulate_match(live[home], live[away], t.k, model, rng,
                             home_sign(t, home, away, venue), knockout=knockout,
                             shootout_p_a=shootout_p_home)
        live[home], live[away] = float(res.new_rating_a[0]), float(res.new_rating_b[0])
        return res

    group_results: dict[str, list[Result]] = {}
    standings: dict[str, Standings] = {}
    orders: dict[str, list[str]] = {}
    thirds = {}
    for letter, teams in t.groups.items():
        results = []
        for i, j in schedule(len(teams)):
            home, away = teams[i], teams[j]
            res = play(home, away, group_venue(t, home, away), knockout=False)
            results.append(Result(home, away, int(res.goals_a[0]), int(res.goals_b[0])))
        st = rank_group(list(teams), results, t.tiebreakers, ratings, rng)
        group_results[letter] = results
        standings[letter] = st
        orders[letter] = st.order
        if t.best_thirds:
            thirds[letter] = (st.order[2], st.rows[st.order[2]])

    third_ranking = rank_thirds(thirds, ratings, rng) if t.best_thirds else []
    scores: dict[int, KnockoutScore] = {}

    def knockout_play(number: int, round_name: str, home: str, away: str) -> str:
        res = play(home, away, t.venues.get(number), knockout=True)
        scores[number] = KnockoutScore(int(res.goals_a[0]), int(res.goals_b[0]),
                                       int(res.decided_by[0]))
        return home if res.a_wins[0] else away

    knockout = play_knockout(t, orders, third_ranking[:t.best_thirds], knockout_play)
    final = t.rounds[list(t.rounds)[-1]][-1]
    return SimulatedTournament(group_results, standings, third_ranking, knockout, scores,
                               knockout[final].winner, live)
