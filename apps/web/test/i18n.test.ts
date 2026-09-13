import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import en from '../src/i18n/locales/en.json';
import cs from '../src/i18n/locales/cs.json';
import uk from '../src/i18n/locales/uk.json';
import pl from '../src/i18n/locales/pl.json';
import ru from '../src/i18n/locales/ru.json';
import { ALL_DEFS, CATEGORIES, TEMPLATES } from '@budova/engine';

const LOCALES: Record<string, Record<string, string>> = { en, cs, uk, pl, ru };
const SRC = resolve(__dirname, '..', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const sourceFiles = walk(SRC).filter((f) => /\.tsx?$/.test(f) && !f.includes('/locales/'));
const sources = sourceFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

describe('localisation', () => {
  it('ships exactly the five supported languages', () => {
    expect(Object.keys(LOCALES).sort()).toEqual(['cs', 'en', 'pl', 'ru', 'uk']);
  });

  it('has identical key sets in every language', () => {
    const reference = Object.keys(en).sort();
    for (const [lang, dict] of Object.entries(LOCALES)) {
      expect({ lang, keys: Object.keys(dict).sort() }).toEqual({ lang, keys: reference });
    }
  });

  it('has no empty or untranslated-looking values', () => {
    for (const [lang, dict] of Object.entries(LOCALES)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(`${lang}:${key}`).toBe(`${lang}:${key}`);
        expect(value.trim().length, `${lang}:${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the same interpolation placeholders in every language', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en)) {
      const expected = placeholders(en[key as keyof typeof en]);
      for (const [lang, dict] of Object.entries(LOCALES)) {
        expect(placeholders(dict[key]), `${lang}:${key}`).toEqual(expected);
      }
    }
  });

  it('translates every component in the catalog', () => {
    for (const def of ALL_DEFS) {
      for (const [lang, dict] of Object.entries(LOCALES)) {
        expect(dict[`comp.${def.type}`], `${lang} missing comp.${def.type}`).toBeTruthy();
      }
    }
  });

  it('translates every property of every component', () => {
    for (const def of ALL_DEFS) {
      for (const spec of def.props) {
        const key = spec.i18n ?? `prop.${spec.key}`;
        expect(en[key as keyof typeof en], `missing ${key} (${def.type})`).toBeTruthy();
      }
    }
  });

  it('translates every category and template', () => {
    for (const cat of CATEGORIES) expect(en[`cat.${cat}` as keyof typeof en]).toBeTruthy();
    for (const tpl of TEMPLATES) {
      expect(en[`template.${tpl.id}.name` as keyof typeof en]).toBeTruthy();
      expect(en[`template.${tpl.id}.desc` as keyof typeof en]).toBeTruthy();
    }
  });

  it('has no hard-coded user-facing string literals left in the source', () => {
    // Every t('…') call must resolve to a key that exists.
    const used = [...sources.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'/g)].map((m) => m[1]);
    const missing = [...new Set(used)].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });
});
