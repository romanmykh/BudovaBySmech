#!/usr/bin/env python3
"""Build apps/symbols/data/symbols.json from the IEC 60617 source PDF.

Nothing here draws a symbol.  extract.py lifts the artwork and the wording out
of the source document; this adds the translated names (cs.json, ru.json,
pl.json), the category each row belongs to, and the small spelling fixes the
source needs, and writes what the page loads.

    python3 tools/symbols/build.py <source.pdf>
"""
import json
import os
import re
import sys

from extract import extract

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "apps", "symbols", "data", "symbols.json")

LANGS = ("en", "cs", "ru", "pl")

# id, then the category name in each language of LANGS
CATEGORIES = [
    ("connections", "Conductors & connections", "Vodiče a spoje",
     "Проводники и соединения", "Przewody i połączenia"),
    ("network", "Lines & wiring", "Vedení a rozvody",
     "Линии и прокладка", "Linie i instalacje"),
    ("sockets", "Socket outlets", "Zásuvky", "Розетки", "Gniazda wtyczkowe"),
    ("switches", "Switches (installation)", "Vypínače a spínače",
     "Выключатели (установочные)", "Łączniki instalacyjne"),
    ("lighting", "Lighting", "Svítidla", "Освещение", "Oświetlenie"),
    ("appliances", "Appliances", "Spotřebiče", "Приёмники энергии", "Odbiorniki"),
    ("switching", "Switching & protection devices", "Spínací a jisticí přístroje",
     "Коммутационные и защитные аппараты", "Aparaty łączeniowe i zabezpieczające"),
    ("protection", "Surge protection", "Ochrana před přepětím",
     "Защита от перенапряжений", "Ochrona przepięciowa"),
    ("earthing", "Earthing & bonding", "Uzemnění a pospojování",
     "Заземление и уравнивание потенциалов", "Uziemienia i połączenia wyrównawcze"),
    ("measuring", "Measuring & signalling", "Měřicí přístroje a signalizace",
     "Измерительные приборы и сигнализация", "Przyrządy pomiarowe i sygnalizacja"),
    ("machines", "Rotating machines", "Točivé stroje",
     "Электрические машины", "Maszyny elektryczne"),
    ("transformers", "Transformers", "Transformátory",
     "Трансформаторы", "Transformatory"),
    ("converters", "Converters & sources", "Měniče a zdroje",
     "Преобразователи и источники", "Przekształtniki i źródła"),
    ("generation", "Generating stations & substations", "Výrobny a rozvodny",
     "Электростанции и подстанции", "Elektrownie i stacje"),
    ("passive", "Passive components", "Pasivní součástky",
     "Пассивные компоненты", "Elementy bierne"),
    ("semiconductors", "Semiconductors", "Polovodičové součástky",
     "Полупроводниковые приборы", "Elementy półprzewodnikowe"),
    ("actuators", "Actuators & operation", "Ovládací prvky a pohony",
     "Приводы и органы управления", "Napędy i elementy sterownicze"),
    ("qualifiers", "Qualifying symbols", "Kvalifikační značky",
     "Квалифицирующие обозначения", "Symbole kwalifikujące"),
    ("selectors", "Selectors", "Voliče", "Искатели", "Wybieraki"),
    ("misc", "Other symbols", "Ostatní značky", "Прочие обозначения", "Inne symbole"),
]

# The source runs in topic order, so a row's category follows from its position.
RANGES = [
    (0, 38, "connections"),
    (40, 52, "qualifiers"),
    (53, 82, "qualifiers"),
    (83, 124, "actuators"),
    (125, 130, "earthing"),
    (135, 201, "switching"),
    (202, 206, "protection"),
    (207, 224, "generation"),
    (225, 243, "network"),
    (244, 252, "sockets"),
    (253, 266, "switches"),
    (267, 276, "lighting"),
    (277, 278, "appliances"),
    (279, 304, "passive"),
    (305, 353, "semiconductors"),
    (354, 379, "machines"),
    (380, 430, "transformers"),
    (431, 447, "converters"),
    (448, 474, "measuring"),
    (475, 494, "selectors"),
    (499, 504, "qualifiers"),
    (505, 507, "earthing"),
    (518, 523, "transformers"),
]
OVERRIDES = {
    39: "semiconductors",   # a thyristor printed among the qualifying symbols
    131: "qualifiers", 132: "switching", 133: "measuring", 134: "converters",
    495: "misc", 496: "converters", 497: "transformers", 498: "transformers",
    508: "passive", 509: "switching", 510: "connections", 511: "connections",
    512: "switching", 513: "measuring", 514: "generation", 515: "generation",
    516: "appliances", 517: "appliances", 524: "measuring", 525: "switching",
}

