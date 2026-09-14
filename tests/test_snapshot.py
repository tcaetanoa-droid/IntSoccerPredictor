from pathlib import Path

import pandas as pd

from intsoccer.data import parse, snapshot

FIX = Path(__file__).parent / "fixtures"


def test_rating_on_uses_last_match_strictly_before_date():
    hist = parse.load_matches(FIX / "spain_2022plus.tsv")
    # Spain's last pre-World-Cup match is before 2026-06-11; the final is 2026-07-19.
    r_before, last = snapshot.rating_on(hist, "ES", "2026-06-11")
    assert last < pd.Timestamp("2026-06-11")
    r_after, _ = snapshot.rating_on(hist, "ES", "2026-07-20")
    assert r_after == 2259.0
    assert r_before != r_after


def test_rating_on_picks_correct_side():
    hist = parse.load_matches(FIX / "argentina_2022plus.tsv")
    # final listed as ES (home) AR (away): Argentina's rating is the away column
    r, last = snapshot.rating_on(hist, "AR", "2026-07-20")
    assert last == pd.Timestamp("2026-07-19") and r == 2173.0


def test_infer_groups():
    codes = list("ABCDEFGH")
    m = pd.DataFrame({"home": ["A", "A", "A", "B", "C", "E", "E", "E", "F"],
                      "away": ["B", "C", "D", "C", "D", "F", "G", "H", "G"]})
    groups = snapshot.infer_groups(m, codes, group_size=4)
    assert sorted(map(sorted, groups)) == [list("ABCD"), list("EFGH")]
