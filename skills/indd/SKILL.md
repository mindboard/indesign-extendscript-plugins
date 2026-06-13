---
name: indd
description: Run InDesign ExtendScript (.jsx) on macOS by writing a script to a local file and executing it in Adobe InDesign via AppleScript (osascript). Use when the user wants to automate Adobe InDesign — create/modify documents, place images, build tables, export PDF/PNG/JPG/EPS, read fonts/styles/colors, convert IDML, or otherwise drive InDesign from scripts on a Mac.
---

# InDesign ExtendScript Runner

Automate Adobe InDesign on macOS by generating an ExtendScript (`.jsx`) file and
executing it inside a running InDesign application via AppleScript.

InDesign ExtendScript is **ECMAScript 3 (old JavaScript)** plus an InDesign-specific
DOM and Adobe's `File`/`Folder`/`$` host objects. It is *not* Node.js or modern JS —
no `let`/`const`/arrow functions/`JSON.parse`/template literals. Use `var`, classic
`function` expressions, and the idioms shown below.

## Prerequisites

- macOS with Adobe InDesign installed (e.g. "Adobe InDesign 2026").
- The script runs against the **currently running** InDesign. Many scripts assume an
  open document via `app.activeDocument` — make sure InDesign is open with the
  relevant document, or have the script create one with `app.documents.add(...)`.

## How to run a script

1. Write the ExtendScript to a local file, e.g. `/tmp/indesign-script.jsx`.
2. Execute it with `osascript`, telling InDesign to `do script ... language javascript`:

```bash
osascript -e 'with timeout of 300 seconds
tell application "Adobe InDesign 2026"
do script (POSIX file "/tmp/indesign-script.jsx") language javascript
end tell
end timeout'
```

- Replace `2026` with the installed version year the user has (2024, 2025, 2026, …).
  Default to **2026** unless told otherwise.
- Always pass an **absolute** POSIX path to the `.jsx` file.
- **Always wrap in `with timeout of N seconds … end timeout`.** The default Apple event
  timeout is ~60s; longer scripts (enumerating `app.fonts`, placing images, building
  tables, exporting) fail with *"AppleEvent timed out. (-1712)"* without it. **Verified:**
  a font-enumeration script timed out at the default and succeeded with `with timeout`.
- `stdout` of `osascript` is **the value of the last evaluated expression** in the
  `.jsx`. That is why the scripts below end with `logs.join('\n')` — it returns the
  collected log lines to the shell so you can read the result.

A reusable one-liner (adjust version + path):

```bash
JSX=/tmp/indesign-script.jsx VER=2026
osascript -e "with timeout of 300 seconds
tell application \"Adobe InDesign $VER\"
do script (POSIX file \"$JSX\") language javascript
end tell
end timeout"
```

If the file does not exist, write it first.

**Launch InDesign *before* running the `tell` block.** AppleScript resolves the
`do script` terminology from InDesign's scripting dictionary at *compile* time, so if
the app is not already running the script fails to compile with a misleading
*"Expected end of line but found "script". (-2741)"* error (it is not really a syntax
error). Start it first and wait until it registers, then run:

```bash
open -a "Adobe InDesign 2026"
# wait until the process is registered before sending the Apple event:
until osascript -e 'tell application "System Events" to (name of processes) contains "Adobe InDesign 2026"' | grep -q true; do sleep 1; done
```

The first time, the user may need to grant the terminal **Automation/Accessibility**
permission for InDesign. Note also that sending Apple events to InDesign is a
cross-application action — if you run inside a command sandbox that blocks Apple
events, the `osascript` call must be allowed to run outside it.

**Tip — put the AppleScript in a file, not in `-e`.** Quoting the multi-line `tell`
block through repeated `-e` flags is fragile; writing it to a `.applescript` file and
running `osascript /path/to/run.applescript` avoids shell-quoting breakage (verified —
the `-e` form mis-parsed, the file form worked).

## Writing ExtendScript: core idioms

Start every script with the target directive and a `console.log` shim that both prints
(to the ExtendScript console) and accumulates output to return to the shell:

```javascript
//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);   // ExtendScript console
    logs.push(v);   // collected for the return value
};

// ... your work ...

console.log('OK');
logs.join('\n');     // LAST expression -> becomes osascript stdout
```

Key InDesign / ExtendScript specifics:

- **Measurements** are strings with units: `'210mm'`, `'10mm'`, `36` (points for type).
- **`geometricBounds`** is `[top, left, bottom, right]`.
- **Create a document:**
  `app.documents.add({ documentPreferences: { pageWidth:'210mm', pageHeight:'297mm', facingPages:false } })`
