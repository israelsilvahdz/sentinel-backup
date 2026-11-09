'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowRight, BookOpenCheck, Search, UploadCloud, X } from 'lucide-react';
import { localWorkspace } from '@/lib/local-workspace';
import { expectedPlanCourses, kardexSemester, readKardexWorkbook, type KardexCourse, type KardexStatus, type KardexStudent } from '@/lib/kardex-progress';
import { useDashboardFilters } from './DashboardClient';
import { WorkspaceHeader } from './WorkspaceHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type SavedKardex = { name: string; students: KardexStudent[] };
const identity = (student: KardexStudent) => `${student.id}|${student.plan}`;
const statusLabel: Record<KardexStatus, string> = { accredited: 'Acreditada', inProgress: 'En curso · CU', notAccredited: 'No acreditada', pending: 'Pendiente', review: 'Revisar calificación' };
const cardTone: Record<KardexStatus, string> = {
  accredited: 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:border-emerald-500',
  inProgress: 'border-sky-300 bg-sky-50 text-sky-950 hover:border-sky-500',
  notAccredited: 'border-rose-300 bg-rose-50 text-rose-950 hover:border-rose-500',
  pending: 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300',
  review: 'border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-500',
};
const statusDot: Record<KardexStatus, string> = { accredited: 'bg-emerald-600', inProgress: 'bg-sky-500', notAccredited: 'bg-rose-500', pending: 'bg-slate-300', review: 'bg-amber-500' };
const sequence = [
  { rail: 'bg-[#087969]', soft: 'bg-[#e6f6f0]', ink: 'text-[#075d51]' },
  { rail: 'bg-[#138b75]', soft: 'bg-[#e8f7ee]', ink: 'text-[#0b6f59]' },
  { rail: 'bg-[#2d9b75]', soft: 'bg-[#eaf8ed]', ink: 'text-[#137356]' },
  { rail: 'bg-[#56a96d]', soft: 'bg-[#eef8e9]', ink: 'text-[#30734a]' },
  { rail: 'bg-[#84b85b]', soft: 'bg-[#f3f8e8]', ink: 'text-[#557438]' },
  { rail: 'bg-[#b4bb58]', soft: 'bg-[#f8f8e9]', ink: 'text-[#716d38]' },
  { rail: 'bg-[#d4a84f]', soft: 'bg-[#fbf4e6]', ink: 'text-[#8a6530]' },
  { rail: 'bg-[#e28a49]', soft: 'bg-[#fff1e7]', ink: 'text-[#9a532e]' },
];

