'use client';

import { useMemo, useState } from 'react';
import { Search, Users, GraduationCap, AlertCircle, ChevronLeft, ArrowUpRight } from 'lucide-react';
import { aggregateAcademics, otherGroupsAverage, subjectAveragesFor, type AcademicAggregate } from '@/lib/academic-aggregates';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type View = 'professors' | 'groups';

export function AverageComparisonBar({ average, comparison, metric = 'Promedio' }: { average: number | null; comparison: { average: number; count: number } | null; metric?: string }) {
  return <div className="mt-2">
    <div className="relative h-2 overflow-visible rounded-full bg-slate-100" aria-label={comparison ? `${metric} ${average?.toFixed(1) ?? 'sin dato'}; otros grupos ${comparison.average.toFixed(1)}` : `${metric} ${average?.toFixed(1) ?? 'sin dato'}`}>
      {average !== null && <div className="academic-bar h-full rounded-full bg-teal-600" style={{ width: `${Math.max(0, Math.min(100, average))}%` }} />}
      {comparison && <span className="absolute top-[-3px] h-3.5 w-0.5 rounded-full bg-orange-600" style={{ left: `${Math.max(0, Math.min(100, comparison.average))}%` }} title={`Otros grupos: ${comparison.average.toFixed(1)} (${comparison.count} calificaciones)`} />}
    </div>
    {comparison && <p className="mt-1.5 text-[11px] text-orange-800"><span className="mr-1 inline-block h-2.5 w-0.5 bg-orange-600" />{metric} otros grupos: {comparison.average.toFixed(1)} · {comparison.count} {metric === 'Potencial' ? 'alumnos' : 'calificaciones'}</p>}
  </div>;
}

