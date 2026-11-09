'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { BookOpenCheck, CheckCircle2, CircleDashed, Clock3, Search, ShieldAlert, UploadCloud, X } from 'lucide-react';
import { localWorkspace } from '@/lib/local-workspace';
import { kardexSummary, readKardexWorkbook, type KardexStatus, type KardexStudent } from '@/lib/kardex-progress';
import { useDashboardFilters } from './DashboardClient';
import { WorkspaceHeader } from './WorkspaceHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const statusLabel: Record<KardexStatus, string> = {
  accredited: 'Acreditada', inProgress: 'CU · en curso', notAccredited: 'No acreditada', pending: 'Pendiente', review: 'Revisar código',
};
const statusStyle: Record<KardexStatus, string> = {
  accredited: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  inProgress: 'border-sky-200 bg-sky-50 text-sky-800',
  notAccredited: 'border-rose-200 bg-rose-50 text-rose-800',
  pending: 'border-slate-200 bg-slate-50 text-slate-600',
  review: 'border-amber-200 bg-amber-50 text-amber-800',
};
type SavedKardex = { name: string; students: KardexStudent[] };
const periodOrder = (period: string) => {
  const year = Number(period.match(/\d{4}/)?.[0] || 0);
  const month = /ene/i.test(period) ? 1 : /mayo|may/i.test(period) ? 5 : /jun|verano/i.test(period) ? 6 : /ago/i.test(period) ? 8 : /sep/i.test(period) ? 9 : 12;
  return year * 12 + month;
};

