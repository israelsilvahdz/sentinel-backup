'use client';

import { useDashboardFilters } from './DashboardClient';

export function ScopeSwitcher({ compact = false }: { compact?: boolean }) {
  const { audience, leaders, tutors, scopeType, setScopeType, scopeValue, setScopeValue } = useDashboardFilters();
  const people = scopeType === 'tutor' ? tutors : leaders;
  const role = audience === 'professional' ? 'mentor' : scopeType === 'tutor' ? 'tutor' : 'líder';

  return <div className={compact ? 'space-y-3' : 'grid gap-3 sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)]'}>
    <label className="block min-w-0 text-xs font-semibold text-slate-600">Rol
      <select className="mt-1.5 h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" value={scopeType} onChange={event => setScopeType(event.target.value as 'all' | 'leader' | 'tutor')}>
        <option value="all">Vista general</option><option value="leader">{audience === 'professional' ? 'Mentor' : 'Líder'}</option>{audience === 'prepa' && <option value="tutor">Tutor</option>}
      </select>
    </label>
    {scopeType !== 'all' && <label className="block min-w-0 text-xs font-semibold text-slate-600">{audience === 'professional' ? 'Mentor' : 'Persona'}
      <select className="mt-1.5 h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" value={scopeValue || ''} onChange={event => setScopeValue(event.target.value || null)}>
        <option value="">Todos los {role === 'líder' ? 'líderes' : role === 'tutor' ? 'tutores' : 'mentores'}</option>
        {scopeValue && !people.includes(scopeValue) && <option value={scopeValue}>{scopeValue} · no disponible</option>}
        {people.map(person => <option key={person} value={person}>{person}</option>)}
      </select>
    </label>}
  </div>;
}
