# Five Oaks Prep List

A Claude Code skill for the Five Oaks Duck Lodge kitchen. Give it a dinner booking (date,
host, guest count, salad or soup, entree, and dessert) and it builds dated, printable prep
sheets, one page per prep day. Each task is back-scheduled from Chef's day and hour
offsets.

## What's here

| Path | What it is |
|---|---|
| `SKILL.md` | The skill's instructions: how bookings become sheets, and Chef's standing decisions |
| `data/menu.json` | The menu and every prep task with its timing. This is the source of truth |
| `scripts/build_prep_list.js` | Schedules the tasks and writes the Word file |
| `scripts/render_docx.sh` | Renders the Word file to PDF through Microsoft Word, for checking |
| `references/selection_menu.md` | The salad or soup, dinner, and dessert pick list |
| `assets/FiveOaksLogo.png` | The Five Oaks logo printed on each sheet |

## Install

Clone into your Claude Code skills folder:

```bash
git clone https://github.com/imprimisxo/fiveoaks-prep-list.git ~/.claude/skills/fiveoaks-prep-list
```

Then ask Claude Code for a Five Oaks prep list, or give it a host and a dinner date.

Generated prep lists save to `~/Five_Oaks/Prep Lists/` and are not tracked here.
