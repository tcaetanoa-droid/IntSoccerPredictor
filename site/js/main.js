// site/js/main.js
import { loadSiteData } from './data.js';
import { boot as bootPrint } from './print.js';

// A reload's place is the engine's to restore, once the sheet stands (land() in print.js).
history.scrollRestoration = 'manual';
// The method chapter is its own page now; a link to its old place on the sheet follows it there.
if (location.hash === '#how-it-works') location.replace('how-it-works.html');

const CHAPTERS = [
  { id: 'hero', mod: './hero.js' },
  { id: 'who-wins-it', mod: './fate-table.js' },
  { id: 'group-stage', mod: './groups.js' },
  { id: 'bracket', mod: './bracket.js' },
  { id: 'hosts', mod: './hosts.js' },
  { id: 'underdogs', mod: './underdogs.js' },
  { id: 'paradoxes', mod: './paradoxes.js' },
  { id: 'pick-a-team', mod: './team.js' },
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
  bootPrint();   // every unit is registered by now; the engine paints and starts listening
}
start().catch((e) => {
  console.error(e);
  const hero = document.getElementById('hero');
  if (hero) hero.textContent = `Could not load the data: ${e.message}`;
});
