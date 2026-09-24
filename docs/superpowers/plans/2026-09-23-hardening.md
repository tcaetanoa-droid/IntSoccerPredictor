# 11f Internal hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close roadmap component 11f: fix the sheet's visitor-facing edge cases (items 1, 2, 5 and the failed pick), share the duplicated helpers (6), make the run-path fallback visible (12), measure items 3, 4 and 8 and fix only what fails the pre-registered criteria, close 7, 9, 10 and 11 in the docs, and clean up after dropping 11g (including `site/data/wc2026/backtest.json`).

**Architecture:** A new dev tool, `tools/check.mjs`, drives a headless Chrome over the DevTools Protocol and gives the component its evidence: four behaviour checks, a style dump that proves an ordinary read is unchanged, the measurement that decides items 3, 4 and 8, and the render check's screenshots. The site changes are small edits in `site/js/print.js`, `team.js`, `svg.js` and the chart modules; the Python changes are in `montecarlo/run.py` and `backtest/`.

**Tech Stack:** plain ES modules in the browser (no build step); Node 24 (built-in `WebSocket`, `node:test`); Python 3.11 with pytest; Chrome DevTools Protocol.

**Spec:** `docs/superpowers/specs/2026-09-23-hardening-design.md` (read it before any task; section numbers below are its sections).

**Design authority:** `PRODUCT.md`; `DESIGN.md`; surface brief `.impeccable/surfaces/site-index-html.md` (seed key bed5693b); detector baseline 2 findings (both `wide-tracking`, on How it works).

## Global Constraints

- Work in `/Users/thiagocaetano/Developer/Caetano-2/projects/IntSoccerPredictor` on branch `hardening`. Never `git add` from the workspace root.
- Commits: `Component 11f: <what>`, then a blank line and `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Never push.
- Test gate: `.venv/bin/python -m pytest -q` (125 pass at the start) and `node --test tests/js/*.mjs` (12 pass at the start). Ruff is not a gate.
- The site is plain HTML, CSS and JavaScript: no framework, no bundler, no dependency. `tools/check.mjs` uses Node built-ins only.
- The local server is `python3 tools/serve.py` on port 8001 (one is usually already running: `lsof -nP -iTCP:8001 -sTCP:LISTEN`). It serves `site/` from disk with no caching.
- Nothing a visitor sees in an ordinary read changes. After every commit that touches `site/`, `node tools/check.mjs dump output/check/now.json` must equal `output/check/baseline.json` byte for byte (`cmp`), except where a task names the expected difference.
- Every number on the page comes from `site/data/`; the page never computes a statistic.
- DESIGN.md's rules hold: no CSS transition, hover lift, transform or fade-in from below; the only fade is the 150ms ink-to-paper on a team pick; a unit never un-prints; blank is the unprinted state.
- Code matches its neighbours: the site's comments are full sentences saying why, in British spelling.
- The failed-pick line reads exactly: `<Team>'s runs did not load. Pick again to retry.` (the picked team's name from `ctx.byCode`).
- UI stations: this component changes no surface, so it takes the bounded UI stations. Each task that edits front-end scripts reads the craft floor first and ends with the render check's screenshots; Task 9 runs the full render check and the detector. The architectural closers (`impeccable polish`, `critique`, the finish reviewer, `document`) do not apply.
- OWN-WORLD (surface brief, verbatim): "Paper #F2F6F1, ink #10261A, orange #C2410C only for the real result and the hot number, the pinned nine-step fate scale as cell colour whose strength follows the share, numbers always in full ink. League Gothic capitals for mastheads and chapter titles, Old Standard TT for reading, News Cycle for every table and label. Broadsheet rules: hairlines between rows, 3px rules under mastheads and around chapter titles, which sit centred between two of them. No kickers, no chapter numbers, no cards, no shadows, no glow."
- Craft-floor bans (`/Users/thiagocaetano/Developer/Caetano-2/.claude/skills/impeccable/reference/craft-floor.md`, "Refuse", verbatim): Same-size cards of icon plus heading plus text as the page structure. The hero-metric template: big number, small label, supporting stats, accent. A kicker or eyebrow above a heading. Section numbers (01 / 02 / 03) unless the sequence itself carries information the reader needs. A modal for a task that needs neither interruption nor protected focus. Gradient text. Glass and blur as decoration rather than as a specific effect. A colored `border-left` or `border-right` above 1px on cards, list items, callouts, or alerts. Hard offset shadows (`box-shadow: 4px 4px 0`) outside a world that is actually neobrutalist. Sparklines, progress rings, and soft-shadowed rounded rectangles standing in for content. Monospace as a costume for "technical" rather than for code, data, or measurement. A system display face as the display voice of an own-world page. Unicode glyphs or emoji standing in for an icon system. Geometric masks standing in for organic contours. Light or dark picked by category.

## File map

| File | Change | Task |
|---|---|---|
| `tools/check.mjs` | create: checks, dump, measure, shots | 1 |
| `README.md` | quick start and layout lines for check.mjs; backtest `--site` gone; status | 1, 7, 8 |
| `tests/js/print.test.mjs` | `inkAt`, `ruleAt`; `fmt` becomes `fmtCount` | 2 |
| `site/js/print.js` | export `inkAt`, `ruleAt`, `reduced`; use `fmtCount`; hero rows keep progress; boot relayout | 2, 3, (5), (6) |
| `site/js/svg.js` | export `snap` (and `redrawOnWidth` if Task 6 runs) | 2, (6) |
| `site/js/bracket.js`, `calibration.js`, `groups.js`, `hosts.js`, `paradoxes.js`, `underdogs.js` | use the shared helpers | 2, (5), (6) |
| `site/js/team.js` | shared `reduced`; first-draw guard; failed-pick restore and line | 2, 4 |
| `DESIGN.md` | failed-pick line; fate-scale numbers; glyph ruling | 4, 8 |
| `src/intsoccer/montecarlo/run.py`, `tests/test_montecarlo.py` | the substitution warns | 7 |
| `src/intsoccer/backtest/build.py`, `backtest/__init__.py`, `cli.py`, `tests/test_backtest.py`, `site/data/wc2026/backtest.json` | the site file and `--site` removed | 7 |
| `docs/BACKTEST.md` | the site file and `--site` gone | 7 |
| `docs/superpowers/specs/2026-09-20-restyle-design.md` | items 7 and 9 | 8 |
| `docs/ROADMAP.md` | 11f done with its record; 11g dropped | 8 |

Tasks 5 and 6 are conditional: the controller runs each only if Task 1's `measure` prints `FIX` for its items.

---

### Task 1: `tools/check.mjs`, the baseline and the measurement

Recommended model: the most capable (a new tool, browser judgment).

**Files:**
- Create: `tools/check.mjs`
- Modify: `README.md` (quick start, and the layout's `tools/` line)

**Interfaces:**
- Produces: `node tools/check.mjs checks` (prints `pass`/`FAIL` per behaviour, exit 1 on any failure), `dump <file>`, `measure` (prints a table and two verdict lines), `shots <dir>`. The files `output/check/baseline.json` (the reference dump) and `.impeccable/review/before/*.png` (the before screenshots), both gitignored.

- [ ] **Step 1: Write the tool**

Create `tools/check.mjs` with exactly this content:

```js
#!/usr/bin/env node
// tools/check.mjs: the site's checks in a headless Chrome. It launches the browser, drives it over
// the DevTools Protocol with Node's own WebSocket (Node 24, no dependencies) and reads the pages
// from tools/serve.py, so serve first: python3 tools/serve.py
//
//   node tools/check.mjs checks        the behaviours the unit tests cannot reach; exit 1 on a failure
//   node tools/check.mjs dump <file>   every painted value, step by step down both pages, for a diff
//   node tools/check.mjs measure       frame and resize timings on a CPU slowed six times
//   node tools/check.mjs shots <dir>   the render check's screenshots
//
// BASE (default http://localhost:8001) and CHROME (default: Google Chrome's macOS path) override.
// Every viewport is emulated, never set with --window-size: headless Chrome clamps a window to at
// least 500px wide.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8001';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844, mobile: true };
const PAGES = ['/world-cup-2026', '/how-it-works'];
// A page has booted once its last chapter is drawn (the engine boots straight after) or, on the
// method page, once the calibration chart is.
const READY = { '/world-cup-2026': '#pick-a-team .th', '/how-it-works': '#how-it-works .calwrap' };

// In every document, before its own scripts: the checks' helpers on window.__c. The untimed
// requestAnimationFrame is kept here, before TIMING wraps it, so the checks' own frames are never
// counted as the page's work.
const HELPERS = `(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const path = (el) => {
    const p = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.id) { p.push('#' + e.id); break; }
      p.push(e.tagName.toLowerCase() + ':' + [...e.parentElement.children].indexOf(e));
    }
    return p.reverse().join('>');
  };
  window.__c = {
    frames: (n = 2) => new Promise((resolve) => { let k = n; const f = () => (--k > 0 ? raf(f) : resolve()); raf(f); }),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    waitFor: (test, ms = 20000) => new Promise((resolve, reject) => {
      const t0 = performance.now();
      (function poll() {
        let ok = false;
        try { ok = !!test(); } catch (e) { ok = false; }
        if (ok) return resolve(true);
        if (performance.now() - t0 > ms) return reject(new Error('timed out waiting for ' + test));
        setTimeout(poll, 25);
      })();
    }),
    // Every painted value on the page: each attribute of each element in the body (inline styles,
    // classes, SVG geometry) and each leaf element's text, keyed by a path of child indices from
    // the nearest element with an id.
    state() {
      const out = {};
      for (const el of document.body.querySelectorAll('*')) {
        const at = path(el);
        for (const a of el.attributes) out[at + ' @' + a.name] = a.value;
        if (!el.firstElementChild) out[at + ' text'] = el.textContent;
      }
      return out;
    },
    // Frames until nothing painted changes for two frames running, at most sixty.
    async settle() {
      let a = JSON.stringify(this.state()), same = 0;
      for (let i = 0; i < 60 && same < 2; i++) {
        await this.frames(1);
        const b = JSON.stringify(this.state());
        same = b === a ? same + 1 : 0;
        a = b;
      }
    },
  };
})();`;

// measure only, after HELPERS: every animation-frame callback the page asks for is timed, with the
// frame's time stamp so the callbacks of one frame add up, and so is every window resize handler,
// with its event's time stamp so the handlers of one resize add up.
const TIMING = `(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const frames = (window.__frames = []), resizes = (window.__resizes = []);
  window.requestAnimationFrame = (cb) => raf((t) => {
    const s = performance.now();
    try { cb(t); } finally { frames.push([t, performance.now() - s]); }
  });
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (this === window && type === 'resize' && typeof fn === 'function') {
      const timed = function (e) {
        const s = performance.now();
        try { return fn.call(this, e); } finally { resizes.push([e.timeStamp, performance.now() - s]); }
      };
      return add.call(this, type, timed, opts);
    }
    return add.call(this, type, fn, opts);
  };
})();`;

// ---- the browser --------------------------------------------------------------------------------

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'intsoccer-check-'));
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let err = '';
    proc.stderr.on('data', (d) => {
      err += d;
      const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    proc.on('exit', (code) => reject(new Error(`Chrome exited (${code}): ${err.slice(-400)}`)));
  });
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error(`no DevTools socket at ${url}`)); });
  let id = 0;
  const pending = new Map(), listeners = new Set();
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id !== undefined) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(`${p.method}: ${m.error.message}`)); else p.resolve(m.result);
    } else for (const fn of listeners) fn(m);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject, method });
    ws.send(JSON.stringify({ id: n, method, params, sessionId }));
  });
  const close = async () => {
    try { await send('Browser.close'); } catch (e) { /* already gone */ }
    proc.kill();
    rmSync(profile, { recursive: true, force: true });
  };
  return { send, on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }, close };
}

