import math

import numpy as np
import pytest

from intsoccer.backtest import scores

SHRUG9 = np.array([12, 4, 16, 8, 4, 1, 1, 1, 1]) / 48   # the structural shrug of spec section 6


def test_brier_certain_call_shrug_and_certain_miss():
    assert scores.brier([1, 0, 0], 0) == 0
    assert scores.brier([1 / 3] * 3, 0) == pytest.approx(2 / 3)
    assert scores.brier([0.5, 0.5], 1) == pytest.approx(0.5)
    assert scores.brier([0, 0, 1], 0) == pytest.approx(2.0)


def test_logloss_certain_call_shrug_and_the_floor():
    assert scores.logloss([1, 0, 0], 0) == 0
    assert scores.logloss([1 / 3] * 3, 2) == pytest.approx(math.log(3))
    assert scores.logloss([0.5, 0.5], 0) == pytest.approx(math.log(2))
    assert scores.logloss([0, 1, 0], 0) == pytest.approx(-math.log(1e-6))
    assert scores.logloss([0, 1, 0], 0, floor=1e-3) == pytest.approx(-math.log(1e-3))


def test_rps_perfect_one_rung_off_eight_rungs_off():
    perfect = np.zeros(9)
    perfect[3] = 1
    assert scores.rps(perfect, 3) == 0
    one_off = np.zeros(9)
    one_off[1] = 1
    assert scores.rps(one_off, 0) == pytest.approx(1 / 8)
    eight_off = np.zeros(9)
    eight_off[8] = 1
    assert scores.rps(eight_off, 0) == pytest.approx(1.0)


def test_rps_of_the_structural_shrug_by_hand():
    # cumulative shrug (12, 16, 32, 40, 44, 45, 46, 47) / 48 against a champion (all zeros)
    assert scores.rps(SHRUG9, 8) == pytest.approx(11310 / 2304 / 8)
    # ... and against a fourth-placed group team (all ones): (36, 32, 16, 8, 4, 3, 2, 1) / 48
    assert scores.rps(SHRUG9, 0) == pytest.approx(2670 / 2304 / 8)


def test_skill_equal_better_worse():
    assert scores.skill(0.5, 0.5) == 0
    assert scores.skill(0.25, 0.5) == pytest.approx(0.5)
    assert scores.skill(1.0, 0.5) == pytest.approx(-1.0)
