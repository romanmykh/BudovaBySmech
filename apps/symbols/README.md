# Značky IEC 60617 / IEC 60617 symbols

A single-page, dependency-free directory of the IEC 60617 symbol tables: search,
EN/CZ switching, and one-click SVG or PNG download of every symbol.

```
apps/symbols/
  index.html          markup (header, search, category bar, grid)
  styles.css          light + dark, responsive down to 320 px
  app.js              search, language, rendering, SVG/PNG export (no framework)
  data/symbols.json   generated — 526 symbols, do not edit by hand
tools/symbols/
  extract.py          lifts artwork and wording out of the source PDF
  build.py            adds categories and Czech names, writes symbols.json
  cs.json             the Czech name of every row, keyed by row order
```

## Where the symbols come from

Every symbol is **taken from the IEC 60617 symbol tables** in the source PDF —
none is redrawn from memory. In that document each symbol is a 1-bit image mask
over a dotted layout grid, so `extract.py`:

1. renders each symbol cell at the mask's own resolution;
2. drops the grid dots (small isolated components, plus the repeating blob size
   the grid is drawn with);
3. traces the remaining ink to Bezier outlines with potrace;
4. normalises the outline into the shared `0 0 120 80` viewBox.

The result is the source's own geometry as vector paths. Each card cites the
page it came from (`IEC 60617 · s. 21`), so any symbol can be checked against
the document in a few seconds.

The English wording is the source's own, with its spelling mistakes corrected
(`Brancing` → `Branching`, `genral` → `general`, and about twenty more — see
`TYPOS` in `build.py`) so that search finds those rows. The Czech name is a
translation, written by hand in `cs.json`; the standard itself is published in
Czech as ČSN EN 60617 by ČAS, and where a wording matters legally, that edition
is the one to quote.

## Running it

The page loads `data/symbols.json` with `fetch`, so it needs to be served over
HTTP (opening the file from disk is blocked by the browser):

```bash
npm run symbols          # http://localhost:8080
```

No build step — three static files plus one JSON. Deploy by copying
`apps/symbols/` anywhere that serves static files.

## Regenerating the data

```bash
python3 tools/symbols/build.py <source.pdf>
```

`cs.json` is keyed by row order, so the build refuses to run if the source
yields a different number of rows than the translation table covers — a changed
source means the Czech names need revisiting rather than silently shifting by
one.

## Data format

```json
{
  "meta": { "source": "IEC 60617 symbol tables (source PDF), 53 pages",
            "viewBox": "0 0 120 80", "count": 526 },
  "categories": [ { "id": "sockets", "en": "Socket outlets", "cs": "Zásuvky" } ],
  "symbols": [
    {
      "id": "socket-outlet-power-with-protective-contact",
      "cat": "sockets",
      "name": { "en": "Socket outlet (power) with protective contact",
                "cs": "Zásuvka s ochranným kontaktem" },
      "kw":   { "en": "zásuvka socket plug receptacle", "cs": "" },
      "note": "",
      "ref": "IEC 60617 · s. 21",
      "svg": "<path d=\"…\" fill=\"currentColor\" stroke=\"none\" fill-rule=\"evenodd\"/>"
    }
  ]
}
```

`svg` holds the **inner** markup only: filled outlines in `currentColor`, so the
page themes them and the download carries a black symbol on a transparent (SVG)
or white (PNG, 960 × 640) background. `note` is the source's own comment column.

Search matches both languages, the keyword list, the source comment, the page
reference and the id, and ignores diacritics: `zasuvka` finds *zásuvka*.