// One tab, emulated as `view` (a width and a height, `mobile` for a phone, `scale` to override the
// device scale), with reduced motion on or off, the CPU slowed `slow` times and, for measure, the
// page's frames and resizes timed.
async function tab(b, view, { reduced = false, slow = 1, timing = false } = {}) {
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params = {}) => b.send(method, params, sessionId);
  await s('Page.enable');
  await s('Runtime.enable');
  await s('Page.addScriptToEvaluateOnNewDocument', { source: HELPERS + (timing ? TIMING : '') });
  const size = async (v) => {
    await s('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height,
      deviceScaleFactor: v.scale ?? (v.mobile ? 3 : 1), mobile: !!v.mobile });
    await s('Emulation.setTouchEmulationEnabled', { enabled: !!v.mobile });
  };
  await size(view);
  await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
  if (slow > 1) await s('Emulation.setCPUThrottlingRate', { rate: slow });
  const js = async (expression) => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`in the page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  const loaded = () => new Promise((resolve) => {
    const off = b.on((m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { off(); resolve(); } });
  });
  // Load a page and wait for the engine: every chapter drawn, the faces settled, a few frames.
  const open = async (path) => {
    const done = loaded();
    await s('Page.navigate', { url: BASE + path });
    await done;
    await js(`window.__c.waitFor(() => document.querySelector(${JSON.stringify(READY[path])}))
      .then(() => document.fonts.ready).then(() => window.__c.frames(4))`);
  };
  return { s, js, size, open, loaded, sessionId, close: () => b.send('Target.closeTarget', { targetId }) };
}

// Type a team's name into the search field and press Enter, as a visitor would.
const pickTeam = (name) => `(() => {
  const i = document.getElementById('team-search');
  i.focus(); i.value = ${JSON.stringify(name)}; i.dispatchEvent(new Event('input'));
  i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
})()`;

// ---- checks: the behaviours the unit tests cannot reach ----------------------------------------
// Each returns nothing when the behaviour holds, or what it saw when it does not.

// 1. Mid-fill, the width crosses 1024px, where the hero switches between the pin (wide) and the
// flow (narrow). No row may lose ink at the crossing, nor on the scroll after it.
async function heroAcross(b) {
  const NARROW = { width: 1000, height: 900 }, WIDE = { width: 1100, height: 900 };
  const pinned = (t) => t.js(`!document.querySelector('#hero .pin').classList.contains('flow')`);
  const ink = (t) => t.js(`[...document.querySelectorAll('#hero .hr')].map((r) => +r.style.opacity)`);
  for (const [from, to] of [[NARROW, WIDE], [WIDE, NARROW]]) {
    const t = await tab(b, from);
    try {
      await t.open('/world-cup-2026');
      if ((await pinned(t)) !== (from === WIDE)) return `setup: at ${from.width}×${from.height} the hero should ${from === WIDE ? '' : 'not '}pin`;
      // Mid-fill: pinned, half a screen of travel; flowing, the seventh row on the reading line.
      await t.js(`(async () => {
        const y = ${from === WIDE} ? innerHeight / 2
          : document.querySelectorAll('#hero .hr')[6].getBoundingClientRect().top + scrollY - 0.92 * innerHeight;
        scrollTo({ top: Math.max(0, y), behavior: 'instant' });
        await window.__c.settle();
      })()`);
      let floor = await ink(t);
      if (!floor.some((v) => v < 0.07) || !floor.some((v) => v > 0.3)) return `setup: the column is not mid-fill (${floor.join(' ')})`;
      await t.size(to);
      await t.js('window.__c.settle()');
      if ((await pinned(t)) !== (to === WIDE)) return `setup: at ${to.width}×${to.height} the hero should ${to === WIDE ? '' : 'not '}pin`;
      for (let step = 0; step <= 12; step++) {
        const now = await ink(t);
        const i = now.findIndex((v, k) => v < floor[k]);
        if (i >= 0) return `${from.width} to ${to.width}: row ${i + 1} went from ${floor[i]} to ${now[i]} ${step ? `${step} scroll steps after the crossing` : 'at the crossing'}`;
        floor = now;
        await t.js(`(async () => { scrollBy({ top: innerHeight / 10, behavior: 'instant' }); await window.__c.settle(); })()`);
      }
    } finally { await t.close(); }
  }
}

// 2. Under reduced motion the sheet is finished at load, and the bracket's sideways cue and phone
// summary still follow the width when it changes.
async function reducedFollows(b) {
  const t = await tab(b, DESKTOP, { reduced: true });
  try {
    await t.open('/world-cup-2026');
    const look = () => t.js(`(() => {
      const x = document.querySelector('#bracket .lock > .scroll-x'), cue = x.nextElementSibling;
      const shown = (el) => !!el && getComputedStyle(el).display !== 'none';
      return { sx: x.classList.contains('sx'), cue: !!cue && cue.classList.contains('sxnote') && shown(cue),
               summary: shown(document.querySelector('#bracket .bsum')) };
    })()`);
    for (const [view, on] of [[DESKTOP, false], [{ width: 820, height: 1180 }, true], [DESKTOP, false]]) {
      await t.size(view);
      await t.js('window.__c.frames(4)');
      const v = await look();
      if (v.sx !== on || v.cue !== on || v.summary !== on)
        return `at ${view.width}×${view.height} the bracket ${on ? 'overflows, so its cue and summary should show' : 'fits, so its cue and summary should be gone'}: ${JSON.stringify(v)}`;
    }
  } finally { await t.close(); }
}

// 3. A pick made while the first team's file is on its way wins: Spain's file is held at the
// network until Brazil has been picked and drawn, then let through.
async function earlyPick(b) {
  const t = await tab(b, DESKTOP);
  const held = [];
  const off = b.on((m) => { if (m.sessionId === t.sessionId && m.method === 'Fetch.requestPaused') held.push(m.params.requestId); });
  try {
    await t.s('Fetch.enable', { patterns: [{ urlPattern: '*team_ES.json*' }] });
    const done = t.loaded();
    await t.s('Page.navigate', { url: BASE + '/world-cup-2026' });
    await done;
    await t.js(`window.__c.waitFor(() => document.getElementById('team-search'))`);
    for (let i = 0; !held.length; i++) {
      if (i > 800) return "setup: Spain's file was never requested";
      await new Promise((r) => setTimeout(r, 25));
    }
    await t.js(pickTeam('Brazil'));
    await t.js(`window.__c.waitFor(() => document.querySelector('#pick-a-team .th .tn')?.textContent === 'Brazil')`);
    for (const requestId of held) await t.s('Fetch.continueRequest', { requestId });
    await t.s('Fetch.disable');
    await t.js('window.__c.sleep(800).then(() => window.__c.frames(4))');
    const v = await t.js(`({ team: document.querySelector('#pick-a-team .th .tn')?.textContent,
      flag: document.querySelector('#pick-a-team .th > img.flag')?.getAttribute('src'),
      field: document.getElementById('team-search').value })`);
    if (v.team !== 'Brazil' || !v.flag?.endsWith('/br.png') || v.field !== 'Brazil') return `after Spain's file arrived: ${JSON.stringify(v)}`;
  } finally { off(); await t.close(); }
}