export function KardexProgressPanel() {
  const { allStudentsMap, scopeValue, scopedStudents, audience } = useDashboardFilters();
  const [data, setData] = useState<SavedKardex | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onlyScope, setOnlyScope] = useState(false);
  const [activeCourse, setActiveCourse] = useState<KardexCourse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    localWorkspace<SavedKardex>('kardex-progress').then(saved => {
      if (live && saved?.students?.length) { setData(saved); setSelectedId(identity(saved.students[0])); }
    }).catch(() => { if (live) setError('No se pudo recuperar el Kárdex guardado en este navegador.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const students = readKardexWorkbook(XLSX.read(await file.arrayBuffer(), { type: 'array' }));
      if (!students.length) throw new Error('No se encontraron alumnos con materias en el Kárdex.');
      const next = { name: file.name, students };
      await localWorkspace('kardex-progress', next);
      setData(next); setSelectedId(identity(students[0])); setQuery('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo leer el archivo.'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  const scopeIds = useMemo(() => new Set(scopedStudents.map(student => student.id.trim().toUpperCase())), [scopedStudents]);
  const students = useMemo(() => (data?.students || []).filter(student => {
    const words = `${student.name} ${student.id} ${student.plan}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const searched = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return words.includes(searched) && (!onlyScope || scopeIds.has(student.id));
  }), [data, query, onlyScope, scopeIds]);
  const selected = students.find(student => identity(student) === selectedId) || students[0] || null;
  const current = selected ? allStudentsMap.get(selected.id) : null;
  const semesters = useMemo(() => {
    const groups: KardexCourse[][] = Array.from({ length: 8 }, () => []);
    const unplaced: KardexCourse[] = [];
    if (selected) for (const course of selected.courses) {
      const semester = kardexSemester(selected.plan, course.order);
      if (semester && semester >= 1 && semester <= 8) groups[semester - 1].push(course);
      else unplaced.push(course);
    }
    return { groups, unplaced };
  }, [selected]);
  const accredited = selected?.courses.filter(course => course.status === 'accredited').length || 0;

  return <main className="workspace-page kardex-page !max-w-none">
    <WorkspaceHeader eyebrow="Trayectoria académica" title="Malla de avance" description="Ocho semestres en secuencia. Las materias y sus calificaciones vienen del Kárdex masivo; las optativas conservan su nombre curricular." />
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/85 px-4 py-3 shadow-sm">
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">Archivo de Kárdex</p><p className="mt-1 truncate text-sm text-slate-600">{data ? `${data.name} · ${new Set(data.students.map(student => student.id)).size} alumnos` : 'Carga el Excel masivo para explorar la malla'}</p></div>
      <div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" accept=".xlsx,.xls" className="sr-only" aria-label="Seleccionar Kárdex masivo" onChange={event => void upload(event.target.files?.[0])} /><Button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="h-10 rounded-xl"><UploadCloud className="mr-2 h-4 w-4" />{busy ? 'Leyendo…' : data ? 'Actualizar Kárdex' : 'Cargar Kárdex'}</Button>{data && <Button type="button" variant="outline" onClick={async () => { await localWorkspace('kardex-progress', { name: '', students: [] }); setData(null); setSelectedId(null); }} className="h-10 rounded-xl"><X className="mr-1 h-4 w-4" />Quitar</Button>}</div>
    </section>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    {!data && !loading && <section className="rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-8 text-center shadow-sm"><BookOpenCheck className="mx-auto h-10 w-10 text-emerald-700" /><h2 className="mt-4 text-xl font-semibold text-emerald-950">Tu plan completo, de un vistazo</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Selecciona un Kárdex masivo. Se lee y conserva únicamente en este navegador.</p></section>}

    {data && <>
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="min-w-[15rem] flex-1"><label htmlFor="kardex-search" className="mb-1.5 block text-xs font-semibold text-emerald-900">Buscar alumno o plan</label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" /><Input id="kardex-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, matrícula o clave del plan" className="h-10 pl-9" /></div></div>
        <div className="min-w-[16rem] flex-[2]"><label htmlFor="kardex-student" className="mb-1.5 block text-xs font-semibold text-emerald-900">Plan seleccionado · {students.length} coincidencias</label><select id="kardex-student" value={selected ? identity(selected) : ''} onChange={event => setSelectedId(event.target.value)} className="h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950" disabled={!students.length}>{students.length ? students.map(student => <option key={identity(student)} value={identity(student)}>{student.name} · {student.plan}</option>) : <option value="">Sin coincidencias</option>}</select></div>
        {scopeValue && <label className="flex h-10 items-center gap-2 rounded-xl border border-emerald-100 px-3 text-xs font-medium text-emerald-900"><input type="checkbox" checked={onlyScope} onChange={event => setOnlyScope(event.target.checked)} className="accent-emerald-700" />Solo mi cartera de {audience === 'professional' ? 'mentor' : 'líder'}</label>}
      </section>

      {selected && <section className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-[0_18px_50px_-40px_rgba(0,67,49,.45)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 px-5 py-4 md:px-6"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-emerald-700">{selected.plan} · {selected.id}</p><h2 className="mt-1 text-lg font-semibold text-emerald-950 md:text-xl">{selected.name}</h2>{current?.academicCodeDescription && <p className="mt-0.5 text-xs text-slate-500">{current.academicCodeDescription}</p>}</div><div className="text-left md:text-right"><p className="text-sm font-semibold text-emerald-900">{accredited} materias acreditadas en el archivo</p><p className="mt-0.5 text-xs text-slate-500">{selected.courses.length} materias visibles{expectedPlanCourses(selected.plan) ? ` · ${expectedPlanCourses(selected.plan)} indicadas en el plan individual` : ''}</p></div></div>
        <div className="overflow-x-auto p-4 md:p-5"><div className="min-w-[1424px]">
          <div className="mb-3 grid grid-cols-8 gap-2.5" aria-label="Secuencia de ocho semestres">{sequence.map((tone, index) => <div key={index} className="flex items-center gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${tone.rail}`}>{index + 1}</span><span className={`h-1 flex-1 rounded-full ${tone.rail}`} />{index < 7 && <ArrowRight className={`h-3 w-3 shrink-0 ${tone.ink}`} />}</div>)}</div>
          <div className="grid grid-cols-8 items-stretch gap-2.5">{semesters.groups.map((group, index) => { const tone = sequence[index]; const approved = group.filter(course => course.status === 'accredited').length; return <div key={index} className={`min-w-0 rounded-2xl p-2 ${tone.soft}`}><div className="mb-2.5 flex h-14 items-center justify-between gap-1 rounded-xl bg-white/75 px-3 shadow-sm"><div><p className={`text-sm font-bold ${tone.ink}`}>{index + 1}° semestre</p><p className="text-[11px] text-slate-500">{group.length ? `${approved} de ${group.length} acreditadas` : 'Sin materias visibles'}</p></div><span className={`h-7 w-1 rounded-full ${tone.rail}`} /></div><div className="space-y-2">{group.map(course => <button key={course.key} type="button" onClick={() => setActiveCourse(course)} className={`group relative flex h-44 w-full flex-col overflow-hidden rounded-xl border p-3 text-left shadow-[0_5px_18px_-16px_rgba(0,55,43,.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${cardTone[course.status]}`}><span className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-bold tracking-wide">{course.key}</span><i aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${statusDot[course.status]}`} /></span><strong className="mt-3 line-clamp-4 text-[13px] leading-[1.15rem]">{course.name}</strong><span className="mt-auto flex items-center justify-between gap-2 border-t border-current/10 pt-2 text-[11px] font-semibold"><span>{statusLabel[course.status]}</span>{course.grade && course.grade !== 'CU' && <span className="rounded-md bg-white/70 px-1.5 py-0.5 tabular-nums">{course.grade}</span>}</span></button>)}{!group.length && <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/50 px-3 text-center text-xs text-slate-400">Sin datos en el archivo</div>}</div></div>; })}</div>
        </div></div>
        {semesters.unplaced.length > 0 && <div className="border-t border-amber-100 bg-amber-50/60 px-5 py-4"><p className="text-xs font-semibold text-amber-900">{semesters.unplaced.length} materias sin ubicación en la secuencia del plan</p><div className="mt-2 flex flex-wrap gap-2">{semesters.unplaced.map(course => <button key={course.key} type="button" onClick={() => setActiveCourse(course)} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-xs text-amber-950 hover:border-amber-400">{course.name}</button>)}</div></div>}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-emerald-100 bg-white px-5 py-3 text-[11px] text-slate-600">{(['accredited', 'inProgress', 'pending', 'notAccredited', 'review'] as KardexStatus[]).map(status => <span key={status} className="flex items-center gap-1.5"><i aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${statusDot[status]}`} />{statusLabel[status]}</span>)}<span className="ml-auto text-slate-500">Los colores superiores indican la secuencia; las tarjetas indican el estado.</span></div>
      </section>}
      {!selected && <p className="rounded-xl border border-emerald-100 bg-white p-5 text-sm text-slate-500">No hay alumnos con ese filtro.</p>}
      <p className="text-xs leading-5 text-slate-500">Los niveles de inglés ausentes en el Kárdex masivo no se agregan ni se califican aquí. Aparecerán cuando los incorpores al archivo. En LAE y LCI, la distribución de los semestres 7 y 8 es provisional hasta contar con un Kárdex individual completo de esas etapas.</p>
    </>}

    <Dialog open={!!activeCourse} onOpenChange={open => { if (!open) setActiveCourse(null); }}><DialogContent><DialogHeader><DialogTitle>{activeCourse?.name}</DialogTitle><DialogDescription>{activeCourse?.key} · {activeCourse ? statusLabel[activeCourse.status] : ''}</DialogDescription></DialogHeader>{activeCourse && <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-slate-500">Calificación</p><p className="mt-1 font-semibold text-emerald-950">{activeCourse.grade || 'Sin registro'}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-slate-500">Orden curricular</p><p className="mt-1 font-semibold text-emerald-950">{activeCourse.order}</p></div><div className="col-span-2 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Periodo registrado</p><p className="mt-1 font-medium text-slate-800">{activeCourse.period || 'Aún sin periodo'}</p></div>{activeCourse.prerequisites && <div className="col-span-2 rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-700">Prerrequisitos</p><p className="mt-1 font-medium text-amber-950">{activeCourse.prerequisites}</p></div>}</div>}</DialogContent></Dialog>
  </main>;
}
