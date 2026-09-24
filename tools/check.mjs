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
  const exited = new Promise((resolve) => proc.on('exit', resolve));
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
  // Chrome is still writing its profile as it shuts down, so the profile is removed only once the
  // process has gone, and retried while a helper process finishes with it. A helper can outlive
  // Chrome holding its stderr open, which would keep this process waiting, so that pipe is let go.
  const close = async () => {
    try { await send('Browser.close'); } catch (e) { /* already gone */ }
    proc.kill();
    await exited;
    proc.stderr.destroy();
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
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
  // 640 tall: the held screen (514px at 1100) pins with room to spare, and the flowing column (from
  // 388px down the page at 1000) straddles the reading line even with the page at its top.
  const NARROW = { width: 1000, height: 640 }, WIDE = { width: 1100, height: 640 };
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

// 4. A pick whose file does not arrive: the team on the page comes back at full ink with its name
// and its address, one line under the search field says what happened, and the next pick clears
// it. Then, on a fresh page, two picks in flight: Brazil's file is held at the network while
// France's fails, so what comes back is Spain, still on the page, not Brazil, the pick France
// overtook; and Brazil's file, let through late, changes nothing. With motion and under reduced
// motion (no fade).
async function failedPick(b) {
  for (const reduced of [false, true]) {
    const t = await tab(b, DESKTOP, { reduced });
    // Every request the Fetch patterns catch fails, except the file named by `hold`, which waits.
    let hold = null;
    const held = [];
    const off = b.on((m) => {
      if (m.sessionId !== t.sessionId || m.method !== 'Fetch.requestPaused') return;
      if (hold && m.params.request.url.includes(hold)) held.push(m.params.requestId);
      else t.s('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'Failed' }).catch(() => {});
    });
    const mode = reduced ? 'reduced motion' : 'motion';
    const look = `(() => {
      const note = document.querySelector('#pick-a-team .pk [role=status]');
      return { opacity: getComputedStyle(document.querySelector('#pick-a-team .tbody')).opacity,
               team: document.querySelector('#pick-a-team .th .tn')?.textContent,
               field: document.getElementById('team-search').value, hash: location.hash,
               note: note ? note.textContent : null };
    })()`;
    // Each value the page shows that is not the one wanted, or '' when all of them are.
    const wrong = (v, want) => Object.keys(want).filter((k) => v[k] !== want[k])
      .map((k) => `${k} ${JSON.stringify(v[k])}, wanted ${JSON.stringify(want[k])}`).join('; ');
    try {
      await t.open('/world-cup-2026');
      await t.s('Fetch.enable', { patterns: [{ urlPattern: '*team_BR.json*' }] });
      await t.js(pickTeam('Brazil'));
      await t.js('window.__c.sleep(600).then(() => window.__c.frames(2))');
      let why = wrong(await t.js(look), { opacity: '1', team: 'Spain', field: 'Spain', hash: '', note: "Brazil's runs did not load. Pick again to retry." });
      if (why) return `${mode}: ${why}`;
      await t.s('Fetch.disable');
      await t.js(pickTeam('Brazil'));
      await t.js(`window.__c.waitFor(() => document.querySelector('#pick-a-team .th .tn')?.textContent === 'Brazil').then(() => window.__c.frames(2))`);
      const after = await t.js(`document.querySelector('#pick-a-team .pk [role=status]').textContent`);
      if (after !== '') return `${mode}: after a pick that worked, the line still reads ${JSON.stringify(after)}`;
      // Two picks in flight, from Spain with no hash.
      await t.open('/world-cup-2026');
      hold = 'team_BR.json';
      await t.s('Fetch.enable', { patterns: [{ urlPattern: '*team_BR.json*' }, { urlPattern: '*team_FR.json*' }] });
      await t.js(pickTeam('Brazil'));
      for (let i = 0; !held.length; i++) {
        if (i > 800) return `${mode}: setup: Brazil's file was never requested`;
        await new Promise((r) => setTimeout(r, 25));
      }
      await t.js(pickTeam('France'));
      await t.js('window.__c.sleep(600).then(() => window.__c.frames(2))');
      const back = { opacity: '1', team: 'Spain', field: 'Spain', hash: '', note: "France's runs did not load. Pick again to retry." };
      why = wrong(await t.js(look), back);
      if (why) return `${mode}, two picks in flight: ${why}`;
      for (const requestId of held) await t.s('Fetch.continueRequest', { requestId });
      await t.s('Fetch.disable');
      await t.js('window.__c.sleep(800).then(() => window.__c.frames(4))');
      why = wrong(await t.js(look), back);
      if (why) return `${mode}, once Brazil's held file arrived: ${why}`;
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
