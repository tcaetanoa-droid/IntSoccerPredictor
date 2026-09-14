from pathlib import Path

from intsoccer.data import parse

FIX = Path(__file__).parent / "fixtures"


def test_load_ratings():
    df = parse.load_ratings(FIX / "ratings_head.tsv")
    assert list(df.columns) == ["rank", "code", "rating"]
    assert df.iloc[0]["code"] == "ES" and df.iloc[0]["rating"] == 2259


def test_load_matches_types_and_derived_columns():
    df = parse.load_matches(FIX / "team_head.tsv")
    assert len(df) == 15
    final = df.iloc[-1]
    assert (final["home"], final["away"]) == ("ES", "AR")
    assert (final["home_goals"], final["away_goals"]) == (1, 0)
    assert final["match_type"] == "WC" and final["neutral"]
    # pre-match rating reconstruction: after - points (home), after + points (away)
    assert final["home_rating_before"] == 2259 - 27
    assert final["away_rating_before"] == 2173 + 27
    assert str(final["date"].date()) == "2026-07-19"


def test_unicode_minus_is_normalised():
    df = parse.load_matches(FIX / "team_head.tsv")
    assert (df["points"] < 0).any()


def test_team_names():
    names = parse.load_team_names(FIX / "teams_head.tsv")
    assert names["AF"] == "Afghanistan"


def test_team_filename_strips_accents_and_spaces():
    from intsoccer.data.fetch import team_filename
    assert team_filename("Curaçao") == "Curacao.tsv"
    assert team_filename("Bosnia and Herzegovina") == "Bosnia_and_Herzegovina.tsv"
