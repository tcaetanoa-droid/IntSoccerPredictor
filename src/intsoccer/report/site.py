"""Everything the website needs beyond the ten views: team index, flags, generated text,
calibration export and the copy into site/data/. Pure functions over report outputs."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

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


FATE_LABEL = {
    "gs4": "fourth in its group", "gs3_out": "third in its group and out",
    "r32": "the round of 32", "r16": "the round of 16", "qf": "the quarter-finals",
    "fourth": "fourth place", "third": "third place", "runner_up": "the final, lost",
    "champion": "the trophy",
}
ROUND_LABEL = {"R32": "round of 32", "R16": "round of 16", "QF": "quarter-finals",
               "SF": "semi-finals"}


def _pct(v: float, dec: int = 1) -> str:
    return f"{v * 100:.{dec}f}%"


def excerpt_text(page: dict, names: dict[str, str]) -> str:
    """'The one thing to know': a rules-based paragraph from a team page dict (spec §4.2)."""
    team = display_name(page["team"], names)
    fates = page["fates"]
    top = max(fates, key=fates.get)
    share = fates[top]
    escape = 1 - fates["gs4"] - fates["gs3_out"]
    conq = page["knocked_out_by"][0] if page["knocked_out_by"] else None
    conq_name = display_name(conq["team"], names) if conq else None

    if top in ("gs4", "gs3_out"):
        s = (f"{team}'s most common ending is {FATE_LABEL[top]}, {_pct(share)} of its runs. "
             f"It got out of the group in {_pct(escape)} of them")
        if conq:
            s += (f", and when it did, {conq_name} was the team that ended its tournament "
                  f"most often ({_pct(conq['pct'])} of eliminations).")
        else:
            s += "."
        return s

    if top == "champion":
        s = f"{team}'s most common ending is the trophy: it won {_pct(share)} of its runs."
        if conq:
            s += (f" When it fell, {conq_name} was the team that beat it most often "
                  f"({_pct(conq['pct'])} of eliminations).")
        return s

    s = f"{team}'s single biggest risk is {FATE_LABEL[top]}, where {_pct(share)} of its runs end."
    if not conq:
        return s
    s += (f" {conq_name} is the team that ends its tournament most often, "
          f"{_pct(conq['pct'])} of eliminations.")
    ex = page.get("first_round_excerpt")
    if ex and ex["opponent"] == conq["team"]:
        key = next(k for k in ex if k.startswith("meet_in_"))
        rnd = ROUND_LABEL[key[len("meet_in_"):-len("_pct")].upper()]
        s += (f" The two meet in the {rnd} in {_pct(ex[key])} of all runs, "
              f"and {team} wins {_pct(ex['win_pct_when_met'], 0)} of those meetings.")
    return s


def team_pages(ctx: tables.Context, names: dict[str, str]) -> dict[str, dict]:
    """team_<CODE> -> page dict for every team, with name and excerpt_text added."""
    out = {}
    for code in ctx.t.teams:
        page = tables.team_page(ctx, code)
        page["name"] = display_name(code, names)
        page["excerpt_text"] = excerpt_text(page, names)
        out[f"team_{code}"] = page
    return out


LOCAL_PATH_META = ("tournament_yaml", "ratings_snapshot")


def _publish_report(src: Path, target: Path) -> None:
    """report.json's meta holds absolute paths on the machine that ran the simulation; the
    published copy keeps only the file names. Same serialisation as report.build."""
    bundle = json.loads(src.read_text())
    meta = bundle.get("meta", {})
    for key in LOCAL_PATH_META:
        if key in meta:
            meta[key] = Path(meta[key]).name
    target.write_text(json.dumps(bundle, indent=1))


def copy_site_data(report_dir: Path, site_dir: Path, name: str,
                   calibration: Path = Path("data") / "calibration.json") -> list[Path]:
    """Copy the files the website fetches into <site_dir>/data/<name>/. Returns written paths."""
    dest = Path(site_dir) / "data" / name
    dest.mkdir(parents=True, exist_ok=True)
    sources = [Path(report_dir) / "report.json", Path(report_dir) / "teams.json",
               *sorted(Path(report_dir).glob("team_*.json"))]
    if Path(calibration).exists():
        sources.append(Path(calibration))
    written = []
    for src in sources:
        target = dest / src.name
        if src.name == "report.json":
            _publish_report(src, target)
        else:
            shutil.copyfile(src, target)
        written.append(target)
    return written
