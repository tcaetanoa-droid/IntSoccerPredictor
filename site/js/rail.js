// site/js/rail.js
export function initRail(rail, sections) {
  const links = [...rail.querySelectorAll('a')];
  const byId = Object.fromEntries(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      links.forEach((a) => a.classList.remove('on'));
      const a = byId[e.target.id]; if (a) a.classList.add('on');
    }
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach((s) => io.observe(s));
  const toggle = document.querySelector('.rail-toggle');
  if (!toggle) return;
  const set = (open) => { rail.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); };
  // The rail sits before <main> in the DOM and the toggle after it, so on open the focus moves
  // into the rail (no ring for a mouse click, the browser keeps its focus-visible state).
  toggle.addEventListener('click', () => { const open = !rail.classList.contains('open'); set(open); if (open) links[0].focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && rail.classList.contains('open')) { set(false); toggle.focus(); } });
}
