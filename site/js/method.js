// site/js/method.js
import { h, fmtCount, chapterHead } from './dom.js';
import { register, paintRow, paintBlock, rowWindow } from './print.js';
import { calibrationChart } from './calibration.js';

// Facts the chapter states more than once: the ratings snapshot, the size of the fit and the
// length of a run. Written once and interpolated, so a step's prose and the "Reproduce it" list
// can never give two different numbers.
const SNAPDATE = '10 June 2026';
const SNAP = `${SNAPDATE}, the day before the opening match`;
const NFIT = '7,526', NMATCH = '104';
// The two ratings the real final started at, quoted in the worked example below.
const ES = 2232, AR = 2200;

// The fitted parameters belong to the run, not to the module: report.meta.goals_model is their
// source of truth and every figure the text derives from them is formatted here.
function figures(meta) {
  const { a, b, c_friendly } = meta.goals_model;
  return { a: a.toFixed(3), b: b.toFixed(5), c: c_friendly.toFixed(3).replace('-', '−'),
    ea: Math.exp(a).toFixed(2), e100b: Math.exp(100 * b).toFixed(2) };
}
// The worked example's four numbers are the module's own text. They are checked here against the
// Elo formula the sentence describes, so it cannot claim arithmetic it does not do; a mismatch is
// reported, never thrown, and the chapter still draws.
function checkExample(html) {
  const we = 1 / (1 + 10 ** (-(ES - AR) / 400)), chg = 60 * 1 * (1 - we);
  for (const n of [we.toFixed(3), `+${chg.toFixed(1)}`, String(Math.round(ES + chg)), String(Math.round(AR - chg))])
    if (!html.includes(n)) console.warn(`method: the worked example does not carry ${n}`);
}

