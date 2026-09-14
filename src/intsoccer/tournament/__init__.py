"""Tournament rules: definitions (YAML), group standings, knockout bracket. See docs/ROADMAP.md."""

from .format import (GroupSlot, MatchRef, ThirdSlot, Tournament, build_tournament, format_slot,
                     load_tournament, parse_slot)
from .group import Result, Row, Standings, rank_group, rank_thirds, table
from .knockout import KnockoutMatch, play_knockout, third_assignment

__all__ = ["GroupSlot", "MatchRef", "ThirdSlot", "Tournament", "build_tournament", "format_slot",
           "load_tournament", "parse_slot",
           "Result", "Row", "Standings", "rank_group", "rank_thirds", "table",
           "KnockoutMatch", "play_knockout", "third_assignment"]
