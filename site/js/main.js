// site/js/main.js
import { loadSiteData } from './data.js';
import { boot as bootPrint } from './print.js';

const CHAPTERS = [
  { id: 'hero', mod: './hero.js' },
  { id: 'who-wins-it', mod: './fate-table.js' },
  { id: 'group-stage', mod: './groups.js' },
  { id: 'bracket', mod: './bracket.js' },
  { id: 'hosts', mod: './hosts.js' },
  { id: 'underdogs', mod: './underdogs.js' },
  { id: 'paradoxes', mod: './paradoxes.js' },
  { id: 'pick-a-team', mod: './team.js' },
  { id: 'how-it-works', mod: './method.js' },
];

async function start() {
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
  // The browser takes a fragment at parse time, when every section is still empty, so a cold deep
  // link lands hundreds of pixels short of its chapter. The sheet is only this tall now, so the
  // landing is re-taken here, before boot()'s seed pass paints what ends up above it. 'instant'
  // is required: `scroll-behavior: smooth` would animate the whole sheet and print it on the way.
  // A reload is left alone, so the browser's own scroll restoration keeps the reader's position.
  if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') {
    const id = location.hash.slice(1), target = id && document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  bootPrint();   // every unit is registered by now; the engine paints and starts listening
}
start().catch((e) => {
  console.error(e);
  const hero = document.getElementById('hero');
  if (hero) hero.textContent = `Could not load the data: ${e.message}`;
});