- **Active document:** `app.activeDocument`. Collections (`doc.fonts`, `doc.pages`,
  `page.textFrames`, `doc.paragraphStyles`, `doc.swatches`, …) are accessed by
  `.item(n)`, `[i]`, or `.itemByName(name)`, and have a `.length`.
- **Enums** are global, e.g. `SaveOptions.no`, `ExportFormat.PDF_TYPE`,
  `PNGColorSpaceEnum.RGB`, `PNGExportRangeEnum.EXPORT_ALL`.
- **Export:** set `app.<format>ExportPreferences.properties = {...}` then
  `doc.exportFile(ExportFormat.PNG_FORMAT, File('/abs/out.png'))`.
- **Close without saving:** `doc.close(SaveOptions.no)`.
- **File I/O** uses Adobe's `File` object (not `fs`):
  ```javascript
  var file = new File('/abs/path.txt');
  file.encoding = 'UTF-8';
  if (file.open('w')) { file.write(text); file.close(); }   // write
  if (file.open('r')) { var text = file.read(); file.close(); } // read
  ```
- **Current script directory:** `File($.fileName).parent` (has `.fullName`).
- **Parse JSON** (no `JSON.parse` in ES3): `eval('(' + jsonString + ');')`.
- **Iterate** with classic `for` loops; there is no `forEach`. A common helper:
  ```javascript
  var eachItem = function(list, fn){ for(var i=0;i<list.length;i++){ fn(list[i]); } };
  ```

## Non-ASCII / CJK (Japanese etc.) content — important

Multibyte string **literals embedded in the `.jsx` source can get corrupted** depending
on how InDesign reads the file. The robust rule, verified building a Japanese document:

1. **Keep the `.jsx` source pure ASCII.** Do not paste Japanese (or any non-ASCII) text,
   or Japanese font names, directly into the script.
2. **Read non-ASCII *content* from UTF-8 files at runtime** with the Adobe `File` API
   (`file.encoding = 'UTF-8'; file.open('r'); file.read()`). Assigning that read-in
   string to `frame.contents` / `cell.contents` renders correctly.
3. **Reference fonts by their ASCII PostScript name**, not by their Japanese display
   name. Look up the `Font` object and assign it:
   ```javascript
   var findFont = function(ps){
       for (var i=0;i<app.fonts.length;i++){ if(app.fonts[i].postscriptName===ps) return app.fonts[i]; }
       return null;
   };
   paraStyle.appliedFont = findFont('HiraMinProN-W3');   // assign the Font object
   ```

Japanese fonts confirmed available on this macOS + InDesign 2026 (PostScript names):

| Use | PostScript name | Display name |
|-----|-----------------|--------------|
| Mincho (serif) body | `HiraMinProN-W3`, `HiraMinProN-W6` | ヒラギノ明朝 ProN |
| Gothic (sans) heading | `HiraKakuProN-W3`, `HiraKakuProN-W6` | ヒラギノ角ゴ ProN |
| Adobe-bundled Mincho/Gothic | `KozMinPr6N-Regular`, `KozGoPr6N-Regular` | 小塚明朝 / 小塚ゴシック Pr6N |

To discover fonts, enumerate `app.fonts` and read `.name` (family⇥style), `.postscriptName`,
`.fontFamily`, `.fontStyleName` (wrap the run in `with timeout`, the list is large).

## Layout building blocks (verified)

- **Multi-column text frame:**
  ```javascript
  tf.textFramePreferences.properties = { textColumnCount: 3, textColumnGutter: '6mm' };
  ```
- **Heading that spans all columns:** set it on the paragraph style:
  ```javascript
  paraStyle.spanColumnType = SpanColumnTypeOptions.SPAN_COLUMNS;
  ```
- **Flow text + apply styles by paragraph:** join lines with `'\r'` (the paragraph
  separator), assign to `tf.contents`, then loop `tf.parentStory.paragraphs[i]` and set
  `.appliedParagraphStyle`. Paragraph count equals the number of joined lines, so keep a
  parallel array of styles. Use **empty** entries (`''`) as placeholders for objects you
  will anchor later — they become empty paragraphs you can target by index.
