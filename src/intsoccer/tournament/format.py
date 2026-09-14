"""Tournament definitions: load and validate one `data/tournaments/<name>.yaml`.

YAML fields (see `wc2026.yaml` for a complete, annotated example):

    name, match_type (-> Elo K), tiebreakers (head_to_head_first | overall_first),
    start_date, ratings_snapshot (optional paths, relative to the project root),
    hosts: {team code: venue country code}        # +100 when they play there
    groups: {letter: [team codes]}                # quote codes in YAML ('NO' is Norway)
    advance: {top_n, best_thirds}
    knockout:
      extra_time_and_penalties: bool
      third_place_table: CSV path (required when best_thirds > 0)
      matches: {number: [slot, slot]}
      rounds: {round name: [match numbers]}      # in playing order

Slot notation, as printed in the FIFA / UEFA regulations:

    1A, 2B        group position 1 / 2 of group A / B
    3:ABCDF       a third-placed team, from one of the listed groups; which one is looked up
                  in the third-place table by the set of groups whose thirds advanced
    W74, L101     winner / loser of knockout match 74 / 101

The third-place table CSV has columns `combo, groups, <slot>, <slot>, ...` where each slot column
is the group-winner slot (1A, 1B, ...) that meets a third, and each cell is the group letter of the
third that goes there. `groups` is the set of groups whose thirds advanced, as letters.
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path
from typing import NamedTuple

import yaml

from ..elo import k_factor

PROJECT_ROOT = Path(__file__).resolve().parents[3]
TOURNAMENT_DIR = PROJECT_ROOT / "data" / "tournaments"

TIEBREAKER_RULESETS = {
    "head_to_head_first",   # World Cup 2026, UEFA: points, head-to-head, overall GD, GF
    "overall_first",        # CONMEBOL: points, overall GD, GF, head-to-head
}


class GroupSlot(NamedTuple):
    position: int
    group: str


class ThirdSlot(NamedTuple):
    groups: frozenset[str]   # groups this slot may take a third-placed team from


class MatchRef(NamedTuple):
    winner: bool             # False = loser of that match
    match: int


Slot = GroupSlot | ThirdSlot | MatchRef

_GROUP_SLOT = re.compile(r"^([1-9])([A-Z])$")
_THIRD_SLOT = re.compile(r"^3:([A-Z]+)$")
_MATCH_REF = re.compile(r"^([WL])(\d+)$")


def parse_slot(text: str) -> Slot:
    text = str(text).strip()
    if m := _GROUP_SLOT.match(text):
        return GroupSlot(int(m.group(1)), m.group(2))
    if m := _THIRD_SLOT.match(text):
        return ThirdSlot(frozenset(m.group(1)))
    if m := _MATCH_REF.match(text):
        return MatchRef(m.group(1) == "W", int(m.group(2)))
    raise ValueError(f"bad slot {text!r}: expected 1A, 3:ABCD, W74 or L101")


def format_slot(slot: Slot) -> str:
    if isinstance(slot, GroupSlot):
        return f"{slot.position}{slot.group}"
    if isinstance(slot, ThirdSlot):
        return "3:" + "".join(sorted(slot.groups))
    return f"{'W' if slot.winner else 'L'}{slot.match}"


@dataclass(frozen=True)
class Tournament:
    name: str
    match_type: str
    k: int
    tiebreakers: str
    hosts: dict[str, str]                       # team code -> venue country code
    groups: dict[str, tuple[str, ...]]          # letter -> team codes
    top_n: int
    best_thirds: int
    matches: dict[int, tuple[Slot, Slot]]       # knockout match number -> (home slot, away slot)
    rounds: dict[str, tuple[int, ...]]          # round name -> match numbers, in playing order
    third_place_table: dict[frozenset[str], dict[str, str]]   # advancing groups -> {1A: 'E', ...}
    extra_time_and_penalties: bool
    start_date: str | None
    ratings_snapshot: Path | None
    path: Path | None

    @property
    def teams(self) -> list[str]:
        return [code for codes in self.groups.values() for code in codes]

    def group_of(self, code: str) -> str:
        for letter, codes in self.groups.items():
            if code in codes:
                return letter
        raise KeyError(code)

    def round_of(self, match: int) -> str:
        for name, numbers in self.rounds.items():
            if match in numbers:
                return name
        raise KeyError(match)

    def third_slots(self) -> dict[str, ThirdSlot]:
        """{group-winner slot text (e.g. '1E'): the ThirdSlot it meets}."""
        return _third_slots(self.matches)


def _third_slots(matches: dict[int, tuple[Slot, Slot]]) -> dict[str, ThirdSlot]:
    out = {}
    for number, (home, away) in matches.items():
        for a, b in ((home, away), (away, home)):
            if isinstance(b, ThirdSlot):
                if not isinstance(a, GroupSlot):
                    raise ValueError(f"match {number}: a third-placed slot must face a group slot")
                out[format_slot(a)] = b
    return out


def load_tournament(path: str | Path) -> Tournament:
    path = Path(path)
    if not path.suffix:
        path = TOURNAMENT_DIR / f"{path.name}.yaml"
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return build_tournament(raw, path)


def _resolve(value, base: Path) -> Path | None:
    if value is None:
        return None
    p = Path(value)
    return p if p.is_absolute() else base / p


def build_tournament(raw: dict, path: Path | None = None, base: Path = PROJECT_ROOT) -> Tournament:
    """Turn the parsed YAML into a validated Tournament. Raises ValueError on any inconsistency."""
    for key in ("name", "match_type", "tiebreakers", "groups", "advance", "knockout"):
        if key not in raw:
            raise ValueError(f"missing top-level field {key!r}")
    if raw["tiebreakers"] not in TIEBREAKER_RULESETS:
        raise ValueError(f"unknown tiebreakers {raw['tiebreakers']!r}, "
                         f"expected one of {sorted(TIEBREAKER_RULESETS)}")

    groups = {str(letter): tuple(str(c) for c in codes) for letter, codes in raw["groups"].items()}
    top_n = int(raw["advance"]["top_n"])
    best_thirds = int(raw["advance"].get("best_thirds", 0))
    ko = raw["knockout"]
    matches = {int(n): (parse_slot(pair[0]), parse_slot(pair[1]))
               for n, pair in ko["matches"].items()}
    rounds = {str(name): tuple(int(n) for n in numbers) for name, numbers in ko["rounds"].items()}
    table_path = _resolve(ko.get("third_place_table"), base)

    _check_bracket(groups, top_n, best_thirds, matches, rounds)
    table = _load_third_place_table(table_path, groups, best_thirds, matches) if best_thirds else {}
    _check_teams(groups, dict(raw.get("hosts") or {}))

    t = Tournament(
        name=str(raw["name"]),
        match_type=str(raw["match_type"]),
        k=k_factor(str(raw["match_type"])),
        tiebreakers=str(raw["tiebreakers"]),
        hosts={str(k): str(v) for k, v in (raw.get("hosts") or {}).items()},
        groups=groups,
        top_n=top_n,
        best_thirds=best_thirds,
        matches=matches,
        rounds=rounds,
        third_place_table=table,
        extra_time_and_penalties=bool(ko.get("extra_time_and_penalties", True)),
        start_date=None if raw.get("start_date") is None else str(raw["start_date"]),
        ratings_snapshot=_resolve(raw.get("ratings_snapshot"), base),
        path=path,
    )
    return t


def _check_teams(groups: dict[str, tuple[str, ...]], hosts: dict) -> None:
    sizes = {len(codes) for codes in groups.values()}
    if len(sizes) != 1:
        raise ValueError(f"groups are not all the same size: {sorted(sizes)}")
    seen: dict[str, str] = {}
    for letter, codes in groups.items():
        for code in codes:
            if code in seen:
                raise ValueError(f"team {code!r} appears in groups {seen[code]} and {letter}")
            seen[code] = letter
    for code in hosts:
        if str(code) not in seen:
            raise ValueError(f"host {code!r} is not in any group")


def _check_bracket(groups, top_n, best_thirds, matches, rounds) -> None:
    group_size = min(len(c) for c in groups.values())
    if not 1 <= top_n <= group_size:
        raise ValueError(f"advance.top_n={top_n} but groups have {group_size} teams")
    if not 0 <= best_thirds <= len(groups):
        raise ValueError(f"advance.best_thirds={best_thirds} but there are {len(groups)} groups")
    if best_thirds and top_n != 2:
        raise ValueError("best_thirds requires top_n = 2")

    # every knockout match in exactly one round
    placed = [n for numbers in rounds.values() for n in numbers]
    if sorted(placed) != sorted(matches):
        raise ValueError(f"rounds list matches {sorted(placed)} but knockout.matches has "
                         f"{sorted(matches)}")
    if len(placed) != len(set(placed)):
        raise ValueError("a match number appears in more than one round")
    round_index = {n: i for i, (_, numbers) in enumerate(rounds.items()) for n in numbers}

    group_slots: list[GroupSlot] = []
    third_slots: list[ThirdSlot] = []
    refs: list[MatchRef] = []
    for number, pair in matches.items():
        for slot in pair:
            if isinstance(slot, GroupSlot):
                if slot.group not in groups:
                    raise ValueError(f"match {number}: no group {slot.group!r}")
                if slot.position > top_n:
                    raise ValueError(f"match {number}: slot {format_slot(slot)} but only the top "
                                     f"{top_n} advance directly")
                group_slots.append(slot)
            elif isinstance(slot, ThirdSlot):
                if unknown := slot.groups - set(groups):
                    raise ValueError(f"match {number}: third slot names unknown groups "
                                     f"{sorted(unknown)}")
                third_slots.append(slot)
            else:
                if slot.match not in matches:
                    raise ValueError(f"match {number} refers to unknown match {slot.match}")
                if round_index[slot.match] >= round_index[number]:
                    raise ValueError(f"match {number} refers to match {slot.match}, which is "
                                     f"not in an earlier round")
                refs.append(slot)

    expected = {GroupSlot(p, g) for g in groups for p in range(1, top_n + 1)}
    if sorted(group_slots) != sorted(expected):
        raise ValueError("bracket must use every group position 1..top_n exactly once; got "
                         f"{sorted(format_slot(s) for s in group_slots)}")
    if len(third_slots) != best_thirds:
        raise ValueError(f"bracket has {len(third_slots)} third-placed slots but "
                         f"advance.best_thirds={best_thirds}")
    if len(refs) != len(set(refs)):
        raise ValueError("a match winner or loser is used more than once in the bracket")


def _load_third_place_table(path: Path | None, groups, best_thirds, matches) -> dict:
    if path is None:
        raise ValueError("advance.best_thirds > 0 needs knockout.third_place_table")
    third_by_winner = _third_slots(matches)   # {'1E': ThirdSlot, ...}

    with open(path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        raise ValueError(f"{path}: empty third-place table")
    columns = [c for c in rows[0] if c not in ("combo", "groups")]
    if set(columns) != set(third_by_winner):
        raise ValueError(f"{path}: columns {sorted(columns)} do not match the bracket's "
                         f"third-placed slots {sorted(third_by_winner)}")

    table: dict[frozenset[str], dict[str, str]] = {}
    for row in rows:
        combo = frozenset(row["groups"].strip())
        if len(combo) != best_thirds or not combo <= set(groups):
            raise ValueError(f"{path}: bad groups {row['groups']!r} in row {row.get('combo')}")
        if combo in table:
            raise ValueError(f"{path}: duplicate row for groups {row['groups']}")
        assignment = {col: row[col].strip() for col in columns}
        if sorted(assignment.values()) != sorted(combo):
            raise ValueError(f"{path}: row {row['groups']} must use each of its groups "
                             f"exactly once")
        for winner_slot, third_group in assignment.items():
            if third_group not in third_by_winner[winner_slot].groups:
                raise ValueError(f"{path}: row {row['groups']} sends 3{third_group} to "
                                 f"{winner_slot}, which only accepts "
                                 f"{format_slot(third_by_winner[winner_slot])}")
        table[combo] = assignment

    expected = {frozenset(c) for c in combinations(sorted(groups), best_thirds)}
    if missing := expected - set(table):
        raise ValueError(f"{path}: {len(missing)} group combinations missing, e.g. "
                         f"{''.join(sorted(next(iter(missing))))}")
    return table