// The six steps are fixed editorial text (plan Appendix A), transcribed verbatim; only the figures
// the data owns are interpolated. String.raw keeps the KaTeX delimiters \( \) and \[ \] as written;
// `maths` is the column beside the prose, and it is empty for the last step.
const STEPS = (f, runs) => [
  {
    title: 'Start from the ratings',
    prose: String.raw`Every team enters with its Elo rating from eloratings.net as it stood on ${SNAP}. Spain was top at 2157, Qatar bottom at 1421. Elo is a running score: after every match, points move from the loser to the winner, more when the result was a surprise, and a team's rating is the sum of its whole history. The one thing the rating must not be used for is turning it directly into a win probability. Elo's expected result \(W_e\) is an <b>expected score</b> (a win counts 1, a draw ½), not a probability: two equal teams have \(W_e = 0.5\), but each wins only about 36% of the time and 28% of matches are drawn. Sampling "random &lt; \(W_e\)" would never produce a draw. So the ratings only ever feed the goals model below.`,
    maths: String.raw`<div class="eq">\[W_e = \frac{1}{1 + 10^{-d_r/400}}\]</div><table class="agate key"><thead><tr><th scope="col">Symbol</th><th scope="col">What it means</th></tr></thead><tbody><tr><th scope="row">\(W_e\)</th><td>the expected score: the average of 1 for a win, ½ for a draw and 0 for a loss over many matches. Not a win probability.</td></tr><tr><th scope="row">\(d_r\)</th><td>the rating gap between the two teams, defined in step 2.</td></tr></tbody></table><p class="mfn">Used only inside the rating update in step 4, never to decide a match.</p>`,
  },
  {
    title: 'Turn the gap into expected goals',
    prose: String.raw`For each match take the rating difference from each team's point of view, adding 100 points to a team playing a genuine home game (the three hosts in their own stadiums; Canada's knockouts were in the United States, so no bonus there). The gap sets each side's expected number of goals through a single exponential curve, fitted by maximum likelihood on ${NFIT} matches played by the 48 teams between January 2010 and ${SNAPDATE}. The World Cup itself is excluded from the fit so the backtest is honest.`,
    maths: String.raw`<div class="eq">\[d_r = R_A - R_B + 100\cdot[\text{A at home}]\]</div><div class="eq">\[\lambda_A = e^{\,a + b\,d_r}, \qquad \lambda_B = e^{\,a - b\,d_r}\]</div><table class="agate key"><thead><tr><th scope="col">Symbol</th><th scope="col">What it means</th></tr></thead><tbody><tr><th scope="row">\(R_A,\ R_B\)</th><td>the two teams' Elo ratings before the match.</td></tr><tr><th scope="row">\(d_r\)</th><td>the rating gap from team A's point of view: A's rating minus B's, plus 100 if A is at home. A positive gap means A is the stronger side.</td></tr><tr><th scope="row">\(\lambda_A,\ \lambda_B\)</th><td>each team's expected goals: the average number it would score if this match were played over and over. B's formula uses the same gap with the sign flipped.</td></tr><tr><th scope="row">\(e^{\,x}\)</th><td>the exponential function, 2.718… raised to the power x. It turns an additive gap in ratings into a multiplicative effect on goals, so every extra 100 points multiplies the goal rate by the same factor.</td></tr><tr><th scope="row">\(a\)</th><td>the base scoring rate. With no gap and no home advantage each team expects e<sup>a</sup> = ${f.ea} goals.</td></tr><tr><th scope="row">\(b\)</th><td>how much each rating point is worth in goals. Every +100 points multiplies a team's goal rate by e<sup>100b</sup> = ${f.e100b}.</td></tr></tbody></table><table class="agate pt"><thead><tr><th scope="col">Parameter</th><th scope="col">Value</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row">a</th><td>${f.a}</td><td>equal teams at a neutral venue: ${f.ea} goals each, 2.3 per match</td></tr><tr><th scope="row">b</th><td>${f.b}</td><td>per Elo point: every +100 multiplies a team's goal rate by ${f.e100b}</td></tr><tr><th scope="row">c<sub>friendly</sub></th><td>${f.c}</td><td>friendlies score at the same rate as competitive games; the simulator uses 0</td></tr></tbody></table><p class="mfn">Examples: home team +100 → 1.37 vs 0.96 goals. A +400 favourite → 2.32 vs 0.57.</p>`,
  },
  {
    title: 'Play the match',
    prose: String.raw`Each side's goals are drawn from an independent Poisson distribution with its own rate. The Poisson distribution is the standard way to describe counts of rare, independent events, and goals in a football match fit it well: if a team expects 1.15 goals, it scores none about a third of the time, one about a third, two about a fifth, and three or more once in eight. The scoreline decides everything: win, draw or loss, goal difference, group points. In the knockout rounds a draw goes to extra time, another Poisson draw over 30 minutes' worth of rate, and then to a penalty shootout, a coin flip. This is the whole match model: no form, no injuries, no squads, no weather, just the gap and a Poisson.`,
    maths: String.raw`<div class="eq">\[P(\text{goals} = k) = \frac{\lambda^{k} e^{-\lambda}}{k!}\]</div><table class="agate key"><thead><tr><th scope="col">Symbol</th><th scope="col">What it means</th></tr></thead><tbody><tr><th scope="row">\(P(\text{goals}=k)\)</th><td>the probability that the team scores exactly k goals.</td></tr><tr><th scope="row">\(k\)</th><td>a number of goals: 0, 1, 2, 3 and so on.</td></tr><tr><th scope="row">\(\lambda\)</th><td>that team's expected goals from step 2.</td></tr><tr><th scope="row">\(\lambda^{k}\)</th><td>lambda multiplied by itself k times. It grows with k, which favours scoring more when the rate is high.</td></tr><tr><th scope="row">\(k!\)</th><td>"k factorial": 1 × 2 × … × k. It grows faster than λ<sup>k</sup>, which is what makes very high scores rare.</td></tr><tr><th scope="row">\(e^{-\lambda}\)</th><td>a scaling term that makes the probabilities for k = 0, 1, 2, … add up to exactly 1.</td></tr></tbody></table><p class="mfn">Both sides drawn independently, capped at 15 goals. With equal teams the draw probability is 0.28; real matches near d<sub>r</sub> = 0 draw 0.30, the usual independent-Poisson under-prediction.</p>`,
  },
  {
    title: 'Update the ratings after every match',
    prose: String.raw`A World Cup is not 104 independent matches. A team that wins its first two games goes into the third rated higher, and the simulation carries that forward: after every match, in every run, the ratings are updated with eloratings.net's own formula and the new ratings feed the next match of <em>that</em> run. The size of the move is the surprise, \(W - W_e\), scaled by how much the match matters and by how big the margin was. Knockout updates use the score after extra time; a shootout counts as a draw.`,
    maths: String.raw`<div class="eq">\[R_{\text{new}} = R_{\text{old}} + K \cdot G \cdot (W - W_e)\]</div><table class="agate key"><thead><tr><th scope="col">Symbol</th><th scope="col">What it means</th></tr></thead><tbody><tr><th scope="row">\(R_{\text{old}},\ R_{\text{new}}\)</th><td>the team's Elo rating before and after the match.</td></tr><tr><th scope="row">\(K\)</th><td>how much the match matters: 60 for World Cup finals, down to 20 for friendlies. Every match in this simulation uses 60.</td></tr><tr><th scope="row">\(G\)</th><td>the goal-margin multiplier: 1 for a one-goal margin, 1.5 for two, more for bigger wins. A 3–0 moves more points than a 1–0.</td></tr><tr><th scope="row">\(W\)</th><td>what actually happened: 1 for a win, ½ for a draw, 0 for a loss.</td></tr><tr><th scope="row">\(W_e\)</th><td>what was expected, from step 1: the expected score given the gap.</td></tr><tr><th scope="row">\(W - W_e\)</th><td>the surprise. Beat a team you were expected to beat and it is small; lose to one you should have beaten and it is large and negative.</td></tr></tbody></table><div class="two"><table class="agate pt"><thead><tr><th scope="col">K</th><th scope="col">match type</th></tr></thead><tbody><tr><th scope="row">60</th><td>World Cup finals</td></tr><tr><th scope="row">50</th><td>continental championships</td></tr><tr><th scope="row">40</th><td>qualifiers</td></tr><tr><th scope="row">30</th><td>other tournaments</td></tr><tr><th scope="row">20</th><td>friendlies</td></tr></tbody></table><table class="agate pt"><thead><tr><th scope="col">margin N</th><th scope="col">G</th></tr></thead><tbody><tr><th scope="row">0 or 1</th><td>1</td></tr><tr><th scope="row">2</th><td>1.5</td></tr><tr><th scope="row">≥ 3</th><td>(11 + N) / 8</td></tr></tbody></table></div><p class="mfn">Both teams' changes are equal and opposite. Verified against every row of the real 2026 histories: the points exchanged match the site within ±1.</p><div class="ex"><div class="klab">Worked example: the real final, 19 July 2026, Spain 1–0 Argentina, neutral venue</div><p>Ratings before: Spain ${ES}, Argentina ${AR}. \(d_r = +32\), so \(W_e = 1/(1 + 10^{-32/400}) = 0.546\). K = 60, margin 1 so G = 1, W = 1. Change = 60 × 1 × (1 − 0.546) = <b>+27.2</b>. Spain to 2259, Argentina to 2173, exactly the 27 points eloratings.net recorded.</p></div>`,
  },
  {
    title: `Play the whole tournament, ${runs} times`,
    prose: String.raw`The rules live in a data file, not in the code: twelve groups, the 2026 tiebreakers (head-to-head before overall goal difference, new this year), the eight best third-placed teams ranked by points, goal difference and goals, the fixed third-place table that slots them into the bracket, and the 32 knockout match numbers. Fair play points and FIFA ranking cannot be simulated; where they would decide a tie the model falls back to pre-tournament Elo, then a seeded draw. Every run plays all ${NMATCH} matches from a seed, so run number 24,327 is the same tournament every time it is regenerated. All ${runs} runs, 10.4 million matches, are stored, and every number on this page is a count over them.`,
    maths: String.raw`<p class="mfn">Checked against reality before any simulation: fed the 72 real group results, the standings code produces the real 32 qualifiers; fed the real standings, the bracket code produces all 16 real round-of-32 pairings.</p>`,
  },
  {
    title: 'What it gets wrong',
    prose: String.raw`Draws are slightly under-predicted (0.28 against 0.30 observed for equal teams), the standard weakness of two independent Poissons. The known fix is the Dixon–Coles correction, a single extra parameter that nudges the four low-scoring lines (0–0, 1–0, 0–1, 1–1) towards their real frequencies. It will be added for the Euro 2028 and Copa América 2028 simulations. Home advantage is a flat 100 points for everyone. Squads, injuries, form and the weather in Monterrey in June do not exist. Predicted and observed goals agree within about 0.07 per team for every rating-gap bin between −500 and +500, and win rates within about 0.02, which is as much as a two-parameter model can be asked for.`,
    maths: '',
  },
];

