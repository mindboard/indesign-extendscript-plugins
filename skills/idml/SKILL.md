---
name: idml
description: Unpack and repack Adobe InDesign IDML files as editable XML, then edit the XML directly — no InDesign required. Use when the user wants to inspect, diff, or programmatically edit an .idml (stories/text, styles, colors, spreads, links) and produce a valid .idml back, or to convert between an .idml and its extracted folder.
---

# IDML Unpack / Pack (XML editing)

An **IDML** (`.idml`) file is Adobe InDesign Markup — a **ZIP package** of XML
files (an OCF container, the same family as EPUB). Unpacking it gives you a tree
of human- and AI-readable XML you can read, diff, and edit directly, then pack
back into a valid `.idml` that InDesign opens.

This skill uses **Python 3 (stdlib only)** — no `pip install`, nothing to set
up. Python is the right tool here: it's already on macOS, and editing the
unpacked XML is exactly what Claude is good at. The companion script is
[`scripts/idmlutil.py`](scripts/idmlutil.py).

> Sibling skill: **`indd`** drives a *live* InDesign app via ExtendScript. Use
> **`idml`** (this one) when you want to manipulate the file's XML offline
> without launching InDesign; use **`indd`** when you need InDesign to render,
> export (PDF/PNG), or convert IDML↔INDD.

## The one rule that makes an IDML valid

A plain `zip -r out.idml folder/` produces a file InDesign **rejects**. The
package must contain a `mimetype` entry that is:

1. the **first** entry in the archive, and
2. **STORED** (uncompressed), holding exactly
   `application/vnd.adobe.indesign-idml-package`.

InDesign reads those magic bytes from a fixed offset, so order and compression
matter. `idmlutil.py pack` does this for you (every other file is DEFLATED).
**Always repack with this script**, never with a generic zip command.

## How to run it

```bash
# Extract an .idml into a folder of XML (default folder: ./workspace)
python3 skills/idml/scripts/idmlutil.py unpack /abs/path/in.idml /abs/path/out_dir

# Repack a folder back into a valid .idml (default folder: ./workspace)
python3 skills/idml/scripts/idmlutil.py pack /abs/path/out.idml /abs/path/src_dir
```

- The 3rd argument (folder) is optional and defaults to `./workspace`.
- `unpack` **clears the destination folder first**, so each extraction is clean.
- `pack` reads the `mimetype` from the source folder if present, otherwise
  writes the standard constant; it skips `.DS_Store`.
- Prefer **absolute paths**.

If the user has the venv convention (`.venv/bin/python`), use that interpreter
instead of `python3`; never `pip install` (the script needs no dependencies).

## Typical workflow: edit the XML

1. **Unpack:** `python3 .../idmlutil.py unpack book.idml work/`
2. **Explore** the tree, then read/grep the relevant XML:
   - `designmap.xml` — top-level map tying the package together.
   - `Stories/Story_*.xml` — the actual **text content** (paragraphs, runs).
     The visible words live in `<Content>` elements.
   - `Spreads/Spread_*.xml` — page geometry and frames.
   - `Resources/Styles.xml` — paragraph/character/object/table styles.
   - `Resources/Graphic.xml` — **colors / swatches**, strokes.
   - `Resources/Fonts.xml`, `Resources/Preferences.xml`.
   - `MasterSpreads/`, `XML/`, `META-INF/container.xml`.
3. **Edit** the XML with normal file tools (`Read`/`Edit`, or Python). Keep it
   well-formed UTF-8; don't disturb the `self` IDs / cross-references unless you
   know the matching reference.
4. **Repack:** `python3 .../idmlutil.py pack book-edited.idml work/`
5. **Verify** (see below) before handing back.

### Editing text safely

A story's words are split across `<Content>` runs inside
`ParagraphStyleRange` / `CharacterStyleRange` elements. To change wording,
edit the text **inside** the existing `<Content>…</Content>` tags rather than
adding or removing runs — that preserves the per-run styling. Special markers
like `<Br/>` (line break) appear between runs; leave them in place.

CJK / non-ASCII text is fine: the XML files are UTF-8, so Japanese content
round-trips unchanged (verified — a `<Story>` containing こんにちは survived
unpack→edit→pack intact). Save edits as UTF-8 without a BOM.

