#!/bin/bash
# Render a .docx through Microsoft Word — the Five Oaks document handler of record.
#
# Word is the only renderer on this machine that is faithful to what the kitchen
# will actually print: it honors fixed table layout, resolves PAGE / NUMPAGES
# field codes, and renders every page (QuickLook does none of these).
#
# Usage:  ./render_docx.sh <file.docx> [outdir]
# Output: <outdir>/render.pdf plus page1.png, page2.png, ... and a footer readout.

set -euo pipefail

DOCX="$1"
OUTDIR="${2:-$(dirname "$DOCX")/_render}"

[ -f "$DOCX" ] || { echo "No such file: $DOCX" >&2; exit 1; }
[ -d "/Applications/Microsoft Word.app" ] || {
  echo "Microsoft Word is not installed — cannot validate. Do not fall back to qlmanage." >&2
  exit 1
}

mkdir -p "$OUTDIR"
DOCX_ABS="$(cd "$(dirname "$DOCX")" && pwd)/$(basename "$DOCX")"
OUT_ABS="$(cd "$OUTDIR" && pwd)"
PDF="$OUT_ABS/render.pdf"

# Render a COPY, never the delivered file. Word rewrites any .docx it opens — even
# "with read only" — normalizing markup (a literal tab in <w:t> becomes <w:tab/>) and
# dropping a .bak alongside it. Rendering the original would mean shipping a
# Word-mutated artifact instead of the one the generator produced.
COPY="$OUT_ABS/.render-copy.docx"
cp "$DOCX_ABS" "$COPY"

osascript - "$COPY" "$PDF" <<'APPLESCRIPT' >/dev/null
on run argv
	set inPath to item 1 of argv
	set outPath to item 2 of argv
	tell application "Microsoft Word"
		set theDoc to open file name inPath with read only
		save as theDoc file name outPath file format format PDF
		close theDoc saving no
	end tell
end run
APPLESCRIPT

python3 - "$PDF" "$OUT_ABS" <<'PY'
import sys, fitz   # PyMuPDF ships with the system python3 on this machine
pdf, out = sys.argv[1], sys.argv[2]
d = fitz.open(pdf)
print(f"pages: {d.page_count}")
for i, p in enumerate(d):
    p.get_pixmap(dpi=110).save(f"{out}/page{i+1}.png")
txt = "\n".join(p.get_text() for p in d)
print("footer:", [l.strip() for l in txt.splitlines() if "Page " in l and " of " in l])
print(f"images: {out}/page1.png .. page{d.page_count}.png")
PY

# Drop the copy, Word's backup of it, and any "~$" owner/lock file Word left beside it.
rm -f "$COPY" "$COPY.bak" "$OUT_ABS"/~\$*.docx
