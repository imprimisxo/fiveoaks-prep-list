// Five Oaks Prep List core: schedule + document, shared by the command line generator
// (build_prep_list.js) and the web app (webapp/index.html).
//
// build({ menu, request, docx, logo, fonts }) back-schedules every component task from its
// course time and returns the docx Document with one dated sheet per prep day, plus the
// plain-text schedule report. It touches no files: the caller loads menu.json, the logo
// and the docx library, and packs the Document (Packer.toBuffer in Node, toBlob in a
// browser). Bad input throws PrepError.
//
// Request shape: see SKILL.md, Step 2.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiveOaksPrep = factory();
})(typeof self !== 'undefined' ? self : this, function () {

class PrepError extends Error {}
const fail = (msg) => { throw new PrepError(msg); };

// ==========================================================================
// DATES AND OFFSETS
// ==========================================================================

// Dates are calendar days in local time. A Date is only ever built at local noon for day
// math (immune to DST shifts) or at the service clock time for the timeline.
const parseYMD = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) fail(`date "${s}" is not YYYY-MM-DD`);
  return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
};
const ymd = (d) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parseClock = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) fail(`time "${s}" is not HH:MM (24-hour)`);
  return +m[1] * 60 + +m[2];
};

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d) => `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
const shortDate = (d) => `${DOW[d.getDay()].slice(0, 3)} ${d.getMonth() + 1}/${d.getDate()}`;
const clock = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

// "-8 days, put ribeye roast in reefer to thaw" -> { days: -8, text }
// "-4 ½ hours, ...", "-1/2 hours, ...", "-15 minutes, ...", "0 hours, ...", "-0 hours, ..."
// The fractions are written as \u escapes so a browser reads this file correctly even
// when the server doesn't say it's UTF-8.
const parseAmount = (s) => s.replace(/\u00BD/g, ' 0.5').replace(/\u00BC/g, ' 0.25').replace(/\u00BE/g, ' 0.75')
  .trim().split(/\s+/).reduce((sum, part) => {
    const frac = /^(\d+)\/(\d+)$/.exec(part);
    const n = frac ? +frac[1] / +frac[2] : Number(part);
    if (!Number.isFinite(n)) throw new Error(part);
    return sum + n;
  }, 0);

const parseTask = (line, where) => {
  const m = /^\s*([-+]?)\s*([\d\s\u00BD\u00BC\u00BE/.]+?)\s*(days?|hours?|hrs?|minutes?|mins?)\s*,\s*(.+?)\s*$/i.exec(line);
  if (!m) fail(`${where}: cannot read "${line}" (expected "-N days|hours|minutes, task")`);
  let amount;
  try { amount = parseAmount(m[2]); } catch (e) { fail(`${where}: bad amount in "${line}"`); }
  const sign = m[1] === '+' ? 1 : (m[1] === '-' ? -1 : (amount === 0 ? 1 : -1));
  const unit = m[3].toLowerCase();
  const text = m[4].charAt(0).toUpperCase() + m[4].slice(1);
  if (unit.startsWith('day')) {
    if (!Number.isInteger(amount)) fail(`${where}: day offsets must be whole days ("${line}")`);
    // "0 days" means on the service itself, so it belongs on the timeline at course time.
    return amount === 0 ? { minutes: 0, text } : { days: sign * amount, text };
  }
  const minutes = Math.round(sign * amount * (unit.startsWith('h') ? 60 : 1));
  return { minutes, text };
};

// ==========================================================================
// TEMPLATE CONSTANTS: Five Oaks house format
// ==========================================================================

// ---- Brand palette (Five Oaks) --------------------------------------------
// Source: /Users/cheflance/Five_Oaks/kit/FiveOaks_Brand_Colors.json. Matches fiveoaks-sop.
const GREEN = '407060';        // headings, table header fill, checkbox glyph
const TAN = 'C49E76';          // H1 rule only. Never text: 2.5:1 on white
const LIGHT = 'F2F5F3';        // alternate row fill
const TAN_TINT = 'F3ECE4';     // TAN at 20% over white, service group rows
const RULE_COLOR = 'C6D4CF';   // GREEN at 30% over white, table hairlines
const BODY_COLOR = '2B2B2B';   // Five Oaks charcoal
const CAPTION_COLOR = '555555';

// Wingdings 'o' is an open square, 'ü' a checkmark. Neither brand font carries U+2610 or
// U+2713, so a Unicode box would print as a missing-glyph tofu. Same fix as the sibling
// prep-list skills.
const BOX_FONT = 'Wingdings', BOX_CHAR = 'o', CHECK_CHAR = '\u00FC';

// ---- Logo -----------------------------------------------------------------
const LOGO_W = 700, LOGO_H = 204;
const LOGO_HEIGHT_PX = 48;     // 0.5in at 96dpi; repeats on every sheet, so smaller than the SOP's 1.0in

// ---- Geometry (text column 9360 DXA = 6.5in) ------------------------------
const W = 9360;
const COL_BOX = 560;
const ADV_COLS = [COL_BOX, 2700, W - COL_BOX - 2700];                    // box | component | task
// Item is wide enough for "Homemade Sweetened Whipped Cream" on one line in Word's render
// (3200 still wrapped it). Each wrap costs a row's height, and on cheesecake or bread
// pudding nights it wraps three times, enough to push a service day onto a second page.
const TIME_COLS = [COL_BOX, 1080, 3500, W - COL_BOX - 1080 - 3500];      // box | time | component | task
const PAST_COLS = [COL_BOX, 1080, 3500, W - COL_BOX - 1080 - 3500];      // box | was due | component | task

// ---- Density: every day on one page ----------------------------------------
// Chef wants one sheet per day, even on heavy nights (a salad or soup, entree, and dessert
// plus advance prep for later dinners). Each sheet uses the largest density whose
// estimated height fits the page: 10pt normally, 9pt or 8pt only on the days that need
// it. Sizes are half-points, line and pad are twips. Exact line heights: IBM Plex sets
// 10pt on a ~13pt line, and the exact 12.5pt line saves about 1pt per table line.
const DENSITIES = [
  { name: 'normal',  sz: 20, line: 250, pad: 15, box: 22, h2: 26, note: 17 },   // 10pt
  { name: 'compact', sz: 18, line: 225, pad: 10, box: 20, h2: 24, note: 16 },   //  9pt
  { name: 'tight',   sz: 16, line: 200, pad: 5,  box: 18, h2: 22, note: 15 },   //  8pt
];

// ---- Height estimate --------------------------------------------------------
// Points of body height a sheet needs at density d, from the same rows sheetChildren
// builds. Long tasks wrap, so each cell's line count is a greedy word wrap at an average
// IBM Plex Sans Condensed character width. Calibrated against Word renders on 2026-10-23,
// the estimate landed within about 5pt of Word on full service days, either way, so a
// sheet must fit with FIT_MARGIN to spare.
const BODY_PT = (11 - 0.5 - 0.7) * 72;   // letter page minus top and bottom margins
const FIT_MARGIN = 8;
const CHAR_EM = 0.40;

// Without `docx` only the schedule is built (doc is null), which is how the web app reads
// a day's tasks for its on-screen sheet. `only` (YYYY-MM-DD) limits the document to that
// one prep day.
function build({ menu: MENU, request: REQ, docx, logo: logoBuffer, fonts = {}, only = null }) {
  const {
    Document, Paragraph, TextRun, ImageRun, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, TableLayoutType,
    Footer, PageNumber, TabStopType, TabStopPosition, Tab,
    convertInchesToTwip,
  } = docx || {};
  if (docx && !logoBuffer) fail('Five Oaks logo not found. Ask for upload, do not generate without it.');

  // ==========================================================================
  // SCHEDULE
  // ==========================================================================

  const TIMES = {};
  for (const [course, t] of Object.entries(MENU.service_times)) TIMES[course] = parseClock(t);

  const todayStr = REQ.today || ymd(new Date());
  const TODAY = parseYMD(todayStr);

  if (!Array.isArray(REQ.services) || REQ.services.length === 0) fail('request has no services');

  // Appetizers, Salads & Soups and Desserts are keyed choices: a menu.json key, its short or
  // full name, its Chef number when it has one ("2", "#2"), or 'none'.
  const findChoice = (section, what, key) => {
    if (key == null || key === '' || key === 'none') return null;
    const k = String(key).toLowerCase().trim();
    const map = MENU[section] || {};
    const hit = map[k] || Object.values(map).find(d => d.short.toLowerCase() === k || d.name.toLowerCase() === k ||
      (d.number != null && String(d.number) === k.replace(/^#/, '')));
    if (!hit) fail(`unknown ${what} "${key}". Known: ${Object.keys(map).join(', ')}`);
    return hit;
  };

  const services = REQ.services.map((s, i) => {
    const date = parseYMD(s.date);
    if (ymd(date) < todayStr) fail(`service ${s.date} is before today (${todayStr}). Set "today" in the request to backdate.`);
    const meal = s.meal == null ? null : MENU.meals[String(s.meal).replace(/^#/, '')];
    if (s.meal != null && !meal) fail(`unknown meal "${s.meal}". Known: ${Object.keys(MENU.meals).join(', ')}`);
    // Chef's rule (2026-10-25): one Duck and one Non-duck appetizer per dinner, or none.
    const appetizers = [['appetizer_duck', 'duck'], ['appetizer_nonduck', 'non-duck']].map(([field, category]) => {
      const a = findChoice('appetizers', `${category} appetizer`, s[field]);
      if (a && a.category !== category) fail(`service ${s.date}: "${s[field]}" is not a ${category} appetizer`);
      return a;
    }).filter(Boolean);
    const salad = findChoice('salads_soups', 'salad or soup', s.salad);
    const dessert = findChoice('desserts', 'dessert', s.dessert);
    const guests = s.guests == null ? null : Number(s.guests);
    if (guests != null && !(guests > 0)) fail(`service ${s.date}: guests must be a positive number`);
    const times = { ...TIMES };
    for (const [course, t] of Object.entries(s.times || {})) times[course] = parseClock(t);
    // Course order. A Set, because older requests attached the gumbo through `extras`.
    const componentNames = [...new Set([
      ...appetizers.flatMap(a => a.components),
      ...(salad ? salad.components : []),
      ...(meal ? meal.components : []),
      ...(dessert ? dessert.components : []),
      ...(s.extras || []),
    ])];
    for (const c of componentNames) if (!MENU.components[c]) fail(`service ${s.date}: unknown component "${c}"`);
    const mealLabel = meal ? `Meal #${String(s.meal).replace(/^#/, '')}: ${meal.short}` : null;
    const menuLabel = [...appetizers.map(a => a.short), salad ? salad.short : null, mealLabel, dessert ? dessert.short : null]
      .filter(Boolean).join(' + ') || 'Extras only';
    const host = s.host ? String(s.host).trim() : null;
    return { i, date, key: ymd(date), host, guests, appetizers, salad, meal, dessert, times, componentNames, menuLabel };
  }).sort((a, b) => a.date - b.date || a.i - b.i);

  const guestText = (s) => s.guests ? `${s.guests} guests` : 'guest count TBD';
  const serviceTag = (s) => `${shortDate(s.date)} dinner`;
  // With back-to-back parties, the host name is how the kitchen tells the nights apart.
  const hostTag = (s) => s.host ? ` | ${s.host}` : '';
  // The "Tonight" line and the service band, shared by the sheet and its height estimate:
  // with appetizers in the menu label, either can now wrap.
  const tonightText = (s) => `${s.host ? s.host + '   |   ' : ''}${s.menuLabel}   |   ${guestText(s)}`;
  const bandText = (svc) => [`For ${serviceTag(svc)}${hostTag(svc)}`, `   ${svc.menuLabel}   |   ${guestText(svc)}`];

  // ---- Batching ---------------------------------------------------------------
  // "batch": ["Classic Cheesecake"] in the request makes one production run of that
  // component for every dinner that uses it. The component's first `batch_steps` tasks
  // (the make-ahead run, per menu.json) happen once, on the earliest dinner's dates, scaled
  // up. Each dinner keeps its own later tasks (thaw, reheat, plate).
  const batchUsers = {};
  for (const name of REQ.batch || []) {
    const comp = MENU.components[name];
    if (!comp) fail(`batch: unknown component "${name}"`);
    if (!comp.batch_steps) fail(`batch: "${name}" has no batch_steps in menu.json, so it cannot be batched`);
    const users = services.filter(s => s.componentNames.includes(name));
    if (users.length > 1) batchUsers[name] = users;
  }
  const multWord = (n) => (n === 2 ? 'double' : n === 3 ? 'triple' : `${n}x`);
  const svcShort = (s) => `${s.host ? s.host + ' ' : ''}${s.date.getMonth() + 1}/${s.date.getDate()}`;

  // A batch made for the first dinner has to still be good for the last one. A later
  // dinner past `batch_max_days` gets its share frozen on the make day and thawed the day
  // before its dinner when the component defines `batch_freeze` (its SOP allows it);
  // otherwise the run carries a WARNING.
  const warnings = [];
  const frozenShares = [];   // { name, svc, made }
  for (const [name, users] of Object.entries(batchUsers)) {
    const comp = MENU.components[name];
    const first = parseTask(comp.tasks[0], name);
    if (first.days == null || comp.batch_max_days == null) continue;
    const made = addDays(users[0].date, first.days);
    for (const u of users.slice(1)) {
      const gap = Math.round((u.date - made) / 86400000);
      if (gap <= comp.batch_max_days) continue;
      if (comp.batch_freeze) { frozenShares.push({ name, svc: u, made, gap }); continue; }
      warnings.push(`${name}: the ${multWord(users.length)} batch made ${shortDate(made)} is served to ${svcShort(u)}, ` +
        `${gap} days later. menu.json allows ${comp.batch_max_days} (see the component's _batch_note and SOP).`);
    }
  }

  // Every task becomes one row on exactly one dated sheet.
  //   kind 'advance' : day offset, any time that day
  //   kind 'timed'   : hour or minute offset, at a clock time on the timeline
  const rows = [];
  services.forEach((svc, si) => {
    svc.componentNames.forEach((name, ci) => {
      const comp = MENU.components[name];
      const anchor = svc.times[comp.course];
      if (anchor == null) fail(`component "${name}" has course "${comp.course}" with no service time`);
      const users = batchUsers[name];
      comp.tasks.forEach((line, ti) => {
        const t = parseTask(line, name);
        const order = si * 1e6 + ci * 1e3 + ti;
        const batched = users && ti < comp.batch_steps && t.days != null;
        if (batched && users[0] !== svc) return;   // made in the earliest dinner's batch
        if (batched) t.text += ` (${multWord(users.length)} batch for ${users.map(svcShort).join(' + ')})`;
        if (t.days != null) {
          rows.push({ kind: 'advance', date: addDays(svc.date, t.days), svc, component: name, text: t.text, order });
        } else {
          // Offsets can cross midnight; let the clock time roll the date.
          const total = anchor + t.minutes;
          const dayShift = Math.floor(total / 1440);
          rows.push({ kind: 'timed', date: addDays(svc.date, dayShift), minute: total - dayShift * 1440, svc, component: name, text: t.text, order });
        }
      });
    });
  });

  // Frozen shares print under the dinner they're for, after that component's other tasks.
  for (const { name, svc, made } of frozenShares) {
    const { freeze, thaw } = MENU.components[name].batch_freeze;
    const fill = (s) => { const t = s.replace('{share}', svcShort(svc)); return t.charAt(0).toUpperCase() + t.slice(1); };
    const order = services.indexOf(svc) * 1e6 + svc.componentNames.indexOf(name) * 1e3 + 900;
    rows.push({ kind: 'advance', date: made, svc, component: name, text: fill(freeze), order });
    rows.push({ kind: 'advance', date: addDays(svc.date, -1), svc, component: name, text: fill(thaw), order: order + 1 });
  }

  // Anything that should already have happened goes to the top of today's sheet.
  for (const r of rows) {
    r.key = ymd(r.date);
    if (r.key < todayStr) { r.dueDate = r.date; r.kind = 'pastdue'; r.date = TODAY; r.key = todayStr; }
  }

  const byDate = new Map();
  for (const r of rows) {
    if (!byDate.has(r.key)) byDate.set(r.key, []);
    byDate.get(r.key).push(r);
  }
  const sheetKeys = [...byDate.keys()].sort();

  // Same clock time + same instruction (e.g. "Plate and serve" at 7:00 PM) prints once and
  // names every component it covers, instead of one checkbox per component.
  const norm = (t) => t.toLowerCase().replace(/\b(a|an|the)\b/g, '').replace(/[^a-z0-9%]+/g, ' ').trim();
  const mergeTimed = (list) => {
    const out = [];
    const seen = new Map();
    for (const r of [...list].sort((a, b) => a.minute - b.minute || a.order - b.order)) {
      const k = `${r.minute}|${r.svc.key}|${norm(r.text)}`;
      if (seen.has(k)) {
        // Two parties on one night can share a component; name it once.
        const c = seen.get(k).components;
        if (!c.includes(r.component)) c.push(r.component);
        continue;
      }
      const row = { ...r, components: [r.component] };
      seen.set(k, row);
      out.push(row);
    }
    return out;
  };

  const groupByService = (list) => {
    const groups = new Map();
    for (const r of [...list].sort((a, b) => a.svc.date - b.svc.date || a.order - b.order)) {
      if (!groups.has(r.svc)) groups.set(r.svc, []);
      groups.get(r.svc).push(r);
    }
    return [...groups.entries()];
  };

  const sheets = sheetKeys.map((key) => {
    const list = byDate.get(key);
    return {
      key,
      date: parseYMD(key),
      tonight: services.filter(s => s.key === key),
      pastDue: groupByService(list.filter(r => r.kind === 'pastdue')),
      advance: groupByService(list.filter(r => r.kind === 'advance')),
      timed: mergeTimed(list.filter(r => r.kind === 'timed')),
    };
  });

  // ==========================================================================
  // TEMPLATE: Five Oaks house format
  // ==========================================================================

  // ---- Typography -----------------------------------------------------------
  // Oswald (headings) + IBM Plex Sans Condensed (body), the fiveoaks-sop pairing. The caller
  // passes Word-safe faces instead when the brand fonts aren't installed.
  const headFace = fonts.head || 'Oswald';
  const bodyFace = fonts.body || 'IBM Plex Sans Condensed';

  let D = DENSITIES[0];   // set per sheet before its paragraphs are built
  const CELL_M = () => ({ top: D.pad, bottom: D.pad, left: 100, right: 100 });
  const CELL_LINE = () => ({ line: D.line, lineRule: 'exact' });

  const run = (text, o = {}) => new TextRun({ text, font: bodyFace, size: D.sz, color: BODY_COLOR, ...o });

  // An optional note rides on the heading line instead of taking a caption line of its own.
  const h2 = (text, first, note) => new Paragraph({
    spacing: { before: first ? 80 : 140, after: 30 },
    keepNext: true,
    children: [
      new TextRun({ text, font: headFace, size: D.h2, bold: true, color: GREEN }),
      ...(note ? [run(`     ${note}`, { size: D.note, color: CAPTION_COLOR, italics: true })] : []),
    ],
  });
  const caption = (text) => new Paragraph({
    spacing: { after: 60 },
    keepNext: true,
    children: [run(text, { size: D.note, color: CAPTION_COLOR, italics: true })],
  });

  const cell = (children, width, fill, opts = {}) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
    margins: CELL_M(),
    ...opts,
    children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, spacing: CELL_LINE(), children })],
  });
  const headCell = (text, width, font) => cell(
    [new TextRun({ text, font: font || bodyFace, size: D.sz, bold: true, color: 'FFFFFF' })],
    width, GREEN, { align: font === BOX_FONT ? AlignmentType.CENTER : AlignmentType.LEFT });
  const boxCell = (fill) => cell(
    [new TextRun({ text: BOX_CHAR, font: BOX_FONT, size: D.box, color: GREEN })],   // 1pt over the text fits the exact line unclipped
    COL_BOX, fill, { align: AlignmentType.CENTER });
  const textCell = (text, width, fill, o) => cell([run(text, o)], width, fill);

  // A service group row spans the table: who the following tasks are for.
  const groupRow = (svc, cols) => new TableRow({
    cantSplit: true,
    children: [new TableCell({
      columnSpan: cols.length,
      width: { size: W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: TAN_TINT, color: 'auto' },
      margins: CELL_M(),
      children: [new Paragraph({ spacing: CELL_LINE(), children: [
        run(bandText(svc)[0], { bold: true, color: GREEN }),
        run(bandText(svc)[1]),
      ] })],
    })],
  });

  const table = (cols, header, bodyRows) => new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: cols,                // REQUIRED alongside FIXED layout
    layout: TableLayoutType.FIXED,     // else docx-js autofits and collapses the columns
    borders: Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical']
      .map(k => [k, { style: BorderStyle.SINGLE, size: 2, color: RULE_COLOR }])),
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => headCell(h, cols[i], i === 0 ? BOX_FONT : null)) }),
      ...bodyRows,
    ],
  });

  const groupedTable = (cols, header, groups, cellsFor) => {
    const body = [];
    for (const [svc, list] of groups) {
      body.push(groupRow(svc, cols));
      list.forEach((r, i) => {
        const fill = i % 2 === 1 ? LIGHT : null;
        body.push(new TableRow({ cantSplit: true, children: [boxCell(fill), ...cellsFor(r, fill)] }));
      });
    }
    return table(cols, header, body);
  };

  // ---- One dated sheet ------------------------------------------------------
  const sheetChildren = (sheet, first) => {
    const out = [];

    // Logo opens every sheet as a body paragraph (never a Header). Each sheet after the
    // first starts on a new page so a day can be pulled off the packet and posted alone.
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      pageBreakBefore: !first,
      spacing: { after: 60 },
      children: [new ImageRun({ type: 'png', data: logoBuffer,
        transformation: { width: Math.round(LOGO_W * LOGO_HEIGHT_PX / LOGO_H), height: LOGO_HEIGHT_PX } })],
    }));

    out.push(new Paragraph({
      spacing: { after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TAN, space: 4 } },
      children: [new TextRun({ text: `Prep List: ${longDate(sheet.date)}`, font: headFace, size: 36, bold: true, color: GREEN })],
    }));

    // The sign-off rides right-aligned on the last header line instead of taking a line of
    // its own: one row saved on every sheet, which a six-dinner day needs to fit one page.
    const signOff = [
      new TextRun({ children: [new Tab()] }),
      // Blanks sized for initials, labels kept short: on a four-course night the course line
      // plus a longer sign-off wraps past the right margin and costs the line this saves.
      run('Prepped: _________   Checked: _________', { bold: true }),
    ];
    const headerLine = (children, last) => new Paragraph({
      spacing: { after: last ? 40 : 20 },
      // At the true right margin (W). TabStopPosition.MAX sits 0.23in short of it.
      tabStops: [{ type: TabStopType.RIGHT, position: W }],
      children: last ? [...children, ...signOff] : children,
    });

    if (sheet.tonight.length) {
      sheet.tonight.forEach((s, k) => {
        out.push(headerLine([
          run('Tonight: ', { bold: true, color: GREEN }),
          run(tonightText(s), { bold: true }),
        ], false));
        // A course shows only on nights that have something to prep for it. Listing empty
        // courses anyway pushed the sign-off off the line.
        const served = new Set(s.componentNames.map(n => MENU.components[n].course));
        const courses = [['Appetizers', 'appetizers'], ['Salad or Soup', 'salad'], ['Dinner', 'dinner'], ['Dessert', 'dessert']]
          .filter(([, c]) => s.times[c] != null && served.has(c))
          .map(([label, c]) => `${label} ${clock(s.times[c]).replace(/ [AP]M$/, '')}`);
        // The full dish names are not repeated here: every component appears by name in the
        // tables below, and the two extra lines push full service days onto a second page.
        // One "PM" at the end, not one per course, keeps four courses and the sign-off on
        // one line.
        out.push(headerLine([run(courses.join('  |  ') + ' PM')], k === sheet.tonight.length - 1));
      });
    } else {
      out.push(headerLine([run('No dinner service tonight. Advance prep only.', { bold: true })], true));
    }

    let firstSection = true;
    const section = (title, note) => { const p = h2(title, firstSection, note); firstSection = false; return p; };

    if (sheet.pastDue.length) {
      out.push(section('Past Due: Do First'));
      out.push(caption('These were scheduled before today. Do them now, or tell the chef if the service plan has to change.'));
      out.push(groupedTable(PAST_COLS, [CHECK_CHAR, 'Was Due', 'Item', 'Task'], sheet.pastDue,
        (r, fill) => [textCell(shortDate(r.dueDate), PAST_COLS[1], fill, { bold: true }),
          textCell(r.component, PAST_COLS[2], fill), textCell(r.text, PAST_COLS[3], fill)]));
    }

    if (sheet.advance.length) {
      const start = sheet.timed.length ? sheet.timed[0].minute : null;
      out.push(section('Advance Prep', start != null
        ? `Any time today. Finish before the timeline starts at ${clock(start)}.`
        : 'Any time today, for the dinners named in each band.'));
      out.push(groupedTable(ADV_COLS, [CHECK_CHAR, 'Item', 'Task'], sheet.advance,
        (r, fill) => [textCell(r.component, ADV_COLS[1], fill), textCell(r.text, ADV_COLS[2], fill)]));
    }

    if (sheet.timed.length) {
      out.push(section('Service Timeline'));
      const body = sheet.timed.map((r, i) => {
        const fill = i % 2 === 1 ? LIGHT : null;
        const who = r.components.join(', ') + (r.svc.key !== sheet.key ? ` (for ${serviceTag(r.svc)})` : '');
        return new TableRow({ cantSplit: true, children: [
          boxCell(fill),
          textCell(clock(r.minute), TIME_COLS[1], fill, { bold: true }),
          textCell(who, TIME_COLS[2], fill),
          textCell(r.text, TIME_COLS[3], fill),
        ] });
      });
      out.push(table(TIME_COLS, [CHECK_CHAR, 'Time', 'Item', 'Task'], body));
    }

    // No spacer paragraph here: the next sheet's logo paragraph follows the table directly.
    // A spacer after a table that ends at the bottom of the page lands on a blank page.
    return out;
  };

  // ---- Height estimate (constants above) --------------------------------------
  const wrapLines = (text, colDxa, d) => {
    const perLine = Math.max(8, Math.floor(((colDxa - 200) / 20) / (CHAR_EM * d.sz / 2)));
    let lines = 1, cur = 0;
    for (const w of String(text).split(/\s+/)) {
      if (!cur) cur = w.length;
      else if (cur + 1 + w.length <= perLine) cur += 1 + w.length;
      else { lines++; cur = w.length; }
    }
    return lines;
  };
  const estimateSheet = (sheet, d) => {
    const rowPt = (lines) => lines * d.line / 20 + 2 * d.pad / 20 + 0.5;
    const textLine = d.sz / 2 * 1.3 + 1.5;
    const h2Pt = d.h2 / 2 * 1.35 + 8.5;
    const rowsPt = (cols, cells) => rowPt(Math.max(...cells.map((t, i) => wrapLines(t, cols[i + 1], d))));
    // Each dinner tonight takes its "Tonight" line (which can wrap) plus the course line.
    const tonightLines = sheet.tonight.reduce((n, s) => n + wrapLines(`Tonight: ${tonightText(s)}`, W, d) + 1, 0);
    let h = 39 + 36 + (sheet.tonight.length ? tonightLines : 1) * textLine + 2;
    const grouped = (groups, cols, cellsOf) => {
      let t = rowPt(1);
      for (const [svc, list] of groups) { t += rowPt(wrapLines(bandText(svc).join(''), W, d)); for (const r of list) t += rowsPt(cols, cellsOf(r)); }
      return t;
    };
    if (sheet.pastDue.length) h += h2Pt + textLine + 3 + grouped(sheet.pastDue, PAST_COLS, r => [shortDate(r.dueDate), r.component, r.text]);
    if (sheet.advance.length) h += h2Pt + grouped(sheet.advance, ADV_COLS, r => [r.component, r.text]);
    if (sheet.timed.length) {
      h += h2Pt + rowPt(1);
      for (const r of sheet.timed) h += rowsPt(TIME_COLS, [clock(r.minute), r.components.join(', '), r.text]);
    }
    return h;
  };
  const pickDensity = (sheet) => DENSITIES.find(d => estimateSheet(sheet, d) <= BODY_PT - FIT_MARGIN) || DENSITIES[DENSITIES.length - 1];

  // Word needs a paragraph after the document's final table. Pin it to an exact 1pt line
  // so a last sheet that fills its page cannot spill onto a blank one.
  const endSpacer = () => new Paragraph({
    spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' },
    children: [new TextRun({ text: '', size: 2 })],
  });

  // ---- Document -------------------------------------------------------------
  // Every sheet gets its density even when no document is built: the report and the web
  // app's on-screen sheet both use it.
  for (const s of sheets) { s.density = pickDensity(s); s.estimate = estimateSheet(s, s.density); }
  const docSheets = only ? sheets.filter((s) => s.key === only) : sheets;
  const first = services[0], last = services[services.length - 1];
  const span = only ? shortDate(parseYMD(only))
    : first.key === last.key ? shortDate(first.date) : `${shortDate(first.date)} to ${shortDate(last.date)}`;
  const footerText = `Five Oaks Prep List | ${REQ.label ? REQ.label + ' | ' : ''}${span}`;

  const doc = !docx || !docSheets.length ? null : new Document({
    creator: 'Five Oaks Duck Lodge',
    title: `Five Oaks Prep List ${span}`,
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },   // US Letter
          margin: {
            top: convertInchesToTwip(0.5), bottom: convertInchesToTwip(0.7),
            left: convertInchesToTwip(1), right: convertInchesToTwip(1),
            footer: convertInchesToTwip(0.35),
          },
        },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: footerText, size: 16, font: bodyFace, color: CAPTION_COLOR }),
            // MUST be a Tab element; a literal '\t' inside <w:t> is ignored by Word
            new TextRun({ children: [new Tab()], size: 16, font: bodyFace }),
            new TextRun({ text: 'Page ', size: 16, font: bodyFace, color: CAPTION_COLOR }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: bodyFace, color: CAPTION_COLOR }),
            new TextRun({ text: ' of ', size: 16, font: bodyFace, color: CAPTION_COLOR }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: bodyFace, color: CAPTION_COLOR }),
          ],
        })] }),
      },
      children: [...docSheets.flatMap((s, i) => {
        D = s.density;
        return sheetChildren(s, i === 0);
      }), endSpacer()],
    }],
  });

  // ---- Report ---------------------------------------------------------------
  const slug = (s) => String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const stem = ['FiveOaks_Prep_List', ...(only ? [only] : [first.key, ...(first.key !== last.key ? ['to', last.key] : [])]),
    ...(REQ.label ? [slug(REQ.label)] : [])].join('_');

  // Plain-text schedule, so the run can be checked and summarized without opening the
  // document.
  const report = [];
  for (const w of warnings) report.push(`WARNING: ${w}`);
  for (const [name, users] of Object.entries(batchUsers)) report.push(`batch: ${name} x${users.length} for ${users.map(svcShort).join(' + ')}`);
  for (const f of frozenShares) report.push(`frozen share: ${f.name} for ${svcShort(f.svc)} (${f.gap} days after the ${shortDate(f.made)} batch): freeze ${shortDate(f.made)}, thaw ${shortDate(addDays(f.svc.date, -1))}`);
  report.push(`today: ${todayStr}`);
  for (const s of services) report.push(`service ${s.key}${hostTag(s)}  ${s.menuLabel}  ${guestText(s)}`);
  let boxes = 0;
  const count = (g) => g.reduce((k, [, l]) => k + l.length, 0);
  for (const s of sheets) {
    s.counts = { pastDue: count(s.pastDue), advance: count(s.advance), timed: s.timed.length };
    s.maySpill = s.estimate > BODY_PT - FIT_MARGIN;
    boxes += s.counts.pastDue + s.counts.advance + s.counts.timed;
    report.push(`\n== ${longDate(s.date)}  (past due ${s.counts.pastDue}, advance ${s.counts.advance}, timeline ${s.counts.timed})` +
      `  [${s.density.name}, est ${Math.round(s.estimate)} of ${Math.round(BODY_PT)} pt${s.maySpill ? ', MAY SPILL' : ''}]`);
    for (const [svc, l] of s.pastDue) for (const r of l) report.push(`  PAST DUE (was ${ymd(r.dueDate)}) [${serviceTag(svc)}${hostTag(svc)}] ${r.component}: ${r.text}`);
    for (const [svc, l] of s.advance) for (const r of l) report.push(`  advance [${serviceTag(svc)}${hostTag(svc)}] ${r.component}: ${r.text}`);
    for (const r of s.timed) report.push(`  ${clock(r.minute).padStart(8)}  ${r.components.join(', ')}: ${r.text}`);
  }

  return { doc, report, stem, sheets, boxes, services, warnings, frozenShares, batchUsers, todayStr, fonts: { head: headFace, body: bodyFace, box: BOX_FONT } };
}

return { build, PrepError, parseTask, longDate, shortDate, parseYMD, ymd, clock };
});
