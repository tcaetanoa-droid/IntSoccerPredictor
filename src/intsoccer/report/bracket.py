"""Report views 9 and 10 (docs/REPORTS.md): the most-probable bracket and the reality overlay."""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import pandas as pd

from ..model import GoalsModel, outcome_probs
from ..tournament import GroupSlot, ThirdSlot, format_slot, play_knockout, rank_group, rank_thirds
from ..tournament.group import Result
from ..tournament.knockout import third_assignment
from ..tournament.simulate import home_sign
from .tables import Context, best_third_groups, escape_pct, modal_orders

MIN_MEETINGS = 100   # below this, use the match model instead of the store's frequency


# --- 9. most-probable bracket -------------------------------------------------------------

def _knockout_rows(ctx: Context) -> pd.DataFrame:
    m = ctx.matches
    return m[m["stage"] != "group"]


def _win_prob(ctx: Context, ko: pd.DataFrame, model: GoalsModel | None,
              number: int, home: str, away: str) -> tuple[float, int, str]:
    x = ko[ko["number"] == number]
    a = x[(x["home"] == home) & (x["away"] == away)]
    b = x[(x["home"] == away) & (x["away"] == home)]
    n = len(a) + len(b)
    if n >= MIN_MEETINGS:
        wins = (a["winner"] == home).sum() + (b["winner"] == home).sum()
        return wins / n, n, "store"
    model = model or GoalsModel(**ctx.run.meta["goals_model"])
    sign = home_sign(ctx.t, home, away, ctx.t.venues.get(number))
    la, lb = model.expected_goals(ctx.ratings[home], ctx.ratings[away], sign)
    w, d, _ = outcome_probs(la, lb)
    return float(w[0] + 0.5 * d[0]), n, "model"


def modal_bracket(ctx: Context, model: GoalsModel | None = None) -> dict:
    t = ctx.t
    orders = modal_orders(ctx)
    adv = escape_pct(ctx)
    groups = {g: [{"team": c, "pos": i + 1, "adv_pct": float(adv[c])}
                  for i, c in enumerate(order)] for g, order in orders.items()}
    thirds_groups = best_third_groups(ctx)
    thirds = third_assignment(t, [(g, orders[g][2]) for g in thirds_groups])
    ko = _knockout_rows(ctx)
    winner_of: dict[int, tuple[str, str]] = {}
    matches = []

    def resolve(slot, partner):
        if isinstance(slot, GroupSlot):
            return orders[slot.group][slot.position - 1]
        if isinstance(slot, ThirdSlot):
            return thirds[format_slot(partner)]
        won, lost = winner_of[slot.match]
        return won if slot.winner else lost

    for round_name, numbers in t.rounds.items():
        for number in numbers:
            hs, as_ = t.matches[number]
            home, away = resolve(hs, as_), resolve(as_, hs)
            p, n_met, source = _win_prob(ctx, ko, model, number, home, away)
            won, lost = (home, away) if p >= 0.5 else (away, home)
            winner_of[number] = (won, lost)
            matches.append({"number": number, "round": round_name, "home": home, "away": away,
                            "p_home": float(p), "n_met": int(n_met), "source": source,
                            "winner": won})
    return {"groups": groups, "best_third_groups": thirds_groups, "matches": matches,
            "champion": matches[-1]["winner"]}


# --- 10. reality overlay ------------------------------------------------------------------

def load_real_results(path: Path) -> tuple[dict[str, list[Result]], dict[str, list[Result]]]:
    """Real results CSV -> ({group letter: results}, {knockout stage: results})."""
    groups: dict[str, list[Result]] = {}
    knockout: dict[str, list[Result]] = {}
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            res = Result(r["home"], r["away"], int(r["home_goals"]), int(r["away_goals"]))
            if r["stage"] == "group":
                groups.setdefault(r["group"], []).append(res)
            else:
                knockout.setdefault(r["stage"], []).append(res)
    return groups, knockout


def replay_real(ctx: Context, results_path: Path) -> dict:
    """The real tournament through the group/knockout code: orders, best thirds, matches."""
    t = ctx.t
    groups, knockout = load_real_results(results_path)
    rng = np.random.default_rng(0)
    orders, thirds = {}, {}
    for g, teams in t.groups.items():
        st = rank_group(list(teams), groups[g], t.tiebreakers, ctx.ratings, rng)
        orders[g] = st.order
        thirds[g] = (st.order[2], st.rows[st.order[2]])
    ranking = rank_thirds(thirds, ctx.ratings, rng)
    best = ranking[:t.best_thirds]
    rounds = list(t.rounds)

    def real_winner(number, round_name, home, away):
        rows = [r for r in knockout[round_name] if {r.home, r.away} == {home, away}]
        if not rows:
            raise ValueError(f"match {number}: {home} v {away} is not a real {round_name} fixture")
        r = rows[0]
        if r.home_goals != r.away_goals:
            return r.home if r.home_goals > r.away_goals else r.away
        later = {c for s in rounds[rounds.index(round_name) + 1:]
                 for rr in knockout.get(s, []) for c in (rr.home, rr.away)}
        (winner,) = {home, away} & later
        return winner

    played = play_knockout(t, orders, best, real_winner)
    matches = [{"number": n, "round": m.round, "home": m.home, "away": m.away,
                "winner": m.winner} for n, m in played.items()]
    return {"orders": orders, "best_thirds": best, "matches": matches,
            "champion": played[t.rounds[rounds[-1]][-1]].winner}


