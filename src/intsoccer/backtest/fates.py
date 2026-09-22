# src/intsoccer/backtest/fates.py
"""The tournament measures (spec section 6): every team's real fate, the runs' fate ladders
scored with the ranked probability score against a structural shrug, the three hits, and the
calibration of the reach-the-round probabilities."""

from __future__ import annotations

import numpy as np
import pandas as pd

from ..report.tables import Context, fate_order, fate_pcts
from . import scores

# reach-the-round name -> the lowest fate that counts as having reached it
THRESHOLDS = {"r32": "r32", "r16": "r16", "qf": "qf", "sf": "fourth", "f": "runner_up",
              "w": "champion"}
BIN_EDGES = (0.1, 0.25, 0.5, 0.75)
BIN_LABELS = ("[0,0.1)", "[0.1,0.25)", "[0.25,0.5)", "[0.5,0.75)", "[0.75,1]")


def _loser(m: dict) -> str:
    return m["away"] if m["winner"] == m["home"] else m["home"]


def real_fates(ctx: Context, real: dict) -> dict[str, str]:
    """One fate per team from the replayed real path: the final's winner and loser, the
    third-place match's, the losers of each earlier round, and the group exits by position."""
    rounds = ctx.rounds
    by_round: dict[str, list[dict]] = {}
    for m in real["matches"]:
        by_round.setdefault(m["round"], []).append(m)
    fates: dict[str, str] = {}
    final = by_round[rounds[-1]][0]
    fates[final["winner"]], fates[_loser(final)] = "champion", "runner_up"
    if "3P" in rounds:
        tp = by_round["3P"][0]
        fates[tp["winner"]], fates[_loser(tp)] = "third", "fourth"
    knock = [f for f in fate_order(rounds) if f.upper() in rounds]
    for rnd in rounds:
        if rnd.lower() in knock:
            for m in by_round[rnd]:
                fates[_loser(m)] = rnd.lower()
    for order in real["orders"].values():
        for pos, team in enumerate(order, start=1):
            if team not in fates:
                fates[team] = "gs4" if pos == 4 else "gs3_out"
    teams = set(ctx.t.teams)
    if set(fates) != teams or len(fates) != len(teams):
        raise ValueError(f"{len(fates)} fates for {len(teams)} teams")
    return fates


def structural_shrug(fates: dict[str, str], order: list[str]) -> np.ndarray:
    """The tournament's own slot counts as a ladder: 12 gs4, 4 gs3_out, 16 r32 ... 1 champion."""
    counts = pd.Series(list(fates.values())).value_counts()
    return np.array([counts.get(f, 0) for f in order], dtype=float) / len(fates)


def team_table(ctx: Context, fates: dict[str, str], names: dict[str, str]) -> pd.DataFrame:
    """One row per team: its ladder, its real fate, its RPS and the shrug's, and the six
    reach-the-round probabilities with their 0/1 outcomes."""
    order = fate_order(ctx.rounds)
    ladders = fate_pcts(ctx)
    shrug = structural_shrug(fates, order)
    rows = []
    for team in ctx.t.teams:
        ladder = ladders.loc[team, order].to_numpy(dtype=float)
        k = order.index(fates[team])
        row = {"team": team, "name": names.get(team, team), "group": ctx.t.group_of(team),
               "elo_snapshot": float(ctx.ratings[team]), "real_fate": fates[team],
               **{f: float(v) for f, v in zip(order, ladder)},
               "rps": scores.rps(ladder, k), "rps_shrug": scores.rps(shrug, k)}
        for name, fate in THRESHOLDS.items():
            j = order.index(fate)
            row[f"reach_{name}"] = float(ladder[j:].sum())
            row[f"reached_{name}"] = int(k >= j)
        rows.append(row)
    return pd.DataFrame(rows)


def hits(real: dict, teams: pd.DataFrame, modal: dict) -> dict:
    """The modal champion, the four likeliest semi-finalists and the modal bracket's round-of-32
    pairings, each against the real one."""
    t = teams.set_index("team")
    modal_champion = str(t["champion"].idxmax())
    top4 = [str(c) for c in t["reach_sf"].sort_values(ascending=False).index[:4]]
    real_sf = {c for m in real["matches"] if m["round"] == "SF" for c in (m["home"], m["away"])}
    first = modal["matches"][0]["round"]
    modal_pairs = {frozenset((m["home"], m["away"])) for m in modal["matches"]
                   if m["round"] == first}
    real_pairs = {frozenset((m["home"], m["away"])) for m in real["matches"]
                  if m["round"] == first}
    matched = modal_pairs & real_pairs
    return {
        "champion": {"modal": modal_champion, "real": real["champion"],
                     "hit": modal_champion == real["champion"]},
        "semi_finalists": {"modal": top4, "real": sorted(real_sf),
                           "matched": len(set(top4) & real_sf)},
        "r32_pairings": {"matched": len(matched), "of": len(real_pairs),
                         "pairs": sorted(sorted(p) for p in matched)},
    }


def calibration(teams: pd.DataFrame, shrug: np.ndarray, order: list[str]) -> dict:
    """The 288 reach-the-round predictions in five probability bins, one row per threshold,
    and the Brier over all 288 against the structural shrug's own thresholds."""
    names = list(THRESHOLDS)
    p = np.concatenate([teams[f"reach_{r}"].to_numpy(dtype=float) for r in names])
    o = np.concatenate([teams[f"reached_{r}"].to_numpy(dtype=float) for r in names])
    shrug_p = np.concatenate([np.full(len(teams), shrug[order.index(THRESHOLDS[r]):].sum())
                              for r in names])
    which = np.digitize(p, BIN_EDGES)
    bins = []
    for i, label in enumerate(BIN_LABELS):
        sel = which == i
        bins.append({"bin": label, "n": int(sel.sum()),
                     "mean_p": float(p[sel].mean()) if sel.any() else 0.0,
                     "observed": float(o[sel].mean()) if sel.any() else 0.0})
    per = len(teams)
    thresholds = [{"bin": f"reach_{r}", "n": per,
                   "mean_p": float(p[i * per:(i + 1) * per].mean()),
                   "observed": float(o[i * per:(i + 1) * per].mean())}
                  for i, r in enumerate(names)]
    brier, brier_shrug = float(((p - o) ** 2).mean()), float(((shrug_p - o) ** 2).mean())
    return {"bins": bins, "thresholds": thresholds, "brier": brier, "brier_shrug": brier_shrug,
            "skill": scores.skill(brier, brier_shrug)}
