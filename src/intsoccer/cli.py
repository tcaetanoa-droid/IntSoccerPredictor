"""Command-line entry point: `intsoccer <command>`."""

from __future__ import annotations

import argparse
import json
import sys

from pathlib import Path

from .data import fetch, parse, snapshot


def cmd_fetch(args: argparse.Namespace) -> int:
    paths = fetch.fetch_core(force=args.force)
    ratings = parse.load_ratings(paths["world"])
    names = parse.load_team_names(paths["teams"])
    print(f"World ratings: {len(ratings)} teams. Top 5:")
    for _, row in ratings.head(5).iterrows():
        print(f"  {row['rank']:>3}  {row['code']}  {names.get(row['code'], '?'):<20} {row['rating']}")
    if args.teams:
        wanted = [names[c] for c in args.teams if c in names]
        got = fetch.fetch_team_histories(wanted, force=args.force)
        for name, path in got.items():
            print(f"  history {name}: {len(parse.load_matches(path))} matches -> {path.name}")
    return 0


def cmd_snapshot(args: argparse.Namespace) -> int:
    """Ratings of every team listed in a tournament ratings table, as of a date (exclusive)."""
    paths = fetch.fetch_core()
    names = parse.load_team_names(paths["teams"])
    table = fetch.download(args.table)
    codes = list(parse.load_ratings(table)["code"])
    snap = snapshot.build_snapshot(codes, args.date, names)
    import pandas as pd
    label_date = args.label_date or str((pd.Timestamp(args.date) - pd.Timedelta(days=1)).date())
    out = snapshot.save_snapshot(snap, label_date, args.label)
    print(snap.to_string(index=False))
    print(f"\n{len(snap)} teams -> {out}")
    return 0


def cmd_fit(args: argparse.Namespace) -> int:
    """Fit the Elo-gap -> expected-goals curve on real match histories."""
    from .model import fit as fitmod

    paths = fetch.fetch_core()
    names = parse.load_team_names(paths["teams"])
    codes = list(parse.load_ratings(fetch.download(args.table))["code"])
    rows = fitmod.build_training_set(codes, names, args.start, args.end)
    n_matches = len(rows) // 2
    model = fitmod.fit_goals_model(rows, with_friendly_term=True)
    competitive_only = fitmod.fit_goals_model(rows[~rows["friendly"]], with_friendly_term=False)
    print(f"training set: {n_matches} matches ({int(rows['friendly'].sum()) // 2} friendlies), "
          f"{args.start} <= date < {args.end}, from {len(codes)} team histories")
    print(f"fitted:  a={model.a:.4f}  b={model.b:.6f}  c_friendly={model.c_friendly:.4f}")
    print(f"  -> equal teams, neutral: {model.rate(0):.3f} goals each; "
          f"+100 (home) edge: {model.rate(100):.3f} vs {model.rate(-100):.3f}; "
          f"+400 edge: {model.rate(400):.3f} vs {model.rate(-400):.3f}")
    print(f"competitive-only fit for comparison: a={competitive_only.a:.4f} b={competitive_only.b:.6f}")
    diag = fitmod.diagnostics(rows, model)
    print("\ndiagnostics by Elo-advantage bin (dr incl. home +100):")
    print(diag[diag["n"] >= 30].to_string())
    out = Path(args.out)
    model.save(out, meta={"fitted_on": {"start": args.start, "end": args.end, "table": args.table,
                                        "matches": n_matches, "friendly_types": sorted(fitmod.FRIENDLY_TYPES)}})
    chart = fitmod.plot_diagnostics(diag, Path("output") / "goals_model_diagnostics.png")
    cal = Path("data") / "calibration.json"
    cal.write_text(json.dumps(fitmod.calibration_records(diag), indent=1))
    print(f"saved {cal}")
    print(f"\nsaved {out} and {chart}")
    return 0


