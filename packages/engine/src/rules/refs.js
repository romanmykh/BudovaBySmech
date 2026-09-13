export const REFS = {
    shock: { std: 'ČSN 33 2000-4-41 ed. 3' },
    shockDisconnect: { std: 'ČSN 33 2000-4-41 ed. 3', clause: '411.3.2' },
    shockRcd: { std: 'ČSN 33 2000-4-41 ed. 3', clause: '411.3.3' },
    shockRcdLighting: { std: 'ČSN 33 2000-4-41 ed. 3', clause: '411.3.4', toVerify: true },
    overcurrent: { std: 'ČSN 33 2000-4-43 ed. 2', clause: '433.1' },
    overcurrentShort: { std: 'ČSN 33 2000-4-43 ed. 2', clause: '434' },
    thermal: { std: 'ČSN 33 2000-4-42 ed. 2' },
    afdd: { std: 'ČSN 33 2000-4-42 ed. 2', clause: '421.7', toVerify: true },
    cableSizing: { std: 'ČSN 33 2000-5-52 ed. 2' },
    voltageDrop: { std: 'ČSN 33 2000-5-52 ed. 2', clause: 'příloha G', toVerify: true },
    earthing: { std: 'ČSN 33 2000-5-54 ed. 3' },
    peSeparation: { std: 'ČSN 33 2000-5-54 ed. 3', clause: '543.4', toVerify: true },
    spd: { std: 'ČSN 33 2000-5-53 ed. 2' },
    bathroom: { std: 'ČSN 33 2000-7-701 ed. 2' },
    evse: { std: 'ČSN 33 2000-7-722 ed. 3' },
    indoor: { std: 'ČSN 33 2130 ed. 3' },
    inspection: { std: 'ČSN 33 2000-6 ed. 2' },
    revision: { std: 'ČSN 33 1500' },
    boards: { std: 'ČSN EN 61439-3' },
    competence: { std: 'nařízení vlády č. 194/2022 Sb.' },
};
export function refString(r) {
    return r.clause ? `${r.std}, ${r.clause}` : r.std;
}