**Adding a line / paragraph.** A forced line break is a `<Br />` element *between*
`<Content>` runs inside one `CharacterStyleRange`; a new paragraph is a sibling
`<ParagraphStyleRange>`. To add a line, insert `<Br /><Content>…</Content>` before the
closing `</CharacterStyleRange>` — reusing the surrounding style so the new line
inherits formatting (verified: grew a 3-line body to 4 lines this way).

**Emphasising part of a line (bold/italic run).** Split the run into sibling
`CharacterStyleRange` elements and give the emphasised one a different `FontStyle`
(e.g. `FontStyle="Bold"` / `"W6"`), keeping the same `<AppliedFont>`:
```xml
<CharacterStyleRange ... FontStyle="W3"><Content>ポンシェは</Content></CharacterStyleRange>
<CharacterStyleRange ... FontStyle="Bold"><Content>博多「ふくや」の明太子</Content></CharacterStyleRange>
<CharacterStyleRange ... FontStyle="W3"><Content>を使用。</Content></CharacterStyleRange>
```
(Verified: rendered the middle run bold within the same family.)

**Swapping a linked image.** Placed images are *referenced*, not embedded. In the
relevant `Spreads/Spread_*.xml` find the `<Link … LinkResourceURI="file:/abs/old.jpg" …>`
and change the URI to the new absolute path. InDesign relinks on open (verified). If the
new image has a different aspect ratio it keeps the old frame, so **re-fit it in
InDesign** afterward (`frame.fit(FitOptions.FILL_PROPORTIONALLY); frame.fit(FitOptions.CENTER_CONTENT);`)
via the `indd` skill.

**Applying a paragraph style.** Styles live in `Resources/Styles.xml`
(`<ParagraphStyle Self="ParagraphStyle/body" …>`); a story applies one via
`AppliedParagraphStyle="ParagraphStyle/body"` on its `ParagraphStyleRange`. Creating or
restyling paragraph styles and reflowing frames is far easier in the `indd` skill than
by hand — do structural/layout changes there and edit text/links here.

## Verifying a repacked IDML

Without launching InDesign you can confirm structural validity:

```bash
# mimetype must be the FIRST line and method "Stored"
unzip -v out.idml | head
# or, fully in Python:
python3 - <<'PY'
import zipfile
z = zipfile.ZipFile('out.idml')
i0 = z.infolist()[0]
assert i0.filename == 'mimetype' and i0.compress_type == zipfile.ZIP_STORED, 'bad mimetype entry'
assert z.read('mimetype') == b'application/vnd.adobe.indesign-idml-package'
print('OK — valid IDML container,', len(z.infolist()), 'entries')
PY
```

For a **full** visual/render check, hand the file to the **`indd`** skill: open
it (`app.open(File('/abs/out.idml'))`), then export PNG/PDF and read the image
back, or convert it to `.indd`. That's the authoritative "does InDesign accept
it" test.

## Notes & gotchas

- **Never repack with `zip`/`jar`/Finder compress** — they compress `mimetype`
  and/or reorder entries, yielding an IDML InDesign won't open. Use the script.
- The script is **pure stdlib** (`zipfile`, `os`, `shutil`); works on the system
  `python3` (3.6+). No third-party packages, no virtualenv needed.
- `unpack` refuses archive entries that would escape the destination folder
  (zip-slip guard) and recreates empty directories.
- Cross-references inside IDML use `self="…"` IDs (e.g. a spread referencing a
  story). If you delete or rename objects, update every reference or InDesign
  will report a damaged file. Prefer *editing values in place* over
  adding/removing objects.
- **Story `Self` IDs and filenames are not stable across an InDesign re-export.**
  After a round-trip through InDesign (open → export IDML) the same story may move from
  e.g. `Stories/Story_u101.xml` to `Story_u10f.xml`. So **locate a story by its content
  (grep for the text), not by a remembered filename** — a hard-coded path will
  `KeyError`/404 after a re-export (verified). `idmlutil.py unpack` always reflects the
  current names.
- This is a file-format tool and is **OS-independent**; only the optional
  render-verification step (via `indd`) needs macOS + InDesign.
