// site/js/main.js
import { loadSiteData } from './data.js';
import { initRail } from './rail.js';

const CHAPTERS = [];  // Tasks 7-15 push {id, mod} here, e.g. {id: 'hero', mod: './hero.js'}

async function boot() {
  const ctx = await loadSiteData('wc2026');
  for (const { id, mod } of CHAPTERS) {
    const section = document.getElementById(id);
    if (!section) continue;
    const { render } = await import(mod);
    await render(section, ctx);
  }
  initRail(document.querySelector('.rail'), [...document.querySelectorAll('main section[id]')]);
}
boot().catch((e) => { console.error(e); document.getElementById('hero').textContent = `Could not load the data: ${e.message}`; });
