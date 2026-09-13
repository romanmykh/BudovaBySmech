import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { getDef, type CircuitKind } from '@budova/engine';
import { useProject } from '../store/project.js';
import { useUi } from '../store/ui.js';

const KINDS: CircuitKind[] = [
  'lighting', 'socket', 'cooker', 'boiler', 'appliance', 'evse', 'motor', 'heating',
  'distribution', 'control', 'other',
];

/** Named circuit grouping: what ends up on the circuit schedule and drives the rules. */
export function CircuitsPanel(): JSX.Element {
  const { t } = useTranslation();
  const project = useProject((s) => s.project);
  const store = useProject;
  const ui = useUi();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CircuitKind>('socket');

  const memberCount = (id: string) =>
    project.components.filter((c) => c.circuit === id).length;

  const add = () => {
    const n = name.trim();
    if (!n) return;
    store.getState().addCircuit(n, kind);
    setName('');
  };

  return (
    <div className="border-t p-2.5 text-xs" style={{ borderColor: 'var(--border)' }}>
      <div className="sect-title mb-1.5">{t('circuits.title')}</div>
      {!project.circuits.length && <div className="dim mb-1.5">{t('circuits.none')}</div>}
      <ul className="mb-2 flex flex-col gap-1">
        {project.circuits.map((c) => (
          <li key={c.id} className="flex items-center gap-1.5">
            <input
              type="color"
              className="h-5 w-6 shrink-0 rounded border p-0"
              value={c.color ?? '#888888'}
              onChange={(e) => store.getState().updateCircuit(c.id, { color: e.target.value })}
              title={t('prop.color')}
            />
            <input
              type="text"
              className="min-w-0 flex-1"
              value={c.name}
              onChange={(e) => store.getState().updateCircuit(c.id, { name: e.target.value })}
            />
            <select
              className="!w-24 shrink-0"
              value={c.kind}
              onChange={(e) => store.getState().updateCircuit(c.id, { kind: e.target.value as CircuitKind })}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`circuitKind.${k}`)}
                </option>
              ))}
            </select>
            <button
              className="btn btn-sm shrink-0"
              title={t('circuits.selectMembers')}
              onClick={() =>
                store.getState().select(project.components.filter((x) => x.circuit === c.id).map((x) => x.id))
              }
            >
              {memberCount(c.id)}
            </button>
            <button
              className="btn btn-sm btn-danger shrink-0"
              onClick={() => store.getState().deleteCircuit(c.id)}
              title={t('action.delete')}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <input
          type="text"
          placeholder={t('circuits.newName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <select className="!w-28 shrink-0" value={kind} onChange={(e) => setKind(e.target.value as CircuitKind)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`circuitKind.${k}`)}
            </option>
          ))}
        </select>
        <button className="btn btn-sm shrink-0" onClick={add}>
          {t('action.add')}
        </button>
      </div>
      <button
        className="btn btn-sm mt-2"
        onClick={() => {
          // Assign every protective device without a circuit to one named after it.
          const unassigned = project.components.filter(
            (c) => !c.circuit && (getDef(c.type)?.flags?.overcurrent || getDef(c.type)?.flags?.rcd),
          );
          if (!unassigned.length) {
            ui.showToast(t('circuits.allAssigned'));
            return;
          }
          for (const c of unassigned) {
            const id = store.getState().addCircuit(c.label || t('prop.circuit'), 'other');
            store.getState().setComponent(c.id, { circuit: id });
          }
        }}
      >
        {t('circuits.autoCreate')}
      </button>
    </div>
  );
}
