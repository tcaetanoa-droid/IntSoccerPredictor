// site/js/data.js
export async function loadSiteData(name) {
  const base = `data/${name}/`;
  const get = async (f) => { const r = await fetch(base + f); if (!r.ok) throw new Error(`${f}: ${r.status}`); return r.json(); };
  const [report, teams, calibration] = await Promise.all([get('report.json'), get('teams.json'), get('calibration.json')]);
  const byCode = Object.fromEntries(teams.map((t) => [t.code, t]));
  return { name, base, report, teams, byCode, calibration, n: report.meta.n_sims, team: (code) => get(`team_${code}.json`) };
}
