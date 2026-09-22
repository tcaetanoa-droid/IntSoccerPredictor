"""Report views 1-8 (docs/REPORTS.md) as tidy tables computed from a Monte Carlo run.

Every function takes a `Context` (the run's tables with plain-string columns, the tournament,
the pre-tournament ratings) and returns a DataFrame or a JSON-ready dict. No plotting here.
"""

from __future__ import annotations

from typing import NamedTuple

import numpy as np
import pandas as pd

from ..data.snapshot import load_snapshot
from ..montecarlo import Run, resolve_meta_path
from ..tournament import Tournament, load_tournament

PLACE_FATE = {1: "champion", 2: "runner_up", 3: "third", 4: "fourth"}


class Context(NamedTuple):
    run: Run
    t: Tournament
    ratings: dict[str, float]
    teams: pd.DataFrame        # teams.parquet + `fate` and `ridx`, string columns
    matches: pd.DataFrame      # matches.parquet, string columns
    n: int
    rounds: list[str]

    @property
    def stages(self) -> list[str]:
        return ["group", *self.rounds]

    def reach_pct(self, round_name: str) -> pd.Series:
        """P(team reached `round_name` or later), indexed by team."""
        k = self.stages.index(round_name)
        return (self.teams["ridx"] >= k).groupby(self.teams["team"]).mean()


def fate_order(rounds: list[str]) -> list[str]:
    knock = [r.lower() for r in rounds
             if r not in ("3P", "F") and not (r == "SF" and "3P" in rounds)]
    podium = ["fourth", "third"] if "3P" in rounds else []
    return ["gs4", "gs3_out", *knock, *podium, "runner_up", "champion"]


def with_fates(teams: pd.DataFrame, rounds: list[str]) -> pd.DataFrame:
    df = teams.copy()
    for col in ("team", "group", "reached"):
        df[col] = df[col].astype(str)
    stages = ["group", *rounds]
    df["ridx"] = df["reached"].map({s: i for i, s in enumerate(stages)}).astype(int)
    group_fate = np.where(df["group_pos"] == 4, "gs4", "gs3_out")
    fate = np.where(df["reached"] == "group", group_fate, df["reached"].str.lower())
    df["fate"] = np.where(df["place"] > 0, df["place"].map(PLACE_FATE).astype(object), fate)
    return df


def context(run: Run, tournament: Tournament | None = None) -> Context:
    t = tournament or load_tournament(resolve_meta_path(run.meta["tournament_yaml"]))
    ratings = load_snapshot(resolve_meta_path(run.meta["ratings_snapshot"]))
    rounds = list(run.meta["rounds"])
    teams = with_fates(run.teams, rounds)
    matches = run.matches.copy()
    for col in ("stage", "home", "away", "winner"):
        matches[col] = matches[col].astype(object).where(matches[col].notna(), None)
        matches[col] = matches[col].map(lambda v: None if v is None else str(v))
    matches["group"] = matches["group"].astype(object).where(matches["group"].notna(), None)
    return Context(run, t, ratings, teams, matches, int(teams["sim"].nunique()), rounds)


# --- shared pieces -----------------------------------------------------------------------

def position_probs(ctx: Context) -> pd.DataFrame:
    """P(group position) per team: rows = team, columns 1..group size."""
    return (ctx.teams.groupby("team")["group_pos"].value_counts(normalize=True)
            .unstack(fill_value=0.0))


def modal_orders(ctx: Context) -> dict[str, list[str]]:
    """Per group, the most likely order: highest P(1st) takes 1st, then P(2nd) among the rest..."""
    P = position_probs(ctx)
    out = {}
    for g, teams in ctx.t.groups.items():
        remaining, order = list(teams), []
        for pos in range(1, len(teams)):
            pick = max(remaining, key=lambda c: P.loc[c, pos])
            order.append(pick)
            remaining.remove(pick)
        out[g] = order + remaining
    return out


def third_qualify_pct(ctx: Context) -> pd.Series:
    """Per group, P(the third-placed team qualified)."""
    df = ctx.teams
    q = (df["group_pos"] == 3) & (df["reached"] != "group")
    return q.groupby(df["group"]).sum() / ctx.n


def best_third_groups(ctx: Context) -> list[str]:
    n = ctx.t.best_thirds
    return sorted(third_qualify_pct(ctx).sort_values(ascending=False).index[:n])


