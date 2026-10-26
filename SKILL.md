---
name: fiveoaks-prep-list
description: >
  Build dated, printable Five Oaks Duck Lodge prep lists from a dinner booking. Given the
  service date(s), guest count, salad or soup, entree meal (#1-#5) and dessert, it back-schedules every
  component task (thaw, cut, dry brine, sous vide, sauces, desserts) from Chef's day and hour
  offsets onto one check-off sheet per prep day. Tasks from different nights of a stay that
  land on the same day share that day's sheet. Output is a Five Oaks branded .docx plus a
  print PDF. Use whenever the user asks for a Five Oaks prep list, prep schedule, prep
  sheets, prep calendar, or "what do we need to prep" for a lodge dinner, hunting party, or
  group stay, including short asks that give a date, a guest count, and a meal number or
  dessert, or "we have a group Fri-Sun, build the prep sheets". Also use when Chef just
  gives a host name and a dinner date: that brings up the salad or soup, dinner, and
  dessert selection menus. Also use to add or change a Five Oaks salad, soup,
  meal, dessert, component, service time, or prep timing. For turning a recipe
  into an SOP use fiveoaks-sop. For PBCC, PVCC, or ChefMac station checklists use their own
  prep-list skills.
---

# Five Oaks Prep List

Turns a booking into the dated prep sheets the Five Oaks kitchen works from: one page per
day, each with a check box beside every task, from the first thaw through plate-up.

The value here is the **back-scheduling**. Chef's menu says "-8 days, put ribeye roast in
reefer to thaw". For a Friday dinner that has to show up on the Thursday eight days before,
next to whatever else is due that Thursday for other nights of the stay. The generator does
that arithmetic. Your job is to get the booking right, run it, check it, and tell Chef
anything that needs his attention.

**Sibling skill:** `fiveoaks-sop` turns a recipe into a production SOP. Several tasks here
say "per SOP"; those SOPs live in `/Users/cheflance/Five_Oaks/SOP/`.

## Files

| Path | What it is |
|---|---|
| `data/menu.json` | The source of truth: service times, meals, desserts, and each component's tasks in Chef's own wording |
| `scripts/build_prep_list.js` | Command line generator: reads the request, writes the .docx, prints the full schedule as text |
| `scripts/prep_core.js` | The scheduling and document code itself, shared by the generator and the web app |
| `scripts/render_docx.sh` | Renders a .docx through Microsoft Word to PDF and page PNGs |
| `scripts/stage_webapp.sh` | Gathers the web app and the files it loads into one folder for publishing |
| `scripts/publish_site.sh` | Pushes the staged web app to the no-login website (GitHub Pages) |
| `webapp/index.html` | The Prep Planner web app (see "Web app" below) |
| `webapp/firestore.rules` | The website database's access rules, pasted into the Firebase console |
| `references/selection_menu.md` | The salad or soup, dinner, and dessert selection menu shown when Chef gives a host and date |
| `assets/FiveOaksLogo.png` | Green FIVE OAKS mallard wordmark, 700 x 204 |

## Step 1: Get the booking

For each dinner you need five things. The dinner runs in three courses: a salad or soup
at 7:00 PM, the entree at 7:30 PM, and dessert at 8:00 PM. Appetizers are separate, at
6:00 PM, and none are defined yet.

| Field | Notes |
|---|---|
| Date | Resolve "next Friday" or "the 6th" against today's date and say the date you used |
| Guests | Prints in every band so the cook knows how many steaks, slices, skillets |
| Salad or soup | 1-4, see below, or `none` |
| Meal | 1-5, see below |
| Dessert | `skillet-cookie`, `cheesecake`, `bread-pudding`, `brownie`, or `none` |

| Salad or soup | Key | Earliest prep |
|---|---|---|
| 1. Five Oaks Ranch Salad | `ranch-salad` | -2 days, ranch dressing |
| 2. House Bacon Salad | `bacon-salad` | -6 hours |
| 3. Caesar Salad | `caesar-salad` | -4 hours |
| 4. Duck Gumbo | `duck-gumbo` | -7 days, gumbo made |

The request's `salad` field takes the key, the number (`2` or `"#2"`), or the name.

| Meal | Plate |
|---|---|
| 1 | Bone-in Cowboy Ribeye, Sauteed Wild Mushrooms, Cajun Rice, Sauteed Green Beans |
| 2 | Bone-in Filet with Demi-glace, Au Gratin Rice, Grilled Broccolini |
| 3 | Prime Rib with Au Jus, Mashed Potatoes, Sauteed Green Beans |
| 4 | Dry Aged Duroc Pork Ribeye with Money Sauce, Au Gratin Rice, Lemon Grilled Asparagus |
| 5 | Salmon with Creamy Dill Sauce, Au Gratin Rice, Lemon Grilled Asparagus |

If the user names the dish instead of the number ("the prime rib night"), map it and say so.

**When Chef gives a host and a dinner date but not the courses, show the selection
menu.** It has three single-selection menus in course order: salad or soup, dinner, then
dessert. A guest count field is added when that's missing. The template and its fill-in
rules are in `references/selection_menu.md`. Chef asked for this menu, so use it rather
than asking in prose. For several bookings at once, put them all in one form.

Don't guess a guest count, because it prints on every band. Missing course choices
matter too: dessert prep starts up to ten days out, and the gumbo seven.

## Step 2: Write the request

Write a small JSON file in the scratchpad, one entry in `services` per dinner, filled in
from the booking. In this shape, angle brackets mark values to fill in:

```
{
  "services": [
    { "date": "YYYY-MM-DD", "host": "<party name>", "guests": <count>,
      "salad": "<salad or soup key, number, or none>", "meal": <1-5>,
      "dessert": "<dessert key or none>" }
  ]
}
```

Optional fields:

- `label` names the group. It goes in the filename and footer. Leave it out when each
  night is a different party.
- `host` on a service is that night's party name, as the reservation gives it. It prints
  on the Tonight line and on every band for that dinner. Always include it when the
  reservation names a host: on back-to-back nights it's how the cooks tell the bands apart.
- `today` (`YYYY-MM-DD`) backdates the run. Leave it out and the generator uses today's
  date.
- `times` on a service overrides that night's course times, for example
  `{ "dinner": "20:00", "dessert": "20:30" }`. Use it when Chef says a night runs late. Don't
  edit `menu.json` for a one-off change.
- `extras` on a service adds whole components to that night, for example
  `["Blue Bell Ice Cream"]`. Names must match `menu.json` exactly.
- `batch` (request level) lists components to make once for every dinner that uses them,
  for example `["Classic Cheesecake", "Homemade Hot Fudge"]`. The component's first
  `batch_steps` tasks in `menu.json` (the make-ahead run) happen once, on the earliest
  dinner's dates. The task text names the batch size and the dinners it covers:
  "(double batch for <host> <m/d> + <host> <m/d>)". Each dinner keeps its own later tasks
  (thaw, reheat, plate). Only components with `batch_steps` can be batched; today that's
  the cheesecake and the hot fudge.

  Chef's standing preference (2026-10-22) is to combine and double these "to the earliest
  date". So when a run has the cheesecake or the hot fudge on more than one night,
  include them in `batch` by default and say so in the delivery message.

## Step 3: Run the generator

`docx` is not installed globally. Install it into a scratch dir once per session. Keep
the version pinned at 9.8.1, the same one the web app loads, so both build the same file:

```bash
cd <scratchpad>/node && npm init -y && npm install docx@9.8.1 --no-audit --no-fund
```

`require('docx')` resolves from the script's own folder, not your cwd, so pass `NODE_PATH`:

```bash
NODE_PATH=<scratchpad>/node/node_modules node ~/.claude/skills/fiveoaks-prep-list/scripts/build_prep_list.js <scratchpad>/request.json
```

It writes `/Users/cheflance/Five_Oaks/Prep Lists/FiveOaks_Prep_List_<first date>[_to_<last date>][_<Label>].docx`.
Add `--out <path>` to write somewhere else while testing.

**Read the printed schedule before going further.** It lists every sheet and every task.
Check it against what the user asked: the right nights, meals, and desserts, and guest
counts in the right places. Look hardest at any `PAST DUE` and `WARNING` lines.

Each batch has a shelf life from its SOP, set as `batch_max_days` in `menu.json`. When a
later dinner falls past it, the run handles it in one of two ways:

- **`frozen share`:** the component defines `batch_freeze` (the hot fudge does). The
  generator adds two tasks under that dinner's band: freeze its share on the make day,
  and pull it to the reefer to thaw the day before the dinner. That's the SOP's own route,
  and Chef approved it on 2026-10-22. Mention it in the delivery message, but it's not a
  problem.
- **`WARNING`:** the component has no freeze route. The sheets are still written as
  asked. Lead the delivery message with the warning, and offer Chef the choice of making
  that dinner's share separately or adding a `batch_freeze` route if the SOP allows one.

## How the schedule is built

These are the rules the generator applies. Know them so you can explain a sheet to Chef.

- **Day offsets** (`-4 days, ...`) are advance prep. The task lands on that calendar day with
  no clock time, in the **Advance Prep** table, under a band naming the dinner it's for.
- **Hour and minute offsets** (`-3 hours`, `-4 ½ hours`, `-1/2 hours`, `-15 minutes`) go on
  the **Service Timeline**, counted back from that component's course time. `0 hours` and
  `0 days` both mean the course time itself.
- **Course times** come from `service_times` in `menu.json`: appetizers 6:00 PM, salad or
  soup 7:00 PM, dinner (entrees) 7:30 PM, dessert 8:00 PM. Each component keys off its own
  `course`. The course-times line under "Tonight" lists only the courses that have prep
  that night, so Appetizers stays off it until Chef defines appetizer items.
- **One sheet per day that has work.** A day with nothing due gets no sheet. Each sheet
  starts on a new page with the logo, so one day can be pulled off the packet and posted.
- **Overlapping nights share a sheet.** On the Friday of a Fri-Sun stay, the sheet carries
  Friday's service timeline plus the advance prep due that day for Saturday and Sunday,
  each under its own band.
- **Identical timeline lines merge.** "Plate and serve" at 7:30 PM for four components
  prints once, naming all four, so there's one box to check rather than four.
- **Past-due work moves to today.** If a booking comes in late, any task dated before
  today goes to the top of today's sheet under **Past Due: Do First**, with its original
  date. A cheesecake ordered for four days out can't be baked seven days out. When the
  run has past-due lines, lead the delivery message with them. Chef may need to change
  the menu, not just rush the prep.

## Step 4: Validate

Run a structural check first. It works anywhere:

```bash
python3 - "<file>.docx" <<'EOF'
import zipfile,xml.dom.minidom as m,re,sys
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
[m.parseString(z.read(n)) for n in z.namelist() if n.endswith(('.xml','.rels'))]
doc=z.read('word/document.xml').decode()
fx=z.read([n for n in z.namelist() if n.startswith('word/footer')][0]).decode()
print('headers:', [n for n in z.namelist() if n.startswith('word/header')], '| logos:', doc.count('<a:blip'))
print('page breaks:', doc.count('<w:pageBreakBefore/>'), '| boxes:', doc.count('>o</w:t>'))
print('footer tab:', bool(re.search(r'<w:r>(?:<w:rPr>.*?</w:rPr>)?<w:tab/></w:r>', fx)), '| NUMPAGES:', fx.count('NUMPAGES'))
print('tan-as-text:', len(re.findall(r'<w:color w:val="C49E76"', doc)), '| dashes:', len(re.findall('[–—]', doc+fx)))
EOF
```

Expected results:

- `headers: []`
- `logos` equals the generator's sheet count, and `page breaks` is one fewer.
- `boxes` equals the generator's checkbox count.
- `footer tab: True` and `NUMPAGES: 1`.
- `tan-as-text: 0` and `dashes: 0`.

Then render through Word, the handler of record, and read the page images:

```bash
~/.claude/skills/fiveoaks-prep-list/scripts/render_docx.sh "/Users/cheflance/Five_Oaks/Prep Lists/<file>.docx"
```

On the PNGs, confirm these things:

- Each sheet starts on its own page with the logo once at the top.
- The tables span the full column, and every task row has a green box.
- A service day's timeline fits on one page.
- There is no blank trailing page.

**Every day on one page.** Chef chose this on 2026-10-23, even if heavy days get smaller
text. Each sheet estimates its own height, wrapping long tasks the way Word does, and
uses the largest density that fits:

- 10pt (`normal`) is the default.
- 9pt (`compact`) and 8pt (`tight`) are used only on the days that need them.

The printed schedule shows the choice on each day's line, for example
`[compact, est 685 of 706 pt]`.

The estimate was calibrated against Word renders on 2026-10-23. A five-night run with a
salad or soup, entree, and dessert every night put its two fullest days at 9pt, and they
measured within about 5pt of the estimate. A sheet must fit with an 8pt margin to spare
(`FIT_MARGIN`).

- **`MAY SPILL` on a day:** it doesn't fit even at 8pt. The only case seen so far is two
  parties on the same night (45 timeline rows), which ran one row onto a second page.
  Mention it in the delivery message. The header row repeats on the second page, so
  it's usable.
- **A render that spills on a day the estimate cleared:** the estimator is off. Raise
  `FIT_MARGIN` or `CHAR_EM` in the generator rather than shrinking the 10pt default.

Things not to undo, each one bought back page space:

- Don't bring back the full menu description line under "Tonight".
- Don't move the sign-off back onto its own line. It sits right-aligned on the
  course-times line, at the true right margin (`W`, not `TabStopPosition.MAX`).
- Don't add "PM" back to each course time. The line reads "Salad or Soup 7:00 | Dinner
  7:30 | Dessert 8:00 PM", which keeps four courses and the sign-off on one line at 10pt.

> **Word can stall.** On a cold start the first AppleScript call can take over two
> minutes and fail with `AppleEvent timed out (-1712)`, so retry once. If it keeps
> timing out while Word answers simple queries, Word is usually waiting on a "Grant File
> Access" dialog for the file's folder. Ask Chef to grant it rather than retrying in a
> loop. Render from inside `/Users/cheflance/Five_Oaks/`, not from `/tmp`, so the grant
> sticks.

## Step 5: Deliver

1. Copy `_render/render.pdf` next to the .docx with the same stem
   (`FiveOaks_Prep_List_..._.pdf`). The PDF is what prints the same from a phone or iPad,
   with the brand fonts baked in. Then delete the `_render` folder.
2. Open the .docx in Word for Chef.
3. Reply briefly:
   - Any past-due lines first, with what they mean for the menu.
   - The sheet dates, each with its task count.
   - Any assumption you made, such as a resolved date or a meal you mapped from a dish name.
   - Anything on the sheets that looks off to you, such as two tasks that clash at the
     same time. Ask Chef about it rather than editing the menu yourself.

## Web app

Chef asked for this on 2026-10-23: a page he can open from any device to enter bookings
and build the prep list himself. The same page, `webapp/index.html`, runs in two places:

| Where | Login | Dinners are saved in |
|---|---|---|
| **Website**, https://imprimisxo.github.io/fiveoaks-prep-planner/ | None, just a kitchen code once per device | Firebase Firestore, shared by every device that uses the same kitchen code |
| **Claude artifact**, https://claude.ai/artifact/VjxfPZT27CMgeCd3JU81ez | claude.ai | The artifact's database |

The website is Chef's main way in. He asked for it the same day because the Claude login
was slow. The artifact still works.

- **Flow:** the Five Oaks logo at the top, then an **Add Guest/Date** button. It opens a
  form for Host (the host sponsor), Dinner Date, and Number of Guests, with an **Add Dinner
  Service** button. That button saves the dinner and shows the menu selection: Salad or
  Soup, Main Course (the entree), and Dessert. Each choice card shows how far ahead its
  prep starts and flags it when the dinner is too close.
- **Prep List** (Chef's change, 2026-10-23): a calendar field picks the prep day
  (today by default, no past days) and chips list every day that has prep. Pressing
  **Prep List** shows that day's task counts and two buttons. **View Prep List** shows
  the day's sheet on screen, laid out like the printed one. **Download Prep List** saves
  the .docx for that one day, `FiveOaks_Prep_List_<date>.docx`. Nothing downloads on
  its own. The schedule always covers every ticked upcoming dinner, so a day's sheet
  carries advance prep for later nights too. `build()` takes `only: "<date>"` for the
  one-day document, and without `docx` it returns the schedule alone (`doc` is null),
  which is what the on-screen sheet uses.
- **Same output as the generator.** The page runs the same `prep_core.js` and
  `menu.json`, with the same `batch` default (cheesecake and hot fudge), and loads docx
  9.8.1 from jsDelivr. On 2026-10-23 a three-dinner run gave the same schedule text and
  the same 33,857-byte .docx in the browser and from `build_prep_list.js`. The page
  always uses the brand fonts, and it can't make the PDF, since that needs Word on
  Chef's Mac.
- **Website storage.** Outside Claude the page fetches `firebase-config.json` from beside
  it and loads the Firebase compat SDK 10.12.2 from gstatic. On a device's first visit
  it asks for the kitchen code (at least 12 characters; trimmed, lowercased, spaces
  collapsed) and keeps it in that browser. Dinners live at
  `kitchens/<SHA-256 of "fiveoaks-prep-planner:" + code>/services/<id>`, so the code itself
  never leaves the device. `webapp/firestore.rules` allows only that 64-character path
  and the dinner fields, and nothing can list `kitchens`, so the code is what keeps the
  list private. The Firebase project is `fiveoaks-prep` on Chef's Google account (free
  Spark plan, Firestore in nam5, Gemini and Analytics off), set up 2026-10-23. Paste the
  rules into its console (Firestore, Rules tab) after any change. Don't name a path
  wildcard `{service}`: `service` is a reserved word there, and the rules won't compile.
  **Change kitchen code** in the footer forgets the code on that device.
  Firestore keeps an offline copy, so the list opens and edits queue when the Wi-Fi drops.
- **Website files.** The public repo `imprimisxo/fiveoaks-prep-planner` holds only staged
  copies: `index.html`, `prep_core.js`, `menu.json`, the logo, `firebase-config.json`
  and `.nojekyll`. Never edit it directly. `webapp/firebase-config.json` is the Firebase
  web config. It is public by design: it only tells browsers where the database is.
- **Dinner fields**, the same in both stores, one document per dinner: `host`, `date`
  (YYYY-MM-DD), `guests`, `salad` (key or `none`), `meal` (`"1"` to `"5"`), `dessert`
  (key or `none`), `created`. A course that is still `null` hasn't been picked. When Chef
  wants the PDF of artifact dinners, read them with ArtifactData `list` on the artifact
  URL. Website dinners are out of Claude's reach unless Chef shares his kitchen code, so
  ask him for the dinners instead. Then run them through Steps 2 to 5.
- **Republish after any change** to `menu.json`, `prep_core.js`, or `webapp/index.html`,
  or the pages keep the old menu.
  - Website: run `scripts/publish_site.sh "<commit message>"`. It clones the site repo,
    stages the files, and pushes. GitHub Pages updates in about a minute.
  - Artifact: stage the files into the scratchpad with `scripts/stage_webapp.sh
    <scratchpad>/prep-app`, then publish the staged `index.html` with `prep_core.js`,
    `menu.json` and `FiveOaksLogo.png` as `files`. Pass the artifact URL as `url` (read
    the artifact first if this conversation hasn't), and leave `capabilities` out so the
    stored `db` and `downloads` carry over.
- **Keep `prep_core.js` and the page ASCII outside comments.** Write `½` as the escape
  backslash-u00BD in code. A server that doesn't declare UTF-8 makes the browser misread
  it, and every "-3 ½ hours" task then fails to parse.

## Changing the menu

All menu edits go in `data/menu.json`. The script needs no changes.

- **Task syntax:** `"<offset>, <task>"`, for example `"-4 ½ hours, Weigh potatoes and add 1%
  salt by weight"`. Offsets take `days`, `hours`, or `minutes`, with whole numbers, `½`,
  `¼`, `¾`, or `1/2`. Keep Chef's wording. The generator only capitalizes the first letter.
- **New component:** add it under `components` with a `course` (`appetizers`, `salad`,
  `dinner`, or `dessert`) and its `tasks`, then list it in a salad or soup, meal, or
  dessert.
- **New salad, soup, meal, or dessert:** add an entry to `salads_soups`, `meals`, or
  `desserts` with `name`, a `short` name for headers, and its `components` in plating
  order. Meal keys are numbers. Salad, soup, and dessert keys are lowercase with hyphens.
  Then add its card to `references/selection_menu.md` with the same key.
- **Appetizers:** none are defined yet. When Chef adds them, give each component
  `"course": "appetizers"`, which keys off 6:00 PM. Attach them per night with `extras`, or
  add an `appetizers` map with a matching request field if they become a fixed menu choice.
- **Salads & Soups:** a menu section (`salads_soups`) like desserts, one choice per
  dinner, picked with the request's `salad` field. It's part of the dinner, not an
  appetizer. Each entry carries Chef's `number` (1-4) besides its key. Their components
  take `"course": "salad"`, which keys off 7:00 PM, ahead of the 7:30 PM entrees. A
  component listed both as the salad and in `extras` isn't doubled.
- **Shared components:** Au Gratin Rice, Sauteed Green Beans, Lemon Grilled Asparagus, Blue
  Bell Ice Cream, Homemade Hot Fudge, and Homemade Sweetened Whipped Cream each appear in several meals or
  desserts. Edit the one component entry and every meal using it picks up the change.

After any edit, run the generator once on a sample booking to confirm it still parses.
Then republish the web app (see "Web app") so its menus match.

## Chef's corrections to the original list

`menu.json` started as a copy of Chef's list (`/Users/cheflance/Five_Oaks/Prep List.docx`).
On 2026-10-22 Chef settled the gaps below. These corrections now live only in `menu.json`,
which is the source of truth. Never re-import from the .docx, or they will be lost.

- Course times: salad or soup 7:00 PM, entrees 7:30 PM, dessert 8:00 PM. Entrees were
  7:00 PM and dessert 7:30 PM until Chef added the Salad or Soup course the same day.
- **Sauteed Wild Mushrooms:** gently warm on the stove at -1 1/2 hours. (The thaw at
  -1 day was dropped on 2026-10-25; see below.)
- **Hot fudge:** the brownie and the skillet cookie share one Homemade Hot Fudge list,
  made 5 days ahead.
- **Prime Rib:** steaks are cut from the roast at -1 hour, not -4 days. The -15 minute
  slice step stays.
- **Money Sauce:** made 2 days ahead per its SOP (no parsley), cooled and refrigerated,
  then warmed at -2 hours.
- **Skillet Cookie:** no whipped cream. It is served with Blue Bell, using the scoop
  tasks shared with the brownie.
- **Entree-time overlap is intended:** on cheesecake and hot fudge nights, the cheesecake
  is plated and the fudge reheated at 7:30 PM while the entrees go out. Chef confirmed this
  is correct, so don't flag it.
- **Batching:** combine and double the cheesecake and the hot fudge onto the earliest
  date when a run uses them on more than one night (see `batch` in Step 2).
- **Salads & Soups list (2026-10-23):** Chef's four items, numbered 1-4 and entered in
  his wording. "Ceasar" is spelled Caesar. His Duck Gumbo list replaced the 15-step
  version derived from FiveOaks_SOP_Duck_Confit_Gumbo the day before.
- **Gumbo freeze and thaw:** the gumbo is made at -7 days. The SOP allows only 3-4 days
  refrigerated, so it's frozen the same day, with the duck in separate containers. Both
  are pulled to the reefer to thaw at -2 days, inside the SOP's 24-48 hour thaw. Chef
  added these steps on 2026-10-23, so this is settled.
- **Macerated Strawberry Sauce:** made and stored at -1 day, not -2 days. The SOP allows
  only 2 days refrigerated and is best the day it is made. Chef moved it on 2026-10-24.
- **SOP review of 2026-10-25** (`/Users/cheflance/Five_Oaks/FiveOaksClaudeWorkspace/reports/
  SOP Prep Activities by Dish.md`): Chef's calls, each with a `_note` in `menu.json`.
  - **Sauteed Wild Mushrooms:** no freeze. The SOP says the butter sauce breaks and the
    mushrooms go spongy when frozen, so the base is made at -2 days and refrigerated, warmed
    at -1 1/2 hours, and finished with the butter, lemon, and chives at -15 minutes.
  - **Creamy Dill Sauce:** base at -2 days; the thermos holds only the base (warmed at -30
    minutes); dill and lemon go in at -10 minutes, inside the SOP's 15 minute window.
  - **Lemon Grilled Asparagus:** grill lit at -45 minutes, batches grilled from -30 minutes,
    no batch held over 15 minutes, tossed at -10 minutes.
  - **Au Gratin Rice:** the veggie sauté moved from -3 hours to -1 day, with the rice. The
    SOP needs them chilled to 41°F, oil and all, before they meet the cold rice and cream.
  - **Cajun Rice:** cooked at -2 1/2 hours and held from -1 hour, not -4 and -3. The SOP
    says best texture within 2 hours of holding.
  - **Five Oaks Ranch Salad:** it is FiveOaks_SOP_Spring_Mix_Salad_with_Peppercorn_Ranch_Dressing.
    The SOP's vegetable prep (tomatoes, cucumber, radishes, red onion, cheddar) was added at
    -1 hour. Chef kept his "cut and wash lettuce" tasks and left the SOP as it is, so don't
    flag the rewash difference.
  - **Duck Gumbo:** the duck fold-in moved from -2 hours to -1 hour, the SOP's best window.
    That puts it back at 6:00 PM with the mushroom warm and the whipped cream on Meal 1
    nights, which Chef accepted when he asked for it.
  - **Classic Cheesecake plate:** cheesecake, Macerated Strawberry Sauce, and whipped cream.
    The Chef Jamie's SOP raspberry coulis, fresh raspberries, and zest over the slice are
    left off. The strawberry sauce always gets the SOP's optional lemon zest, so its task
    reads "make the SOP, including the lemon zest."
  - **House Bacon Salad:** unchanged on purpose. Chef keeps tempering the spinach at -1 hour,
    boiling the eggs 10 minutes, and cooking the eggs and bacon on service day, although the
    SOP differs on all three. He'll adjust from experience. Don't flag it.
  - **Bread Pudding:** unchanged on purpose. Bake at -3 days and reheat, Bourbon Caramel
    sauce, whipped cream, even though the bread pudding SOP bakes on service day with its
    own caramel. Don't flag it.

## Style rules

- Five Oaks palette, same as `fiveoaks-sop`. Green `#407060` is used for headings, the
  table header, and the check boxes. Tan `#C49E76` is used only for the rule under the
  title, never for text. Pale green `#F2F5F3` fills alternate rows, and a tan tint fills
  the service bands.
- Headings are set in Oswald and the body in IBM Plex Sans Condensed. Both are installed
  on Chef's Mac, and the generator falls back to Arial faces elsewhere.
- Check boxes are Wingdings `o`. Neither brand font has a Unicode box glyph.
- No em dashes or en dashes anywhere, matching the Five Oaks SOP rule. Use hyphens,
  colons, or ` | `.
- Keep the logo as a body paragraph at the top of each sheet. Never put it in a Header.
