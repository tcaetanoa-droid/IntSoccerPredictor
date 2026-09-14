"""Monte Carlo runner: simulate a tournament n times and keep everything.

Every simulation i uses its own generator `np.random.default_rng([seed, i])`, so any single run
can be regenerated on its own with `regenerate(run, i)` and compared with what was stored.

A run is a directory under `output/` with:

    meta.yaml        tournament, seed, n_sims, model parameters, snapshot path, timestamp
    matches.parquet  one row per match per simulation (104 x n for the World Cup); knockout
                     rows carry the winner explicitly (a shootout leaves the goals level)
    teams.parquet    one row per team per simulation: group finish, how far it went, rating
    sims.parquet     one row per simulation: champion, runner-up, third, fourth
    summary.csv      per-team probabilities (P(win), P(reach each round), group finish)
"""

from __future__ import annotations

import datetime as dt
import time
from dataclasses import asdict
from pathlib import Path
from typing import NamedTuple

import numpy as np
import pandas as pd
import yaml

from ..model import GoalsModel
from ..tournament import (MatchRef, SimulatedTournament, Tournament, load_tournament,
                          simulate_tournament)
from ..tournament.simulate import schedule

OUTPUT_DIR = Path(__file__).resolve().parents[3] / "output"


class Run(NamedTuple):
    meta: dict
    matches: pd.DataFrame
    teams: pd.DataFrame
    sims: pd.DataFrame

    @property
    def summary(self) -> pd.DataFrame:
        return summarize(self.teams, self.meta["rounds"])


def sim_rng(seed: int, i: int) -> np.random.Generator:
    return np.random.default_rng([int(seed), int(i)])


def _third_place_match(t: Tournament) -> int | None:
    for number, (home, away) in t.matches.items():
        if isinstance(home, MatchRef) and isinstance(away, MatchRef) \
                and not home.winner and not away.winner:
            return number
    return None


