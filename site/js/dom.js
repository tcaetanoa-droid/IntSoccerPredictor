// site/js/dom.js
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
export const fmtCount = (n) => Math.round(n).toLocaleString('en-GB');
export const fmtPct = (x, dec = 1) => `${(x * 100).toFixed(dec)}%`;
export const countOf = (share, n = 100000) => fmtCount(share * n);