// "Reproduce it": the five commands and what each one does. The descriptions are the chapter's own
// closing copy; every number in them is the run's, taken from the steps' facts above and the data,
// so the list cannot say something the method section does not.
const COMMANDS = (meta, runs) => [
  ['intsoccer fetch', 'the match history from eloratings.net'],
  ['snapshot --date 2026-06-11', `the ratings as they stood on ${SNAP}`],
  ['fit', `the two parameters by maximum likelihood on ${NFIT} matches with the World Cup left out`],
  [`simulate --n ${meta.n_sims} --seed ${meta.seed}`,
    `${runs} tournaments from seed ${meta.seed}, all ${NMATCH} matches in each, every run stored`],
  ['report --site', 'the counts this page reads, one pass over the runs'],
];

const repro = (meta, runs) => h('div', { class: 'repro' },
  h('div', { class: 'klab' }, 'Reproduce it'),
  h('p', { class: 'rlead' }, 'Everything is open: the code, the tournament rules file, the fitted parameters and the seed.'),
  h('div', { class: 'rlist' }, ...COMMANDS(meta, runs).map(([cmd, what]) =>
    h('div', { class: 'rrow' }, h('div', {}, h('code', {}, cmd)), h('div', { class: 'rwhat' }, what)))),
  h('p', { class: 'rfoot' }, 'The repository link is in the footer.'));

