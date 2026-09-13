import { supplyDefs } from './supply.js';
import { protectionDefs } from './protection.js';
import { switchingDefs } from './switching.js';
import { terminalDefs } from './terminals.js';
import { wiringDefs } from './wiring.js';
import { loadDefs } from './loads.js';
import { instrumentDefs } from './instruments.js';
export * from './types.js';
export * from './common.js';
export const ALL_DEFS = [
    ...supplyDefs,
    ...protectionDefs,
    ...switchingDefs,
    ...terminalDefs,
    ...wiringDefs,
    ...loadDefs,
    ...instrumentDefs,
];
const BY_TYPE = new Map(ALL_DEFS.map((d) => [d.type, d]));
export function getDef(type) {
    return BY_TYPE.get(type);
}
export function requireDef(type) {
    const d = BY_TYPE.get(type);
    if (!d)
        throw new Error(`Unknown component type: ${type}`);
    return d;
}
export const CATEGORIES = [
    'supply',
    'protection',
    'switching',
    'control',
    'terminals',
    'wiring',
    'loads',
    'instruments',
];
export function defsByCategory(cat) {
    return ALL_DEFS.filter((d) => d.category === cat);
}
/** Merge stored props with the catalog defaults. */
export function effectiveProps(type, props) {
    const def = getDef(type);
    if (!def)
        return { ...(props ?? {}) };
    return { ...def.defaultProps, ...(props ?? {}) };
}
/** DIN modules occupied by an instance. */
export function moduleCount(type, props) {
    const def = getDef(type);
    if (!def || def.modules === undefined)
        return 0;
    const p = effectiveProps(type, props);
    return typeof def.modules === 'function' ? def.modules(p) : def.modules;
}
/** Terminals of an instance, with catalog defaults applied. */
export function terminalsOf(type, props) {
    const def = getDef(type);
    if (!def)
        return [];
    return def.terminals(effectiveProps(type, props));
}
export function sizeOf(type, props) {
    const def = getDef(type);
    if (!def)
        return { w: 60, h: 60 };
    return def.size(effectiveProps(type, props));
}