def fate_pcts(ctx: Context) -> pd.DataFrame:
    """P(fate) per team, all fates as columns in `fate_order`."""
    cols = fate_order(ctx.rounds)
    return (ctx.teams.groupby("team")["fate"].value_counts(normalize=True)
            .unstack(fill_value=0.0).reindex(columns=cols, fill_value=0.0))


def escape_pct(ctx: Context) -> pd.Series:
    return (ctx.teams["reached"] != "group").groupby(ctx.teams["team"]).mean()


def champion_pct(ctx: Context) -> pd.Series:
    return (ctx.teams["place"] == 1).groupby(ctx.teams["team"]).mean()


def elo_series(ctx: Context) -> pd.Series:
    return pd.Series({c: ctx.ratings[c] for c in ctx.t.teams}, name="elo")


# --- 1. group advance ---------------------------------------------------------------------

def group_advance(ctx: Context) -> pd.DataFrame:
    adv = escape_pct(ctx)
    orders = modal_orders(ctx)
    shaded = set(best_third_groups(ctx))
    tq = third_qualify_pct(ctx)
    rows = []
    for g, teams in ctx.t.groups.items():
        for c in teams:
            rows.append({"group": g, "team": c, "adv_pct": adv[c],
                         "modal_pos": orders[g].index(c) + 1,
                         "third_qualifies_pct": tq[g], "third_shaded": g in shaded})
    df = pd.DataFrame(rows)
    return df.sort_values(["group", "adv_pct"], ascending=[True, False]).reset_index(drop=True)


# --- 2. fate table ------------------------------------------------------------------------

def fate_table(ctx: Context) -> pd.DataFrame:
    cols = fate_order(ctx.rounds)
    counts = (ctx.teams.groupby("team")["fate"].value_counts().unstack(fill_value=0)
              .reindex(columns=cols, fill_value=0))
    counts["advanced"] = counts[[c for c in cols if c not in ("gs4", "gs3_out")]].sum(axis=1)
    counts["group_third"] = (ctx.teams["group_pos"] == 3).groupby(ctx.teams["team"]).sum()
    counts.insert(0, "elo", elo_series(ctx))
    counts.insert(0, "group", pd.Series({c: ctx.t.group_of(c) for c in ctx.t.teams}))
    return (counts.sort_values(["champion", "runner_up", "elo"], ascending=False)
            .reset_index().rename(columns={"index": "team"}))


# --- 3. weakest / lowest Elo --------------------------------------------------------------

def _team_profile(ctx: Context) -> pd.DataFrame:
    f = fate_pcts(ctx)
    return pd.DataFrame({"elo": elo_series(ctx), "escape_pct": escape_pct(ctx),
                         "gs4_pct": f["gs4"], "gs3_out_pct": f["gs3_out"],
                         "champion_pct": champion_pct(ctx)})


def weakest_teams(ctx: Context, n: int = 5) -> pd.DataFrame:
    df = _team_profile(ctx).sort_values(["escape_pct", "elo"]).head(n)
    return df.reset_index().rename(columns={"index": "team"})


def lowest_elo_teams(ctx: Context, n: int = 5) -> pd.DataFrame:
    df = _team_profile(ctx).sort_values(["elo", "escape_pct"]).head(n)
    return df.reset_index().rename(columns={"index": "team"})


# --- 4 / 5. first-time champions, trophy paradox -----------------------------------------

def _contender_columns(ctx: Context) -> pd.DataFrame:
    final = ctx.rounds[-1]
    return pd.DataFrame({"elo": elo_series(ctx), "champion_pct": champion_pct(ctx),
                         "escape_pct": escape_pct(ctx), "reach_qf_pct": ctx.reach_pct("QF"),
                         "reach_final_pct": ctx.reach_pct(final)})


def first_time_champions(ctx: Context, n: int = 3) -> pd.DataFrame:
    df = _contender_columns(ctx)
    df = df[~df.index.isin(ctx.t.past_champions)].sort_values("champion_pct", ascending=False)
    return df.head(n).reset_index().rename(columns={"index": "team"})


