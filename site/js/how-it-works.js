// site/js/how-it-works.js: the method page. The chapter module draws into the page's own section,
// after the masthead the shell wrote, from the World Cup data it quotes; then the print engine
// runs as it does on the sheet, so the steps and the chart print as they cross the reading line.
import { loadSiteData } from './data.js';
import { boot as bootPrint } from './print.js';
import { render } from './method.js';

// A reload's place is the engine's to restore, once the page stands (land() in print.js).
history.scrollRestoration = 'manual';

async function start() {
  const ctx = await loadSiteData('wc2026');
  const section = document.getElementById('how-it-works');
  try {
    await render(section, ctx, { page: true });
  } catch (e) {
    console.error(e);
    section.append('This page could not be drawn.');
  }
  bootPrint();
}
start();
