# indesign-extendscript-plugins

A [Claude Code](https://claude.com/claude-code) plugin that lets Claude automate
**Adobe InDesign** on macOS via ExtendScript (`.jsx`) run through AppleScript.

It can create and modify documents, place images, build tables, apply styles,
export PDF/PNG/JPG/EPS, convert IDML, and more — driven from natural-language
requests. The plugin bundles 50+ working example scripts under
[`skills/indd/scripts`](skills/indd/scripts).

## Requirements

- macOS
- Adobe InDesign installed (2024 / 2025 / 2026)
- Claude Code

## Install

In Claude Code:

```
/plugin marketplace add mindboard/indesign-extendscript-plugins
/plugin install indd@indesign-extendscript-plugins
```

## Usage

Just ask Claude in plain language, for example:

> Create an A4 document with a title and a 3-column body, then export it as PDF.

Claude writes the ExtendScript and runs it against your running InDesign.
See [`skills/indd/SKILL.md`](skills/indd/SKILL.md) for the full capabilities and
idioms.

## Credits

Most of the example scripts under [`skills/indd/scripts`](skills/indd/scripts)
are adapted from my earlier repository
[mindboard/indesign-extendscript](https://github.com/mindboard/indesign-extendscript).

## License

MIT