export function AcademicBreakdown() {
  const { allStudents, setActiveView, setFilterType, setSelectedValue } = useDashboardFilters();
  const [view, setView] = useState<View>('professors');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'average' | 'sc'>('name');
  const [selected, setSelected] = useState<{ view: View; row: AcademicAggregate } | null>(null);
  const { byProfessor, byGroup } = useMemo(() => aggregateAcademics(allStudents), [allStudents]);
  const rows = useMemo(() => {
    const source = view === 'professors' ? byProfessor : byGroup;
    const normalized = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const selected = source.filter(row => row.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalized));
    if (sort === 'sc') selected.sort((a, b) => b.scCount - a.scCount || a.name.localeCompare(b.name, 'es'));
    if (sort === 'average') selected.sort((a, b) => (a.average === null ? 1 : b.average === null ? -1 : b.average - a.average) || a.name.localeCompare(b.name, 'es'));
    return selected;
  }, [view, query, sort, byProfessor, byGroup]);
  const totals = useMemo(() => ({
    sc: byProfessor.reduce((sum, row) => sum + row.scCount, 0),
    graded: byProfessor.reduce((sum, row) => sum + row.gradedCount, 0),
  }), [byProfessor]);
  const subjectRows = useMemo(() => selected ? subjectAveragesFor(allStudents, selected.view, selected.row.name) : [], [allStudents, selected]);
  const rowComparisons = useMemo(() => new Map(rows.map(row => [row.name, otherGroupsAverage(allStudents, view, row.name)])), [allStudents, rows, view]);
  const subjectComparisons = useMemo(() => new Map(subjectRows.map(row => [row.name, selected ? otherGroupsAverage(allStudents, selected.view, selected.row.name, row.name) : null])), [allStudents, selected, subjectRows]);

  function openStudents() {
    if (!selected || selected.row.name.startsWith('Sin ')) return;
    setFilterType(selected.view === 'professors' ? 'professor' : 'group');
    setSelectedValue(selected.row.name);
    setActiveView('students');
  }

  return <section className="space-y-4" aria-labelledby="academic-breakdown-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="academic-breakdown-title" className="text-lg font-semibold text-slate-900">Indicadores del monitoreo</h2>
        <p className="text-sm text-slate-500">Promedios del monitoreo y actividades marcadas SC. Las materias sin calificación no cuentan como cero.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border bg-white px-3 py-1.5">{totals.graded} calificaciones</span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">{totals.sc} SC</span>
      </div>
    </div>
    <Card className="overflow-hidden border-slate-200 bg-white">
      <CardContent className="space-y-4 p-4 sm:p-5">
        {selected ? <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}><ChevronLeft className="mr-1 h-4 w-4" />Volver</Button>
              <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{selected.view === 'professors' ? 'Maestro' : 'Grupo'}</p><h3 className="text-lg font-semibold text-slate-900">{selected.row.name}</h3><p className="text-xs text-slate-500">{selected.row.studentCount} alumnos · {subjectRows.length} materias</p></div>
            </div>
            {!selected.row.name.startsWith('Sin ') && <Button type="button" variant="outline" size="sm" onClick={openStudents}>Ver alumnos <ArrowUpRight className="ml-1 h-4 w-4" /></Button>}
          </div>
          <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {subjectRows.map(subject => <div key={subject.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
              <div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{subject.name}</p><p className="text-xs text-slate-500">{subject.studentCount} alumnos · {subject.gradedCount} calificaciones</p><AverageComparisonBar average={subject.average} comparison={subjectComparisons.get(subject.name) || null} /></div>
              <div className="text-right"><p className="text-base font-semibold tabular-nums text-teal-800">{subject.average === null ? '—' : subject.average.toFixed(1)}</p><p className="text-[11px] text-slate-500">promedio</p></div>
              <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1 sm:block sm:text-right"><p className={`text-base font-semibold tabular-nums ${subject.scCount ? 'text-amber-700' : 'text-slate-400'}`}>{subject.scCount}</p><p className="text-[11px] text-slate-500">SC</p></div>
            </div>)}
          </div>
        </div> : <>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border bg-slate-50 p-1" role="group" aria-label="Desglose académico">
            <Button size="sm" variant={view === 'professors' ? 'default' : 'ghost'} onClick={() => setView('professors')}><GraduationCap className="mr-1.5 h-4 w-4" />Maestros</Button>
            <Button size="sm" variant={view === 'groups' ? 'default' : 'ghost'} onClick={() => setView('groups')}><Users className="mr-1.5 h-4 w-4" />Grupos</Button>
          </div>
          <label className="relative min-w-48 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Buscar {view === 'professors' ? 'maestro' : 'grupo'}</span><Input className="pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder={view === 'professors' ? 'Buscar maestro' : 'Buscar grupo'} /></label>
          <label className="text-sm text-slate-600">Ordenar <select value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="ml-1 rounded-lg border bg-white px-2 py-2"><option value="name">Nombre</option><option value="average">Promedio</option><option value="sc">Más SC</option></select></label>
        </div>
        <div className="max-h-[30rem] space-y-2 overflow-y-auto pr-1">
          {rows.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay registros para esta búsqueda.</p>}
          {rows.map(row => <button key={`${view}-${row.name}`} type="button" onClick={() => setSelected({ view, row })} className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition-colors hover:border-teal-200 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800" title={row.name}>{row.name}</p><p className="text-xs text-slate-500">{row.studentCount} alumnos · {row.gradedCount} calificaciones</p><AverageComparisonBar average={row.average} comparison={rowComparisons.get(row.name) || null} /></div>
            <div className="text-right"><p className="text-base font-semibold tabular-nums text-teal-800">{row.average === null ? '—' : row.average.toFixed(1)}</p><p className="text-[11px] text-slate-500">promedio</p></div>
            <div className="col-span-2 flex items-center justify-end gap-1 text-right sm:col-span-1 sm:block"><p className={`text-base font-semibold tabular-nums ${row.scCount ? 'text-amber-700' : 'text-slate-400'}`}>{row.scCount}</p><p className="text-[11px] text-slate-500">SC</p></div>
          </button>)}
        </div>
        </>}
        <p className="text-xs text-slate-500"><AlertCircle className="mr-1 inline h-3.5 w-3.5" />Cada promedio toma las calificaciones disponibles de materias cursadas; un alumno con varias materias aporta una calificación por materia. Pulsa una fila para ver sus materias.</p>
      </CardContent>
    </Card>
  </section>;
}
