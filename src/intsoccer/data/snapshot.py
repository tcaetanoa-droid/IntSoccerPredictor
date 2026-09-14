"""Rating reconstruction: what was each team's Elo on a given date?

A team's rating on date D is its rating after its last match strictly before D (the site
publishes ratings after every match, so no interpolation is needed). Snapshots are saved as
CSV under data/snapshots/ and committed, so simulations start from a fixed, known state.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from . import fetch, parse

SNAPSHOT_DIR = Path(__file__).resolve().parents[3] / "data" / "snapshots"


def load_history(code: str, names: dict[str, str], raw_dir: Path = fetch.RAW_DIR) -> pd.DataFrame:
    """Match history for a team code (downloads if missing)."""
    path = fetch.download(fetch.team_filename(names[code]), raw_dir)
    return parse.load_matches(path)


def rating_on(history: pd.DataFrame, code: str, date: str | pd.Timestamp) -> tuple[float, pd.Timestamp]:
    """(rating, date of last match) for `code` as of `date` (exclusive)."""
    date = pd.Timestamp(date)
    before = history[history["date"] < date]
    if before.empty:
        raise ValueError(f"{code}: no matches before {date.date()}")
    last = before.iloc[-1]
    rating = last["home_rating_after"] if last["home"] == code else last["away_rating_after"]
    return float(rating), last["date"]


def build_snapshot(codes: list[str], date: str, names: dict[str, str],
                   raw_dir: Path = fetch.RAW_DIR) -> pd.DataFrame:
    """Ratings for all `codes` as of `date`, sorted by rating descending."""
    rows = []
    for code in codes:
        hist = load_history(code, names, raw_dir)
        rating, last = rating_on(hist, code, date)
        rows.append({"code": code, "name": names[code], "rating": rating,
                     "last_match": last.date()})
    df = pd.DataFrame(rows).sort_values("rating", ascending=False).reset_index(drop=True)
    df.insert(0, "rank", range(1, len(df) + 1))
    return df


def save_snapshot(df: pd.DataFrame, date: str, label: str,
                  snapshot_dir: Path = SNAPSHOT_DIR) -> Path:
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    path = snapshot_dir / f"{date}_{label}.csv"
    df.to_csv(path, index=False)
    return path


def load_snapshot(path: Path) -> dict[str, float]:
    """{code: rating} from a saved snapshot CSV."""
    df = pd.read_csv(path)
    return dict(zip(df["code"], df["rating"].astype(float)))


def matches_between(codes: list[str], start: str, end: str, names: dict[str, str],
                    raw_dir: Path = fetch.RAW_DIR) -> pd.DataFrame:
    """All matches among `codes` with start <= date <= end, deduplicated across team files."""
    frames = []
    for code in codes:
        hist = load_history(code, names, raw_dir)
        m = hist[(hist["date"] >= pd.Timestamp(start)) & (hist["date"] <= pd.Timestamp(end))]
        frames.append(m)
    df = pd.concat(frames).drop_duplicates(subset=["date", "home", "away"])
    df = df[df["home"].isin(codes) & df["away"].isin(codes)]
    return df.sort_values(["date", "home"]).reset_index(drop=True)


def infer_groups(matches: pd.DataFrame, codes: list[str], group_size: int = 4) -> list[set[str]]:
    """Partition teams into groups from who played whom (connected components)."""
    parent = {c: c for c in codes}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for h, a in zip(matches["home"], matches["away"]):
        parent[find(h)] = find(a)
    groups: dict[str, set[str]] = {}
    for c in codes:
        groups.setdefault(find(c), set()).add(c)
    out = list(groups.values())
    bad = [g for g in out if len(g) != group_size]
    if bad:
        raise ValueError(f"groups of unexpected size: {bad}")
    return out
