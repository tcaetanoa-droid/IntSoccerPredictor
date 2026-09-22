// site/js/dom.js
import { register, paintBlock } from './print.js';
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export const name = (code, byCode) => (byCode[code] ? byCode[code].name : code);
export function flag(code, byCode, width = 40) {
  const iso = byCode[code] ? byCode[code].iso : 'un';
  return h('img', { class: 'flag', src: `https://flagcdn.com/w${width}/${iso}.png`, alt: '', loading: 'lazy' });
}
// A sideways-scrolling region a keyboard can reach: Tab lands on it, the arrow keys scroll it.
export const scrollX = (label, ...children) => h('div', { class: 'scroll-x', tabindex: '0', role: 'group', 'aria-label': label }, ...children);
// The cue a sighted reader needs: the region's aria-label already says it scrolls sideways, so
// print the same words under it while it is actually wider than the sheet. The class follows the
// measurement and the line follows the class; js/print.js runs this with its own layouts, at
// boot, on every resize and once the faces have settled, before it measures anything else.
export function layoutScrollX() {
  for (const el of document.querySelectorAll('.scroll-x')) {
    const over = el.scrollWidth > el.clientWidth + 1;
    el.classList.toggle('sx', over);
    const next = el.nextElementSibling;
    if (over && !(next && next.classList.contains('sxnote'))) el.after(h('p', { class: 'sxnote' }, 'Scrolls sideways'));
  }
}
export const fmtCount = (n) => Math.round(n).toLocaleString('en-GB');
export const fmtPct = (x, dec = 1) => `${(x * 100).toFixed(dec)}%`;
export const countOf = (share, n) => fmtCount(share * n);  // n: ctx.n, the simulation count
// A printed count: the final value for assistive technology, then the display that counts up.
export const count = (n) => [h('span', { class: 'sr' }, fmtCount(n)), h('span', { class: 'ct', 'aria-hidden': 'true' }, '0')];

// Every chapter opens the same way: its name between two rules, then the intro in the reading
// face with the chapter's claim as a bold lead-in. Both print as blocks when the chapter enters.
export function chapterHead(title, claim, ...intro) {
  const h2 = h('h2', {}, title);
  const p = h('p', { class: 'intro' }, h('b', {}, claim), ' ', ...intro);
  register(h2, paintBlock, { kind: 'block' });
  register(p, paintBlock, { kind: 'block' });
  return [h2, p];
}