class _Tables:
    """Preallocated column arrays, filled one simulation at a time."""

    def __init__(self, t: Tournament, n_sims: int):
        self.t = t
        self.teams = t.teams
        self.team_index = {code: i for i, code in enumerate(self.teams)}
        self.rounds = list(t.rounds)
        self.round_index = {"group": 0, **{r: i + 1 for i, r in enumerate(self.rounds)}}
        self.group_letters = list(t.groups)
        self.group_index = {g: i for i, g in enumerate(self.group_letters)}
        n_group_matches = sum(len(schedule(len(teams))) for teams in t.groups.values())
        self.knockout_numbers = [n for numbers in t.rounds.values() for n in numbers]
        self.third_place = _third_place_match(t)
        self.final = t.rounds[self.rounds[-1]][-1]

        n_matches = n_group_matches + len(self.knockout_numbers)
        n_teams = len(self.teams)
        self.n_matches, self.n_teams = n_matches, n_teams
        m, k = n_sims * n_matches, n_sims * n_teams
        self.m = dict(sim=np.zeros(m, np.int32), number=np.zeros(m, np.int16),
                      stage=np.zeros(m, np.int8), group=np.full(m, -1, np.int8),
                      home=np.zeros(m, np.int16), away=np.zeros(m, np.int16),
                      home_goals=np.zeros(m, np.int8), away_goals=np.zeros(m, np.int8),
                      decided_by=np.zeros(m, np.int8), winner=np.full(m, -1, np.int16))
        self.k = dict(sim=np.zeros(k, np.int32), team=np.zeros(k, np.int16),
                      group=np.zeros(k, np.int8), group_pos=np.zeros(k, np.int8),
                      points=np.zeros(k, np.int8), gd=np.zeros(k, np.int16),
                      gf=np.zeros(k, np.int16), tiebreak_depth=np.zeros(k, np.int8),
                      third_rank=np.zeros(k, np.int8), reached=np.zeros(k, np.int8),
                      place=np.zeros(k, np.int8), rating_after=np.zeros(k, np.float32))
        self.s = dict(sim=np.zeros(n_sims, np.int32), champion=np.zeros(n_sims, np.int16),
                      runner_up=np.zeros(n_sims, np.int16), third=np.full(n_sims, -1, np.int16),
                      fourth=np.full(n_sims, -1, np.int16))

    def fill(self, i: int, sim: SimulatedTournament) -> None:
        ti = self.team_index
        row, number = i * self.n_matches, 0
        for g, results in sim.group_results.items():        # groups and matches in play order
            for res in results:
                number += 1
                self._match(row, i, number, 0, self.group_index[g], res.home, res.away,
                            res.home_goals, res.away_goals, 0, None)
                row += 1
        for number in self.knockout_numbers:
            m, sc = sim.knockout[number], sim.knockout_scores[number]
            self._match(row, i, number, self.round_index[m.round], -1, m.home, m.away,
                        sc.home_goals, sc.away_goals, sc.decided_by, m.winner)
            row += 1

        reached = {code: 0 for code in self.teams}
        for m in sim.knockout.values():
            r = self.round_index[m.round]
            for code in (m.home, m.away):
                reached[code] = max(reached[code], r)
        place = {}
        final = sim.knockout[self.final]
        place[final.winner], place[final.loser] = 1, 2
        if self.third_place is not None:
            tp = sim.knockout[self.third_place]
            place[tp.winner], place[tp.loser] = 3, 4
        third_rank = {code: r + 1 for r, (_, code) in enumerate(sim.third_ranking)}

        row = i * self.n_teams
        for g, st in sim.standings.items():
            for pos, code in enumerate(st.order, start=1):
                r = st.rows[code]
                k = self.k
                k["sim"][row] = i
                k["team"][row] = ti[code]
                k["group"][row] = self.group_index[g]
                k["group_pos"][row] = pos
                k["points"][row] = r.points
                k["gd"][row] = r.gd
                k["gf"][row] = r.gf
                k["tiebreak_depth"][row] = st.depth
                k["third_rank"][row] = third_rank.get(code, 0)
                k["reached"][row] = reached[code]
                k["place"][row] = place.get(code, 0)
                k["rating_after"][row] = sim.ratings[code]
                row += 1

        s = self.s
        s["sim"][i] = i
        s["champion"][i] = ti[final.winner]
        s["runner_up"][i] = ti[final.loser]
        if self.third_place is not None:
            tp = sim.knockout[self.third_place]
            s["third"][i], s["fourth"][i] = ti[tp.winner], ti[tp.loser]

    def _match(self, row, i, number, stage, group, home, away, hg, ag, decided_by, winner):
        m = self.m
        m["sim"][row] = i
        m["number"][row] = number
        m["stage"][row] = stage
        m["group"][row] = group
        m["home"][row] = self.team_index[home]
        m["away"][row] = self.team_index[away]
        m["home_goals"][row] = hg
        m["away_goals"][row] = ag
        m["decided_by"][row] = decided_by
        if winner is not None:
            m["winner"][row] = self.team_index[winner]

    def frames(self) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        cat = pd.Categorical.from_codes
        stages = ["group", *self.rounds]

        def team_col(codes):
            return cat(codes, categories=self.teams)

        def group_col(codes):
            return cat(codes, categories=self.group_letters)   # -1 -> NaN

        m = pd.DataFrame({
            "sim": self.m["sim"], "stage": cat(self.m["stage"], categories=stages),
            "group": group_col(self.m["group"]), "number": self.m["number"],
            "home": team_col(self.m["home"]), "away": team_col(self.m["away"]),
            "home_goals": self.m["home_goals"], "away_goals": self.m["away_goals"],
            "decided_by": self.m["decided_by"], "winner": team_col(self.m["winner"]),
        })
        k = dict(self.k)
        k["team"], k["group"] = team_col(k["team"]), group_col(k["group"])
        k["reached"] = cat(k["reached"], categories=stages)
        s = dict(self.s)
        for col in ("champion", "runner_up", "third", "fourth"):
            s[col] = team_col(s[col])
        return m, pd.DataFrame(k), pd.DataFrame(s)