// 4. A pick whose file does not arrive: the previous team comes back at full ink with its name and
// its address, one line under the search field says what happened, and the next pick clears it.
// With motion and under reduced motion (no fade).
async function failedPick(b) {
  for (const reduced of [false, true]) {
    const t = await tab(b, DESKTOP, { reduced });
    const off = b.on((m) => {
      if (m.sessionId === t.sessionId && m.method === 'Fetch.requestPaused')
        t.s('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'Failed' }).catch(() => {});
    });
    const mode = reduced ? 'reduced motion' : 'motion';
    try {
      await t.open('/world-cup-2026');
      await t.s('Fetch.enable', { patterns: [{ urlPattern: '*team_BR.json*' }] });
      await t.js(pickTeam('Brazil'));
      await t.js('window.__c.sleep(600).then(() => window.__c.frames(2))');
      const v = await t.js(`(() => {
        const note = document.querySelector('#pick-a-team .pk [role=status]');
        return { opacity: getComputedStyle(document.querySelector('#pick-a-team .tbody')).opacity,
                 team: document.querySelector('#pick-a-team .th .tn')?.textContent,
                 field: document.getElementById('team-search').value, hash: location.hash,
                 note: note ? note.textContent : null };
      })()`);
      const want = { opacity: '1', team: 'Spain', field: 'Spain', hash: '', note: "Brazil's runs did not load. Pick again to retry." };
      const wrong = Object.keys(want).filter((k) => v[k] !== want[k]);
      if (wrong.length) return `${mode}: ${wrong.map((k) => `${k} ${JSON.stringify(v[k])}, wanted ${JSON.stringify(want[k])}`).join('; ')}`;
      await t.s('Fetch.disable');
      await t.js(pickTeam('Brazil'));
      await t.js(`window.__c.waitFor(() => document.querySelector('#pick-a-team .th .tn')?.textContent === 'Brazil').then(() => window.__c.frames(2))`);
      const after = await t.js(`document.querySelector('#pick-a-team .pk [role=status]').textContent`);
      if (after !== '') return `${mode}: after a pick that worked, the line still reads ${JSON.stringify(after)}`;
    } finally { off(); await t.close(); }
  }
}

async function checks() {
  const b = await launch();
  let failed = 0;
  const run = async (name, fn) => {
    let why;
    try { why = await fn(b); } catch (e) { why = e.message; }
    console.log(`${why ? 'FAIL' : 'pass'}  ${name}${why ? `: ${why}` : ''}`);
    if (why) failed++;
  };
  try {
    await run('the hero keeps its ink when the width crosses 1024px mid-fill', heroAcross);
    await run('under reduced motion the sideways cue and the bracket summary follow the width', reducedFollows);
    await run('a pick made while the first team loads is the team on the page', earlyPick);
    await run('a failed pick restores the team and says so; the next pick clears the line', failedPick);
  } finally { await b.close(); }
  if (failed) process.exitCode = 1;
}

// ---- dump: every painted value, for a before-and-after diff ------------------------------------
// Both pages, both profiles, motion on and reduced. From the top, in steps of half a screen, each
// step records what changed since the last; the engine only prints forward, so the same steps give
// the same file on the same code.

async function dump(file) {
  const b = await launch();
  const out = {};
  try {
    for (const path of PAGES) for (const [name, view] of [['desktop', DESKTOP], ['phone', PHONE]]) for (const reduced of [false, true]) {
      const t = await tab(b, view, { reduced });
      try {
        await t.open(path);
        out[`${path} ${name} ${reduced ? 'reduced' : 'motion'}`] = await t.js(`(async () => {
          const c = window.__c, steps = [], end = document.documentElement.scrollHeight - innerHeight;
          let before = {};
          for (let y = 0; ; y = Math.min(end, y + innerHeight / 2)) {
            scrollTo({ top: y, behavior: 'instant' });
            await c.settle();
            const now = c.state(), delta = {};
            for (const k of new Set([...Object.keys(before), ...Object.keys(now)])) if (before[k] !== now[k]) delta[k] = now[k] ?? null;
            steps.push({ y: Math.round(scrollY), delta });
            before = now;
            if (y >= end) break;
          }
          return steps;
        })()`);
      } finally { await t.close(); }
    }
  } finally { await b.close(); }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  console.log(`${file}: ${Object.keys(out).length} runs`);
}

// ---- measure: spec section 5's protocol and verdicts --------------------------------------------

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0);
  return { p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +(s.at(-1) ?? 0).toFixed(2) };
};
const addUp = (entries) => { const by = new Map(); for (const [k, ms] of entries) by.set(k, (by.get(k) || 0) + ms); return [...by.values()]; };

async function measure() {
  const b = await launch();
  const rows = [];
  try {
    for (const [name, view] of [['phone', PHONE], ['desktop', DESKTOP]]) {
      const t = await tab(b, view, { slow: 6, timing: true });
      try {
        await t.open('/world-cup-2026');
        await t.s('Performance.enable');
        const metric = (m, k) => m.metrics.find((x) => x.name === k).value;
        const m0 = await t.s('Performance.getMetrics');
        // Two screens a second at 60 frames a second: a thirtieth of a screen per frame, top to bottom.
        await t.js(`(async () => {
          window.__frames.length = 0;
          const c = window.__c, end = document.documentElement.scrollHeight - innerHeight;
          while (scrollY < end - 1) { scrollBy({ top: innerHeight / 30, behavior: 'instant' }); await c.frames(1); }
          await c.frames(3);
        })()`);
        const m1 = await t.s('Performance.getMetrics');
        const per = addUp(await t.js('window.__frames'));
        rows.push({ profile: name, what: 'scroll: engine frame work, ms per frame', n: per.length, ...stats(per),
          layouts: metric(m1, 'LayoutCount') - metric(m0, 'LayoutCount'),
          layoutMs: +(1000 * (metric(m1, 'LayoutDuration') - metric(m0, 'LayoutDuration'))).toFixed(1) });
        if (view.mobile) {
          // The address bar: 844 to 788 and back, at the hero, the bracket and the hosts.
          for (const where of ['#hero', '#bracket', '#hosts']) {
            await t.js(`(async () => { document.querySelector('${where}').scrollIntoView({ behavior: 'instant' }); await window.__c.settle(); })()`);
            for (const height of [788, 844]) {
              await t.js('window.__resizes.length = 0');
              await t.size({ ...view, height });
              await t.js('window.__c.frames(3)');
              const ev = addUp(await t.js('window.__resizes'));
              rows.push({ profile: name, what: `resize to ${height} at ${where}: handlers, ms per event`, n: ev.length, ...stats(ev) });
            }
          }
        }
      } finally { await t.close(); }
    }
  } finally { await b.close(); }
  console.table(rows);
  const frame = Math.max(...rows.filter((r) => r.what.startsWith('scroll')).map((r) => r.p95));
  const resize = Math.max(...rows.filter((r) => r.what.startsWith('resize')).map((r) => r.max));
  console.log(`items 4 and 8: engine frame work at the 95th percentile ${frame} ms against 8 ms: ${frame > 8 ? 'FIX' : 'close'}`);
  console.log(`item 3: the slowest address-bar resize ${resize} ms against 16.7 ms: ${resize > 16.7 ? 'FIX' : 'close'}`);
}

