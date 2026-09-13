# Simulátor elektroinstalace / Electrical installation simulator

A browser sandbox for working electricians: draw a real low-voltage installation
on a 2D canvas, wire it by hand, then run it and see whether it actually works.

Scope: AC up to 1000 V — single-phase 230 V and three-phase 400 V, 50 Hz, in
TN-C, TN-C-S and TN-S systems. Everything from a lamp on a one-way switch to a
full distribution board with a main switch, meter, RCDs, RCBOs and outgoing
circuits to sockets, cooker, boiler and an EV wallbox.

Languages: English, Čeština, Українська, Polski, Русский.

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

## Layout

```
packages/engine   simulation engine — pure TypeScript, no React, unit tested
apps/web          React + Vite editor
apps/server       Express + SQLite + bcrypt + JWT
tools/locales     the single table the five locale files are generated from
docs/             project JSON schema
```

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
