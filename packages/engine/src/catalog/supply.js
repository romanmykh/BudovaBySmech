import { numOptions, strOptions, R_OPEN, R_CLOSED } from './common.js';
/** Phase angles of a symmetric three-phase system. */
export const PHASE_ANGLE = { L1: 0, L2: -120, L3: 120 };
export const supplyDefs = [
    {
        type: 'supply',
        category: 'supply',
        symbol: 'supply',
        size: () => ({ w: 120, h: 70 }),
        flags: { source: true },
        keywords: ['source', 'grid', 'transformer', 'prípojka', 'přípojka'],
        defaultProps: {
            system: 'TN-C-S',
            phases: 3,
            voltageLN: 230,
            frequency: 50,
            ipk: 3000,
            rb: 2,
            enabled: true,
        },
        props: [
            { key: 'system', type: 'select', options: strOptions(['TN-C', 'TN-C-S', 'TN-S']) },
            { key: 'phases', type: 'select', options: numOptions([1, 3]) },
            { key: 'voltageLN', type: 'number', unit: 'V', min: 100, max: 400, step: 1 },
            { key: 'frequency', type: 'number', unit: 'Hz', min: 50, max: 60, step: 10, advanced: true },
            { key: 'ipk', type: 'number', unit: 'A', min: 100, max: 25000, step: 100 },
            { key: 'rb', type: 'number', unit: 'Ω', min: 0.1, max: 100, step: 0.1, advanced: true },
            { key: 'enabled', type: 'bool' },
        ],
        terminals: (p) => {
            const t = [
                { id: 'L1', role: 'L', mark: 'L1', x: 20, y: 70, side: 'bottom' },
                { id: 'L2', role: 'L', mark: 'L2', x: 40, y: 70, side: 'bottom' },
                { id: 'L3', role: 'L', mark: 'L3', x: 60, y: 70, side: 'bottom' },
                { id: 'N', role: 'N', mark: 'N', x: 80, y: 70, side: 'bottom' },
                { id: 'PE', role: 'PE', mark: 'PE', x: 100, y: 70, side: 'bottom' },
            ];
            if (p.system === 'TN-C' || p.system === 'TN-C-S') {
                t[3] = { id: 'PEN', role: 'N', mark: 'PEN', x: 80, y: 70, side: 'bottom' };
                return p.phases === 1 ? [t[0], t[3]] : [t[0], t[1], t[2], t[3]];
            }
            return p.phases === 1 ? [t[0], t[3], t[4]] : t;
        },
        initState: () => ({ lostPhases: {} }),
        stamp: (ctx) => {
            const p = ctx.props;
            const star = ctx.net.node(`${ctx.comp.id}::star`);
            const vln = Number(p.voltageLN) || 230;
            const ipk = Math.max(50, Number(p.ipk) || 3000);
            // Source impedance from the prospective short-circuit current, split
            // evenly between the line and the return path. X/R ≈ 0,3 at the origin.
            const ztot = vln / ipk;
            const zr = (ztot * 0.5) / Math.sqrt(1 + 0.09);
            const zx = zr * 0.3;
            const faults = ctx.myFaults();
            const lostPhase = faults.find((f) => f.kind === 'lossPhase' && f.enabled);
            const surge = faults.find((f) => f.kind === 'surge' && f.enabled);
            const phases = Number(p.phases) === 1 ? ['L1'] : ['L1', 'L2', 'L3'];
            const enabled = p.enabled !== false && !ctx.env.deEnergized;
            for (const ph of phases) {
                const n = ctx.node(ph);
                const lost = lostPhase && (lostPhase.terminal === ph || !lostPhase.terminal);
                if (!enabled || lost) {
                    // Open-circuit phase: the conductor stays connected but carries no source.
                    ctx.R(n, star, R_OPEN, `src.${ph}`);
                    continue;
                }
                let mag = vln;
                if (surge) {
                    // A surge is modelled as a raised source magnitude for its duration.
                    mag = Math.max(vln, Number(surge.surgeV) || 4000);
                }
                ctx.V(n, star, mag, PHASE_ANGLE[ph], zr, zx, `src.${ph}`);
            }
            // Neutral / PEN arrangement.
            const isTnc = p.system === 'TN-C' || p.system === 'TN-C-S';
            const nTerm = isTnc ? 'PEN' : 'N';
            const nNode = ctx.node(nTerm);
            ctx.R(star, nNode, zr, `src.N`);
            // The supply transformer star point is earthed (RB).
            const rb = Math.max(0.05, Number(p.rb) || 2);
            ctx.R(star, ctx.earth, rb, 'src.rb');
            if (!isTnc) {
                const peNode = ctx.node('PE');
                ctx.R(star, peNode, zr, 'src.PE');
            }
        },
        update: (ctx) => {
            ctx.meas('U_L1', ctx.v(ctx.node('L1')));
            if (Number(ctx.props.phases) === 3) {
                ctx.meas('U_L2', ctx.v(ctx.node('L2')));
                ctx.meas('U_L3', ctx.v(ctx.node('L3')));
            }
            ctx.meas('I_L1', ctx.i('src.L1'));
            if (Number(ctx.props.phases) === 3) {
                ctx.meas('I_L2', ctx.i('src.L2'));
                ctx.meas('I_L3', ctx.i('src.L3'));
            }
        },
    },
    {
        type: 'meter',
        category: 'supply',
        symbol: 'meter',
        modules: (p) => (Number(p.phases) === 3 ? 7 : 4),
        size: (p) => ({ w: Number(p.phases) === 3 ? 100 : 70, h: 70 }),
        keywords: ['elektroměr', 'licznik', 'лічильник', 'счётчик', 'kwh'],
        defaultProps: { phases: 3, tariff: 'dual', direct: true },
        props: [
            { key: 'phases', type: 'select', options: numOptions([1, 3]) },
            { key: 'tariff', type: 'select', options: strOptions(['single', 'dual']) },
            { key: 'direct', type: 'bool', advanced: true },
        ],
        terminals: (p) => {
            const three = Number(p.phases) === 3;
            const cond = three ? ['L1', 'L2', 'L3', 'N'] : ['L', 'N'];
            const w = three ? 100 : 70;
            return cond.flatMap((c, i) => {
                const x = Math.round(((i + 1) * w) / (cond.length + 1));
                return [
                    { id: `in.${c}`, role: c === 'N' ? 'N' : 'L', mark: c, x, y: 0, side: 'top' },
                    { id: `out.${c}`, role: c === 'N' ? 'N' : 'L', mark: c, x, y: 70, side: 'bottom' },
                ];
            });
        },
        initState: () => ({ energyWh: 0 }),
        stamp: (ctx) => {
            const cond = Number(ctx.props.phases) === 3 ? ['L1', 'L2', 'L3', 'N'] : ['L', 'N'];
            for (const c of cond)
                ctx.R(ctx.node(`in.${c}`), ctx.node(`out.${c}`), R_CLOSED, `m.${c}`);
        },
        update: (ctx) => {
            const cond = Number(ctx.props.phases) === 3 ? ['L1', 'L2', 'L3'] : ['L'];
            let total = 0;
            for (const c of cond) {
                const i = ctx.i(`m.${c}`);
                const u = ctx.v(ctx.node(`out.${c}`));
                ctx.meas(`I_${c}`, i);
                total += u * i;
            }
            ctx.state.energyWh += (total * ctx.env.dt) / 3600;
            ctx.meas('P', total);
            ctx.meas('E', ctx.state.energyWh);
        },
    },
    {
        type: 'hdo',
        category: 'supply',
        symbol: 'hdo',
        modules: 3,
        size: () => ({ w: 70, h: 70 }),
        interactive: 'toggle',
        keywords: ['ripple', 'nízký tarif', 'HDO', 'taryfa'],
        defaultProps: { lowTariff: false },
        props: [{ key: 'lowTariff', type: 'bool' }],
        terminals: () => [
            { id: 'in.L', role: 'L', mark: 'L', x: 15, y: 0, side: 'top' },
            { id: 'in.N', role: 'N', mark: 'N', x: 35, y: 0, side: 'top' },
            { id: 'c.1', role: 'ctrl', mark: '1', x: 15, y: 70, side: 'bottom' },
            { id: 'c.2', role: 'ctrl', mark: '2', x: 55, y: 70, side: 'bottom' },
        ],
        initState: (p) => ({ closed: !!p.lowTariff }),
        stamp: (ctx) => {
            ctx.R(ctx.node('in.L'), ctx.node('in.N'), 5000, 'hdo.coil');
            ctx.R(ctx.node('c.1'), ctx.node('c.2'), ctx.state.closed ? R_CLOSED : R_OPEN, 'hdo.c');
        },
        update: (ctx) => {
            ctx.meas('closed', ctx.state.closed ? 1 : 0);
        },
    },
    {
        /**
         * Main earthing terminal. In a TN-C-S installation this is also the point at
         * which the incoming PEN conductor is split, so it carries a dedicated PEN
         * input and a neutral tap alongside the protective bonding ways. Everything
         * on it is bonded together — that is exactly what the split point is.
         */
        type: 'mainEarthBar',
        category: 'supply',
        symbol: 'earthBar',
        size: () => ({ w: 160, h: 30 }),
        keywords: ['hlavní ochranná přípojnice', 'HOP', 'bonding', 'pospojování'],
        defaultProps: { ways: 6 },
        props: [{ key: 'ways', type: 'number', min: 2, max: 12, step: 1 }],
        terminals: (p) => {
            const n = Math.max(2, Math.min(12, Number(p.ways) || 6));
            const out = [
                { id: 'pen', role: 'N', mark: 'PEN', x: 14, y: 0, side: 'top' },
                { id: 'n', role: 'N', mark: 'N', x: 40, y: 0, side: 'top' },
            ];
            return [
                ...out,
                ...Array.from({ length: n }, (_, i) => ({
                    id: `t${i + 1}`,
                    role: 'PE',
                    mark: String(i + 1),
                    x: Math.round(((i + 1) * 160) / (n + 1)),
                    y: 30,
                    side: 'bottom',
                })),
            ];
        },
        stamp: (ctx) => {
            const n = Math.max(2, Math.min(12, Number(ctx.props.ways) || 6));
            const bus = ctx.net.node(`${ctx.comp.id}::bus`);
            ctx.R(ctx.node('pen'), bus, 1e-4, 'pen');
            ctx.R(ctx.node('n'), bus, 1e-4, 'n');
            for (let i = 1; i <= n; i++)
                ctx.R(ctx.node(`t${i}`), bus, 1e-4, `b${i}`);
        },
    },
    {
        type: 'earthElectrode',
        category: 'supply',
        symbol: 'earthElectrode',
        size: () => ({ w: 40, h: 50 }),
        keywords: ['zemnič', 'uzemnienie', 'заземлювач', 'заземлитель', 'Ra'],
        defaultProps: { ra: 10 },
        props: [{ key: 'ra', type: 'number', unit: 'Ω', min: 0.1, max: 1000, step: 0.5 }],
        terminals: () => [{ id: 'pe', role: 'PE', mark: 'PE', x: 20, y: 0, side: 'top' }],
        stamp: (ctx) => {
            ctx.R(ctx.node('pe'), ctx.earth, Math.max(0.05, Number(ctx.props.ra) || 10), 'ra');
        },
        update: (ctx) => ctx.meas('I_earth', ctx.i('ra')),
    },
];