def cmd_simulate(args: argparse.Namespace) -> int:
    """Monte Carlo: simulate the tournament n times, store every run, print the summary."""
    from .model import GoalsModel
    from .montecarlo import OUTPUT_DIR, run
    from .tournament import load_tournament

    t = load_tournament(args.tournament)
    ratings = snapshot.load_snapshot(t.ratings_snapshot)
    model = GoalsModel.load()
    out = Path(args.out) if args.out else OUTPUT_DIR / args.tournament
    print(f"{t.name}: {args.n} simulations, seed {args.seed}, K={t.k}, "
          f"model a={model.a:.4f} b={model.b:.5f}")
    r = run(t, ratings, model, args.n, args.seed, out_dir=out,
            progress_every=max(1, args.n // 20))
    summary = r.summary
    cols = ["team", "group", "group_1", "reach_R32", "reach_QF", "reach_SF", "reach_F", "champion"]
    cols = [c for c in cols if c in summary.columns]
    print()
    print(summary[cols].head(16).to_string(index=False, float_format=lambda x: f"{x:.3f}"))
    print(f"\n{r.meta['seconds']} s -> {out}")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    """Compute the report views for a saved run and write them under <run>/report/."""
    from .report import build_report

    run_dir = Path(args.run)
    views = build_report(run_dir)
    print(f"{len(views)} views -> {run_dir / 'report'}")
    if args.site:
        from .report.site import copy_site_data
        written = copy_site_data(run_dir / "report", Path("site"), run_dir.name)
        print(f"{len(written)} files -> site/data/{run_dir.name}/")
    b = views["bracket"]
    final = b["matches"][-1]
    print(f"most-probable final: {final['home']} v {final['away']} "
          f"{final['p_home']:.0%} -> {final['winner']}")
    real = views["reality"]["top_finals"][0]
    print(f"most common final: {real['champion']} beat {real['runner_up']} in {real['pct']:.2%}"
          f"{' (the real one)' if real['real'] else ''}")
    return 0


def cmd_backtest(args: argparse.Namespace) -> int:
    """Score a saved run against the real results; the method and record are docs/BACKTEST.md."""
    from .backtest import build_backtest
    from .backtest.forecasts import SPARSE_RUNS

    run_dir = Path(args.run)
    out = build_backtest(run_dir, Path(args.results),
                         site_dir=Path("site") if args.site else None)
    s = out["summary"]
    t, m = s["tournament"], s["matches"]
    print(f"{run_dir.name}: {s['meta']['n_sims']} runs against {len(out['matches'])} real matches"
          f" -> {run_dir / 'backtest'}")
    print(f"fate-ladder RPS {t['rps']:.4f} vs structural shrug {t['rps_shrug']:.4f} "
          f"(skill {t['rps_skill']:.2f})")
    h = t["hits"]
    print(f"hits: champion {h['champion']['modal']} (real {h['champion']['real']}); "
          f"semi-finalists {h['semi_finalists']['matched']} of 4; "
          f"round-of-32 pairings {h['r32_pairings']['matched']} of {h['r32_pairings']['of']}")
    for name in ("dayof", "runs"):
        a = m[name]["all"]
        print(f"{name:<6} Brier {a['brier']:.4f}  log-loss {a['logloss']:.4f}  "
              f"skill vs shrug {a['skill']['logloss_vs_shrug']:+.3f}  "
              f"vs Elo {a['skill']['logloss_vs_elo']:+.3f}  (log-loss)")
    if s["sparse_pairings"]["count"]:
        print(f"sparse pairings (under {SPARSE_RUNS} runs): {s['sparse_pairings']['count']}")
    if args.site:
        print(f"site file -> site/data/{run_dir.name}/backtest.json")
    print("method and record: docs/BACKTEST.md")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="intsoccer", description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)

    f = sub.add_parser("fetch", help="download ratings, lookups, and optional team histories")
    f.add_argument("--teams", nargs="*", metavar="CODE", help="team codes, e.g. ES AR EN")
    f.add_argument("--force", action="store_true", help="re-download cached files")
    f.set_defaults(func=cmd_fetch)

    sn = sub.add_parser("snapshot", help="save every team's rating as of a date")
    sn.add_argument("--table", default="2026_World_Cup.tsv",
                    help="eloratings.net table listing the teams (default: 2026_World_Cup.tsv)")
    sn.add_argument("--date", required=True,
                    help="cut-off date, exclusive: rating after the last match BEFORE this day")
    sn.add_argument("--label", required=True, help="snapshot label, e.g. wc2026")
    sn.add_argument("--label-date", default=None,
                    help="date used in the filename (default: --date minus one day)")
    sn.set_defaults(func=cmd_snapshot)

    ft = sub.add_parser("fit", help="fit the Elo-gap -> expected-goals model")
    ft.add_argument("--table", default="2026_World_Cup.tsv", help="teams whose histories to use")
    ft.add_argument("--start", default="2010-01-01")
    ft.add_argument("--end", default="2026-06-11", help="exclusive; keep the backtest window out")
    ft.add_argument("--out", default="data/model_params.yaml")
    ft.set_defaults(func=cmd_fit)

    sm = sub.add_parser("simulate", help="run n Monte Carlo simulations and save every one")
    sm.add_argument("--tournament", default="wc2026", help="name of data/tournaments/<name>.yaml")
    sm.add_argument("--n", type=int, default=100_000, help="number of simulations")
    sm.add_argument("--seed", type=int, default=2026)
    sm.add_argument("--out", default=None, help="output directory (default: output/<tournament>)")
    sm.set_defaults(func=cmd_simulate)

    rp = sub.add_parser("report", help="build every report view of docs/REPORTS.md for a run")
    rp.add_argument("--run", default="output/wc2026", help="run directory written by simulate")
    rp.add_argument("--site", action="store_true",
                    help="also copy the site's JSON into site/data/<run name>/")
    rp.set_defaults(func=cmd_report)

    bt = sub.add_parser("backtest",
                        help="score a run against the real results (method: docs/BACKTEST.md)")
    bt.add_argument("--run", default="output/wc2026", help="run directory written by simulate")
    bt.add_argument("--results", default="data/tournaments/wc2026_results.csv",
                    help="the real results CSV")
    bt.add_argument("--site", action="store_true",
                    help="also write site/data/<run name>/backtest.json")
    bt.set_defaults(func=cmd_backtest)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
