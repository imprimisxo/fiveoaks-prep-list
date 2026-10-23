// Five Oaks Prep List generator.
//
// Reads the menu (data/menu.json) and a request naming the services (date, host, guests,
// salad or soup, meal, dessert), back-schedules every component task from its course
// time, and writes ONE .docx with one dated sheet per prep day. Tasks for different
// services that land on the same day share that day's sheet. The scheduling and the
// document live in prep_core.js, which the web app (webapp/index.html) runs too; this
// file is the command line around it.
//
//   npm init -y && npm install docx@9.8.1 --no-audit --no-fund      (in a scratch dir)
//   NODE_PATH=$PWD/node_modules node <skill>/scripts/build_prep_list.js request.json
//   NODE_PATH=$PWD/node_modules node <skill>/scripts/build_prep_list.js request.json --out /tmp/x.docx
//
// Request shape: see SKILL.md, Step 2.
//
// Then validate with scripts/render_docx.sh, see SKILL.md Step 4.

const fs = require('fs');
const path = require('path');
const docx = require('docx');
const { build, PrepError } = require('./prep_core');

const SKILL_DIR = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const OUT_OVERRIDE = outFlag >= 0 ? args[outFlag + 1] : process.env.PREP_OUT;
const reqPath = args.find((a, i) => !a.startsWith('--') && (outFlag < 0 || i !== outFlag + 1));
if (!reqPath) {
  console.error('usage: build_prep_list.js request.json [--out file.docx]');
  process.exit(2);
}

const fail = (msg) => { console.error('ERROR: ' + msg); process.exit(1); };

const MENU = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'data/menu.json'), 'utf8'));
const REQ = JSON.parse(fs.readFileSync(reqPath, 'utf8'));

// Oswald (headings) + IBM Plex Sans Condensed (body), the fiveoaks-sop pairing. Both are
// installed in ~/Library/Fonts on Chef's Mac; fall back to Word-safe faces elsewhere.
const has = (files) => files.some(f => fs.existsSync(f));
const HOME = process.env.HOME || '/Users/cheflance';
const fonts = {
  head: has([`${HOME}/Library/Fonts/Oswald-Bold.ttf`, '/Library/Fonts/Oswald-Bold.ttf']) ? 'Oswald' : 'Arial Narrow',
  body: has([`${HOME}/Library/Fonts/IBMPlexSansCondensed-Regular.ttf`, '/Library/Fonts/IBMPlexSansCondensed-Regular.ttf'])
    ? 'IBM Plex Sans Condensed' : 'Arial',
};

const LOGO_CANDIDATES = [
  path.join(SKILL_DIR, 'assets/FiveOaksLogo.png'),
  '/Users/cheflance/.claude/skills/fiveoaks-sop/assets/FiveOaksLogo.png',
  '/Users/cheflance/Five_Oaks/kit/02_logos_recolored/FiveOaks_Primary_Logo_Green_700x204.png',
  '/mnt/user-data/uploads/FiveOaksLogo.png',
];
const logoPath = LOGO_CANDIDATES.find(p => fs.existsSync(p));
if (!logoPath) fail('Five Oaks logo not found. Ask for upload, do not generate without it.');

let result;
try {
  result = build({ menu: MENU, request: REQ, docx, logo: fs.readFileSync(logoPath), fonts });
} catch (e) {
  if (e instanceof PrepError) fail(e.message);
  throw e;
}
const { doc, report, stem, sheets, boxes } = result;

const OUT = OUT_OVERRIDE || path.join('/Users/cheflance/Five_Oaks/Prep Lists', `${stem}.docx`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });

docx.Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log(report.join('\n'));
  console.log(`\nWROTE ${OUT} (${buf.length} bytes)`);
  console.log(`sheets: ${sheets.length} | checkboxes: ${boxes} | fonts: ${result.fonts.head} / ${result.fonts.body} / ${result.fonts.box} | logo: ${logoPath}`);
});
