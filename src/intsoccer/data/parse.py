"""Parse eloratings.net TSVs into pandas DataFrames."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .schema import MATCH_COLUMNS, RATINGS_COLUMNS

MINUS = "−"  # eloratings.net uses the Unicode minus sign


def _read_tsv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, sep="\t", header=None, dtype=str, keep_default_na=False,
                     encoding="utf-8")
    return df.apply(lambda col: col.str.replace(MINUS, "-", regex=False))


def load_ratings(path: Path) -> pd.DataFrame:
    """Ratings table -> columns: rank, code, rating (+ extra numeric cols)."""
    df = _read_tsv(path)
    names = RATINGS_COLUMNS + [f"c{i}" for i in range(len(RATINGS_COLUMNS), df.shape[1])]
    df.columns = names[: df.shape[1]]
    df["rank"] = df["rank"].astype(int)
    df["rating"] = df["rating"].astype(int)
    return df[["rank", "code", "rating"]].copy()


def load_matches(path: Path) -> pd.DataFrame:
    """Team match history -> typed DataFrame with a 'date' column and pre-match ratings."""
    df = _read_tsv(path)
    if df.shape[1] != len(MATCH_COLUMNS):
        raise ValueError(f"{path.name}: expected {len(MATCH_COLUMNS)} columns, got {df.shape[1]}")
    df.columns = MATCH_COLUMNS
    for col in ["year", "month", "day", "home_goals", "away_goals", "points",
                "home_rating_after", "away_rating_after"]:
        df[col] = df[col].astype(int)
    for col in ["home_rank_change", "away_rank_change", "home_rank", "away_rank"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
    # Very old matches may have an unknown month/day stored as 0; clamp to the 1st.
    df["month"] = df["month"].clip(lower=1)
    df["day"] = df["day"].clip(lower=1)
    df["date"] = pd.to_datetime(df[["year", "month", "day"]])
    df["neutral"] = df["venue"] != ""
    df["home_rating_before"] = df["home_rating_after"] - df["points"]
    df["away_rating_before"] = df["away_rating_after"] + df["points"]
    return df


def _load_lookup(path: Path) -> dict[str, str]:
    """Ragged 'code<TAB>name[<TAB>alias...]' file -> {code: first name}."""
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) >= 2 and parts[0]:
            out[parts[0]] = parts[1]
    return out


def load_team_names(path: Path) -> dict[str, str]:
    """en.teams.tsv -> {code: display name}."""
    return _load_lookup(path)


def load_tournament_names(path: Path) -> dict[str, str]:
    """en.tournaments.tsv -> {code: name}."""
    return _load_lookup(path)