// ---- shots: the render check's screenshots ------------------------------------------------------

async function shots(dir) {
  mkdirSync(dir, { recursive: true });
  const b = await launch();
  const save = (file, data) => writeFileSync(join(dir, file), Buffer.from(data, 'base64'));
  try {
    for (const [name, view] of [['desktop', DESKTOP], ['mobile', PHONE]]) {
      // The first viewport, as a visitor meets it.
      let t = await tab(b, view);
      await t.open('/world-cup-2026');
      save(`${name}.png`, (await t.s('Page.captureScreenshot', { format: 'png' })).data);
      await t.close();
      // The finished sheets (reduced motion prints every unit at load): down the page and back so
      // every lazy flag has arrived, then the top 9000px in one image.
      for (const path of PAGES) {
        t = await tab(b, { ...view, scale: 1 }, { reduced: true });
        await t.open(path);
        const h = await t.js(`(async () => {
          const c = window.__c;
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo({ top: y, behavior: 'instant' }); await c.sleep(150); }
          scrollTo({ top: 0, behavior: 'instant' }); await c.sleep(800); await c.frames(2);
          return Math.min(document.documentElement.scrollHeight, 9000);
        })()`);
        const shot = await t.s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
          clip: { x: 0, y: 0, width: view.width, height: h, scale: 1 } });
        save(`${name}-full${path.replace('/', '-')}.png`, shot.data);
        await t.close();
      }
    }
  } finally { await b.close(); }
  console.log(`${dir}: desktop.png, mobile.png and four full-page captures`);
}

// ---- main ------------------------------------------------------------------------------------------

const [cmd, arg] = process.argv.slice(2);
const commands = { checks, dump: () => dump(arg), measure, shots: () => shots(arg) };
if (!commands[cmd] || ((cmd === 'dump' || cmd === 'shots') && !arg)) {
  console.error('usage: node tools/check.mjs checks | dump <file> | measure | shots <dir>');
  process.exit(2);
}
try { await fetch(BASE); } catch (e) {
  console.error(`nothing is serving ${BASE}: run python3 tools/serve.py first`);
  process.exit(2);
}
await commands[cmd]();
```

- [ ] **Step 2: Run the checks against today's code; all four must fail**

Run: `node tools/check.mjs checks`
Expected: four `FAIL` lines, each for the bug it names: (1) a hero row going down in ink, (2) `sx`, `cue` and `summary` still false at 820 wide, (3) `team` "Spain" after Spain's file arrived, (4) `opacity "0"`, `hash "#team=BR"` and `note null`, among others. A check that passes on today's code does not reproduce its bug: fix the check, not the site. A `setup:` failure means the scene was not reached. For check 1, if the hero does not pin at 1100×900, raise both heights together (for example 1000×1000 and 1100×1000) until the wide side pins and the narrow side flows, and keep those numbers in the file.

- [ ] **Step 3: Take the reference dump twice and compare**

```bash
node tools/check.mjs dump output/check/baseline.json
node tools/check.mjs dump output/check/again.json
cmp output/check/baseline.json output/check/again.json && echo identical
```
Expected: `identical`. If the files differ, the dump is not deterministic: find the source with `diff` (a value still moving when `settle()` returns, a flag's load) and fix the tool until two runs match. The equality gate means nothing until they do.

- [ ] **Step 4: Measure (the decision input for Tasks 5 and 6)**

Run: `node tools/check.mjs measure`
Expected: a table (phone and desktop scroll rows, six phone resize rows) and two verdict lines, `items 4 and 8: ... FIX|close` and `item 3: ... FIX|close`. Copy the whole output into the task report exactly; the controller decides Tasks 5 and 6 from it and the roadmap quotes it.

- [ ] **Step 5: The before screenshots**

Run: `node tools/check.mjs shots .impeccable/review/before`
Expected: `desktop.png`, `mobile.png` and four `*-full-*.png` files. Open `desktop.png` and `mobile.png` (the Read tool shows images) and confirm each is the first viewport of the World Cup page at its width (the mobile one 390 wide, not a crop of a 500px layout).

- [ ] **Step 6: README**

In `README.md`'s quick start, after the line `python3 tools/serve.py                   # the site at http://localhost:8001, addresses as on Vercel`, add:

```
node tools/check.mjs checks              # the site's behaviours in a headless Chrome (serve first)
```

In the project layout, replace
`tools/              serve.py, the local server for site/: clean addresses and site/vercel.json's redirects`
with
`tools/              serve.py, the local server for site/: clean addresses and site/vercel.json's redirects;`
`                    check.mjs, the site's checks, dumps, timings and screenshots in a headless Chrome`

- [ ] **Step 7: Commit**

```bash
git add tools/check.mjs README.md
git commit -m "Component 11f: tools/check.mjs, the site's checks in a headless Chrome" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Shared helpers (item 6)

Recommended model: standard (mechanical, with a strict check).

**Files:**
- Modify: `site/js/print.js`, `site/js/svg.js`, `site/js/bracket.js`, `site/js/calibration.js`, `site/js/groups.js`, `site/js/hosts.js`, `site/js/paradoxes.js`, `site/js/team.js`, `site/js/underdogs.js`
- Test: `tests/js/print.test.mjs`

**Interfaces:**
- Consumes: `output/check/baseline.json` (Task 1).
- Produces: `print.js` exports `inkAt(p)`, `ruleAt(p)` (numbers) and `reduced()` (boolean); `svg.js` exports `snap(v)`; `print.js` no longer exports `fmt` (use `fmtCount` from `dom.js`).

- [ ] **Step 1: Read `/Users/thiagocaetano/Developer/Caetano-2/.claude/skills/impeccable/reference/craft-floor.md`**

- [ ] **Step 2: Write the failing tests**

In `tests/js/print.test.mjs`, change the import line to

```js
import { clamp, inkAt, ruleAt, rowWindow, blockProgress, lineProgress, densityTarget, tintStrength, holdPhase, roundProgress } from '../../site/js/print.js';
import { fmtCount } from '../../site/js/dom.js';
```

replace the `fmt` test with

```js
test('fmtCount rounds and groups thousands', () => {
  assert.equal(fmtCount(18626), '18,626');
  assert.equal(fmtCount(0.4), '0');
  assert.equal(fmtCount(12345.6), '12,346');
});

test('inkAt: an unprinted text, row head or cell sits at 4% ink and climbs to full', () => {
  near(inkAt(0), 0.04);
  near(inkAt(0.5), 0.52);
  near(inkAt(1), 1);
});

