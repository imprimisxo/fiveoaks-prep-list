# Five Oaks Prep List

> **Moved.** This repo was merged into [imprimisxo/fiveoaks-prep-planner](https://github.com/imprimisxo/fiveoaks-prep-planner) on 2026-10-26 and is archived. The skill and the Prep Planner website both live there now; install from that repo:
>
> ```bash
> git clone https://github.com/imprimisxo/fiveoaks-prep-planner.git ~/.claude/skills/fiveoaks-prep-list
> ```

A Claude Code skill for the Five Oaks Duck Lodge kitchen. Give it a dinner booking (date,
host, guest count, salad or soup, entree, and dessert) and it builds dated, printable prep
sheets, one page per prep day. Each task is back-scheduled from Chef's day and hour
offsets.

## What's here

| Path | What it is |
|---|---|
| `SKILL.md` | The skill's instructions: how bookings become sheets, and Chef's standing decisions |
| `data/menu.json` | The menu and every prep task with its timing. This is the source of truth |
| `scripts/build_prep_list.js` | Command line generator: writes the Word file and prints the schedule |
| `scripts/prep_core.js` | The scheduling and Word file code, shared by the generator and the web app |
| `scripts/render_docx.sh` | Renders the Word file to PDF through Microsoft Word, for checking |
| `scripts/stage_webapp.sh` | Gathers the web app's files into one folder for publishing |
| `scripts/publish_site.sh` | Pushes the web app to its website, https://imprimisxo.github.io/fiveoaks-prep-planner/ |
| `webapp/index.html` | The Prep Planner web app: enter dinners, pick menus, build the prep list |
| `webapp/firestore.rules` | Access rules for the website's Firebase database |
| `references/selection_menu.md` | The salad or soup, dinner, and dessert pick list |
| `assets/FiveOaksLogo.png` | The Five Oaks logo printed on each sheet |

## Install

Clone into your Claude Code skills folder:

```bash
git clone https://github.com/imprimisxo/fiveoaks-prep-list.git ~/.claude/skills/fiveoaks-prep-list
```

Then ask Claude Code for a Five Oaks prep list, or give it a host and a dinner date.

Generated prep lists save to `~/Five_Oaks/Prep Lists/` and are not tracked here.
