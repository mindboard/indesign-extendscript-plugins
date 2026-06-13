# indesign-extendscript-plugins

A [Claude Code](https://claude.com/claude-code) plugin for automating
**Adobe InDesign**, driven from natural-language requests. It bundles two
complementary skills:

- **`indd`** — drive a running InDesign on macOS via ExtendScript (`.jsx`) run
  through AppleScript. Create and modify documents, place images, build tables,
  apply styles, export PDF/PNG/JPG/EPS, convert IDML, and more. Ships 50+ working
  example scripts under [`skills/indd/scripts`](skills/indd/scripts).
- **`idml`** — unpack, edit, and repack **IDML** files as XML, fully offline.
  An `.idml` is a ZIP of XML, so Claude can extract it, edit the story text /
  styles / colors directly, and pack it back into a valid `.idml` — **without
  launching InDesign**. Implemented in pure-stdlib Python
  ([`skills/idml/scripts/idmlutil.py`](skills/idml/scripts/idmlutil.py)).

The two work well together: build or render with `indd`, manipulate the file's
XML offline with `idml`.

## Requirements

- Claude Code
- The **`indd`** skill needs macOS with Adobe InDesign installed (2024 / 2025 / 2026).
- The **`idml`** skill needs only Python 3 (already on macOS) — no InDesign, no
  third-party packages. It is OS-independent; only optional render-verification
  (handed off to `indd`) requires InDesign.

## Install

In Claude Code:

```
/plugin marketplace add mindboard/indesign-extendscript-plugins
/plugin install indd@indesign-extendscript-plugins
```

## Usage

Just ask Claude in plain language. Claude picks the right skill automatically
based on the task — you don't need to name it.

Generate / render with **`indd`**:

> Create an A4 document with a title and a 3-column body, then export it as PDF.

Claude writes the ExtendScript and runs it against your running InDesign.
See [`skills/indd/SKILL.md`](skills/indd/SKILL.md) for the full capabilities and
idioms.

Edit an existing IDML offline with **`idml`**:

> Open hello.idml, change the text "Hello" to "Hello, World!", and save it as
> hello-world.idml.

Claude unpacks the IDML, edits the story XML, and repacks a valid `.idml` —
no InDesign needed. See [`skills/idml/SKILL.md`](skills/idml/SKILL.md).

## Credits

Most of the example scripts under [`skills/indd/scripts`](skills/indd/scripts)
are adapted from my earlier repository
[mindboard/indesign-extendscript](https://github.com/mindboard/indesign-extendscript).

## License

MIT