- **Make a paragraph style's font actually take effect — clear character overrides.**
  Applying `text.appliedParagraphStyle = ps` does **not** remove existing
  character-level formatting, so a font baked onto a run (e.g. from earlier editing or an
  imported IDML) survives and the style's `appliedFont` appears ignored. Clear it:
  ```javascript
  text.appliedParagraphStyle = ps;
  text.clearOverrides(OverrideType.CHARACTER_ONLY);   // now the style's font wins
  ```
  Re-apply any intentional local emphasis (bold run, etc.) *after* clearing (verified:
  this is what made a Yu-Gothic body style override an old Hiragino run).
- **Anchored inline image** (lands in the text flow / column):
  ```javascript
  var ip = story.paragraphs[idx].insertionPoints[0];
  var frame = ip.textFrames.add();
  frame.geometricBounds = ['0mm','0mm', h+'mm', w+'mm'];
  frame.contentType = ContentType.graphicType;
  frame.place(File('/abs/image.png'));
  frame.fit(FitOptions.PROPORTIONALLY);     // scale to frame, keep aspect
  frame.fit(FitOptions.FRAME_TO_CONTENT);   // shrink frame to the scaled image
  ```
  By default the placed frame is anchored as an **inline** character on the text line.
  An inline image **taller than the line's leading visually overlaps the surrounding
  body text** (the image overflows its small line box). The fix is **Above Line**
  anchoring — it puts the image on its own line and reserves vertical space, so text
  flows cleanly above and below (verified: this removed image/text overlap in the
  multi-column example). Configure `anchoredObjectSettings` (all verified):
  ```javascript
  var it = frame.anchoredObjectSettings;
  it.anchoredPosition   = AnchorPosition.ABOVE_LINE;
  it.horizontalAlignment = HorizontalAlignment.RIGHT_ALIGN; // LEFT_ALIGN | CENTER_ALIGN | RIGHT_ALIGN
  it.anchorSpaceAbove   = 3;                                // space above, in the document's units
  ```
  **Watch the exact property names** — these are easy to get wrong and throw
  *"Object does not support the property or method … (55)"*:
  - It is **`horizontalAlignment`**, *not* `alignment`.
  - It is **`anchorSpaceAbove`**, *not* `spaceAbove`.
  - Other useful `AnchoredObjectSetting` members: `verticalAlignment`,
    `horizontalReferencePoint`, `anchorXoffset` / `anchorYoffset`, `anchorPoint`,
    `pinPosition`, `lockPosition`. To discover the supported members of any object at
    runtime, reflect on it: `obj.reflect.properties` (each has a `.name`).
- **Inline table** at an insertion point: `ip.tables.add({headerRowCount:1, bodyRowCount:n, columnCount:c, width:'85mm'})`.
  A **`Table` has no `.texts`** — style cells individually via
  `table.cells.item(k).texts[0].properties = {...}` (or loop `table.cells`). Set insets
  with `cell.properties = { topInset:1.5, ... }`.
- **Measurement units:** to avoid ambiguity, set
  `doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.POINTS` (and
  vertical), use **point numbers** for type (`pointSize`, `leading`, `spaceAfter`) and
  **unit strings** (`'15mm'`) for geometry / table sizes.
- **`pointSize`/`leading` get silently scaled when the ruler is mm — pin the script
  unit.** `app.scriptPreferences.measurementUnit` defaults to `AUTO_VALUE`, which
  follows the document's ruler. If the ruler is **millimeters** and you assign a bare
  number like `style.pointSize = 7`, InDesign interprets it through that unit and stores
  a *different* size (observed **≈0.71×**, e.g. `7 → 4.96pt`, `5.5 → 3.90pt`). The text
  then renders far smaller than intended. **Fix (verified):** set
  ```javascript
  app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
  ```
  once at the top, so numeric `pointSize`/`leading` are taken as real points — even
  while the *ruler* stays mm for geometry. This was the difference between type coming
  out at 2.4pt vs the intended ~4–5pt.
- **Fit text to its frame by sizing on `overflows` feedback.** To fill a fixed frame
  with a balanced margin (instead of guessing a size), grow the point size until the
  frame just overflows, then back off a notch — calling `doc.recompose()` after each
  change so `overflows` reflects the new layout:
  ```javascript
  var sz = style.pointSize, g = 0;
  doc.recompose();
  while (!tf.overflows && sz < 60 && g++ < 400){ sz += 0.25; style.pointSize = sz; style.leading = sz*1.4; doc.recompose(); }
  while ( tf.overflows && sz > 2  && g++ < 400){ sz -= 0.25; style.pointSize = sz; style.leading = sz*1.4; doc.recompose(); }
  sz -= 0.5; style.pointSize = sz; style.leading = sz*1.4;   // small bottom margin
  ```
