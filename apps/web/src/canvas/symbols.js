import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
const S = 1.4; // default stroke width
const line = (x1, y1, x2, y2, extra = {}) => (_jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, strokeWidth: S, ...extra }));
const rect = (x, y, w, h, extra = {}) => (_jsx("rect", { x: x, y: y, width: w, height: h, fill: "none", strokeWidth: S, ...extra }));
const circle = (cx, cy, r, extra = {}) => (_jsx("circle", { cx: cx, cy: cy, r: r, fill: "none", strokeWidth: S, ...extra }));
const text = (x, y, t, size = 9, extra = {}) => (_jsx("text", { x: x, y: y, fontSize: size, textAnchor: "middle", stroke: "none", fill: "currentColor", ...extra, children: t }));
/** Body outline shared by every modular device. */
function body(w, h, extra = {}) {
    return rect(3, 6, w - 6, h - 12, { rx: 2, ...extra });
}
/** The switching contact drawn open or closed. */
function contact(x, yTop, yBot, closed) {
    return (_jsxs("g", { children: [line(x, yTop, x, yTop + 4), closed ? line(x, yTop + 4, x, yBot - 4) : line(x, yTop + 4, x + 9, yBot - 6), line(x, yBot - 4, x, yBot), _jsx("circle", { cx: x, cy: yTop + 4, r: 1.6, fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: x, cy: yBot - 4, r: 1.6, fill: "currentColor", stroke: "none" })] }));
}
function poleColumns(w, n) {
    return Array.from({ length: n }, (_, i) => Math.round(((i + 1) * w) / (n + 1)));
}
function poleCount(poles) {
    switch (poles) {
        case '1P':
            return 1;
        case '1P+N':
        case '2P':
            return 2;
        case '3P':
            return 3;
        default:
            return 4;
    }
}
const SYMBOLS = {
    supply: ({ w, h, props }) => (_jsxs("g", { children: [rect(2, 2, w - 4, h - 4, { rx: 3 }), circle(24, h / 2 - 6, 11), line(16, h / 2 - 6, 32, h / 2 - 6), _jsx("path", { d: "M16 14 q4 -6 8 0 t8 0", fill: "none", strokeWidth: S, transform: `translate(0 ${h / 2 - 20})` }), text(w / 2 + 18, 22, String(props.system ?? 'TN-C-S'), 10), text(w / 2 + 18, 36, `${props.voltageLN ?? 230} V / ${props.phases === 1 ? '1' : '3'}~`, 9), text(w / 2 + 18, 50, `Ik ${Math.round((Number(props.ipk) || 0) / 100) / 10} kA`, 8)] })),
    mcb: ({ w, h, props, state }) => {
        const n = poleCount(String(props.poles ?? '1P'));
        const cols = poleColumns(w, n);
        const closed = !!state?.closed && !state?.tripped;
        return (_jsxs("g", { children: [body(w, h), cols.map((x, i) => (_jsxs("g", { children: [contact(x, 6, h - 6, closed), _jsx("path", { d: `M${x + 3} ${h / 2 + 3} h6`, strokeWidth: S }), _jsx("path", { d: `M${x + 3} ${h / 2 + 7} q3 -4 6 0`, fill: "none", strokeWidth: S })] }, i))), text(w / 2, h - 14, `${props.curve ?? 'B'}${props.inA ?? 16}`, 10)] }));
    },
    rcd: ({ w, h, props, state }) => {
        const n = poleCount(String(props.poles ?? '2P'));
        const cols = poleColumns(w, n);
        const closed = !!state?.closed && !state?.tripped;
        return (_jsxs("g", { children: [body(w, h), cols.map((x, i) => (_jsx("g", { children: contact(x, 6, h - 6, closed) }, i))), rect(6, h / 2 - 7, w - 12, 14, { rx: 7, strokeDasharray: '3 2' }), text(w / 2, h - 13, `${props.idn ?? 30} mA ${props.rcdType ?? 'A'}`, 9)] }));
    },
    rcbo: ({ w, h, props, state }) => {
        const n = poleCount(String(props.poles ?? '1P+N'));
        const cols = poleColumns(w, n);
        const closed = !!state?.closed && !state?.tripped;
        return (_jsxs("g", { children: [body(w, h), cols.map((x, i) => (_jsx("g", { children: contact(x, 6, h - 6, closed) }, i))), rect(5, h / 2 - 6, w - 10, 12, { rx: 6, strokeDasharray: '3 2' }), text(w / 2, 20, `${props.curve ?? 'B'}${props.inA ?? 16}`, 9), text(w / 2, h - 12, `${props.idn ?? 30} mA ${props.rcdType ?? 'A'}`, 8)] }));
    },
    afdd: ({ w, h, props, state }) => (_jsxs("g", { children: [body(w, h), contact(w / 2, 6, h - 6, !!state?.closed && !state?.tripped), _jsx("path", { d: `M${w / 2 - 8} ${h / 2 + 8} l5 -6 l-2 6 l5 -6`, fill: "none", strokeWidth: S }), text(w / 2, h - 12, 'AFDD', 8), props.withMcb ? text(w / 2, 20, `${props.curve ?? 'B'}${props.inA ?? 16}`, 8) : null] })),
    spd: ({ w, h, props, state }) => (_jsxs("g", { children: [body(w, h), rect(w / 2 - 9, h / 2 - 10, 18, 20), _jsx("path", { d: `M${w / 2 - 9} ${h / 2 + 10} l18 -20`, strokeWidth: S }), line(w / 2, 6, w / 2, h / 2 - 10), line(w / 2, h / 2 + 10, w / 2, h - 6), text(w / 2, h - 12, String(props.spdType ?? 'T1+T2'), 8), state?.degraded ? text(w / 2, 18, '✕', 12, { fill: 'var(--fail)' }) : null] })),
    fuse: ({ w, h, props, state }) => (_jsxs("g", { children: [body(w, h), rect(w / 2 - 7, h / 2 - 12, 14, 24), line(w / 2, 6, w / 2, h / 2 - 12), line(w / 2, h / 2 + 12, w / 2, h - 6), state?.blown ? (_jsx("path", { d: `M${w / 2 - 5} ${h / 2 + 3} l10 -6`, strokeWidth: S, stroke: "var(--fail)" })) : (line(w / 2, h / 2 - 12, w / 2, h / 2 + 12)), text(w / 2, h - 12, `${props.inA ?? 16} A`, 8)] })),
    motorStarter: ({ w, h, props, state }) => (_jsxs("g", { children: [body(w, h), poleColumns(w, 3).map((x, i) => (_jsx("g", { children: contact(x, 6, h - 6, !!state?.closed && !state?.tripped) }, i))), text(w / 2, h - 12, `${props.setA ?? 6} A`, 8)] })),
    overloadRelay: ({ w, h, props, state }) => (_jsxs("g", { children: [body(w, h), poleColumns(w, 3).map((x, i) => (_jsxs("g", { children: [line(x, 6, x, h - 6), rect(x - 4, h / 2 - 8, 8, 16)] }, i))), text(w / 2, h - 12, `${props.setA ?? 6} A`, 8), state?.tripped ? text(w - 12, 18, '!', 12, { fill: 'var(--fail)' }) : null] })),
    meter: ({ w, h, props }) => (_jsxs("g", { children: [rect(2, 2, w - 4, h - 4, { rx: 3 }), circle(w / 2, h / 2, 13), text(w / 2, h / 2 + 4, 'kWh', 9), text(w / 2, h - 8, props.phases === 3 ? '3~' : '1~', 8)] })),
    hdo: ({ w, h, state }) => (_jsxs("g", { children: [rect(2, 2, w - 4, h - 4, { rx: 3 }), text(w / 2, h / 2, 'HDO', 10), circle(w - 14, 14, 4, { fill: state?.closed ? 'var(--ok)' : 'none' })] })),
    earthBar: ({ w, h }) => (_jsxs("g", { children: [rect(0, 6, w, h - 12, { rx: 2 }), line(6, h / 2, w - 6, h / 2), text(16, h / 2 - 4, 'HOP', 8)] })),
    earthElectrode: ({ w, h }) => (_jsxs("g", { children: [line(w / 2, 0, w / 2, h - 18), line(w / 2 - 14, h - 18, w / 2 + 14, h - 18), line(w / 2 - 9, h - 12, w / 2 + 9, h - 12), line(w / 2 - 4, h - 6, w / 2 + 4, h - 6)] })),
    isolator: ({ w, h, props, state }) => (_jsxs("g", { children: [body(w, h), poleColumns(w, poleCount(String(props.poles ?? '4P'))).map((x, i) => (_jsx("g", { children: contact(x, 6, h - 6, !!state?.closed) }, i)))] })),
    contactor: ({ w, h, props, state }) => (_jsxs("g", { children: [body(w, h), poleColumns(w - 20, poleCount(String(props.poles ?? '4P'))).map((x, i) => (_jsx("g", { children: contact(x, 6, h - 6, !!state?.closed) }, i))), rect(w - 18, h / 2 - 9, 12, 18), text(w - 12, h / 2 + 4, 'A', 8)] })),
    impulseRelay: ({ w, h, state }) => (_jsxs("g", { children: [body(w, h), rect(8, h / 2 - 9, 14, 18), contact(w - 15, 6, h - 6, !!state?.closed), text(15, h / 2 + 4, 'RI', 8)] })),
    stairTimer: ({ w, h, state }) => (_jsxs("g", { children: [body(w, h), rect(8, h / 2 - 9, 14, 18), contact(w - 15, 6, h - 6, !!state?.closed), circle(15, h / 2, 5), line(15, h / 2, 15, h / 2 - 3), line(15, h / 2, 18, h / 2)] })),
    timeRelay: ({ w, h, state }) => (_jsxs("g", { children: [body(w, h), rect(8, h / 2 - 9, 14, 18), contact(w - 15, 6, h - 6, !!state?.closed), text(15, h / 2 + 4, 't', 10)] })),
    twilight: ({ w, h, state }) => (_jsxs("g", { children: [body(w, h), circle(16, h / 2, 7), _jsx("path", { d: `M20 ${h / 2 - 4} a6 6 0 1 0 0 8`, fill: "none", strokeWidth: S }), contact(w - 15, 6, h - 6, !!state?.closed)] })),
    thermostat: ({ w, h, props, state }) => (_jsxs("g", { children: [body(w, h), text(16, h / 2 + 4, '°C', 9), contact(w - 15, 6, h - 6, !!state?.closed), text(w / 2, h - 12, `${props.setpoint ?? 21}`, 8)] })),
    phaseMonitor: ({ w, h, state }) => (_jsxs("g", { children: [body(w, h), text(w / 2, h / 2 - 2, 'L1 L2 L3', 8), circle(w / 2, h / 2 + 12, 4, { fill: state?.ok ? 'var(--ok)' : 'var(--fail)' })] })),
    priorityRelay: ({ w, h, state }) => (_jsxs("g", { children: [body(w, h), text(w / 2, h / 2 + 4, 'PRIO', 9), circle(w - 14, 14, 4, { fill: state?.closed ? 'var(--ok)' : 'var(--warn)' })] })),
    signalLamp: ({ w, h, props, meas }) => {
        const on = (meas?.brightness ?? 0) > 0.1;
        const col = String(props.color ?? 'red');
        const map = { red: '#e04b3a', green: '#39b869', yellow: '#e8c33a', blue: '#4a8ee8', white: '#e8e8e8' };
        return (_jsxs("g", { children: [body(w, h), circle(w / 2, h / 2, 9, { fill: on ? map[col] ?? '#e04b3a' : 'none' }), line(w / 2 - 6, h / 2 - 6, w / 2 + 6, h / 2 + 6), line(w / 2 + 6, h / 2 - 6, w / 2 - 6, h / 2 + 6)] }));
    },
    buzzer: ({ w, h, meas }) => (_jsxs("g", { children: [body(w, h), _jsx("path", { d: `M${w / 2 - 8} ${h / 2 + 6} v-8 a8 8 0 0 1 16 0 v8 z`, fill: "none", strokeWidth: S }), (meas?.sounding ?? 0) > 0 ? text(w / 2, h - 12, '♪', 10) : null] })),
    transformer: ({ w, h }) => (_jsxs("g", { children: [body(w, h), circle(w / 2 - 7, h / 2, 10), circle(w / 2 + 7, h / 2, 10)] })),
    psu: ({ w, h, props }) => (_jsxs("g", { children: [body(w, h), text(w / 2, h / 2 - 2, '~ →', 11), text(w / 2, h / 2 + 12, `${props.outV ?? 24} V`, 9)] })),
    panelSocket: ({ w, h }) => (_jsxs("g", { children: [body(w, h), circle(w / 2, h / 2, 11), _jsx("circle", { cx: w / 2 - 4, cy: h / 2, r: 1.8, fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: w / 2 + 4, cy: h / 2, r: 1.8, fill: "currentColor", stroke: "none" })] })),
    energyMonitor: ({ w, h }) => (_jsxs("g", { children: [body(w, h), rect(10, h / 2 - 9, w - 20, 18, { rx: 2 }), text(w / 2, h / 2 + 4, 'kWh', 9)] })),
    peBar: ({ w, h }) => (_jsxs("g", { children: [rect(0, 0, w, h, { rx: 2, fill: 'var(--live-pe)', fillOpacity: 0.14 }), line(4, h / 2, w - 4, h / 2, { stroke: 'var(--live-pe)', strokeWidth: 2.5 }), text(12, h / 2 - 3, 'PE', 8, { fill: 'var(--live-pe)' })] })),
    nBar: ({ w, h }) => (_jsxs("g", { children: [rect(0, 0, w, h, { rx: 2, fill: 'var(--live-n)', fillOpacity: 0.14 }), line(4, h / 2, w - 4, h / 2, { stroke: 'var(--live-n)', strokeWidth: 2.5 }), text(10, h / 2 - 3, 'N', 8, { fill: 'var(--live-n)' })] })),
    wago: ({ w, h }) => (_jsxs("g", { children: [rect(0, 0, w, h, { rx: 3 }), line(4, h / 2, w - 4, h / 2)] })),
    junctionBox: ({ w, h }) => (_jsx("g", { children: rect(1, 1, w - 2, h - 2, { rx: 4, strokeDasharray: '4 3' }) })),
    dinRail: ({ w, h }) => (_jsxs("g", { children: [rect(0, 2, w, h - 4, { fill: 'var(--bg-sunken)' }), line(0, h / 2, w, h / 2, { strokeDasharray: '2 4' })] })),
    gland: ({ w, h }) => (_jsxs("g", { children: [rect(4, 6, w - 8, h - 12, { rx: 2 }), line(0, h / 2, w, h / 2)] })),
    comb: ({ w, h, props }) => (_jsxs("g", { children: [rect(0, 2, w, h - 8, { rx: 2, fill: 'currentColor', fillOpacity: 0.1 }), Array.from({ length: Math.floor(w / 20) }, (_, i) => (_jsx("g", { children: line(i * 20 + 10, h - 8, i * 20 + 10, h - 2) }, i))), text(20, h - 10, String(props.kind ?? '1P'), 8)] })),
    switch1: ({ w, h, state }) => (_jsxs("g", { children: [line(10, h, 10, h - 12), state?.closed ? line(10, h - 12, 25, 12) : line(10, h - 12, 22, h - 26), line(25, 12, 25, 0), _jsx("circle", { cx: 10, cy: h - 12, r: 2, fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: 25, cy: 12, r: 2, fill: "currentColor", stroke: "none" })] })),
    switch5: ({ w, h, state }) => (_jsxs("g", { children: [line(30, h, 30, h - 12), line(30, h - 12, state?.a ? 15 : 22, state?.a ? 12 : h - 24), line(30, h - 12, state?.b ? 45 : 40, state?.b ? 12 : h - 24), line(15, 12, 15, 0), line(45, 12, 45, 0)] })),
    switch6: ({ w, h, state }) => {
        const pos = Number(state?.pos ?? 1);
        return (_jsxs("g", { children: [line(30, h, 30, h - 12), line(30, h - 12, pos === 1 ? 15 : 45, 12), line(15, 12, 15, 0), line(45, 12, 45, 0), _jsx("circle", { cx: 30, cy: h - 12, r: 2, fill: "currentColor", stroke: "none" })] }));
    },
    switch66: ({ w, h, state }) => {
        const a = Number(state?.posA ?? 1);
        const b = Number(state?.posB ?? 1);
        return (_jsxs("g", { children: [line(25, h, 25, h - 12), line(25, h - 12, a === 1 ? 15 : 35, 12), line(65, h, 65, h - 12), line(65, h - 12, b === 1 ? 55 : 75, 12), [15, 35, 55, 75].map((x) => line(x, 12, x, 0))] }));
    },
    switch7: ({ w, h, state }) => {
        const x = !!state?.crossed;
        return (_jsxs("g", { children: [line(20, h, 20, h - 12), line(50, h, 50, h - 12), line(20, 12, 20, 0), line(50, 12, 50, 0), x ? (_jsxs(_Fragment, { children: [line(20, h - 12, 50, 12), line(50, h - 12, 20, 12)] })) : (_jsxs(_Fragment, { children: [line(20, h - 12, 20, 12), line(50, h - 12, 50, 12)] }))] }));
    },
    button: ({ w, h, state }) => (_jsxs("g", { children: [line(10, h, 10, h - 12), line(25, 12, 25, 0), state?.pressed ? line(10, h - 12, 25, 12) : line(10, h - 14, 25, h - 20), line(17, h - 22, 17, h - 30), line(12, h - 30, 22, h - 30)] })),
    dimmer: ({ w, h, props }) => (_jsxs("g", { children: [rect(4, 8, w - 8, h - 16, { rx: 3 }), _jsx("path", { d: `M10 ${h - 14} L${w - 10} 14`, strokeWidth: S }), text(w / 2, h - 20, `${props.level ?? 100}%`, 9)] })),
    motion: ({ w, h, state }) => (_jsxs("g", { children: [rect(4, 8, w - 8, h - 16, { rx: 3 }), _jsx("path", { d: `M${w / 2 - 10} ${h / 2 + 6} a10 10 0 0 1 20 0`, fill: "none", strokeWidth: S }), _jsx("path", { d: `M${w / 2 - 5} ${h / 2 + 6} a5 5 0 0 1 10 0`, fill: "none", strokeWidth: S }), state?.closed ? circle(w - 12, 14, 3, { fill: 'var(--ok)' }) : null] })),
    smartRelay: ({ w, h, state }) => (_jsxs("g", { children: [rect(4, 6, w - 8, h - 12, { rx: 3 }), text(w / 2, h / 2 + 4, 'REL', 9), state?.closed ? circle(w - 12, 12, 3, { fill: 'var(--ok)' }) : null] })),
    socket: ({ w, h, props, state }) => (_jsxs("g", { children: [_jsx("path", { d: `M${w / 2 - 14} ${h - 14} a14 14 0 0 1 28 0 z`, fill: "none", strokeWidth: S }), line(w / 2 - 14, h - 14, w / 2 + 14, h - 14), _jsx("circle", { cx: w / 2 - 6, cy: h - 22, r: 2, fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: w / 2 + 6, cy: h - 22, r: 2, fill: "currentColor", stroke: "none" }), line(w / 2, h - 14, w / 2, h - 10), Number(props.outlets) === 2 ? text(w - 8, 14, '2×', 9) : null, state?.plugged ? rect(w / 2 - 7, h - 34, 14, 8, { rx: 1, fill: 'currentColor', fillOpacity: 0.3 }) : null] })),
    socketUsb: ({ w, h }) => (_jsxs("g", { children: [_jsx("path", { d: `M${w / 2 - 14} ${h - 14} a14 14 0 0 1 28 0 z`, fill: "none", strokeWidth: S }), line(w / 2 - 14, h - 14, w / 2 + 14, h - 14), text(w / 2, h - 30, 'USB', 8)] })),
    socketCee: ({ w, h, props }) => (_jsxs("g", { children: [circle(w / 2, h / 2, 16), [0, 72, 144, 216, 288].map((a) => {
                const r = (a * Math.PI) / 180;
                return (_jsx("circle", { cx: w / 2 + Math.cos(r) * 8, cy: h / 2 + Math.sin(r) * 8, r: 2.2, fill: "currentColor", stroke: "none" }, a));
            }), text(w / 2, h - 2, `${props.inA ?? 16} A`, 8)] })),
    connectionBox: ({ w, h }) => (_jsxs("g", { children: [rect(4, 6, w - 8, h - 12, { rx: 2 }), line(4, h / 2, w - 4, h / 2)] })),
    lamp: ({ w, h, meas }) => {
        const b = meas?.brightness ?? 0;
        return (_jsxs("g", { children: [circle(w / 2, h / 2, 13, { fill: b > 0.02 ? '#f5c542' : 'none', fillOpacity: 0.15 + b * 0.85 }), line(w / 2 - 9, h / 2 - 9, w / 2 + 9, h / 2 + 9), line(w / 2 + 9, h / 2 - 9, w / 2 - 9, h / 2 + 9)] }));
    },
    ledPanel: ({ w, h, meas }) => {
        const b = meas?.brightness ?? 0;
        return (_jsxs("g", { children: [rect(6, 12, w - 12, h - 24, { rx: 2, fill: '#f5e6a3', fillOpacity: b * 0.9 }), line(12, h / 2, w - 12, h / 2), text(w / 2, h - 4, 'LED', 8)] }));
    },
    ledStrip: ({ w, h, meas }) => {
        const b = meas?.brightness ?? 0;
        return (_jsxs("g", { children: [rect(4, h / 2 - 5, w - 8, 10, { rx: 5, fill: '#f5e6a3', fillOpacity: b * 0.9 }), Array.from({ length: 6 }, (_, i) => _jsx("g", { children: circle(12 + i * ((w - 24) / 5), h / 2, 2) }, i))] }));
    },
    fluorescent: ({ w, h, meas }) => {
        const b = meas?.brightness ?? 0;
        return (_jsxs("g", { children: [rect(6, h / 2 - 7, w - 12, 14, { rx: 7, fill: '#dff0f5', fillOpacity: b * 0.9 }), line(2, h / 2, 6, h / 2), line(w - 6, h / 2, w - 2, h / 2)] }));
    },
    boiler: ({ w, h }) => (_jsxs("g", { children: [rect(10, 10, w - 20, h - 18, { rx: 8 }), _jsx("path", { d: `M${w / 2 - 6} ${h - 16} q6 -8 0 -14 q-6 -6 0 -12`, fill: "none", strokeWidth: S })] })),
    cooker: ({ w, h }) => (_jsxs("g", { children: [rect(6, 10, w - 12, h - 20, { rx: 3 }), [0, 1].map((r) => [0, 1].map((c) => _jsx("g", { children: circle(w / 3 + c * (w / 3), h / 3 + r * (h / 4), 7) }, `${r}${c}`)))] })),
    oven: ({ w, h }) => (_jsxs("g", { children: [rect(6, 8, w - 12, h - 16, { rx: 3 }), line(6, 20, w - 6, 20), rect(12, 26, w - 24, h - 38, { rx: 2 })] })),
    washer: ({ w, h }) => (_jsxs("g", { children: [rect(6, 8, w - 12, h - 16, { rx: 3 }), circle(w / 2, h / 2 + 4, 12), circle(w / 2, h / 2 + 4, 6)] })),
    dishwasher: ({ w, h }) => (_jsxs("g", { children: [rect(6, 8, w - 12, h - 16, { rx: 3 }), line(10, h / 2, w - 10, h / 2), line(10, h / 2 + 10, w - 10, h / 2 + 10)] })),
    floorHeating: ({ w, h }) => (_jsxs("g", { children: [rect(4, 10, w - 8, h - 20, { rx: 2 }), _jsx("path", { d: `M10 ${h / 2 + 6} q8 -14 16 0 t16 0 t16 0`, fill: "none", strokeWidth: S })] })),
    airCon: ({ w, h }) => (_jsxs("g", { children: [rect(6, 12, w - 12, h - 26, { rx: 4 }), line(12, h - 18, w - 12, h - 18), _jsx("path", { d: `M${w / 2 - 10} ${h - 10} q10 8 20 0`, fill: "none", strokeWidth: S })] })),
    heatPump: ({ w, h }) => (_jsxs("g", { children: [rect(6, 10, w - 12, h - 20, { rx: 3 }), circle(w / 2, h / 2, 12), [0, 120, 240].map((a) => {
                const r = (a * Math.PI) / 180;
                return _jsx("g", { children: line(w / 2, h / 2, w / 2 + Math.cos(r) * 12, h / 2 + Math.sin(r) * 12) }, a);
            })] })),
    motor: ({ w, h }) => (_jsxs("g", { children: [circle(w / 2, h / 2, 17), text(w / 2, h / 2 + 5, 'M', 14), text(w / 2, h / 2 + 15, '3~', 8)] })),
    machine: ({ w, h }) => (_jsxs("g", { children: [rect(6, 10, w - 12, h - 20, { rx: 2 }), circle(w / 2, h / 2, 9), line(w / 2, h / 2 - 14, w / 2, h / 2 - 9)] })),
    genericLoad: ({ w, h }) => (_jsxs("g", { children: [rect(8, 12, w - 16, h - 24, { rx: 2 }), line(8, 12, w - 8, h - 12)] })),
    evse: ({ w, h, props }) => (_jsxs("g", { children: [rect(8, 8, w - 16, h - 16, { rx: 4 }), _jsx("path", { d: `M${w / 2 - 3} ${h / 2 - 10} l-6 12 h8 l-4 10 l10 -14 h-8 z`, fill: "currentColor", stroke: "none" }), text(w / 2, h - 4, `${props.powerKw ?? 11} kW`, 8)] })),
    multimeter: ({ w, h, props, meas }) => (_jsxs("g", { children: [rect(2, 2, w - 4, h - 14, { rx: 5 }), rect(8, 10, w - 16, 18, { rx: 2, fill: 'var(--bg-sunken)' }), text(w / 2, 24, formatReading(meas?.reading, String(props.mode ?? 'V')), 11), circle(w / 2, h - 28, 9), text(w / 2, h - 25, String(props.mode ?? 'V'), 9)] })),
    clampMeter: ({ w, h, meas }) => (_jsxs("g", { children: [_jsx("path", { d: `M${w / 2} 6 a14 14 0 1 1 -0.1 0`, fill: "none", strokeWidth: 2 }), rect(8, h - 44, w - 16, 22, { rx: 3, fill: 'var(--bg-sunken)' }), text(w / 2, h - 29, meas?.reading !== undefined ? `${meas.reading.toFixed(2)} A` : '— A', 10)] })),
    insulationTester: ({ w, h }) => (_jsxs("g", { children: [rect(2, 2, w - 4, h - 14, { rx: 5 }), rect(8, 10, w - 16, 20, { rx: 2, fill: 'var(--bg-sunken)' }), text(w / 2, 24, 'MΩ', 11)] })),
    loopTester: ({ w, h }) => (_jsxs("g", { children: [rect(2, 2, w - 4, h - 14, { rx: 5 }), rect(8, 10, w - 16, 20, { rx: 2, fill: 'var(--bg-sunken)' }), text(w / 2, 24, 'Zs', 11)] })),
    rcdTester: ({ w, h }) => (_jsxs("g", { children: [rect(2, 2, w - 4, h - 14, { rx: 5 }), rect(8, 10, w - 16, 20, { rx: 2, fill: 'var(--bg-sunken)' }), text(w / 2, 24, 'IΔn', 11)] })),
    phaseTester: ({ w, h }) => (_jsxs("g", { children: [rect(2, 2, w - 4, h - 12, { rx: 5 }), circle(w / 2, h / 2 - 4, 12), _jsx("path", { d: `M${w / 2 - 5} ${h / 2 - 9} l10 5 l-10 5 z`, fill: "currentColor", stroke: "none" })] })),
    socketTester: ({ w, h }) => (_jsxs("g", { children: [rect(6, 2, w - 12, h - 14, { rx: 4 }), [0, 1, 2].map((i) => _jsx("g", { children: circle(16 + i * 14, 18, 4) }, i))] })),
};
function formatReading(v, mode) {
    if (v === undefined)
        return '—';
    if (mode === 'A')
        return `${v.toFixed(3)} A`;
    if (mode === 'R')
        return `${v.toFixed(1)} Ω`;
    return `${v.toFixed(1)} V`;
}
/** Fallback for any component without a drawn symbol. */
function genericSymbol({ w, h }) {
    return (_jsxs("g", { children: [rect(4, 6, w - 8, h - 12, { rx: 3 }), line(10, h / 2, w - 10, h / 2, { strokeDasharray: '3 3' })] }));
}
export function renderSymbol(name, ctx) {
    const fn = SYMBOLS[name];
    return fn ? fn(ctx) : genericSymbol(ctx);
}
export function hasSymbol(name) {
    return name in SYMBOLS;
}
