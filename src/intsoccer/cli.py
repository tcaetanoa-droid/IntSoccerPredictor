"""Command-line entry point: `intsoccer <command>`."""

from __future__ import annotations

import argparse
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
    print(f"\nsaved {out} and {chart}")
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

    for name in ["simulate", "backtest", "report"]:
        s = sub.add_parser(name, help=f"(not implemented yet, see docs/ROADMAP.md)")
        s.set_defaults(func=lambda a, n=name: print(f"{n}: not implemented yet") or 1)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
