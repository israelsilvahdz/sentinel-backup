'use client';

import { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays, CircleHelp, LayoutDashboard, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, Users, UserRoundCheck } from 'lucide-react';
import { getStudentOverallRisk } from '@/lib/dataProcessor';
import { useDashboardFilters, type ActiveView } from './DashboardClient';
import { ScopeSwitcher } from './ScopeSwitcher';
import { Button } from '@/components/ui/button';

const modules: { view: ActiveView; title: string; description: string; icon: typeof LayoutDashboard; category: string }[] = [
  { view: 'dashboard', title: 'Resumen académico', description: 'Prioridades, faltas y actividades pendientes.', icon: LayoutDashboard, category: 'Análisis' },
  { view: 'students', title: 'Panel de alumnos', description: 'Ficha, materias y reportes individuales.', icon: Users, category: 'Seguimiento' },
  { view: 'academic-performance', title: 'Desempeño y materias', description: 'Promedios por docente y carrera o grupo.', icon: BarChart3, category: 'Análisis' },
  { view: 'change-stats', title: 'Análisis de cambios', description: 'Qué cambió desde el monitoreo anterior.', icon: TrendingUp, category: 'Seguimiento' },
  { view: 'professor-schedule', title: 'Horarios de profesores', description: 'Clases y contactos docentes en un lugar.', icon: CalendarDays, category: 'Operación' },
  { view: 'weighting-schemes', title: 'Gestor de ponderaciones', description: 'Consulta los pesos de las actividades.', icon: SlidersHorizontal, category: 'Configuración' },
  { view: 'unclassified', title: 'Materias sin clasificar', description: 'Revisa las materias pendientes de esquema.', icon: CircleHelp, category: 'Configuración' },
];

export function WelcomeDashboard() {
  const { setActiveView, setFilterType, setSelectedValue, allStudents, scopedStudents, audience, scopeType, scopeValue } = useDashboardFilters();
  const summary = useMemo(() => {
    const subjects = new Set(scopedStudents.flatMap(student => (student.subjectSummaries || []).map(subject => subject.name)));
    const careers = new Set(scopedStudents.map(student => student.academicCodeDescription || student.academicCode).filter(Boolean));
    const atRisk = scopedStudents.filter(student => {
      const risk = getStudentOverallRisk(student, student.subjectSummaries || []);
      return risk.hasSD || risk.hasAtLimit || risk.hasHighRisk;
    }).length;
    return { subjects: subjects.size, careers: careers.size, atRisk, unassigned: scopedStudents.filter(student => !student.leader?.trim()).length };
  }, [scopedStudents]);
  const role = audience === 'professional' ? 'mentor' : scopeType === 'tutor' ? 'tutor' : 'líder';
  const stats = [
    { label: 'Alumnos', value: scopedStudents.length, detail: scopeValue ? `Cartera de ${scopeValue}` : 'Monitoreo completo', icon: Users, action: () => setActiveView('students') },
    { label: 'Materias', value: summary.subjects, detail: 'En esta vista', icon: BookOpen, action: () => setActiveView('academic-performance') },
    { label: 'En riesgo', value: summary.atRisk, detail: 'Requieren atención académica', icon: ShieldCheck, action: () => setActiveView('dashboard') },
    { label: audience === 'professional' ? 'Carreras' : 'Sin asignación', value: audience === 'professional' ? summary.careers : summary.unassigned, detail: audience === 'professional' ? 'Programas representados' : 'Alumnos sin líder', icon: audience === 'professional' ? BarChart3 : UserRoundCheck, action: () => setActiveView(audience === 'professional' ? 'academic-performance' : 'students') },
  ];

  return <main className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#053e36] text-white shadow-[0_24px_65px_-35px_rgba(0,64,51,.6)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_17%,rgba(91,215,162,.27),transparent_30%),radial-gradient(circle_at_12%_100%,rgba(28,148,112,.26),transparent_42%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[50px] border-white/5" />
      <div className="relative grid gap-7 p-6 md:p-9 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,.75fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-emerald-100"><Sparkles className="h-3.5 w-3.5" />Tecmilenio · Sentinel</div>
          <h1 className="max-w-2xl text-3xl font-semibold leading-[1.08] tracking-tight md:text-5xl">Bienvenido a tu espacio de seguimiento.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/80 md:text-base">{scopeValue ? `Estás viendo la cartera de ${scopeValue}.` : 'Elige tu cartera para comenzar con una vista enfocada.'} Consulta el avance académico y actúa sobre lo que necesita atención.</p>
          <div className="mt-7 flex flex-wrap gap-2"><Button onClick={() => setActiveView('dashboard')} className="h-11 rounded-xl bg-white px-5 font-semibold text-[#06483c] shadow-sm hover:bg-emerald-50">Abrir resumen <ArrowRight className="ml-2 h-4 w-4" /></Button><Button onClick={() => setActiveView('students')} variant="outline" className="h-11 rounded-xl border-white/25 bg-white/10 px-5 font-semibold text-white hover:bg-white/20 hover:text-white">Ver alumnos <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/95 p-5 text-emerald-950 shadow-xl shadow-black/10 backdrop-blur-md md:p-6">
          <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><UserRoundCheck className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Tu vista de trabajo</p><p className="text-xs text-slate-500">Cambia de {role} en cualquier momento</p></div></div>
          <ScopeSwitcher />
          <div className="mt-4 flex items-center justify-between border-t border-emerald-100 pt-4 text-xs"><span className="text-slate-500">Alumnos en esta vista</span><strong className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">{scopedStudents.length} de {allStudents.length}</strong></div>
        </div>
      </div>
    </section>
    <section aria-label="Estado de la cartera" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(item => <button key={item.label} type="button" onClick={item.action} className="welcome-card group flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-emerald-100 bg-white p-4 text-left shadow-[0_8px_30px_-25px_rgba(0,70,53,.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 md:p-5"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.12em] text-emerald-800">{item.label}</p><p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#06483c]">{item.value}</p><p className="mt-1 truncate text-xs text-slate-500" title={item.detail}>{item.detail}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition-colors group-hover:bg-emerald-100"><item.icon className="h-5 w-5" /></span></button>)}</section>
    <section><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">Accesos rápidos</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-emerald-950 md:text-2xl">Todo a tu alcance</h2></div><p className="text-xs text-slate-500">Tu selección de {role} se mantiene al navegar</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{modules.map(module => <button key={module.view} type="button" onClick={() => setActiveView(module.view)} className="welcome-card group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 text-left shadow-[0_8px_30px_-25px_rgba(0,70,53,.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-emerald-50/70 transition-transform duration-300 group-hover:scale-125" /><div className="relative flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-900"><module.icon className="h-5 w-5" /></span><span className="text-[10px] font-semibold uppercase tracking-[.14em] text-emerald-700/70">{module.category}</span></div><div className="relative mt-5 flex items-end justify-between gap-3"><div><h3 className="text-[15px] font-semibold text-emerald-950">{module.title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">{module.description}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-500 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div></button>)}</div></section>
    <footer className="border-t border-emerald-100 pt-4 text-xs text-emerald-800/70">Sentinel · Acompañamiento académico · {audience === 'professional' ? 'Profesional' : 'Preparatoria'}</footer>
  </main>;
}
