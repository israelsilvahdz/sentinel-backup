"use client";
import { useDashboardFilters, type ActiveView } from './DashboardClient';
import { ArrowUpRight, Users, BookOpen, Activity, LayoutDashboard, TrendingUp, BarChart3, CalendarDays, SlidersHorizontal, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
const modules: {view: ActiveView; title: string; description: string}[] = [
{view:'dashboard',title:'Resumen académico',description:'Riesgo por faltas, actividades y desempeño.'},
{view:'change-stats',title:'Análisis de cambios',description:'Compara monitoreos e identifica cambios.'},
{view:'students',title:'Panel de alumnos',description:'Consulta materias, seguimiento y reportes individuales.'},
{view:'academic-performance',title:'Desempeño y seguimiento',description:'Consulta promedios, SC y riesgo por materia.'},
{view:'professor-schedule',title:'Horarios de profesores',description:'Consulta los horarios registrados en el monitoreo.'},
{view:'weighting-schemes',title:'Gestor de ponderaciones',description:'Configura los pesos de las actividades.'},
{view:'unclassified',title:'Materias sin clasificar',description:'Asigna esquemas a las materias pendientes.'},
];
export function WelcomeDashboard() {
 const {setActiveView,allStudents}=useDashboardFilters();
 const subjectCount = new Set(allStudents.flatMap(student => (student.subjectSummaries || []).map(subject => subject.name))).size;
 return <main className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">
 <header className="relative overflow-hidden rounded-2xl border border-[#00483f] bg-[#00534c] text-white">
   <div className="grid lg:grid-cols-[1.5fr_1fr]">
     <div className="p-6 md:p-8">
       <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70"><span className="h-2 w-2 rounded-full bg-[#ff8834]" /> Prepa Tecmilenio · Sentinel</div>
       <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">Tu día, en perspectiva.</h1>
       <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75">Consulta el desempeño, identifica riesgos y registra el seguimiento de tus alumnos.</p>
       <Button onClick={()=>setActiveView('dashboard')} className="mt-6 h-10 rounded-lg bg-white px-5 text-primary hover:bg-white/90">Ver resumen académico <ArrowUpRight className="ml-3 h-4 w-4" /></Button>
     </div>
     <div className="relative flex flex-col justify-between overflow-hidden bg-[#f1f6f2] p-7 md:p-10">
       <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[32px] border-[#ff8834]/15" />
       <p className="relative text-xs font-bold uppercase tracking-[0.16em] text-[#00534c]">Monitoreo actual</p>
       <div className="relative mt-5 grid grid-cols-2 gap-5">
         <div><Users className="mb-3 h-5 w-5 text-[#00534c]" /><p className="text-4xl font-semibold tracking-tight text-[#00534c]">{allStudents.length}</p><p className="mt-1 text-sm text-[#52645f]">Alumnos</p></div>
         <div><BookOpen className="mb-3 h-5 w-5 text-[#00534c]" /><p className="text-4xl font-semibold tracking-tight text-[#00534c]">{subjectCount}</p><p className="mt-1 text-sm text-[#52645f]">Materias</p></div>
       </div>
       <p className="relative mt-7 border-t border-[#00534c]/10 pt-4 text-xs leading-relaxed text-[#52645f]">{allStudents.length ? 'Información del monitoreo cargado.' : 'Carga un monitoreo en la barra superior para comenzar.'}</p>
     </div>
   </div>
 </header>
 <section>
   <div className="mb-4 flex items-center gap-3"><span className="h-6 w-1 rounded-full bg-[#ff8834]" /><h2 className="text-xl font-semibold tracking-tight text-[#004f48]">¿Qué quieres revisar?</h2></div>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{modules.map((module,index)=><button key={module.view} className="group rounded-2xl border border-[#e1e8e2] bg-white p-5 text-left transition-colors hover:border-[#00534c]/40 hover:bg-[#fbfdfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8834]" onClick={()=>setActiveView(module.view)}><div className="mb-3 flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f5ef] text-[#00534c]">{(() => { const Icon = [LayoutDashboard,TrendingUp,Users,BarChart3,CalendarDays,SlidersHorizontal,CircleHelp][index]; return <Icon className="h-4 w-4" />; })()}</span><ArrowUpRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#00534c]" /></div><h3 className="text-base font-semibold text-[#163e36]">{module.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{module.description}</p></button>)}</div>
 </section>
 <footer className="flex items-center gap-2 border-t border-[#e1e8e2] pt-5 text-xs text-slate-500"><Activity className="h-4 w-4 text-[#ff8834]" /> Sentinel · Acompañamiento académico</footer>
 </main>;
}
