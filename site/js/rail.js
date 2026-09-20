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
  if (toggle) toggle.addEventListener('click', () => rail.classList.toggle('open'));
}
