// tests/js/print.test.mjs: the print engine's pure formulas (site/js/print.js).
// Run: node --test tests/js/*.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, fmt, rowWindow, blockProgress, lineProgress, densityTarget, tintStrength, holdPhase, roundProgress } from '../../site/js/print.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not near ${b}`);

test('clamp holds a value inside [0, 1]', () => {
  assert.equal(clamp(-0.5), 0);
  assert.equal(clamp(0.25), 0.25);
  assert.equal(clamp(7), 1);
});

test('fmt rounds and groups thousands', () => {
  assert.equal(fmt(18626), '18,626');
  assert.equal(fmt(0.4), '0');
  assert.equal(fmt(12345.6), '12,346');
});

test('rowWindow: rows start in sequence, overlap by half, the last finishes at p = 1', () => {
  const R = 13;
  assert.equal(rowWindow(0, 0, R), 0);
  near(rowWindow(1 / (R + 1), 0, R), 0.5);     // row 0 half done when row 1 starts
  assert.equal(rowWindow(1 / (R + 1), 1, R), 0);
  near(rowWindow(2 / (R + 1), 0, R), 1);       // row 0 complete after its window
  near(rowWindow(1, R - 1, R), 1);             // the last row completes exactly at p = 1
  assert.ok(rowWindow(0.99, R - 1, R) < 1);    // and not before
});

test('lineProgress: a row prints as it crosses the reading line at 92% of the viewport', () => {
  const H = 900;
  assert.equal(lineProgress(H, 900), 0);       // below the fold
  assert.equal(lineProgress(H, 828), 0);       // on the reading line
  near(lineProgress(H, 747), 0.5);             // half way through the 18% band
  near(lineProgress(H, 666), 1);               // through the band
  assert.equal(lineProgress(H, -100), 1);      // above the viewport
});

test('blockProgress: a block prints over the first 40% of a screen after entering', () => {
  const H = 900;
  assert.equal(blockProgress(H, 900), 0);
  near(blockProgress(H, 720), 0.5);
  near(blockProgress(H, 540), 1);
});

test('densityTarget: the floor keeps the faintest row readable', () => {
  near(densityTarget(0), 0.65);
  near(densityTarget(1), 1);
  near(densityTarget(0.5), 0.825);
  near(densityTarget(0, 0.55), 0.55);
});

test('tintStrength: the fate colour follows the share and saturates at 40%', () => {
  assert.equal(tintStrength(0), 0);
  near(tintStrength(0.2), 0.5);
  near(tintStrength(0.4), 1);
  assert.equal(tintStrength(0.8), 1);
});

test('band: a row unit prints over its own band, not always the spec\'s 18%', () => {
  const H = 900;
  const B = 0.684;                                           // chapter four: 3.8 bands of 18%
  assert.equal(lineProgress(H, 0.92 * H, B), 0);             // nothing printed on the reading line
  near(lineProgress(H, 0.92 * H - 0.342 * H, B), 0.5);       // half way, 0.342 of a screen later
  near(lineProgress(H, 0.92 * H - B * H, B), 1);             // complete 0.684 of a screen later
  assert.ok(lineProgress(H, 0.92 * H - 0.68 * H, B) < 1);    // and not a moment before
  near(lineProgress(H, 0.92 * H - 0.10 * H, 0.10), 1);       // chapter seven's quicker band
  near(lineProgress(H, 747, 0.18), lineProgress(H, 747));    // the default is the spec's band
});

test('a lead of half a band (0.09 of a screen) delays a row by half its progress', () => {
  near(lineProgress(900, 700 + 0.09 * 900), lineProgress(900, 700) - 0.5);
});

test('holdPhase: the round of 32 fills the approach, its last row ending exactly at the pin', () => {
  const H = 900;
  // 0.92 when the grid is held alone, about 0.62 when the chapter's title is held with it; the
  // eighth row completes exactly at the pin either way.
  for (const a of [0.92, 0.62]) {
    assert.equal(holdPhase(0, H, a).p1, 0);
    near(holdPhase(0.5 * a * H, H, a).p1, 0.5);
    near(holdPhase(a * H, H, a).p1, 1);                      // the pin engages as phase one ends
    near(rowWindow(holdPhase(a * H, H, a).p1, 7, 8), 1);     // the eighth row completes there
    assert.ok(rowWindow(holdPhase(0.99 * a * H, H, a).p1, 7, 8) < 1);
    assert.equal(holdPhase(a * H, H, a).q, 0);               // and the hold starts with nothing held yet
  }
  near(holdPhase(0.46 * H, H).p1, 0.5);                      // the default approach is the grid's own
});

test('holdPhase: the hold spends one and a third screens after the pin', () => {
  const H = 900;
  near(holdPhase(0.92 * H + 0.675 * H, H).q, 0.5);
  near(holdPhase(0.92 * H + 1.35 * H, H).q, 1);
  near(holdPhase(0.62 * H + 1.35 * H, H, 0.62).q, 1);        // the same hold whichever region is held
  assert.ok(holdPhase(0.62 * H + 1.34 * H, H, 0.62).q < 1);
  assert.equal(holdPhase(Infinity, H).p1, 1);                // reduced motion: the finished sheet
  assert.equal(holdPhase(Infinity, H).q, 1);
});

test('roundProgress: four rounds of 0.3 of a screen, then a beat of 0.15', () => {
  near(roundProgress(1 / 4.5, 0), 1);          // the round of 16 fills the hold's first 0.3
  assert.equal(roundProgress(1 / 4.5, 1), 0);  // and the quarter-finals start exactly there
  near(roundProgress(4 / 4.5, 3), 1);          // the final completes four rounds in
  assert.ok(roundProgress(4 / 4.5 - 0.01, 3) < 1);
  assert.equal(roundProgress(1, 3), 1);        // the last 0.15 is the beat: nothing left to print
});
