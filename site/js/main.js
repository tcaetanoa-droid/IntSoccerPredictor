// site/js/main.js
import { loadSiteData } from './data.js';
import { initRail } from './rail.js';

const CHAPTERS = [];  // Tasks 7-15 push {id, mod} here, e.g. {id: 'hero', mod: './hero.js'}
CHAPTERS.push({ id: 'hero', mod: './hero.js' });
CHAPTERS.push({ id: 'who-wins-it', mod: './fate-table.js' });
CHAPTERS.push({ id: 'group-stage', mod: './groups.js' });
CHAPTERS.push({ id: 'bracket', mod: './bracket.js' });
CHAPTERS.push({ id: 'hosts', mod: './hosts.js' });
CHAPTERS.push({ id: 'underdogs', mod: './underdogs.js' });
CHAPTERS.push({ id: 'paradoxes', mod: './paradoxes.js' });
CHAPTERS.push({ id: 'pick-a-team', mod: './team.js' });
CHAPTERS.push({ id: 'how-it-works', mod: './method.js' });

async function boot() {
  initRail(document.querySelector('.rail'), [...document.querySelectorAll('main section[id]')]);
  const ctx = await loadSiteData('wc2026');
  for (const { id, mod } of CHAPTERS) {
    const section = document.getElementById(id);
    if (!section) continue;
    const { render } = await import(mod);
    await render(section, ctx);
  }
}
boot().catch((e) => {
  console.error(e);
  const hero = document.getElementById('hero');
  if (hero) hero.textContent = `Could not load the data: ${e.message}`;
});
