# IntSoccerPredictor

Simulates international soccer tournaments (Euro 2028, Copa América 2028, backtested on the
2026 World Cup) with Elo ratings from eloratings.net, Poisson scorelines, and Monte Carlo.

```
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
intsoccer fetch          # download ratings + team histories into data/raw/
pytest
```

See `CLAUDE.md` for the design, `docs/ROADMAP.md` for what is built and what is next.