# Spelling in the source, corrected so search finds these rows.
TYPOS = {
    "Brancing": "Branching", "genral": "general", "Funtional": "Functional",
    "polirized": "polarized", "polirised": "polarised", "Capasitor": "Capacitor",
    "Adjustibility": "Adjustability", "adjustibility": "adjustability",
    "Continious": "Continuous", "Indicationn": "Indication", "opetated": "operated",
    "Actruator": "Actuator", "actuaded": "actuated", "maually": "manually",
    "dosconnector": "disconnector", "contat": "contact", "Thrmocouple": "Thermocouple",
    "Intergrading": "Integrating", "flourescent": "fluorescent",
    "Flourescent": "Fluorescent", "dependant": "dependent",
    "Potentiameter": "Potentiometer", "maveable": "movable", "mater": "meter",
    "symetic": "symmetric", "exitation": "excitation", "Simplicity": "Simple",
}

# A handful of terms an electrician is likelier to type than the standard's own
# wording; they only widen the search, never replace a name.
SYNONYMS = [
    (r"\bsocket outlet\b", "zásuvka socket plug receptacle"),
    (r"\bswitch\b", "vypínač spínač switch"),
    (r"\bluminaire|lamp\b", "svítidlo světlo lamp luminaire"),
    (r"\bfuse\b", "pojistka fuse jištění"),
    (r"\bcircuit breaker\b", "jistič breaker MCB"),
    (r"\bcontactor\b", "stykač contactor"),
    (r"\bearth|bonding\b", "uzemnění zemnění pospojování PE earth ground"),
    (r"\btransformer\b", "transformátor trafo transformer"),
    (r"\bmotor\b", "motor pohon"),
    (r"\bwatt-hour meter\b", "elektroměr kWh měření spotřeby"),
    (r"\bcapacitor\b", "kondenzátor capacitor"),
    (r"\bresistor\b", "rezistor odpor resistor"),
    (r"\bdiode\b", "dioda diode"),
    (r"\btransistor\b", "tranzistor transistor"),
    (r"\brelay\b", "relé relay"),
    (r"\bdisconnector|isolator\b", "odpojovač odpínač disconnector"),
    (r"\bconductor|cable|line\b", "vodič kabel vedení conductor cable"),
    (r"\bjunction box|connection box\b", "krabice odbočná junction box"),
    (r"\bpush-button\b", "tlačítko push button"),
    (r"\bthyristor\b", "tyristor thyristor"),
]


def fix(text):
    for bad, good in TYPOS.items():
        text = text.replace(bad, good)
    return re.sub(r"\s+", " ", text).strip()


def slug(text, n=6):
    words = re.sub(r"[^a-z0-9 ]", " ", text.lower()).split()
    return "-".join(words[:n]) or "symbol"


def category(i):
    if i in OVERRIDES:
        return OVERRIDES[i]
    for lo, hi, cat in RANGES:
        if lo <= i <= hi:
            return cat
    return "misc"


def keywords(en):
    hits = [words for pattern, words in SYNONYMS if re.search(pattern, en, re.I)]
    return " ".join(hits)


def main(pdf):
    rows = extract(pdf)
    names = {}
    for lang in LANGS:
        if lang == "en":
            continue  # the English name is the source's own wording
        table = json.load(open(os.path.join(HERE, f"{lang}.json"), encoding="utf-8"))
        if len(table) != len(rows):
            raise SystemExit(
                f"{lang}.json has {len(table)} names but the source yields "
                f"{len(rows)} rows; the translation tables are keyed by row order "
                "and must be updated together with the source"
            )
        names[lang] = table

    seen = {}
    symbols = []
    for i, row in enumerate(rows):
        en = fix(row["desc"])
        name = slug(en)
        seen[name] = seen.get(name, 0) + 1
        sid = name if seen[name] == 1 else f"{name}-{seen[name]}"
        symbols.append(
            {
                "id": sid,
                "cat": category(i),
                "name": dict({"en": en}, **{l: names[l][str(i)] for l in names}),
                "kw": {"en": keywords(en)},
                "note": fix(row["comment"]),
                "ref": f"IEC 60617 · s. {row['page']}",
                "svg": row["svg"],
            }
        )

    order = {c[0]: n for n, c in enumerate(CATEGORIES)}
    symbols.sort(key=lambda s: (order[s["cat"]], s["name"]["en"]))
    data = {
        "meta": {
            "source": "IEC 60617 symbol tables (source PDF), 53 pages",
            "viewBox": "0 0 120 80",
            "count": len(symbols),
            "langs": list(LANGS),
        },
        "categories": [
            dict({"id": c[0]}, **dict(zip(LANGS, c[1:]))) for c in CATEGORIES
        ],
        "symbols": symbols,
    }
    with open(os.path.abspath(OUT), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    counts = {}
    for s in symbols:
        counts[s["cat"]] = counts.get(s["cat"], 0) + 1
    print(f"{len(symbols)} symbols -> {os.path.abspath(OUT)}")
    for c in CATEGORIES:
        print(f"  {c[0]:16} {counts.get(c[0], 0)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
