# Project JSON schema

The project file is the single source of truth: the schematic view, the panel
view, the simulation and the design rule check all read it. It is plain JSON,
versioned, and every published version has a migration path forward.

**Current version: `1`**

```jsonc
{
  "schemaVersion": 1,
  "id": "p-8f2a",
  "name": "Rodinný dům 3+1",
  "meta": {
    "author": "…", "site": "…", "notes": "…", "revision": "…",
    "createdAt": "2026-09-12T10:00:00.000Z",
    "updatedAt": "2026-09-12T10:42:00.000Z"
  },
  "settings": { … },
  "components": [ … ],
  "wires": [ … ],
  "circuits": [ … ],
  "enclosures": [ … ],
  "busbars": [ … ],
  "annotations": [ … ],
  "groups": [ … ],
  "view": { "schematic": { "pan": {"x":0,"y":0}, "zoom": 1 }, "panel": { … } }
}
```

## `settings`

| Field | Type | Meaning |
|---|---|---|
| `system` | `TN-C` \| `TN-C-S` \| `TN-S` | Earthing system of the installation |
| `voltageLN` | number | Nominal line-to-neutral voltage, V (230) |
| `voltageLL` | number | Nominal line-to-line voltage, V (400) |
| `frequency` | number | Hz (50) |
| `ambientTemp` | number | °C, used for ampacity derating |
| `defaultInstallMethod` | `A1`…`E` | Reference installation method of ČSN 33 2000-5-52 ed. 2 |
| `voltageDropLighting` | number | % limit for lighting circuits (3) |
| `voltageDropOther` | number | % limit for other circuits (5) |
| `conductorTemp` | number | °C, operating temperature used for R and Zs (70) |
| `premises` | `dwelling` \| `commercial` \| `industrial` \| `outdoor` | Changes rule severity |

## `components[]`

```jsonc
{
  "id": "f1",
  "type": "rcbo",             // catalog type key
  "x": 160, "y": 360,         // schematic position, px
  "rot": 0,                   // 0 | 90 | 180 | 270
  "mirror": false,
  "label": "F2",              // printed on the device and the circuit schedule
  "props": { "inA": 16, "curve": "B", "idn": 30, "rcdType": "A", "poles": "1P+N" },
  "circuit": "c2",            // circuit grouping id
  "panel": { "enclosureId": "e1", "row": 2, "slot": 4 },
  "location": "koupelna",     // used by the bathroom / outdoor rules
  "locked": false,
  "notes": "…"
}
```

`props` is validated against the catalog: every component type declares a list
of `PropSpec` entries (key, type, options, unit, range). Unknown keys are kept
untouched so that a file written by a newer build still round-trips.

`panel` is optional. A component without it exists only in the schematic; the
panel view lists it as unplaced.

## `wires[]`

A wire is **one conductor**, not a cable. A 3-core cable to a socket is three
wires with the same length and cross-section and roles `L1`, `N`, `PE`. This is
what makes a swapped N/PE, a switch in the neutral or a lost PE behave the way
it does in reality rather than producing a generic error.

```jsonc
{
  "id": "w14",
  "from": { "comp": "f2", "terminal": "out.L" },
  "to":   { "comp": "z1", "terminal": "in.L" },
  "role": "L2",               // L1 | L2 | L3 | N | PE | PEN | CTRL | ELV+ | ELV-
  "csa": 2.5,                 // mm²: 0.75 1 1.5 2.5 4 6 10 16 25 35 …
  "length": 18,               // metres — electrically significant
  "material": "Cu",           // Cu | Al
  "color": null,              // null = follow the role convention
  "points": [ { "x": 200, "y": 420 } ],   // manual bend points
  "circuit": "c2",
  "installMethod": "B2",      // overrides settings.defaultInstallMethod
  "loadedConductors": 2,      // 2 | 3, for the ampacity table
  "groupingFactor": 1
}
```

Terminal ids are declared by the catalog for each component type, e.g. a 1P+N
RCBO has `in.L`, `in.N`, `out.L`, `out.N`; a socket has `in.L`, `in.N`, `in.PE`
and the plug side `out.L`, `out.N`, `out.PE`.

## `circuits[]`

```jsonc
{ "id": "c2", "name": "Zásuvky obývák", "kind": "socket", "color": "#2f8fd0",
  "description": "…" }
```

`kind` is one of `lighting`, `socket`, `cooker`, `boiler`, `appliance`, `evse`,
`motor`, `heating`, `distribution`, `control`, `other`, and drives the minimum
cross-section and dedicated-circuit rules.

## `enclosures[]` and `busbars[]`

```jsonc
{ "id": "e1", "name": "RD 4×12", "rows": 4, "modulesPerRow": 12,
  "mount": "flush", "ip": "IP40", "x": 0, "y": 0, "door": true }

{ "id": "b1", "enclosureId": "e1", "row": 1, "slot": 0, "modules": 12,
  "kind": "3P+N", "phase": "L1", "inA": 63 }
```

One module is 17,5 mm. `rows × modulesPerRow` is the capacity checked by the
design rule check.

## `annotations[]` and `groups[]`

Free text, rectangles, lines and notes, each bound to the `schematic` or
`panel` view. Groups are named sets of component ids for multi-select operations.

## Versioning and migration

`migrateProject(raw)` accepts any document with `schemaVersion ≤ SCHEMA_VERSION`
and applies the migrations in order, returning the upgraded project together
with any warnings. A document from a **newer** build is rejected with an
explicit error rather than being silently mis-read. Documents without a
`schemaVersion` are treated as version 1 with a warning.

To add a field: add it to the interface with a safe default in
`normaliseProject`. To change the meaning of an existing field: bump
`SCHEMA_VERSION` and append a migration function to `MIGRATIONS`.
