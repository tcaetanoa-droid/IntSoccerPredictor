"""Download TSV files from eloratings.net into data/raw/ (cached)."""

from __future__ import annotations

import time
import unicodedata
from pathlib import Path

import requests

from .schema import BASE_URL, LOOKUP_FILES

RAW_DIR = Path(__file__).resolve().parents[3] / "data" / "raw"
USER_AGENT = "IntSoccerPredictor/0.1 (personal hobby project)"


def team_filename(name: str) -> str:
    """'Bosnia and Herzegovina' -> 'Bosnia_and_Herzegovina.tsv'; 'Curaçao' -> 'Curacao.tsv'."""
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return ascii_name.replace(" ", "_") + ".tsv"


def download(filename: str, raw_dir: Path = RAW_DIR, force: bool = False,
             timeout: float = 30.0) -> Path:
    """Fetch one file into raw_dir unless it is already cached. Returns the local path."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    dest = raw_dir / filename
    if dest.exists() and not force:
        return dest
    resp = requests.get(f"{BASE_URL}/{filename}", timeout=timeout,
                        headers={"User-Agent": USER_AGENT})
    resp.raise_for_status()
    dest.write_bytes(resp.content)  # site serves UTF-8; avoid requests' charset guess
    return dest


def fetch_core(raw_dir: Path = RAW_DIR, force: bool = False) -> dict[str, Path]:
    """World ratings plus the lookup tables."""
    files = {"world": "World.tsv", **LOOKUP_FILES}
    return {key: download(fname, raw_dir, force) for key, fname in files.items()}


def fetch_team_histories(team_names: list[str], raw_dir: Path = RAW_DIR, force: bool = False,
                         pause: float = 0.5) -> dict[str, Path]:
    """Download one history file per team display name. Pauses between requests."""
    out: dict[str, Path] = {}
    for i, name in enumerate(team_names):
        fname = team_filename(name)
        cached = (raw_dir / fname).exists() and not force
        out[name] = download(fname, raw_dir, force)
        if not cached and i < len(team_names) - 1:
            time.sleep(pause)
    return out