- **Check for hidden overset text** after filling a fixed frame: `tf.overflows` (boolean).
  If `true`, shrink the font, enlarge the frame, or thread to more frames/pages.

### Export formats (third arg of `ExportFormat`)

| Target | Constant |
|--------|----------|
| PDF | `ExportFormat.PDF_TYPE` |
| **IDML** | `ExportFormat.INDESIGN_MARKUP` |
| PNG / JPG / EPS | `ExportFormat.PNG_FORMAT` / `JPG` / `EPS_TYPE` |

Save a native `.indd` with `doc.save(new File('/abs/out.indd'))`. **Verified end-to-end:**
a 3-column A4-landscape Japanese document with an inline image and a CSV-driven table was
built and exported to `.indd`, `.idml`, and `.pdf` in one run (see
`scripts/20_build-multicolumn-doc-from-md-and-csv.jsx`).

## Detecting & fixing overset (hidden) text — verified

Overset text is content that does not fit its container and so is **invisible** in the
output (a table cell or text frame just looks blank). ExtendScript can detect it:

- **Text frame / story:** `textFrame.overflows` (Boolean).
- **Table cell:** `cell.overflows` (Boolean). Scan a whole table with
  `table.cells.everyItem()` (loop `table.cells.item(i)`), or one column via
  `table.columns.item(c).cells`. A cell's `name` is `"column:row"`.
- **Gotcha:** an overset cell's **`.contents` returns `""`** even though text *is*
  there — so detect with `.overflows`, never by testing for empty content.

**Why a cell oversets:** an **unbreakable Latin token** (a filename like `chimchar.png`,
a URL, a long English word) cannot wrap, so if it is wider than the column it spills out
and the cell renders blank. CJK (Japanese/Chinese) text breaks between characters, so it
wraps and grows the row height instead — it rarely oversets. So overset in a mixed table
is usually a too-narrow **Latin** column.

**Fix by widening the column** — borrow width from a "safe donor" (the widest column
that does *not* itself overset after shrinking), keeping the total width constant so the
table still fits its frame column. **Call `doc.recompose()` after every width change** —
otherwise `.overflows` reports the *stale* pre-change layout and the logic misbehaves
(this was the difference between a diverging and a converging fix):

```javascript
var colHasOverset = function(t,c){
    var cs = t.columns.item(c).cells;
    for (var i=0;i<cs.length;i++){ if (cs.item(i).overflows) return true; }
    return false;
};
var tableHasOverset = function(t){
    for (var c=0;c<t.columnCount;c++){ if (colHasOverset(t,c)) return true; }
    return false;
};
var step=2, floor=16, guard=0;
while (tableHasOverset(table) && guard<200){
    guard++;
    var widenC=-1;
    for (var c=0;c<table.columnCount;c++){ if (colHasOverset(table,c)){ widenC=c; break; } }
    if (widenC<0) break;
    var donor=-1, donorW=-1;                       // widest column that survives a shrink
    for (var c=0;c<table.columnCount;c++){
        if (c===widenC || colHasOverset(table,c)) continue;
        var col=table.columns.item(c), orig=col.width;
        if (orig-step < floor) continue;
        col.width = orig-step; doc.recompose();    // tentative
        var bad = colHasOverset(table,c);
        col.width = orig;      doc.recompose();     // revert
        if (!bad && orig>donorW){ donorW=orig; donor=c; }
    }
    if (donor<0) break;                            // nothing safe to borrow from
    table.columns.item(widenC).width += step;
    table.columns.item(donor).width  -= step;
    doc.recompose();
}
```
**Verified:** this cleared an overset filename cell in the pokemon table by widening the
image column ~2pt (borrowed from the numeric column) while leaving the English-name
column intact. Alternative fixes if no width can be borrowed: shrink the cell/table font
until `overflows` is false, enlarge the whole frame, or allow the token to break.

## Session control recipes (verified on InDesign 2026 / 21.3)

These cover the essential "drive a live InDesign session" operations. All were tested
against a running Adobe InDesign 2026 on macOS.

- **Is there an active document?** Accessing `app.activeDocument` when nothing is open
  **throws**, so always gate on the count first:
  ```javascript
  if (app.documents.length > 0) {
      var doc = app.activeDocument;      // safe
  }
  ```
- **Create a document if none is open:**
  ```javascript
  var doc = (app.documents.length > 0)
      ? app.activeDocument
      : app.documents.add({ documentPreferences: { pageWidth:'210mm', pageHeight:'297mm', facingPages:false } });
  ```