test('ruleAt: a box rule sits at 6% ink and climbs to full', () => {
  near(ruleAt(0), 0.06);
  near(ruleAt(0.5), 0.53);
  near(ruleAt(1), 1);
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `node --test tests/js/*.mjs`
Expected: FAIL, `does not provide an export named 'inkAt'`.

- [ ] **Step 4: The helpers**

In `site/js/print.js`:
- Replace `import { layoutScrollX } from './dom.js';` with `import { layoutScrollX, fmtCount } from './dom.js';`.
- Delete `export const fmt = (n) => Math.round(n).toLocaleString('en-GB');`.
- After `export const clamp = ...`, add:

```js
// The two print floors (spec §4.1): an unprinted text, row head or cell sits at 4% ink and a box's
// rule at 6%, each climbing to full ink as its progress p goes from 0 to 1.
export const inkAt = (p) => 0.04 + 0.96 * p;
export const ruleAt = (p) => 0.06 + 0.94 * p;
```

- Change `const reduced = () => ...` to `export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;`.
- In `paintCounts`, `fmt(p * +c.dataset.count)` becomes `fmtCount(p * +c.dataset.count)`.
- In `paintRow` (two places) and `paintBlock`, `(0.04 + 0.96 * p).toFixed(3)` becomes `inkAt(p).toFixed(3)`.

In `site/js/svg.js`, after `const NS = ...`, add:

```js
// A hairline on the pixel, not across two: a one-pixel line at a whole coordinate straddles two
// pixel rows, so every chart puts its rules and ticks on the half pixel.
export const snap = (v) => Math.round(v) + 0.5;
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `node --test tests/js/*.mjs`
Expected: 14 pass, 0 fail.

- [ ] **Step 6: Every copy becomes the shared helper**

Change each line below and nothing else; every `.toFixed(3)` and the bracket's `* 0.75` stay where they are.

| File | Import change | Line(s) | Before | After |
|---|---|---|---|---|
| `bracket.js` | add `inkAt, ruleAt` to the `./print.js` import; add `import { snap } from './svg.js';` | 96 | `(0.06 + 0.94 * pr)` | `ruleAt(pr)` |
| | | 97 | `const on = 0.04 + 0.96 * pw;` | `const on = inkAt(pw);` |
| | | 130 | `(0.04 + 0.96 * v)` | `inkAt(v)` |
| | | 135, 137 | `(0.04 + 0.96 * pf)` | `inkAt(pf)` |
| | | 139 | `(0.04 + 0.96 * pt)` | `inkAt(pt)` |
| | | 169 | `(0.06 + 0.94 * p)` | `ruleAt(p)` |
| | | 200 | `const snap = (v) => Math.round(v) + 0.5;      // a hairline on the pixel, not across two` | delete the line |
| `calibration.js` | `import { svgEl, snap } from './svg.js';` | 18 | the local `const snap = ...` line | delete the line |
| `groups.js` | add `inkAt, ruleAt` to the `./print.js` import | 13 | `(0.06 + 0.94 * label)` | `ruleAt(label)` |
| | | 14 | `(0.04 + 0.96 * label)` | `inkAt(label)` |
| `hosts.js` | `import { svgEl, snap } from './svg.js';`; add `inkAt` to the `./print.js` import | 48 | the local `const snap = ...` line | delete the line |
| | | 81 | `(0.04 + 0.96 * p)` | `inkAt(p)` |
| | | 113 | `(0.04 + 0.96 * r.headP)` | `inkAt(r.headP)` |
| `paradoxes.js` | `import { svgEl, snap } from './svg.js';`; add `inkAt, ruleAt` to the `./print.js` import | 68 | the local `const snap = ...` line | delete the line |
| | | 115, 117 | `(0.04 + 0.96 * p)` | `inkAt(p)` |
| | | 129 | `(0.06 + 0.94 * ink)` | `ruleAt(ink)` |
| | | 131 | `(0.04 + 0.96 * ink)` | `inkAt(ink)` |
| | | 136 | `(0.04 + 0.96 * q)` | `inkAt(q)` |
| `team.js` | add `inkAt, reduced` to the `./print.js` import | 17 | `const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;` | delete the line |
| | | 43, 44 | `(0.04 + 0.96 * p)` | `inkAt(p)` |
| `underdogs.js` | add `inkAt` to the `./print.js` import | 28, 29 | `(0.04 + 0.96 * ink)` | `inkAt(ink)` |

Line numbers are before this task's edits; match on the text. Then:

Run: `grep -n "0\.04 + 0\.96\|0\.06 + 0\.94\|const snap\|const reduced\|fmt(" site/js/*.js`
Expected: only the two definitions in `print.js` (`inkAt`, `ruleAt`), `export const reduced` in `print.js`, and `export const snap` in `svg.js`.

- [ ] **Step 7: Prove an ordinary read is unchanged**

```bash
node --test tests/js/*.mjs
node tools/check.mjs dump output/check/now.json && cmp output/check/baseline.json output/check/now.json && echo identical
```
Expected: 14 pass; `identical`. Any difference is a slip in Step 6: `diff` the files, find it, fix it.

- [ ] **Step 8: Screenshots**

Run: `node tools/check.mjs shots .impeccable/review`, open `desktop.png` and `mobile.png`, and confirm they match `.impeccable/review/before/` (`cmp` is enough when the bytes match).

- [ ] **Step 9: Commit**

```bash
git add site/js tests/js/print.test.mjs
git commit -m "Component 11f: one home for the print floors, the pixel snap and the motion test" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: The hero across 1024px (item 1) and reduced motion following the width (item 2)

Recommended model: the most capable (the engine).

**Files:**
- Modify: `site/js/print.js` (`pin`, `tickPin`, `boot`)

**Interfaces:**
- Consumes: `reduced()` (Task 2); `node tools/check.mjs checks` (Task 1), whose checks 1 and 2 fail before this task.
- Produces: no new exports.

- [ ] **Step 1: Read `/Users/thiagocaetano/Developer/Caetano-2/.claude/skills/impeccable/reference/craft-floor.md`**

- [ ] **Step 2: Confirm checks 1 and 2 fail**

Run: `node tools/check.mjs checks`
Expected: `FAIL` on the first two lines (and on the last two, which Task 4 fixes).

- [ ] **Step 3: Item 1, each hero row keeps its progress in both modes**

In `pin()`, replace

```js
  pinned = { block, held, rows: rows.map((el, i) => ({ el, i, p: 0 })), painter, p: 0, active: false };
  rows.forEach((el) => painter(el, reduced() ? 1 : 0));
```

with

```js
  const p0 = reduced() ? 1 : 0;
  pinned = { block, held, rows: rows.map((el, i) => ({ el, i, p: p0 })), painter, p: 0, active: false };
  rows.forEach((el) => painter(el, p0));
```

In `tickPin()`, replace

```js
    if (p !== pinned.p) { pinned.p = p; pinned.rows.forEach((r) => pinned.painter(r.el, rowWindow(p, r.i, pinned.rows.length))); }
    return p >= 1;
```

with

```js
    if (p !== pinned.p) {
      pinned.p = p;
      // A row keeps the most it has printed in either mode, so a width crossing 1024px mid-fill,
      // which moves the hero between the pin and the flow, never takes ink back; and only a row
      // whose value moved is painted.
      for (const r of pinned.rows) {
        const v = Math.max(r.p, rowWindow(p, r.i, pinned.rows.length));
        if (v !== r.p) { r.p = v; pinned.painter(r.el, v); }
      }
    }
    return p >= 1;
```

Run: `node tools/check.mjs checks`
Expected: the first line `pass`.

- [ ] **Step 4: Commit item 1**

```bash
git add site/js/print.js
git commit -m "Component 11f: the hero keeps its ink when the width crosses 1024px mid-fill" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Item 2, both paths lay out again on resize and once the faces settle**

In `boot()`, replace

```js
  window.addEventListener('pagehide', savePlace);
  if (reduced()) { units.forEach((u) => set(u, 1)); layoutPin(); land(); return; }
```

with

```js
  window.addEventListener('pagehide', savePlace);
  // Both paths lay the sheet out again when the window changes and once the faces have settled,
  // so the sideways cue and the bracket's phone summary follow the width under reduced motion
  // too; only the moving path then paints from the scroll.
  const still = reduced();
  const relayout = () => { H = window.innerHeight; W = window.innerWidth; layoutPin(); if (!still) schedule(); };
  window.addEventListener('resize', relayout);
  document.fonts.ready.then(relayout);   // the held screen's height settles with the faces
  if (still) { units.forEach((u) => set(u, 1)); layoutPin(); land(); return; }
```

and delete the two old listeners further down:

```js
  window.addEventListener('resize', () => { H = window.innerHeight; W = window.innerWidth; layoutPin(); schedule(); });
  document.fonts.ready.then(() => { layoutPin(); schedule(); });   // the held screen's height settles with the faces
```

- [ ] **Step 6: Verify**

```bash
node tools/check.mjs checks
node --test tests/js/*.mjs
node tools/check.mjs dump output/check/now.json && cmp output/check/baseline.json output/check/now.json && echo identical
```
Expected: the first two lines `pass`; 14 pass; `identical`. A dump difference confined to `sx` classes and `sxnote` elements in the `reduced` runs would mean the faces settled after boot at load and item 2 now corrects it: show that diff in the report instead of accepting it silently. Any other difference is a regression.

- [ ] **Step 7: Screenshots**

Run: `node tools/check.mjs shots .impeccable/review` and compare `desktop.png` and `mobile.png` with `.impeccable/review/before/`.

- [ ] **Step 8: Commit item 2**

```bash
git add site/js/print.js
git commit -m "Component 11f: under reduced motion the sideways cue and the bracket summary follow the width" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: The first load against an early pick (item 5) and the failed pick

Recommended model: the most capable (async ordering, focus and assistive technology).

**Files:**
- Modify: `site/js/team.js` (`render`: the picker, `pick`, the first draw)
- Modify: `DESIGN.md` (Inputs / Fields)

**Interfaces:**
- Consumes: `node tools/check.mjs checks`, whose checks 3 and 4 fail before this task.
- Produces: `<p class="foot" role="status">` as the last child of `#pick-a-team .pk`.

- [ ] **Step 1: Read `/Users/thiagocaetano/Developer/Caetano-2/.claude/skills/impeccable/reference/craft-floor.md`**

- [ ] **Step 2: Confirm checks 3 and 4 fail**

Run: `node tools/check.mjs checks`
Expected: `FAIL` on the last two lines.

- [ ] **Step 3: Item 5, the first draw yields to a pick**

At the end of `render()`, replace

```js
  draw(await ctx.team(code), false);
```

with

```js
  // A pick made while this file was on its way has drawn its own team; drawing the first one now
  // would land on top of it, the picked team's flag over the first team's numbers.
  const first = gen;
  const t = await ctx.team(code);
  if (first === gen) draw(t, false);
```

Run: `node tools/check.mjs checks`
Expected: the third line `pass`.

- [ ] **Step 4: Commit item 5**

```bash
git add site/js/team.js
git commit -m "Component 11f: a pick made while the first team loads stays on the page" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: The failed pick**

In `render()`, before `const pk = ...`, add

```js
  // The line a failed pick prints under the search field. It is on the page from the start, empty,
  // so assistive technology announces its text when a failure sets it; empty, its margins fold into
  // the picker's own and it takes no room.
  const note = h('p', { class: 'foot', role: 'status' });
```

and make `note` the picker's last child:

```js
  const pk = h('div', { class: 'pk' },
    h('p', { class: 'lead' }, 'Pick a team, or one of the favourites: ', favs),
    h('label', { class: 'sr', for: 'team-search' }, 'Team'),
    h('div', { class: 'sw' }, h('div', { class: 'srch' }, fsl, input, clear), results),
    note);
```

Replace the whole of `pick()` with

```js
  async function pick(c) {
    const was = code, wasHash = location.hash;
    code = c;
    history.replaceState(null, '', `#team=${code}`);
    // draw() rebuilds the favourites line, so a favourite that was activated is removed from the
    // document and focus would fall to <body>. From a row or the keyboard the focus is already
    // on the input, so it stays there; from a tap on a favourite it must not go to the input,
    // which would open the on-screen keyboard, so it goes to the rebuilt team header instead.
    const onInput = document.activeElement === input;
    closeList(false);
    if (onInput) input.focus();
    note.textContent = '';                     // a new pick clears the last one's failure
    const g = ++gen;
    // The team's JSON is fetched while the old ink fades, so the fade is the whole wait.
    const fade = fadeOut(body);
    let t;
    try {
      t = await ctx.team(code);
    } catch (e) {
      // The file did not arrive. Once the fade has run, and unless a newer pick has taken over,
      // the previous team comes back as it was, name and address included, and one line says
      // what happened and what to do.
      await fade;
      if (g !== gen) return;
      code = was;
      history.replaceState(null, '', wasHash || location.pathname + location.search);
      input.value = ctx.byCode[code].name;
      body.style.opacity = '';
      note.textContent = `${ctx.byCode[c].name}'s runs did not load. Pick again to retry.`;
      return;
    }
    await fade;
    if (g !== gen) return;                     // a second pick overtook this one
    draw(t, true);
    body.style.opacity = '';
    if (!onInput) body.querySelector('.th').focus();
    reprint(body, PRINT_MS);                   // the new team prints from zero, ease-out
  }
```

- [ ] **Step 6: DESIGN.md**

In `DESIGN.md`, section "### Inputs / Fields", after the `- **Results:** ...` bullet, add:

```markdown
- **Failure:** a pick whose file does not arrive leaves the previous team on the page, with its name in the field and its address, and prints one line under the field in the foot-note role (News Cycle .8rem, muted, `role="status"`): "Brazil's runs did not load. Pick again to retry." The next pick clears it. Empty, the line takes no room.
```

- [ ] **Step 7: Verify**

```bash
node tools/check.mjs checks
node --test tests/js/*.mjs
node tools/check.mjs dump output/check/now.json; diff output/check/baseline.json output/check/now.json
```
Expected: all four lines `pass`; 14 pass. The diff shows only the new line's two attributes, `... @class": "foot"` and `... @role": "status"` (plus its empty `text`), in the first step of each of the four `/world-cup-2026` runs; nothing else. Then make this dump the reference for later tasks: `cp output/check/now.json output/check/baseline.json`.

- [ ] **Step 8: Screenshots**

Run: `node tools/check.mjs shots .impeccable/review` and compare with `.impeccable/review/before/`: the empty line takes no room, so nothing moves.

- [ ] **Step 9: Commit the failed pick**

```bash
git add site/js/team.js DESIGN.md
git commit -m "Component 11f: a failed pick restores the team and says so in one line" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5 (conditional): Measure first, then paint (items 4 and 8)

Run only if Task 1's `measure` printed `items 4 and 8: ... FIX`. Otherwise skip; Task 8 records the numbers and closes both.

Recommended model: the most capable (the engine).

**Files:**
- Modify: `site/js/print.js` (`tick`), `site/js/groups.js` (the column count)

- [ ] **Step 1: Read `/Users/thiagocaetano/Developer/Caetano-2/.claude/skills/impeccable/reference/craft-floor.md`**

- [ ] **Step 2: Item 4, `tick()` reads every live unit, then paints**

In `print.js`, replace

```js
  units = units.filter((u) => u.el.isConnected);
  for (const u of units) {
    if (u.manual || !u.live) continue;
    set(u, progressOf(u));
  }
```

with

```js
  units = units.filter((u) => u.el.isConnected);
  // Every live unit is measured before any is painted: a paint changes the layout (a count's text,
  // a bar's width), so a measurement after it would make the browser lay the page out again, once
  // per unit (spec §4, the budget).
  const live = units.filter((u) => !u.manual && u.live);
  const progress = live.map(progressOf);
  live.forEach((u, i) => set(u, progress[i]));
```

- [ ] **Step 3: Item 8, the wall's column count comes from the layout, not from every frame**

In `groups.js`, replace

```js
  const cols = () => getComputedStyle(wall).gridTemplateColumns.split(' ').length;
```

with

```js
  // The wall's column count follows the width alone (site.css's media queries), so it is read once
  // the wall is on the page and again on each resize, not per box on every frame.
  let columns = 4;
  const countColumns = () => { columns = getComputedStyle(wall).gridTemplateColumns.split(' ').length; };
```

change `register(box, paintBox, { lead: () => (i % cols()) * LEAD });` to `register(box, paintBox, { lead: () => (i % columns) * LEAD });`, and after `section.replaceChildren(...)` at the end of `render()` add

```js
  countColumns();
  window.addEventListener('resize', countColumns);   // before the engine's own, which boots later
```

- [ ] **Step 4: Verify and re-measure**

```bash
node tools/check.mjs checks
node --test tests/js/*.mjs
node tools/check.mjs dump output/check/now.json && cmp output/check/baseline.json output/check/now.json && echo identical
node tools/check.mjs measure
```
Expected: four `pass`; 14 pass; `identical`; copy the new `measure` output into the report. A dump difference means a paint moved the layout within a frame: report it with the diff rather than accepting it.

- [ ] **Step 5: Screenshots, then commit**

Run `node tools/check.mjs shots .impeccable/review` and compare with the before set. Then:

```bash
git add site/js/print.js site/js/groups.js
git commit -m "Component 11f: each frame measures every unit before it paints any" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6 (conditional): Redraw only when the width moved (item 3)

Run only if Task 1's `measure` printed `item 3: ... FIX`. Otherwise skip; Task 8 records the numbers and closes it.

Recommended model: the most capable.

**Files:**
- Modify: `site/js/svg.js`, `site/js/bracket.js`, `site/js/hosts.js`, `site/js/paradoxes.js`, `site/js/calibration.js`; `site/js/print.js` only under Step 4

- [ ] **Step 1: Read `/Users/thiagocaetano/Developer/Caetano-2/.claude/skills/impeccable/reference/craft-floor.md`**

- [ ] **Step 2: The guard**

In `svg.js`, add:

```js
// The charts are drawn at their holders' measured widths, so a resize redraws them; but a resize
// that leaves the page's width alone (a phone's address bar changes only the height) moves
// nothing, and a holder with no width (hidden) has nothing to draw into. The redraw once the
// faces settle is not routed through here: the faces move the boxes without moving the width.
export function redrawOnWidth(holder, draw) {
  let drawnAt = document.documentElement.clientWidth;
  window.addEventListener('resize', () => {
    const w = document.documentElement.clientWidth;
    if (w === drawnAt || !holder.clientWidth) return;
    drawnAt = w;
    draw();
  });
}
```

Every media query in `site.css` is a width query, so the page's width decides every chart's width.

- [ ] **Step 3: The four charts use it**

Replace `window.addEventListener('resize', draw);` with, in `bracket.js` (inside `drawConnectors`) `redrawOnWidth(grid, draw);`, in `hosts.js` `redrawOnWidth(regions[0].holder, draw);`, in `paradoxes.js` `redrawOnWidth(holder, draw);`, in `calibration.js` `redrawOnWidth(holders[0], draw);`, adding `redrawOnWidth` to each file's `./svg.js` import (`bracket.js` gains it beside `snap`). Leave every `document.fonts.ready.then(draw)` as it is.

Run:

```bash
node tools/check.mjs checks
node tools/check.mjs dump output/check/now.json && cmp output/check/baseline.json output/check/now.json && echo identical
node tools/check.mjs measure
```
Expected: four `pass`; `identical`; if the `item 3` line now reads `close`, go to Step 5.

- [ ] **Step 4: Only if `item 3` still reads `FIX`: the engine skips a height-only change while neither pin is engaged**

In `print.js`'s `boot()`, replace the `relayout` line from Task 3 with

```js
  const relayout = () => {
    const w = window.innerWidth;
    // A phone's address bar changes the height alone; with neither pin engaged, nothing the
    // layout measures has moved, so the new height is taken and the sheet repaints from it.
    const engaged = (pinned && pinned.active) || holds.some((o) => o.candidates.some((el) => el.classList.contains('held')));
    if (w === W && !engaged) { H = window.innerHeight; if (!still) schedule(); return; }
    H = window.innerHeight; W = w; layoutPin(); if (!still) schedule();
  };
```

and run the three commands of Step 3 again.

- [ ] **Step 5: Screenshots, then commit**

Run `node tools/check.mjs shots .impeccable/review` and compare with the before set. Then:

```bash
git add site/js
git commit -m "Component 11f: the charts redraw only when the page's width moved" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: The run-path warning (item 12) and the backtest's site file removed

Recommended model: standard.

**Files:**
- Modify: `src/intsoccer/montecarlo/run.py`, `tests/test_montecarlo.py`
- Modify: `src/intsoccer/backtest/build.py`, `src/intsoccer/backtest/__init__.py`, `src/intsoccer/cli.py`, `tests/test_backtest.py`, `README.md`, `docs/BACKTEST.md`
- Delete: `site/data/wc2026/backtest.json`

**Interfaces:**
- Produces: `resolve_meta_path(path)` unchanged in signature, now warning (`UserWarning`) when it substitutes; `build_backtest(run_dir, results, out_dir=None, calibration=CALIBRATION_PATH, names=None)` without `site_dir`; no `site_payload`; `intsoccer backtest` without `--site`.

- [ ] **Step 1: The failing test for the warning**

In `tests/test_montecarlo.py`, add `import warnings` to the imports, and replace the body of `test_resolve_meta_path_falls_back_to_this_checkouts_data_folder` with

```python
    from intsoccer.montecarlo import resolve_meta_path
    from intsoccer.tournament.format import TOURNAMENT_DIR

    stale = "/Users/someone/OldPlace/IntSoccerPredictor/data/tournaments/wc2026.yaml"
    with pytest.warns(UserWarning, match="OldPlace.*wc2026.yaml"):
        assert resolve_meta_path(stale) == TOURNAMENT_DIR / "wc2026.yaml"
    stale_snapshot = "/Users/someone/OldPlace/data/snapshots/2026-06-10_wc2026.csv"
    with pytest.warns(UserWarning, match="2026-06-10_wc2026.csv"):
        assert resolve_meta_path(stale_snapshot).name == "2026-06-10_wc2026.csv"
    here = tmp_path / "meta.yaml"
    here.write_text("x")
    with warnings.catch_warnings():
        warnings.simplefilter("error")          # a recorded path that exists is used without a word
        assert resolve_meta_path(here) == here
    with pytest.raises(FileNotFoundError):
        resolve_meta_path("/nowhere/data/tournaments/no_such_tournament.yaml")
```

Run: `.venv/bin/python -m pytest -q tests/test_montecarlo.py -k resolve_meta_path`
Expected: FAIL, `DID NOT WARN`.

- [ ] **Step 2: The warning**

In `src/intsoccer/montecarlo/run.py`, add `import warnings` to the imports and make `resolve_meta_path`:

```python
def resolve_meta_path(path: str | Path) -> Path:
    """A path recorded in meta.yaml: as recorded if it exists, else the same file under this
    checkout's data/<folder>/ (runs record absolute paths, and the project folder has moved). The
    substitution warns, naming both paths: a run made from a variant file whose recorded path is
    gone would otherwise be read against this checkout's own file unnoticed."""
    p = Path(path)
    if p.exists():
        return p
    local = DATA_DIR / p.parent.name / p.name
    if local.exists():
        warnings.warn(f"{p} is not on disk; reading {local} from this checkout in its place",
                      UserWarning, stacklevel=2)
        return local
    raise FileNotFoundError(f"{p} is not on disk, and neither is {local}")
```

Run: `.venv/bin/python -m pytest -q`
Expected: 125 pass. The tests that read the stored 100k run (`test_report.py`, `test_backtest.py`) now list `UserWarning`s in the summary: that run's `meta.yaml` records the project's old folder. That is the warning doing its job; do not silence it.

- [ ] **Step 3: Commit item 12**

```bash
git add src/intsoccer/montecarlo/run.py tests/test_montecarlo.py
git commit -m "Component 11f: a run whose recorded file is gone says which file it reads instead" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Only with Thiago's yes (asked at the plan's handoff): re-point the stored run**

`output/` is not in git. In `output/wc2026/meta.yaml`, replace `/Users/thiagocaetano/Developer/IntSoccerPredictor/` with `/Users/thiagocaetano/Developer/Caetano-2/projects/IntSoccerPredictor/` in the `tournament_yaml` and `ratings_snapshot` lines, then run `.venv/bin/python -m pytest -q` and confirm the `UserWarning`s are gone.

- [ ] **Step 5: The backtest writes no site file**

In `tests/test_backtest.py`, rename `test_build_backtest_writes_the_four_files_and_the_site_file` to `test_build_backtest_writes_the_four_files`, change its call to `out = build_backtest(run_dir, RESULTS, calibration=cal, names={})`, and delete its last seven lines, from `site_file = tmp_path / "site" / "data" / "wc2026" / "backtest.json"` to `assert payload["tournament"] == s["tournament"] and payload["matches"] == s["matches"]`.

In `src/intsoccer/backtest/build.py`: the module docstring becomes

```python
"""Score a saved run against the real results: output/<name>/backtest/{matches,teams,
calibration}.csv + summary.json (elsewhere with `out_dir`). The record is written up in
docs/BACKTEST.md."""
```

`build_backtest`'s signature drops `site_dir` (every caller passes `out_dir` by keyword):

```python
def build_backtest(run_dir: Path, results: Path, out_dir: Path | None = None,
                   calibration: Path = CALIBRATION_PATH, names: dict | None = None) -> dict:
```

The `if site_dir is not None:` line and the three lines under it are deleted, and so is the whole of `site_payload()`.

In `src/intsoccer/backtest/__init__.py`: `from .build import build_backtest` and `__all__ = ["build_backtest"]`.

In `src/intsoccer/cli.py`: `out = build_backtest(run_dir, Path(args.results))`; delete `if args.site:` and the `print(f"site file -> ...")` under it; delete the `bt.add_argument("--site", ...)` call (both of its lines).

Delete the file: `git rm site/data/wc2026/backtest.json`.

In `README.md`: the quick-start line becomes `intsoccer backtest --run output/wc2026          # score the run -> output/wc2026/backtest/`, and in the layout `build.py (output/<name>/backtest/, site JSON); the record is docs/BACKTEST.md` becomes `build.py (output/<name>/backtest/); the record is docs/BACKTEST.md`.

In `docs/BACKTEST.md`: the opening paragraph's end, from `the numbers under` to the paragraph's last word, becomes

```markdown
the numbers under `output/wc2026/backtest/`. Built 22 September 2026; results in
`data/tournaments/wc2026_results.csv`.
```

and under "Reproducing it", `intsoccer backtest --run output/wc2026 --site` becomes `intsoccer backtest --run output/wc2026`.

- [ ] **Step 6: Verify**

```bash
.venv/bin/python -m pytest -q
grep -rn "site_payload\|backtest.json\|\-\-site" src tests README.md docs/BACKTEST.md site/js
```
Expected: 125 pass. The grep finds only the report's own `--site` (`intsoccer report --site`, in `README.md`, `cli.py`'s report parser and `site/js/method.js`), which stays; nothing of the backtest's.

- [ ] **Step 7: Commit**

```bash
git add -A src tests README.md docs/BACKTEST.md site/data/wc2026
git commit -m "Component 11f: the backtest writes no site file; its record stays in the repository" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Closures, 11g dropped, the roadmap's record

Recommended model: standard.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-20-restyle-design.md`, `DESIGN.md`, `docs/ROADMAP.md`, `README.md`

**Interfaces:**
- Consumes: Task 1's `measure` output, and Tasks 5 and 6's if they ran (the controller passes them in the brief).

- [ ] **Step 1: Item 7 in the restyle spec**

In `docs/superpowers/specs/2026-09-20-restyle-design.md` §3.1, replace

```markdown
- Every text colour clears 4.5:1 on the paper and on the strongest tint it sits on. The plan
  measures the tinted cells; the dark fates (4th place green, 3rd place bronze) never reach the
  strength where ink would fail because their shares are small, and the strength is capped at
  the last value that clears 4.5:1 if a data refresh ever changes that.
```

with

```markdown
- Every text colour clears 4.5:1 on the paper and on the strongest tint it sits on. Measured
  (11f, 23 September 2026): ink falls under 4.5:1 only on 4th place above 92.4% strength (a 37.0%
  share) and on 3rd place above 95.3% (38.1%); every other fate clears it at full strength. The
  2026 sheet's highest shares are 5.3% and 9.3%, and no real tournament gives a team a 37% chance
  of finishing fourth, so there is no cap in code.
```

- [ ] **Step 2: Item 9 in the restyle spec**

- §4: `a hovered row darkens its ink (\`filter: brightness(.94)\` on the row, 120 ms; a` becomes `a hovered row darkens its ink (\`filter: brightness(.94)\` on the row, at once, with no transition; a`.
- §4: `animation. The only CSS transitions are hover (120 ms) and the popover (none).` becomes `animation. There are no CSS transitions: hover feedback and the popover change at once.`
- §3.2's table: in the `Hero column row` row, `1rem, line-height 1.8` becomes `1rem, line-height 1.5, .15rem padding`.
- §6: `Rows are 1rem on 1.8 with hairlines.` becomes `Rows are 1rem on 1.5 with .15rem of padding and hairlines.`

- [ ] **Step 3: Items 7 and 11 in DESIGN.md**

At the end of the fate-scale paragraph (the one beginning `- **The fate scale**`), after `use the scale only as an ordering.`, add: ` Ink on a tint clears 4.5:1 at every share a tournament produces: only 4th place and 3rd place could fall under it, above a 37% and a 38% share, against the 2026 sheet's highest of 5.3% and 9.3% (measured 23 September 2026).`

At the end of the Buttons paragraph (the one beginning `There are no styled buttons.`), add: ` The sort arrows and the clear × are characters in the text face, not an icon system, so the craft floor's rule against Unicode glyphs standing in for icons does not reach them (passed twice in review; ruled 23 September 2026).`

- [ ] **Step 4: The roadmap**

In `docs/ROADMAP.md`'s table, row 11: replace from `11f todo (internal hardening` to the end of the cell's text (`once 12 has scored the runs)`) with:

`11f done 23 Sep 2026 (internal hardening: the hero across 1024px, reduced motion at every width, the pick's first-load race and its failure line, one home for the print helpers, the run-path warning; the rest measured or closed, see the note; spec docs/superpowers/specs/2026-09-23-hardening-design.md, checks in tools/check.mjs); 11g dropped 23 Sep 2026 (the backtest lives in the repository, not on the site)`

Replace the whole `**11f Internal hardening.**` note (from its first line through the `resolve_meta_path` bullet) with a record in the same voice, with these parts in this order:

1. One sentence: the list came from PR #2's final review (22 September 2026) plus one item from the backtest's; settled 23 September 2026 per `docs/superpowers/specs/2026-09-23-hardening-design.md`.
2. **Fixed:** the hero rows keep their ink when the width crosses 1024px mid-fill; under reduced motion the sideways cue and the bracket's phone summary follow the width; a pick made while the first team loads stays; a failed pick restores the team and prints "Brazil's runs did not load. Pick again to retry."; the print floors (`inkAt`, `ruleAt`), `reduced()`, `snap()` and `fmtCount` each live in one module; `resolve_meta_path` warns when it substitutes a file.
3. **Measured** (6× CPU slowdown, phone 390×844 and desktop 1440×900): the engine's frame work at the 95th percentile against 8 ms, and the slowest address-bar resize against 16.7 ms, with the exact figures from the `measure` output in the brief, and for each of items 3, 4 and 8 whether it was fixed (and the re-measured figure) or closed.
4. **Closed:** 7 (the thresholds: 4th place above a 37.0% share, 3rd place above 38.1%, against 5.3% and 9.3%; no cap in code); 9 (the stale restyle-spec lines corrected); 10 (the restyle spec's §8 owner amendment, commit b28fb5c, already records the 516px gap and the clearance formula); 11 (the arrows and the × are characters in the text face; DESIGN.md records the ruling).
5. Also found and fixed in the sitting: the failed pick (it was not on the list).

Replace the whole `**11g Reality check.**` note with:

```markdown
**11g Reality check.** Dropped 23 September 2026. Thiago: the backtest belongs in the repository
for anyone who digs into the code and results; on the website it is not needed, and the Euro and
Copa editions follow the same rule. Its site file, `site/data/wc2026/backtest.json`, and the
`intsoccer backtest --site` flag that wrote it were removed with 11f.
```

- [ ] **Step 5: The README's status**

In the status table's first row, the `Next` cell becomes `Hiatus until the Euro 2028 and Copa América 2028 draws`. After the last `Done` row (`The 2026 backtest: ...`), add the row `| Internal hardening: the sheet's edge cases at every width, one home for the print helpers, browser checks in \`tools/check.mjs\` | |`.

- [ ] **Step 6: Verify and commit**

```bash
grep -n "11g" docs/ROADMAP.md README.md
.venv/bin/python -m pytest -q && node --test tests/js/*.mjs
```
Expected: `11g` appears only as dropped; 125 and 14 pass.

```bash
git add docs DESIGN.md README.md
git commit -m "Component 11f: the closures, 11g dropped, and the roadmap's record" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: The render check, the detector and the gates

Recommended model: standard.

- [ ] **Step 1: Screenshots against the before set**

```bash
node tools/check.mjs shots .impeccable/review
for f in .impeccable/review/before/*.png; do cmp -s "$f" ".impeccable/review/$(basename "$f")" && echo "same  $(basename "$f")" || echo "DIFF  $(basename "$f")"; done
```
Expected: `same` on every file. For any `DIFF`, open both images and say what differs; a flag that loaded in one capture and not the other is not a regression, anything else is.

- [ ] **Step 2: The detector on rendered dumps**

```bash
S=$(mktemp -d)/rendered && mkdir -p "$S/css" && cp site/css/*.css "$S/css/"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for p in world-cup-2026 how-it-works; do "$C" --headless=new --disable-gpu --mute-audio --window-size=1440,900 --virtual-time-budget=8000 --dump-dom "http://localhost:8001/$p" > "$S/$p.html" 2>/dev/null; done
../../.claude/skills/impeccable/scripts/impeccable detect --json "$S/world-cup-2026.html" "$S/how-it-works.html" "$S/css/site.css" | python3 -c "import json,sys,collections; d=json.load(sys.stdin); print(len(d), collections.Counter((x['antipattern'], x['file'].rsplit('/',1)[1]) for x in d))"
```
Expected: `2 Counter({('wide-tracking', 'how-it-works.html'): 2})`, the baseline. A new finding is triaged: fixed, or reported with its reason.

- [ ] **Step 3: The gates, all together**

```bash
.venv/bin/python -m pytest -q
node --test tests/js/*.mjs
node tools/check.mjs checks
node tools/check.mjs dump output/check/now.json && cmp output/check/baseline.json output/check/now.json && echo identical
git status --short
```
Expected: 125 pass; 14 pass; four `pass`; `identical`; a clean tree on `hardening`.

- [ ] **Step 4: Hand over for Thiago's review on localhost**

Report: the branch's commits (`git log --oneline main..hardening`), the gate output, the measurement figures and what they decided, and the local address (`http://localhost:8001/world-cup-2026`, served by `python3 tools/serve.py`). Thiago reviews there before the pull request.

---

## After the tasks (controller)

- The final review of the whole branch, then superpowers:finishing-a-development-branch: the pull request (its description carries the measurement figures), Thiago's review, a merge commit on his word, the branch deleted locally and on GitHub. `gh` needs `gh auth switch --user tcaetanoa-droid` first and `gh auth switch --user guard-supplements` after.
- After the merge, in the workspace repository (local only, `git -C /Users/thiagocaetano/Developer/Caetano-2`): `context/current-priorities.md` and `projects/README.md` stop listing 11g and 11f as remaining and say the World Cup edition is finished and on hiatus until the 2028 draws; one workspace commit.
