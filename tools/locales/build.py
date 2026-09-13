#!/usr/bin/env python3
"""
Generates apps/web/src/i18n/locales/{en,cs,uk,pl,ru}.json from the section
tables in this directory.

Every entry maps a key to five strings in the order
  English, Čeština, Українська, Polski, Русский
so the five files can never drift apart. Electrical terminology is the term an
electrician in that country actually uses, not a literal translation.

Run:  python3 tools/locales/build.py
"""
import json
import os
import sys

LANGS = ["en", "cs", "uk", "pl", "ru"]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "apps", "web", "src", "i18n", "locales"))

SECTIONS = [
    "sec_shell",
    "sec_catalog",
    "sec_props",
    "sec_sim",
    "sec_rules",
    "sec_ui",
]


def main() -> int:
    sys.path.insert(0, HERE)
    table: dict[str, list[str]] = {}
    for name in SECTIONS:
        mod = __import__(name)
        for k, v in mod.S.items():
            if k in table:
                raise SystemExit(f"duplicate key {k} in {name}")
            table[k] = v

    os.makedirs(OUT, exist_ok=True)
    for i, lang in enumerate(LANGS):
        data = {k: v[i] for k, v in sorted(table.items())}
        path = os.path.join(OUT, f"{lang}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
            f.write("\n")
        print(f"{lang}.json  {len(data)} keys")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