def trophy_paradox(ctx: Context, giants: list[str], absent: list[str] = (),
                   n_first: int = 3) -> pd.DataFrame:
    champ = champion_pct(ctx)
    rows = [{"side": "first_timer", "team": c, "titles": 0, "champion_pct": champ[c],
             "qualified": True} for c in first_time_champions(ctx, n_first)["team"]]
    rows += [{"side": "giant", "team": c, "titles": ctx.t.past_champions[c],
              "champion_pct": champ[c], "qualified": True} for c in giants]
    rows += [{"side": "giant", "team": c, "titles": ctx.t.past_champions[c],
              "champion_pct": 0.0, "qualified": False} for c in absent]
    return pd.DataFrame(rows)


# --- 6. hosts -----------------------------------------------------------------------------

def hosts_exit(ctx: Context) -> pd.DataFrame:
    f = fate_pcts(ctx)
    rows = [{"team": h, "fate": fate, "pct": f.loc[h, fate]}
            for h in ctx.t.hosts for fate in f.columns]
    return pd.DataFrame(rows)


# --- 7. paradoxes -------------------------------------------------------------------------

def _first_round_exit_given_reached(ctx: Context) -> pd.Series:
    first, second = ctx.rounds[0], ctx.rounds[1]
    return 1 - ctx.reach_pct(second) / ctx.reach_pct(first)


def opponents_by_round(ctx: Context, team: str, top: int = 3) -> dict[str, list[dict]]:
    m = ctx.matches
    mine = m[(m["stage"] != "group") & ((m["home"] == team) | (m["away"] == team))]
    opp = mine["away"].where(mine["home"] == team, mine["home"])
    out = {}
    for stage in ctx.rounds:
        counts = opp[mine["stage"] == stage].value_counts()
        total = counts.sum()
        out[stage] = [{"team": c, "pct": k / total} for c, k in counts.head(top).items()] \
            if total else []
    return out


def paradoxes(ctx: Context, pair_a: tuple[str, str],
              pairs_b: list[tuple[str, str]]) -> pd.DataFrame:
    elo = elo_series(ctx)
    first = ctx.rounds[0]
    exit_rate = _first_round_exit_given_reached(ctx)
    champ = champion_pct(ctx)
    rows = []
    for c in pair_a:
        top = opponents_by_round(ctx, c, top=1)[first]
        reason = f"most common {first} opponent: {top[0]['team']} ({top[0]['pct']:.0%})" \
            if top else ""
        rows.append({"panel": "A", "pair": 1, "team": c, "elo": elo[c],
                     "metric": f"{first.lower()}_exit_given_reached", "value": exit_rate[c],
                     "reason": reason})
    for k, pair in enumerate(pairs_b, start=1):
        for c in pair:
            reason = "host: plays its knockout matches at home (+100)" if c in ctx.t.hosts else ""
            rows.append({"panel": "B", "pair": k, "team": c, "elo": elo[c],
                         "metric": "champion_pct", "value": champ[c], "reason": reason})
    return pd.DataFrame(rows)


# --- 8. team page -------------------------------------------------------------------------

def team_page(ctx: Context, team: str) -> dict:
    f = fate_pcts(ctx).loc[team]
    m = ctx.matches
    mine = m[(m["stage"] != "group") & (m["stage"] != "3P")
             & ((m["home"] == team) | (m["away"] == team))]
    opp = mine["away"].where(mine["home"] == team, mine["home"])
    lost = mine["winner"] != team
    conq = opp[lost].value_counts(normalize=True).head(5)
    first = ctx.rounds[0]
    main = conq.index[0] if len(conq) else None
    excerpt = None
    if main is not None:
        meet = mine[(mine["stage"] == first) & (opp == main)]
        excerpt = {"opponent": main, f"meet_in_{first.lower()}_pct": len(meet) / ctx.n,
                   "win_pct_when_met": float((meet["winner"] == team).mean()) if len(meet) else 0}
    return {
        "team": team, "group": ctx.t.group_of(team), "elo": ctx.ratings[team],
        "champion_pct": f["champion"],
        "fates": {k: float(v) for k, v in f.items()},
        "reach": {r: float(ctx.reach_pct(r)[team]) for r in ctx.rounds if r != "3P"},
        "opponents_by_round": opponents_by_round(ctx, team),
        "knocked_out_by": [{"team": c, "pct": float(v)} for c, v in conq.items()],
        "first_round_excerpt": excerpt,
    }
