# Značky elektro / Electrical symbols

A single-page, dependency-free reference directory of electrical symbols for
working electricians: search, EN/CZ switching, and one-click SVG or PNG download
of every symbol.

```
apps/symbols/
  index.html          markup (header, search, category bar, grid)
  styles.css          ~150 lines, light + dark, responsive down to 320 px
  app.js              search, language, rendering, SVG/PNG export (no framework)
  data/symbols.json   generated — 279 symbols, do not edit by hand
tools/symbols/build.py  the generator that produces data/symbols.json
```

## Running it

The page loads `data/symbols.json` with `fetch`, so it needs to be served over
HTTP (opening the file directly from disk is blocked by the browser):

```bash
npm run symbols          # http://localhost:8080
```

There is no build step — it is three static files plus one JSON. Deploy by
copying `apps/symbols/` anywhere that serves static files.

## Data format

```json
{
  "meta": { "standard": "ČSN EN 60617 …", "viewBox": "0 0 120 80", "count": 279 },
  "categories": [ { "id": "sockets", "en": "Sockets & outlets", "cs": "Zásuvky a vývody" } ],
  "symbols": [
    {
      "id": "prot-rcd-2p",
      "cat": "protection",
      "name": { "en": "Residual current device (RCD) 2P", "cs": "Proudový chránič 2pólový" },
      "kw":   { "en": "RCD RCCB earth leakage 30mA", "cs": "proudový chránič RCD 30 mA" },
      "ref": "IEC 60617-07-13-08",
      "svg": "<line …/><rect …/><circle …/>"
    }
  ]
}
```

`svg` holds the **inner** markup only. Every symbol is drawn on the same
`0 0 120 80` viewBox with `stroke="currentColor"` and `fill="none"`, so the page
themes them and the exported file carries a plain black stroke on transparent
(SVG) or white (PNG, 960 × 640 px) background.

Search matches both languages, the keyword lists, the standard reference and the
id, and it is diacritics-insensitive: `chranic` finds *chránič*.

## Editing the symbols

Change `tools/symbols/build.py` and regenerate:

```bash
npm run symbols:build
```

The generator composes every symbol from a handful of primitives (`line`, `rect`,
`circ`, `path`, `text`), so variants of one device — a socket with one to four
outlets, with or without a protective contact, IP-rated, three-phase — stay
geometrically identical apart from the qualifying mark the standard adds.

## Standards note

The graphical forms follow **ČSN EN 60617 / IEC 60617** (schematic symbols) and
**ČSN EN 60617-11 / ČSN 01 3411** (drawings for electrical installations), with
the IEC database reference (e.g. `IEC 60617-07-13-08`) shown on each card where
one applies. The standard text itself is copyrighted and sold by ČAS
(agentura-cas.cz) and is not reproduced here — for project documentation that has
to be defended in an inspection, verify the shape against the current standard
before use.
