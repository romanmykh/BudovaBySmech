import { numOptions, strOptions, R_OPEN, R_CLOSED } from './common.js';
import { loadImpedance } from '../physics/network.js';
const SWITCH_KEYWORDS = ['vypínač', 'spínač', 'switch', 'łącznik', 'вимикач', 'выключатель'];
/** A pole of a wall switch: one common and n selectable outputs. */
function switchTerminals(commons, ways, w, h) {
    const out = [];
    commons.forEach((c, ci) => {
        out.push({ id: `c${ci + 1}`, role: 'L', mark: c, x: 10 + ci * 20, y: h, side: 'bottom' });
        for (let k = 1; k <= ways; k++) {
            out.push({
                id: `c${ci + 1}.t${k}`,
                role: 'L',
                mark: `${k}`,
                x: Math.round((k * w) / (ways + 1)),
                y: 0,
                side: 'top',
            });
        }
    });
    return out;
}
export const wiringDefs = [
    {
        type: 'switch1',
        category: 'wiring',
        symbol: 'switch1',
        size: () => ({ w: 50, h: 50 }),
        interactive: 'toggle',
        keywords: [...SWITCH_KEYWORDS, 'řazení 1', 'one-way'],
        defaultProps: { inA: 10 },
        props: [{ key: 'inA', type: 'select', options: numOptions([6, 10, 16]), unit: 'A' }],
        terminals: () => [
            { id: 'c1', role: 'L', mark: 'L', x: 10, y: 50, side: 'bottom' },
            { id: 'c1.t1', role: 'L', mark: '1', x: 25, y: 0, side: 'top' },
        ],
        initState: () => ({ closed: false }),
        stamp: (ctx) => ctx.R(ctx.node('c1'), ctx.node('c1.t1'), ctx.state.closed ? R_CLOSED : R_OPEN, 'p1'),
        update: (ctx) => {
            ctx.meas('I', ctx.i('p1'));
            ctx.meas('closed', ctx.state.closed ? 1 : 0);
        },
    },
    {
        type: 'switch5',
        category: 'wiring',
        symbol: 'switch5',
        size: () => ({ w: 60, h: 50 }),
        interactive: 'toggle',
        keywords: [...SWITCH_KEYWORDS, 'řazení 5', 'double', 'lustrový'],
        defaultProps: { inA: 10 },
        props: [{ key: 'inA', type: 'select', options: numOptions([6, 10, 16]), unit: 'A' }],
        terminals: () => [
            { id: 'c1', role: 'L', mark: 'L', x: 30, y: 50, side: 'bottom' },
            { id: 'c1.t1', role: 'L', mark: '1', x: 15, y: 0, side: 'top' },
            { id: 'c1.t2', role: 'L', mark: '2', x: 45, y: 0, side: 'top' },
        ],
        initState: () => ({ a: false, b: false }),
        stamp: (ctx) => {
            ctx.R(ctx.node('c1'), ctx.node('c1.t1'), ctx.state.a ? R_CLOSED : R_OPEN, 'pa');
            ctx.R(ctx.node('c1'), ctx.node('c1.t2'), ctx.state.b ? R_CLOSED : R_OPEN, 'pb');
        },
        update: (ctx) => {
            ctx.meas('I', ctx.i('pa') + ctx.i('pb'));
        },
    },
    {
        type: 'switch6',
        category: 'wiring',
        symbol: 'switch6',
        size: () => ({ w: 60, h: 50 }),
        interactive: 'toggle',
        keywords: [...SWITCH_KEYWORDS, 'řazení 6', 'two-way', 'přepínač', 'schodišťový'],
        defaultProps: { inA: 10 },
        props: [{ key: 'inA', type: 'select', options: numOptions([6, 10, 16]), unit: 'A' }],
        terminals: () => [
            { id: 'c1', role: 'L', mark: 'L', x: 30, y: 50, side: 'bottom' },
            { id: 'c1.t1', role: 'L', mark: '1', x: 15, y: 0, side: 'top' },
            { id: 'c1.t2', role: 'L', mark: '2', x: 45, y: 0, side: 'top' },
        ],
        initState: () => ({ pos: 1 }),
        stamp: (ctx) => {
            const pos = Number(ctx.state.pos) === 2 ? 2 : 1;
            ctx.R(ctx.node('c1'), ctx.node('c1.t1'), pos === 1 ? R_CLOSED : R_OPEN, 'p1');
            ctx.R(ctx.node('c1'), ctx.node('c1.t2'), pos === 2 ? R_CLOSED : R_OPEN, 'p2');
        },
        update: (ctx) => {
            ctx.meas('I', ctx.i('p1') + ctx.i('p2'));
            ctx.meas('pos', Number(ctx.state.pos) || 1);
        },
    },
    {
        type: 'switch66',
        category: 'wiring',
        symbol: 'switch66',
        size: () => ({ w: 90, h: 50 }),
        interactive: 'toggle',
        keywords: [...SWITCH_KEYWORDS, 'řazení 6+6', 'double two-way'],
        defaultProps: { inA: 10 },
        props: [{ key: 'inA', type: 'select', options: numOptions([6, 10, 16]), unit: 'A' }],
        terminals: () => [
            { id: 'c1', role: 'L', mark: 'L1', x: 25, y: 50, side: 'bottom' },
            { id: 'c1.t1', role: 'L', mark: '1', x: 15, y: 0, side: 'top' },
            { id: 'c1.t2', role: 'L', mark: '2', x: 35, y: 0, side: 'top' },
            { id: 'c2', role: 'L', mark: 'L2', x: 65, y: 50, side: 'bottom' },
            { id: 'c2.t1', role: 'L', mark: '3', x: 55, y: 0, side: 'top' },
            { id: 'c2.t2', role: 'L', mark: '4', x: 75, y: 0, side: 'top' },
        ],
        initState: () => ({ posA: 1, posB: 1 }),
        stamp: (ctx) => {
            const a = Number(ctx.state.posA) === 2 ? 2 : 1;
            const b = Number(ctx.state.posB) === 2 ? 2 : 1;
            ctx.R(ctx.node('c1'), ctx.node('c1.t1'), a === 1 ? R_CLOSED : R_OPEN, 'a1');
            ctx.R(ctx.node('c1'), ctx.node('c1.t2'), a === 2 ? R_CLOSED : R_OPEN, 'a2');
            ctx.R(ctx.node('c2'), ctx.node('c2.t1'), b === 1 ? R_CLOSED : R_OPEN, 'b1');
            ctx.R(ctx.node('c2'), ctx.node('c2.t2'), b === 2 ? R_CLOSED : R_OPEN, 'b2');
        },
    },
    {
        type: 'switch7',
        category: 'wiring',
        symbol: 'switch7',
        size: () => ({ w: 70, h: 50 }),
        interactive: 'toggle',
        keywords: [...SWITCH_KEYWORDS, 'řazení 7', 'intermediate', 'křížový'],
        defaultProps: { inA: 10 },
        props: [{ key: 'inA', type: 'select', options: numOptions([6, 10, 16]), unit: 'A' }],
        terminals: () => [
            { id: 'in1', role: 'L', mark: '1', x: 20, y: 50, side: 'bottom' },
            { id: 'in2', role: 'L', mark: '2', x: 50, y: 50, side: 'bottom' },
            { id: 'out1', role: 'L', mark: '3', x: 20, y: 0, side: 'top' },
            { id: 'out2', role: 'L', mark: '4', x: 50, y: 0, side: 'top' },
        ],
        initState: () => ({ crossed: false }),
        stamp: (ctx) => {
            const x = !!ctx.state.crossed;
            ctx.R(ctx.node('in1'), ctx.node(x ? 'out2' : 'out1'), R_CLOSED, 'a');
            ctx.R(ctx.node('in2'), ctx.node(x ? 'out1' : 'out2'), R_CLOSED, 'b');
            ctx.R(ctx.node('in1'), ctx.node(x ? 'out1' : 'out2'), R_OPEN, 'ao');
            ctx.R(ctx.node('in2'), ctx.node(x ? 'out2' : 'out1'), R_OPEN, 'bo');
        },
        update: (ctx) => ctx.meas('crossed', ctx.state.crossed ? 1 : 0),
    },
    {
        type: 'button',
        category: 'wiring',
        symbol: 'button',
        size: () => ({ w: 50, h: 50 }),
        interactive: 'button',
        keywords: ['tlačítko', 'button', 'przycisk', 'кнопка', 'řazení 1/0'],
        defaultProps: { inA: 10, nc: false },
        props: [
            { key: 'inA', type: 'select', options: numOptions([6, 10, 16]), unit: 'A' },
            { key: 'nc', type: 'bool' },
        ],
        terminals: () => [
            { id: 'c1', role: 'L', mark: 'L', x: 10, y: 50, side: 'bottom' },
            { id: 'c1.t1', role: 'L', mark: '1', x: 25, y: 0, side: 'top' },
        ],
        initState: () => ({ pressed: false }),
        stamp: (ctx) => {
            const on = ctx.props.nc ? !ctx.state.pressed : !!ctx.state.pressed;
            ctx.R(ctx.node('c1'), ctx.node('c1.t1'), on ? R_CLOSED : R_OPEN, 'p1');
        },
        update: (ctx) => ctx.meas('closed', ctx.state.pressed ? 1 : 0),
    },
    {
        type: 'dimmer',
        category: 'wiring',
        symbol: 'dimmer',
        size: () => ({ w: 60, h: 60 }),
        interactive: 'toggle',
        keywords: ['stmívač', 'dimmer', 'ściemniacz', 'диммер'],
        defaultProps: { level: 100, maxW: 300 },
        props: [
            { key: 'level', type: 'number', unit: '%', min: 0, max: 100, step: 1 },
            { key: 'maxW', type: 'number', unit: 'W', min: 20, max: 1000, step: 10 },
        ],
        terminals: () => [
            { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 60, side: 'bottom' },
            { id: 'in.N', role: 'N', mark: 'N', x: 45, y: 60, side: 'bottom' },
            { id: 'out.L', role: 'L', mark: '1', x: 30, y: 0, side: 'top' },
        ],
        initState: () => ({ rSeries: 0.01, on: true }),
        stamp: (ctx) => {
            const st = ctx.state;
            if (!st.on) {
                ctx.R(ctx.node('in.L'), ctx.node('out.L'), R_OPEN, 'p');
                return;
            }
            ctx.R(ctx.node('in.L'), ctx.node('out.L'), Math.max(0.01, st.rSeries), 'p');
        },
        update: (ctx) => {
            const st = ctx.state;
            const level = Math.min(100, Math.max(0, Number(ctx.props.level) ?? 100)) / 100;
            const uIn = ctx.v(ctx.node('in.L'));
            const uOut = ctx.v(ctx.node('out.L'));
            const i = ctx.i('p');
            ctx.meas('I', i);
            ctx.meas('U_out', uOut);
            if (!st.on)
                return;
            if (level >= 0.995) {
                if (st.rSeries !== 0.01) {
                    st.rSeries = 0.01;
                    ctx.invalidate();
                }
                return;
            }
            // Closed-loop control of the series element so that the delivered RMS
            // voltage follows the dimmer setting, the way a phase-cut dimmer behaves.
            if (i > 1e-6 && uIn > 1) {
                const rLoad = Math.max(0.1, uOut / i);
                const target = rLoad * (1 / Math.max(0.02, level) - 1);
                const next = st.rSeries * 0.6 + target * 0.4;
                if (Math.abs(next - st.rSeries) / Math.max(0.01, st.rSeries) > 0.02) {
                    st.rSeries = Math.max(0.01, next);
                    ctx.invalidate();
                }
            }
        },
    },
    {
        type: 'motionDetector',
        category: 'wiring',
        symbol: 'motion',
        size: () => ({ w: 60, h: 60 }),
        interactive: 'toggle',
        keywords: ['pohybové čidlo', 'PIR', 'motion detector', 'czujnik ruchu', 'датчик руху'],
        defaultProps: { holdTime: 60, maxW: 1000, threePole: true },
        props: [
            { key: 'holdTime', type: 'number', unit: 's', min: 5, max: 900, step: 5 },
            { key: 'maxW', type: 'number', unit: 'W', min: 100, max: 2000, step: 50 },
        ],
        terminals: () => [
            { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 60, side: 'bottom' },
            { id: 'in.N', role: 'N', mark: 'N', x: 45, y: 60, side: 'bottom' },
            { id: 'out.L', role: 'L', mark: "L'", x: 30, y: 0, side: 'top' },
        ],
        initState: () => ({ detected: false, remaining: 0, closed: false }),
        stamp: (ctx) => {
            ctx.R(ctx.node('in.L'), ctx.node('in.N'), 60000, 'supply');
            ctx.R(ctx.node('in.L'), ctx.node('out.L'), ctx.state.closed ? R_CLOSED : R_OPEN, 'p');
        },
        update: (ctx) => {
            const st = ctx.state;
            if (st.detected) {
                st.remaining = Number(ctx.props.holdTime) || 60;
                st.detected = false;
                if (!st.closed) {
                    st.closed = true;
                    ctx.invalidate();
                    ctx.log({ key: 'log.motionDetected', vars: { label: ctx.comp.label || 'PIR' }, level: 'info', comp: ctx.comp.id });
                }
            }
            else if (st.remaining > 0) {
                st.remaining -= ctx.env.dt;
                if (st.remaining <= 0) {
                    st.remaining = 0;
                    st.closed = false;
                    ctx.invalidate();
                    ctx.log({ key: 'log.motionTimeout', vars: { label: ctx.comp.label || 'PIR' }, level: 'info', comp: ctx.comp.id });
                }
            }
            ctx.meas('remaining', st.remaining);
            ctx.meas('I', ctx.i('p'));
            ctx.meas('closed', st.closed ? 1 : 0);
        },
    },
    {
        type: 'smartRelay',
        category: 'wiring',
        symbol: 'smartRelay',
        size: () => ({ w: 60, h: 50 }),
        interactive: 'toggle',
        keywords: ['chytré relé', 'smart relay', 'przekaźnik smart'],
        defaultProps: { maxW: 2000 },
        props: [{ key: 'maxW', type: 'number', unit: 'W', min: 100, max: 3600, step: 100 }],
        terminals: () => [
            { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 50, side: 'bottom' },
            { id: 'in.N', role: 'N', mark: 'N', x: 45, y: 50, side: 'bottom' },
            { id: 'out.L', role: 'L', mark: "L'", x: 30, y: 0, side: 'top' },
        ],
        initState: () => ({ closed: false }),
        stamp: (ctx) => {
            ctx.R(ctx.node('in.L'), ctx.node('in.N'), 100000, 'supply');
            ctx.R(ctx.node('in.L'), ctx.node('out.L'), ctx.state.closed ? R_CLOSED : R_OPEN, 'p');
        },
        update: (ctx) => ctx.meas('closed', ctx.state.closed ? 1 : 0),
    },
    /* ---------------- sockets ---------------- */
    {
        type: 'socket16',
        category: 'wiring',
        symbol: 'socket',
        size: () => ({ w: 60, h: 60 }),
        interactive: 'plug',
        flags: { socket: true },
        keywords: ['zásuvka', 'socket', 'gniazdo', 'розетка'],
        defaultProps: { inA: 16, outlets: 1, ip: 'IP20', pluggedW: 0, pluggedPf: 1, plugged: false, classI: true },
        props: [
            { key: 'inA', type: 'select', options: numOptions([10, 16]), unit: 'A' },
            { key: 'outlets', type: 'select', options: numOptions([1, 2]) },
            { key: 'ip', type: 'select', options: strOptions(['IP20', 'IP44', 'IP54']) },
            { key: 'plugged', type: 'bool' },
            { key: 'pluggedW', type: 'number', unit: 'W', min: 0, max: 3680, step: 50 },
            { key: 'pluggedPf', type: 'number', min: 0.3, max: 1, step: 0.05, advanced: true },
            { key: 'classI', type: 'bool', advanced: true },
        ],
        terminals: () => [
            { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 60, side: 'bottom' },
            { id: 'in.N', role: 'N', mark: 'N', x: 30, y: 60, side: 'bottom' },
            { id: 'in.PE', role: 'PE', mark: 'PE', x: 45, y: 60, side: 'bottom' },
            { id: 'out.L', role: 'L', mark: 'L', x: 15, y: 0, side: 'top' },
            { id: 'out.N', role: 'N', mark: 'N', x: 30, y: 0, side: 'top' },
            { id: 'out.PE', role: 'PE', mark: 'PE', x: 45, y: 0, side: 'top' },
        ],
        initState: (p) => ({ plugged: !!p.plugged }),
        stamp: (ctx) => {
            // The socket outlet itself is a straight-through connection to the plug.
            ctx.R(ctx.node('in.L'), ctx.node('out.L'), 1e-3, 'sL');
            ctx.R(ctx.node('in.N'), ctx.node('out.N'), 1e-3, 'sN');
            ctx.R(ctx.node('in.PE'), ctx.node('out.PE'), 1e-3, 'sPE');
            const plugged = ctx.state.plugged ?? ctx.props.plugged;
            const w = Number(ctx.props.pluggedW) || 0;
            if (plugged && w > 0) {
                const pf = Number(ctx.props.pluggedPf) || 1;
                const z = loadImpedance(w, 230, pf);
                ctx.Z(ctx.node('out.L'), ctx.node('out.N'), z.r, z.x, 'load');
                if (ctx.props.classI) {
                    // Class I appliance: its enclosure is bonded to the protective conductor.
                    const cse = ctx.net.node(`${ctx.comp.id}::case`);
                    ctx.R(cse, ctx.node('out.PE'), 0.05, 'caseBond');
                }
            }
        },
        update: (ctx) => {
            const u = ctx.vd(ctx.node('in.L'), ctx.node('in.N'));
            ctx.meas('U', u);
            ctx.meas('I', ctx.i('load'));
            ctx.meas('U_PE', ctx.v(ctx.node('in.PE')));
        },
    },
    {
        type: 'socketUsb',
        category: 'wiring',
        symbol: 'socketUsb',
        size: () => ({ w: 60, h: 60 }),
        interactive: 'plug',
        flags: { socket: true },
        keywords: ['zásuvka s USB', 'USB socket', 'gniazdo USB'],
        defaultProps: { inA: 16, usbW: 12, pluggedW: 0, plugged: false },
        props: [
            { key: 'inA', type: 'select', options: numOptions([10, 16]), unit: 'A' },
            { key: 'usbW', type: 'number', unit: 'W', min: 5, max: 65, step: 5 },
            { key: 'plugged', type: 'bool' },
            { key: 'pluggedW', type: 'number', unit: 'W', min: 0, max: 3680, step: 50 },
        ],
        terminals: () => [
            { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 60, side: 'bottom' },
            { id: 'in.N', role: 'N', mark: 'N', x: 30, y: 60, side: 'bottom' },
            { id: 'in.PE', role: 'PE', mark: 'PE', x: 45, y: 60, side: 'bottom' },
        ],
        initState: (p) => ({ plugged: !!p.plugged }),
        stamp: (ctx) => {
            const usb = Number(ctx.props.usbW) || 12;
            const zu = loadImpedance(usb, 230, 0.6);
            ctx.Z(ctx.node('in.L'), ctx.node('in.N'), zu.r, zu.x, 'usb');
            const w = Number(ctx.props.pluggedW) || 0;
            if ((ctx.state.plugged ?? ctx.props.plugged) && w > 0) {
                const z = loadImpedance(w, 230, 1);
                ctx.Z(ctx.node('in.L'), ctx.node('in.N'), z.r, z.x, 'load');
            }
        },
        update: (ctx) => {
            ctx.meas('U', ctx.vd(ctx.node('in.L'), ctx.node('in.N')));
            ctx.meas('I', ctx.i('usb') + ctx.i('load'));
        },
    },
    {
        type: 'socketCee',
        category: 'wiring',
        symbol: 'socketCee',
        size: () => ({ w: 70, h: 70 }),
        interactive: 'plug',
        flags: { socket: true, threePhase: () => true },
        keywords: ['CEE zásuvka', 'třífázová zásuvka', 'gniazdo siłowe', 'CEE'],
        defaultProps: { inA: 16, plugged: false, pluggedW: 0, pluggedPf: 0.9 },
        props: [
            { key: 'inA', type: 'select', options: numOptions([16, 32, 63]), unit: 'A' },
            { key: 'plugged', type: 'bool' },
            { key: 'pluggedW', type: 'number', unit: 'W', min: 0, max: 22000, step: 100 },
            { key: 'pluggedPf', type: 'number', min: 0.3, max: 1, step: 0.05, advanced: true },
        ],
        terminals: () => [
            { id: 'in.L1', role: 'L', mark: 'L1', x: 10, y: 70, side: 'bottom' },
            { id: 'in.L2', role: 'L', mark: 'L2', x: 25, y: 70, side: 'bottom' },
            { id: 'in.L3', role: 'L', mark: 'L3', x: 40, y: 70, side: 'bottom' },
            { id: 'in.N', role: 'N', mark: 'N', x: 55, y: 70, side: 'bottom' },
            { id: 'in.PE', role: 'PE', mark: 'PE', x: 65, y: 70, side: 'bottom' },
        ],
        initState: (p) => ({ plugged: !!p.plugged }),
        stamp: (ctx) => {
            const w = Number(ctx.props.pluggedW) || 0;
            if (!(ctx.state.plugged ?? ctx.props.plugged) || w <= 0)
                return;
            const pf = Number(ctx.props.pluggedPf) || 0.9;
            const z = loadImpedance(w / 3, 230, pf);
            for (const c of ['L1', 'L2', 'L3'])
                ctx.Z(ctx.node(`in.${c}`), ctx.node('in.N'), z.r, z.x, `z.${c}`);
        },
        update: (ctx) => {
            for (const c of ['L1', 'L2', 'L3']) {
                ctx.meas(`I_${c}`, ctx.i(`z.${c}`));
                ctx.meas(`U_${c}`, ctx.vd(ctx.node(`in.${c}`), ctx.node('in.N')));
            }
        },
    },
    {
        type: 'connectionBox',
        category: 'wiring',
        symbol: 'connectionBox',
        size: () => ({ w: 60, h: 50 }),
        keywords: ['přípojné místo', 'connection box', 'puszka przyłączeniowa'],
        defaultProps: { phases: 1 },
        props: [{ key: 'phases', type: 'select', options: numOptions([1, 3]) }],
        terminals: (p) => {
            const cond = Number(p.phases) === 3 ? ['L1', 'L2', 'L3', 'N', 'PE'] : ['L', 'N', 'PE'];
            return cond.flatMap((c) => {
                const i = cond.indexOf(c);
                const x = Math.round(((i + 1) * 60) / (cond.length + 1));
                const role = c === 'N' ? 'N' : c === 'PE' ? 'PE' : 'L';
                return [
                    { id: `in.${c}`, role, mark: c, x, y: 50, side: 'bottom' },
                    { id: `out.${c}`, role, mark: c, x, y: 0, side: 'top' },
                ];
            });
        },
        stamp: (ctx) => {
            const cond = Number(ctx.props.phases) === 3 ? ['L1', 'L2', 'L3', 'N', 'PE'] : ['L', 'N', 'PE'];
            for (const c of cond)
                ctx.R(ctx.node(`in.${c}`), ctx.node(`out.${c}`), 1e-3, `c.${c}`);
        },
    },
];
