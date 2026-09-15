# Simulátor elektroinstalace / Electrical installation simulator

A browser sandbox for working electricians: draw a real low-voltage installation
on a 2D canvas, wire it by hand, then run it and see whether it actually works.

Scope: AC up to 1000 V — single-phase 230 V and three-phase 400 V, 50 Hz, in
TN-C, TN-C-S and TN-S systems. Everything from a lamp on a one-way switch to a
full distribution board with a main switch, meter, RCDs, RCBOs and outgoing
circuits to sockets, cooker, boiler and an EV wallbox.

Languages: English, Čeština, Українська, Polski, Русский.

**Open it in a browser: https://romanmykh.github.io/BudovaBySmech/** — nothing to
install, no localhost. That deployment runs the whole simulator in the browser
and keeps projects in local storage; see [GitHub Pages](#github-pages) below.

It works on a phone as well as at a desk. Below 900 px the library and the
inspector become drawers reached from a bottom bar, the toolbar collapses into a
menu sheet, and the canvas takes the rest of the screen: drag to pan, pinch to
zoom, tap a device to select it, tap a terminal to start a conductor.

## Running it

```bash
npm install
npm run dev            # API on :8787, editor on :5173
```

Open http://localhost:5173. You can work as a guest straight away — projects are
kept in the browser and can be moved into an account in one click after signing
up (email and password, nothing else).

```bash
npm test               # engine + localisation tests
npm run build          # production build
npm start              # serves the built front end and the API from one process
```

Environment variables for the server: `PORT` (8787), `DB_FILE`
(`data/budova.sqlite`), `JWT_SECRET`. The whole thing runs on one small VPS.

## Symbol directory

A second, deliberately tiny page lives next to the editor: a searchable
directory of 526 symbols taken from the IEC 60617 symbol tables, in English,
Czech, Russian and Polish, each downloadable as SVG or PNG. The artwork is
vectorised out of the source document rather than redrawn, and every card cites
its source page. Three static files, no framework, no build.

**Open it: https://romanmykh.github.io/BudovaBySmech/symbols/**

```bash
npm run symbols                       # http://localhost:8080
python3 tools/symbols/build.py <pdf>  # regenerate the symbol data
```

See [apps/symbols/README.md](apps/symbols/README.md).

## GitHub Pages

`.github/workflows/pages.yml` builds `apps/web` and publishes it on every push
to the default branch. Two build-time settings make it work under the repository
subpath:

| Variable | Value on Pages | Effect |
|---|---|---|
| `BASE_PATH` | `/BudovaBySmech/` | Vite rewrites every asset URL to the subpath |
| `VITE_API_BASE` | `off` | No backend: the app never calls an API |

Pages is static, so the Express API is not deployed with it. Everything that
does not need a server works exactly as it does locally — the solver, fault
injection, the instruments, the panel view, the design rule check, the exports
and all five languages. Projects are kept in the browser and moved between
machines with Export / Import; the sign-in screen is replaced by a note saying
so. Point the same build at a server by setting `VITE_API_BASE` to its URL, and
accounts come back with no other change.

`404.html` is a copy of `index.html`, which is how a static host answers a deep
link into a single-page app.

**One-time repository setting:** Settings → Pages → Build and deployment →
Source: **GitHub Actions**.

To reproduce the Pages build locally:

```bash
cd apps/web
BASE_PATH=/BudovaBySmech/ VITE_API_BASE=off npx vite build
```

## Layout

```
packages/engine   simulation engine — pure TypeScript, no React, unit tested
apps/web          React + Vite editor
apps/server       Express + SQLite + bcrypt + JWT
apps/symbols      static EN/CZ directory of IEC 60617 symbols (no build step)
tools/locales     the single table the five locale files are generated from
tools/symbols     extracts the symbols from the IEC 60617 source PDF
docs/             project JSON schema
```

Imports carry the `.js` extension, so TypeScript must never emit next to its
sources — a stale `foo.js` would shadow the `foo.ts` it came from and the
bundler would silently build the old code. No build script emits into `src/`,
and `.gitignore` blocks it.

## The engine

`packages/engine` is the core, and it is a real solver rather than scripted
animation:

- **Steady-state RMS analysis at 50 Hz** by complex modified nodal analysis,
  recomputed on every state change and on a time tick. Every conductor is a
  branch whose resistance comes from its length, cross-section, material and
  operating temperature, and every node carries an insulation resistance to
  earth. Node potentials, branch currents and voltage drops fall out of the
  solve, so connectivity mistakes behave the way they do on site: a broken
  neutral really does redistribute the phase voltages and over-volt the lightly
  loaded phase; a switch in the neutral really does leave the load live.
- **Protective devices on their published characteristics.** MCBs have a thermal
  region integrated over time and a magnetic region that clears in milliseconds.
  RCDs trip on the vector sum through their poles, within the times of
  ČSN EN 61008-1, and respect their type — a type AC device is blind to a DC
  residual, and a smooth DC component saturates a type AC or A device so that it
  stops seeing the AC fault as well. Fuses follow gG and NH curves, AFDDs react
  to injected arc faults, SPDs conduct on surge and age.
- **Adaptive time stepping**: millisecond resolution while a magnetic release or
  an RCD is pending, minute-long steps while a bimetal is slowly heating. The
  editor's time acceleration (up to 1000×) is what makes a realistic twenty
  minute thermal trip watchable.
- **Fault injection**: short circuits L-N / L-PE / L-L, earth faults with a
  settable resistance, a person touching a live part with a body and standing
  resistance, insulation degradation, loss of PE, loss of a phase, mains surge,
  cable damage, arc faults and DC residual currents. The log says what happened,
  why, and whether the person would have been protected.
- **Instruments** that solve their own copy of the network, so measuring never
  disturbs the simulation: multimeter, clamp meter, insulation tester, loop
  impedance meter, RCD tester (trip time and trip current at ½, 1, 2 and 5×IΔn),
  phase rotation tester and socket tester.

## Design rule check

One click produces a pass / warning / fail checklist that can be exported as
PDF, with every finding linked to the component on the canvas. It follows
current Czech practice:

| Area | Reference |
|---|---|
| Shock protection, disconnection times, 30 mA RCDs | ČSN 33 2000-4-41 ed. 3 |
| Overcurrent protection, conductor against device | ČSN 33 2000-4-43 ed. 2 |
| Thermal effects, AFDD | ČSN 33 2000-4-42 ed. 2 |
| Cable sizing and current-carrying capacity | ČSN 33 2000-5-52 ed. 2 |
| Earthing and protective conductors | ČSN 33 2000-5-54 ed. 3 |
| Surge protection | ČSN 33 2000-5-53 ed. 2 |
| Bathroom zones | ČSN 33 2000-7-701 ed. 2 |
| EV charging points | ČSN 33 2000-7-722 ed. 3 |
| Indoor wiring, circuit rules, outlets per circuit | ČSN 33 2130 ed. 3 |
| Inspection | ČSN 33 2000-6 ed. 2, ČSN 33 1500 |
| Distribution boards | ČSN EN 61439-3 |
| Competence and voltage framework | nařízení vlády č. 194/2022 Sb. |

Where a rule is stated in plain language because the exact clause number has not
been confirmed against the published standard, the finding is marked
**clause to verify** rather than carrying an invented citation.

## Localisation

All five locale files are generated from one table in `tools/locales`, so the
key sets cannot drift apart:

```bash
npm run locales
```

Terminology is what an electrician in that country says, not a literal
translation — MCB = jistič = автоматичний вимикач = wyłącznik nadprądowy =
автоматический выключатель. `apps/web/test/i18n.test.ts` fails the build if a
key is missing in any language, if a placeholder differs between languages, or
if the source calls `t()` with a key that does not exist.

## Project file

Documented in [docs/PROJECT_SCHEMA.md](docs/PROJECT_SCHEMA.md). It is versioned
and migrated forward on load; a file from a newer build is rejected with a clear
message rather than silently mis-read. A wire is **one conductor**, not a cable —
that is what makes swapped N/PE, a lost PE or a shared neutral behave correctly.