export function KardexProgressPanel() {
  const { allStudentsMap, scopeValue, scopedStudents, audience } = useDashboardFilters();
  const [data, setData] = useState<SavedKardex | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [courseQuery, setCourseQuery] = useState('');
  const [courseStatus, setCourseStatus] = useState<KardexStatus | 'all'>('all');
  const [onlyScope, setOnlyScope] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    localWorkspace<SavedKardex>('kardex-progress').then(saved => {
      if (live && saved?.students?.length) { setData(saved); setSelectedId(`${saved.students[0].id}|${saved.students[0].plan}`); }
    }).catch(() => { if (live) setError('No se pudo recuperar el Kárdex guardado en este navegador.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const students = readKardexWorkbook(workbook);
      if (!students.length) throw new Error('No se encontraron alumnos con materias en el Kárdex.');
      const next = { name: file.name, students };
      await localWorkspace('kardex-progress', next);
      setData(next); setSelectedId(`${students[0].id}|${students[0].plan}`); setQuery(''); setCourseQuery(''); setCourseStatus('all');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo leer el archivo.');
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  const scopeIds = useMemo(() => new Set(scopedStudents.map(student => student.id.trim().toUpperCase())), [scopedStudents]);
  const students = useMemo(() => (data?.students || []).filter(student => {
    const words = `${student.name} ${student.id} ${student.plan}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const searched = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return words.includes(searched) && (!onlyScope || scopeIds.has(student.id));
  }), [data, query, onlyScope, scopeIds]);
  const selected = students.find(student => `${student.id}|${student.plan}` === selectedId) || students[0] || null;
  const summary = selected ? kardexSummary(selected) : null;
  const courses = (selected?.courses || []).filter(course =>
    (courseStatus === 'all' || course.status === courseStatus) &&
    `${course.name} ${course.key} ${course.optative}`.toLowerCase().includes(courseQuery.toLowerCase().trim()));
  const periods = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const course of selected?.courses || []) if (course.period && course.status !== 'pending') grouped.set(course.period, (grouped.get(course.period) || 0) + 1);
    return [...grouped].sort((a, b) => periodOrder(a[0]) - periodOrder(b[0]) || a[0].localeCompare(b[0], 'es'));
  }, [selected]);
  const current = selected ? allStudentsMap.get(selected.id) : null;

  return <main className="workspace-page kardex-page">
    <WorkspaceHeader eyebrow="Trayectoria académica" title="Avance del Kárdex" description="Un mapa del plan cursado, materias con código CU y materias todavía sin registro. Las filas repetidas de una misma clave se cuentan una sola vez." />
    <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-900/20 bg-[#063f39] p-5 text-white shadow-[0_22px_50px_-35px_rgba(0,55,47,.7)] md:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full border-[38px] border-white/[.06]" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-emerald-200">Prototipo local</p><h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">Tu mapa de trayectoria</h2><p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">Carga un Kárdex masivo en Excel. Se procesa y conserva únicamente en este navegador; no se envía a un servidor.</p>{data && <p className="mt-3 flex items-center gap-2 text-xs text-emerald-100"><CheckCircle2 className="h-4 w-4" />{data.name} · {new Set(data.students.map(student => student.id)).size} alumnos · {data.students.length} planes</p>}</div>
        <div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" accept=".xlsx,.xls" className="sr-only" aria-label="Seleccionar Kárdex masivo" onChange={event => void upload(event.target.files?.[0])} /><Button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="h-11 rounded-xl bg-white px-5 font-semibold text-emerald-950 hover:bg-emerald-50"><UploadCloud className="mr-2 h-4 w-4" />{busy ? 'Leyendo archivo…' : data ? 'Actualizar Kárdex' : 'Cargar Kárdex'}</Button>{data && <Button type="button" variant="outline" onClick={async () => { await localWorkspace('kardex-progress', { name: '', students: [] }); setData(null); setSelectedId(null); }} className="h-11 rounded-xl border-white/25 bg-white/10 px-4 text-white hover:bg-white/20 hover:text-white"><X className="mr-2 h-4 w-4" />Quitar</Button>}</div>
      </div>
    </section>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    {!data && !loading && <section className="grid gap-3 md:grid-cols-3">{[
      ['01', 'Cargar', 'Selecciona el Excel de Kárdex masivo.'],
      ['02', 'Encontrar', 'Busca por nombre, matrícula o plan.'],
      ['03', 'Explorar', 'Consulta avance, periodos y materias del plan.'],
    ].map(([number, title, body]) => <div key={number} className="rounded-2xl border border-emerald-100 bg-white p-5"><span className="text-xs font-bold text-emerald-700">{number}</span><h3 className="mt-2 font-semibold text-emerald-950">{title}</h3><p className="mt-1 text-sm text-slate-600">{body}</p></div>)}</section>}
    {data && <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="min-w-0 self-start overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm lg:sticky lg:top-24">
        <div className="border-b border-emerald-100 p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, matrícula o plan" className="h-10 pl-9" /></div>{scopeValue && <label className="mt-3 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={onlyScope} onChange={event => setOnlyScope(event.target.checked)} className="accent-emerald-700" />Solo mi cartera de {audience === 'professional' ? 'mentor' : 'líder'}</label>}<p className="mt-3 text-xs font-medium text-slate-500">{students.length} de {data.students.length} planes</p></div>
        <div className="max-h-[34rem] overflow-y-auto p-2">{students.map(student => { const value = kardexSummary(student); const identity = `${student.id}|${student.plan}`; return <button key={identity} type="button" onClick={() => { setSelectedId(identity); setCourseQuery(''); setCourseStatus('all'); }} className={`mb-1 w-full rounded-xl border p-3 text-left transition-colors ${selected?.id === student.id && selected.plan === student.plan ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-transparent text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/60'}`}><span className="block truncate text-sm font-semibold" title={student.name}>{student.name}</span><span className="mt-1 flex justify-between gap-2 text-xs text-slate-500"><span>{student.id} · {student.plan}</span><strong className="text-emerald-800">{value.progress}%</strong></span></button>; })}{students.length === 0 && <p className="p-4 text-sm text-slate-500">Sin coincidencias.</p>}</div>
      </aside>
      {selected && summary && <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm md:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">Plan {selected.plan}</p><h2 className="mt-1 text-xl font-semibold text-emerald-950 md:text-2xl">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">{selected.id}{current?.academicCodeDescription ? ` · ${current.academicCodeDescription}` : ''}{current?.leader ? ` · ${audience === 'professional' ? 'Mentor' : 'Líder'}: ${current.leader}` : ''}</p></div><div className="rounded-2xl bg-emerald-50 px-5 py-3 text-right"><p className="text-3xl font-semibold tabular-nums text-emerald-900">{summary.progress}%</p><p className="text-[11px] font-medium text-emerald-800">materias acreditadas</p></div></div><div className="mt-5 h-2.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${summary.progress}%` }} /></div><p className="mt-2 text-xs text-slate-500">{summary.accredited} de {summary.total} materias únicas del plan. Este porcentaje no representa créditos.</p></section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Estados del plan">{[
          { label: 'Acreditadas', count: summary.accredited, icon: CheckCircle2, style: 'text-emerald-800 bg-emerald-50' },
          { label: 'CU', count: summary.inProgress, icon: Clock3, style: 'text-sky-800 bg-sky-50' },
          { label: 'Pendientes', count: summary.pending, icon: CircleDashed, style: 'text-slate-700 bg-slate-100' },
          { label: 'No acreditadas', count: summary.notAccredited, icon: ShieldAlert, style: 'text-rose-800 bg-rose-50' },
          { label: 'Revisar código', count: summary.review, icon: ShieldAlert, style: 'text-amber-800 bg-amber-50' },
        ].map(item => <div key={item.label} className="rounded-2xl border border-emerald-100 bg-white p-4"><div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.style}`}><item.icon className="h-4 w-4" /></div><p className="text-2xl font-semibold tabular-nums text-emerald-950">{item.count}</p><p className="text-xs font-medium text-slate-600">{item.label}</p></div>)}</section>
        {periods.length > 0 && <section className="rounded-2xl border border-emerald-100 bg-white p-5"><div className="mb-4 flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-emerald-700" /><h3 className="font-semibold text-emerald-950">Trayectoria registrada</h3></div><div className="flex flex-wrap gap-2">{periods.map(([period, count]) => <span key={period} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">{period} · {count} {count === 1 ? 'materia' : 'materias'}</span>)}</div></section>}
        <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 p-5"><div><h3 className="font-semibold text-emerald-950">Mapa de materias</h3><p className="mt-1 text-xs text-slate-500">Orden curricular del archivo · clave oficial como referencia</p></div><div className="flex flex-wrap gap-2"><select value={courseStatus} onChange={event => setCourseStatus(event.target.value as typeof courseStatus)} className="h-9 rounded-lg border border-emerald-200 bg-white px-3 text-xs text-emerald-950"><option value="all">Todos los estados</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Input value={courseQuery} onChange={event => setCourseQuery(event.target.value)} placeholder="Buscar materia" className="h-9 w-40 text-xs" /></div></div><div className="max-h-[38rem] divide-y divide-emerald-50 overflow-y-auto">{courses.map(course => <div key={course.key} className="grid gap-3 px-5 py-3.5 transition-colors hover:bg-emerald-50/40 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center"><span className="text-xs font-bold tabular-nums text-emerald-600">{String(course.order).padStart(2, '0')}</span><div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{course.name}</p><p className="mt-1 text-xs text-slate-500">{course.key}{course.optative ? ` · Optativa: ${course.optative}` : ''}{course.period ? ` · ${course.period}` : ''}{course.attempts > 1 ? ` · ${course.attempts} registros consolidados` : ''}</p>{course.prerequisites && <p className="mt-1 text-xs text-amber-800">Prerrequisitos: {course.prerequisites}</p>}</div><div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle[course.status]}`}>{statusLabel[course.status]}</span>{course.grade && course.grade !== 'CU' && <strong className="min-w-7 text-right text-sm tabular-nums text-emerald-950">{course.grade}</strong>}</div></div>)}{courses.length === 0 && <p className="p-6 text-sm text-slate-500">No hay materias con este filtro.</p>}</div></section>
        <p className="text-xs leading-5 text-slate-500">Lectura provisional: CU se muestra como “en curso”; confirma ese código con el criterio institucional. Las materias sin calificación ni periodo se muestran como pendientes. “Créditos” no se suma porque el archivo lo repite por alumno, no por materia.</p>
      </div>}
    </div>}
  </main>;
}