export function render(section, ctx) {
  const meta = ctx.report.meta, runs = fmtCount(ctx.n);
  const src = STEPS(figures(meta), runs);
  checkExample(src.map((s) => s.maths).join(''));
  const steps = src.map((s, i) => {
    // The step number stays in the title: the pipeline order is the content.
    const title = h('h3', {}, `${i + 1}. ${s.title}`);
    const prose = h('p', { class: 'mprose', html: s.prose });
    const side = h('div', { class: 'mcol mside', html: s.maths });
    const el = h('div', { class: 'mstep' }, h('div', { class: 'mcol' }, title, prose), side);
    // A step prints in reading order (spec §8, the transition-8 amendment): the title, then the
    // prose, then the maths beside them, three overlapping windows of the block's 40% of a screen.
    register(el, (_, p) => {
      paintBlock(title, rowWindow(p, 0, 3));
      paintBlock(prose, rowWindow(p, 1, 3));
      paintBlock(side, rowWindow(p, 2, 3));
    }, { kind: 'block' });
    // Every symbol-key and parameter row is an agate row of its own, printed as it crosses the
    // reading line. Its label line and its head are the ruled frame and are printed from the start.
    for (const tr of side.querySelectorAll('tbody tr')) register(tr, paintRow);
    return el;
  });
  const cal = calibrationChart(ctx.calibration);
  section.replaceChildren(
    ...chapterHead('How it works', 'Under the hood.',
      `This is not a betting model and does not use odds, rankings or expert picks. It has two fitted parameters and four formulas, and this section walks through all of them: where the ratings come from, how a rating gap becomes goals, how goals become results, how results update the ratings, and how ${runs} tournaments are played and counted. The code, the rules file and the seed are public, so every number on this page can be regenerated.`),
    ...steps, cal.el, repro(meta, runs));
  cal.draw();   // the panels are drawn at their holders' measured width, so the chart is in the page first
  // KaTeX is a deferred script in the head, so it has run by the time this module does; the guard
  // is there in case it fails to load, and then the TeX stays readable as written. One pass over
  // the finished chapter: the painters only change opacity and dash, never the maths.
  if (window.renderMathInElement) window.renderMathInElement(section, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }] });
}