def _podium(ctx: Context) -> pd.DataFrame:
    s = ctx.run.sims.copy()
    for col in ("champion", "runner_up", "third", "fourth"):
        s[col] = s[col].astype(str)
    return s


def top_finals(ctx: Context, real: dict, top: int = 5) -> list[dict]:
    s = _podium(ctx)
    final = real["matches"][-1]
    loser = final["home"] if final["winner"] != final["home"] else final["away"]
    real_pair = (final["winner"], loser)
    counts = s.groupby(["champion", "runner_up"]).size().sort_values(ascending=False)
    rows = [{"champion": c, "runner_up": r, "pct": k / ctx.n, "real": (c, r) == real_pair}
            for (c, r), k in counts.head(top).items()]
    if not any(row["real"] for row in rows):
        k = counts.get(real_pair, 0)
        rows.append({"champion": real_pair[0], "runner_up": real_pair[1], "pct": k / ctx.n,
                     "real": True})
    return rows


def closest_runs(ctx: Context, real: dict) -> dict:
    """Three nearest misses: closest group stage, closest knockouts, closest final eight."""
    t = ctx.t
    teams, ko = ctx.teams, _knockout_rows(ctx)
    real_pos = {(g, c): i + 1 for g, order in real["orders"].items() for i, c in enumerate(order)}
    pos_hits = ((teams["group_pos"] == [real_pos[(g, c)] for g, c in
                                        zip(teams["group"], teams["team"])])
                .groupby(teams["sim"]).sum())

    real_by_number = {m["number"]: m for m in real["matches"]}
    same_pair = np.array([{h, a} == {real_by_number[n]["home"], real_by_number[n]["away"]}
                          for n, h, a in zip(ko["number"], ko["home"], ko["away"])])
    same_winner = ko["winner"].to_numpy() == np.array([real_by_number[n]["winner"]
                                                        for n in ko["number"]])
    ko_hits = pd.Series(same_pair & same_winner).groupby(ko["sim"].to_numpy()).sum()

    stages = ctx.stages
    qf_i, sf_i = stages.index("QF"), stages.index("SF")
    real_qf = {c for m in real["matches"] if m["round"] == "QF" for c in (m["home"], m["away"])}
    real_sf = {c for m in real["matches"] if m["round"] == "SF" for c in (m["home"], m["away"])}
    real_place = {}
    final = real_by_number[t.rounds[list(t.rounds)[-1]][-1]]
    real_place[final["winner"]] = 1
    real_place[final["home"] if final["winner"] != final["home"] else final["away"]] = 2
    for n, (hs, as_) in t.matches.items():
        if n in real_by_number and n != final["number"] and hs.__class__.__name__ == "MatchRef" \
                and as_.__class__.__name__ == "MatchRef" and not hs.winner and not as_.winner:
            tp = real_by_number[n]
            real_place[tp["winner"]] = 3
            real_place[tp["home"] if tp["winner"] != tp["home"] else tp["away"]] = 4
    in_qf = teams["team"].isin(real_qf) & (teams["ridx"] >= qf_i)
    in_sf = teams["team"].isin(real_sf) & (teams["ridx"] >= sf_i)
    podium = teams["place"].eq(teams["team"].map(real_place).fillna(-1))
    eight = in_qf.astype(int) + in_sf.astype(int) + podium.astype(int)
    eight_hits = eight.groupby(teams["sim"]).sum()

    score = pd.DataFrame({"group_positions": pos_hits, "knockout_results": ko_hits,
                          "final_eight": eight_hits}).fillna(0).astype(int)
    picks = {
        "closest_group_stage": score.sort_values(["group_positions", "knockout_results"],
                                                 ascending=False).index[0],
        "closest_knockouts": score.sort_values(["knockout_results", "final_eight"],
                                               ascending=False).index[0],
        "closest_final_eight": score.sort_values(["final_eight", "knockout_results"],
                                                 ascending=False).index[0],
    }
    out = {}
    for name, sim in picks.items():
        sim = int(sim)
        rows = ko[ko["sim"] == sim].sort_values("number")
        orders = (teams[teams["sim"] == sim].sort_values(["group", "group_pos"])
                  .groupby("group")["team"].apply(list).to_dict())
        out[name] = {
            "sim": sim,
            "scores": {k: int(v) for k, v in score.loc[sim].items()},
            "orders": orders,
            "matches": [{"number": int(n), "round": r, "home": h, "away": a, "winner": w,
                         "matches_reality": bool({h, a} == {real_by_number[n]["home"],
                                                            real_by_number[n]["away"]}
                                                 and w == real_by_number[n]["winner"])}
                        for n, r, h, a, w in zip(rows["number"], rows["stage"], rows["home"],
                                                 rows["away"], rows["winner"])],
        }
    out["averages"] = {k: float(v) for k, v in score.mean().items()}
    out["maxima"] = {"group_positions": len(t.teams),
                     "knockout_results": len(t.matches),
                     "final_eight": len(real_qf) + len(real_sf) + len(real_place)}
    return out


def reality(ctx: Context, results_path: Path) -> dict:
    real = replay_real(ctx, results_path)
    return {"real": real, "top_finals": top_finals(ctx, real), "closest": closest_runs(ctx, real)}
