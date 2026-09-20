"""Everything the website needs beyond the ten views: team index, flags, generated text,
calibration export and the copy into site/data/. Pure functions over report outputs."""
from __future__ import annotations

from . import tables

# eloratings.net code -> ISO 3166 / flagcdn code. Traps: SQ Scotland, IE Ireland, IR Iran.
ISO = {
    "AF": "af", "AL": "al", "DZ": "dz", "AR": "ar", "AT": "at", "AU": "au", "BA": "ba",
    "BE": "be", "BR": "br", "CA": "ca", "CV": "cv", "CD": "cd", "CO": "co", "HR": "hr",
    "CW": "cw", "CZ": "cz", "EC": "ec", "EG": "eg", "EN": "gb-eng", "FR": "fr", "DE": "de",
    "GH": "gh", "HT": "ht", "IR": "ir", "IQ": "iq", "IE": "ie", "IT": "it", "CI": "ci",
    "JP": "jp", "JO": "jo", "MX": "mx", "MA": "ma", "NL": "nl", "NZ": "nz", "NO": "no",
    "PA": "pa", "PY": "py", "PT": "pt", "QA": "qa", "SA": "sa", "SQ": "gb-sct", "SN": "sn",
    "ZA": "za", "KR": "kr", "ES": "es", "SE": "se", "CH": "ch", "TN": "tn", "TR": "tr",
    "US": "us", "UY": "uy", "UZ": "uz", "WA": "gb-wls",
}

NAME_OVERRIDES = {"US": "USA", "BA": "Bosnia & Herz."}


def display_name(code: str, names: dict[str, str]) -> str:
    return NAME_OVERRIDES.get(code, names.get(code, code))


def teams_index(ctx: tables.Context, names: dict[str, str]) -> list[dict]:
    """One row per team for the picker and every flag/name lookup, sorted by title chance."""
    champ = tables.fate_pcts(ctx)["champion"]
    missing = [c for c in ctx.t.teams if c not in ISO]
    if missing:
        raise ValueError(f"no ISO flag code for {missing}; add them to report.site.ISO")
    rows = [{"code": c, "iso": ISO[c], "name": display_name(c, names), "group": ctx.t.group_of(c),
             "elo": float(ctx.ratings[c]), "champion_pct": float(champ[c])} for c in ctx.t.teams]
    return sorted(rows, key=lambda r: -r["champion_pct"])