- **Enumerate every open document** (when multiple files are open):
  ```javascript
  for (var i=0; i<app.documents.length; i++) {
      var d = app.documents.item(i);     // index 0 is the frontmost/active one
      console.log(d.name + ' saved=' + d.saved);
  }
  ```
- **Open a specific InDesign file:** `var doc = app.open(new File('/abs/file.indd'));`
  Works for `.indd` and `.idml`. The opened doc becomes the active document.
- **Save to a specific path:** `doc.save(new File('/abs/out.indd'));`
- **Close:** `doc.close(SaveOptions.NO);` (or `SaveOptions.YES` to write changes first).

### Letting Claude verify its own work (important)

Export the result to an image/PDF, then read it back:

```javascript
var doc = app.activeDocument;
doc.exportFile(ExportFormat.PDF_TYPE, new File('/abs/out.pdf'));   // PDF
// or PNG (set app.pngExportPreferences.properties first, see 02_export-doc-as-png.jsx)
doc.exportFile(ExportFormat.PNG_FORMAT, new File('/abs/out.png'));
```

- **Prefer PNG/JPG for visual verification.** Claude's file reader renders PNG/JPG
  natively, so it can *see* the rendered page and confirm the result. **Verified:** an
  exported PNG was read back and its on-page text was legible.
- **PDF needs a renderer.** Reading a PDF page requires `poppler` (`pdftoppm`); if it is
  not installed, export PNG/JPG instead, or `brew install poppler`.

## Recipes / examples

This skill bundles 50+ working example scripts under `scripts/`, indexed in
`examples-index.json` (each entry has `title`, `description`, `filepath`). When a task
matches one of these, **read the closest example and adapt it** rather than writing from
scratch — they encode the correct InDesign DOM idioms.

Workflow:
1. Skim `examples-index.json` for a matching `title`/`description`.
2. `Read` the referenced `scripts/*.jsx`.
3. Adapt paths, sizes, and content for the user's task.
4. Write the result to a temp `.jsx` and run it with the `osascript` command above.
5. Report the returned stdout (the `logs.join('\n')` output) back to the user.

Categories of bundled examples (prefix = rough grouping):

- **00 — inspect / utilities:** console logging, current dir, active document filename,
  selection info, list fonts (installed or used in doc), close all documents.
- **01 — documents:** create a document with a text frame.
- **02 — export:** export active/Hello-World doc as PDF (PDF/X-1a), PNG, JPG, EPS.
- **03 — tables:** create a table, create + find a table, build a price-list table from JSON.
- **04 — images / PDF placement:** place image at page center, into a rectangle, with a
  graphic frame, as an inline graphic; place a PDF.
- **05 — IDML:** list IDML files, merge IDML files, convert IDML → INDD.
- **06 — file I/O:** save/read/parse JSON, save/read/parse TSV text (UTF-8).
- **07 — traversal / linked images:** traverse all pages & page items, replace an image.
- **08 — vector drawing:** graphic line, polygon, Bézier curves, fractal triangle,
  fractal ginkgo leaf.
- **09 — styles & type:** read paragraph/character styles, apply paragraph (and
  character) styles to "Hello World" text.
- **10 — layers:** find an existing layer or create one, assign page items to it.
- **11 — links:** check linked-image metadata (paths, status).
- **12 — text frames:** rounded corners, center-align contents, inline text frame,
  inspect text object properties.
- **13 — pages:** create a document with multiple pages.
- **14 — conditional text:** read all condition names, delete all conditions.
- **15 — colors / swatches:** read all color names, create a custom swatch.

## Notes & gotchas

- The shell receives only the **last evaluated expression**. Don't rely on `$.writeln`
  alone for results you need programmatically — push to `logs` and end with
  `logs.join('\n')`.
- ExtendScript errors surface in `osascript` stderr / the return string; if output is
  empty or an error, check that a document is open and the InDesign version matches.
- Use absolute paths everywhere (script file, image/PDF inputs, export outputs).
- **Do not write InDesign export/output files into `/tmp`.** On macOS `/tmp` is a
  symlink to `/private/tmp`, and InDesign's `File` export fails with *"Folder … not
  found" (error 48)*. The `.jsx` script itself can live in `/tmp` (it's read by
  `osascript`, not by InDesign's File API), but export targets must be a real directory
  such as the user's project folder or `~/Desktop`. **Verified:** `/tmp` export failed;
  exporting to a real path succeeded.
- This is macOS-only; it depends on AppleScript (`osascript`) and the InDesign
  AppleScript `do script` command.
