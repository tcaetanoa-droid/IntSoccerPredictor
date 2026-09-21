// site/js/main.js
import { loadSiteData } from './data.js';

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
  const ctx = await loadSiteData('wc2026');
  for (const { id, mod } of CHAPTERS) {
    const section = document.getElementById(id);
    if (!section) continue;
    // One chapter that throws must not blank the ones after it, nor overwrite the hero.
    try {
      const { render } = await import(mod);
      await render(section, ctx);
    } catch (e) {
      console.error(e);
      section.textContent = 'This chapter could not be drawn.';
    }
  }
}
boot().catch((e) => {
  console.error(e);
  const hero = document.getElementById('hero');
  if (hero) hero.textContent = `Could not load the data: ${e.message}`;
});
