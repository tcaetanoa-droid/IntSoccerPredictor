"""Resolve and play a knockout bracket for one simulation.

Slots come from the tournament YAML (docs/WC2026_FORMAT.md sections 3 and 4): `1A` / `2B` are
group positions, `3:ABCDF` a third-placed team whose group is looked up in the third-place table
by the set of groups that supplied a qualifying third, `W74` / `L101` the winner / loser of an
earlier match. `play_knockout` walks the rounds in YAML order and asks a callback for each
match's winner, so the same code replays real results (tests) and simulates (later components).
"""

from __future__ import annotations

from collections.abc import Callable
from typing import NamedTuple

from .format import GroupSlot, MatchRef, ThirdSlot, Tournament, format_slot


class KnockoutMatch(NamedTuple):
    number: int
    round: str
    home: str
    away: str
    winner: str

    @property
    def loser(self) -> str:
        return self.away if self.winner == self.home else self.home


Play = Callable[[int, str, str, str], str]   # (match number, round, home, away) -> winner


def third_assignment(t: Tournament, best_thirds: list[tuple[str, str]]) -> dict[str, str]:
    """{group-winner slot text ('1E'): code of the third-placed team it meets}."""
    if len(best_thirds) != t.best_thirds:
        raise ValueError(f"{len(best_thirds)} best thirds given, tournament advances "
                         f"{t.best_thirds}")
    if not best_thirds:
        return {}
    by_group = dict(best_thirds)
    combo = frozenset(by_group)
    if len(combo) != len(best_thirds):
        raise ValueError("two best thirds from the same group")
    return {slot: by_group[group] for slot, group in t.third_place_table[combo].items()}


def play_knockout(t: Tournament, group_orders: dict[str, list[str]],
                  best_thirds: list[tuple[str, str]], play: Play) -> dict[int, KnockoutMatch]:
    """Fill every knockout match from group orders and earlier results, in round order.

    group_orders: group letter -> final order, best first.
    best_thirds: [(group letter, code), ...] of the third-placed teams that advance (any order).
    play: called once per match with (number, round, home, away); returns the winner's code.
    """
    thirds = third_assignment(t, best_thirds)
    played: dict[int, KnockoutMatch] = {}

    def resolve(slot, partner) -> str:
        if isinstance(slot, GroupSlot):
            return group_orders[slot.group][slot.position - 1]
        if isinstance(slot, ThirdSlot):
            code = thirds[format_slot(partner)]
            return code
        if isinstance(slot, MatchRef):
            m = played[slot.match]
            return m.winner if slot.winner else m.loser
        raise TypeError(slot)

    for round_name, numbers in t.rounds.items():
        for number in numbers:
            home_slot, away_slot = t.matches[number]
            home = resolve(home_slot, away_slot)
            away = resolve(away_slot, home_slot)
            winner = play(number, round_name, home, away)
            if winner not in (home, away):
                raise ValueError(f"match {number}: winner {winner!r} is not {home} or {away}")
            played[number] = KnockoutMatch(number, round_name, home, away, winner)
    return played