def run(t: Tournament, ratings: dict[str, float], model: GoalsModel, n_sims: int, seed: int,
        out_dir: Path | None = None, progress_every: int = 0) -> Run:
    """Simulate `n_sims` tournaments and (optionally) save them under `out_dir`."""
    tables = _Tables(t, n_sims)
    t0 = time.perf_counter()
    for i in range(n_sims):
        tables.fill(i, simulate_tournament(t, ratings, model, sim_rng(seed, i)))
        if progress_every and (i + 1) % progress_every == 0:
            rate = (i + 1) / (time.perf_counter() - t0)
            print(f"  {i + 1:>7} / {n_sims}  ({rate:.0f} sims/s, "
                  f"~{(n_sims - i - 1) / rate:.0f} s left)", flush=True)
    matches, teams, sims = tables.frames()
    meta = {
        "tournament": t.name, "tournament_yaml": str(t.path), "seed": int(seed),
        "n_sims": int(n_sims), "rounds": list(t.rounds),
        "ratings_snapshot": str(t.ratings_snapshot), "goals_model": asdict(model),
        "created": dt.datetime.now(dt.UTC).isoformat(timespec="seconds"),
        "seconds": round(time.perf_counter() - t0, 1),
    }
    result = Run(meta, matches, teams, sims)
    if out_dir is not None:
        save_run(result, out_dir)
    return result


def save_run(r: Run, out_dir: Path) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "meta.yaml").write_text(yaml.safe_dump(r.meta, sort_keys=False))
    r.matches.to_parquet(out_dir / "matches.parquet", index=False)
    r.teams.to_parquet(out_dir / "teams.parquet", index=False)
    r.sims.to_parquet(out_dir / "sims.parquet", index=False)
    r.summary.to_csv(out_dir / "summary.csv", index=False, float_format="%.5f")
    return out_dir


def load_run(out_dir: Path) -> Run:
    out_dir = Path(out_dir)
    meta = yaml.safe_load((out_dir / "meta.yaml").read_text())
    return Run(meta, pd.read_parquet(out_dir / "matches.parquet"),
               pd.read_parquet(out_dir / "teams.parquet"),
               pd.read_parquet(out_dir / "sims.parquet"))


def regenerate(r: Run, i: int, model: GoalsModel | None = None) -> SimulatedTournament:
    """Re-simulate run number i from the stored seed, e.g. to inspect it or check the store."""
    from ..data.snapshot import load_snapshot

    t = load_tournament(r.meta["tournament_yaml"])
    ratings = load_snapshot(Path(r.meta["ratings_snapshot"]))
    model = model or GoalsModel(**r.meta["goals_model"])
    return simulate_tournament(t, ratings, model, sim_rng(r.meta["seed"], i))


def summarize(teams: pd.DataFrame, rounds: list[str]) -> pd.DataFrame:
    """Per-team probabilities: group finish, reaching each round, champion, mean rating."""
    n = teams["sim"].nunique()
    stages = ["group", *rounds]
    reached = teams["reached"].cat.codes.to_numpy() if hasattr(teams["reached"], "cat") \
        else teams["reached"].map({s: i for i, s in enumerate(stages)}).to_numpy()
    df = teams.assign(_reached=reached)
    g = df.groupby("team", observed=True)
    out = pd.DataFrame({"group": g["group"].first().astype(str)})
    for pos in range(1, int(df["group_pos"].max()) + 1):
        out[f"group_{pos}"] = g["group_pos"].apply(lambda s, p=pos: (s == p).mean())
    for idx, r in enumerate(rounds, start=1):
        if r == "3P":      # "reached the third-place match" = lost a semi-final; not a milestone
            continue
        out[f"reach_{r}"] = g["_reached"].apply(lambda s, k=idx: (s >= k).mean())
    out["champion"] = g["place"].apply(lambda s: (s == 1).mean())
    out["mean_points"] = g["points"].mean()
    out["mean_rating_after"] = g["rating_after"].mean()
    out.attrs["n_sims"] = n
    return out.sort_values("champion", ascending=False).reset_index()
