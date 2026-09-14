"""Column layouts for eloratings.net TSV files (no header rows). See docs/DATA_SOURCES.md."""

BASE_URL = "https://eloratings.net"

# Ratings tables (World.tsv, <YYYY>_<Tournament>.tsv). Only the first columns are named;
# the rest vary between the world table (31 cols) and tournament tables (22 cols).
RATINGS_COLUMNS = ["rank", "rank_prev", "code", "rating", "high_rank", "high_rating",
                   "low_rank", "low_rating"]

# Per-team match history (<Team>.tsv), 16 columns.
MATCH_COLUMNS = [
    "year", "month", "day",
    "home", "away",
    "home_goals", "away_goals",
    "match_type",       # F, WC, EC, CA, ... (see en.tournaments.tsv)
    "venue",            # country code; empty = home team's country
    "points",           # rating points exchanged, home perspective
    "home_rating_after", "away_rating_after",
    "home_rank_change", "away_rank_change",
    "home_rank", "away_rank",
]

LOOKUP_FILES = {
    "teams": "en.teams.tsv",
    "tournaments": "en.tournaments.tsv",
}

# Match-type codes -> eloratings.net K factor. Values verified empirically by backing K out of
# real history rows (points / (G * (W - We))), see docs/ELO_FORMULA.md. Unlisted codes -> 30.
K_BY_MATCH_TYPE = {
    "WC": 60,    # World Cup finals
    "EC": 50,    # European Championship finals
    "CA": 50,    # Copa America
    "AC": 50,    # Asian Cup
    "AN": 50,    # Africa Cup of Nations
    "GC": 50,    # Gold Cup
    "CC": 50,    # Confederations Cup
    "ENL": 50,   # European Nations League finals
    "IC": 50,    # Intercontinental Championship (Finalissima)
    "WQ": 40,    # World Cup qualifier
    "EQ": 40,    # European Championship qualifier
    "ENA": 40,   # European Nations League, League A
    "ENB": 40,   # European Nations League, League B
    "F": 20,     # Friendly
}
K_DEFAULT = 30   # NLC, FT, ADI, and other minor tournaments
