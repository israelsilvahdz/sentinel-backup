
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  BellRing, 
  Users, 
  UserX, 
  Loader2, 
  BookX, 
  UserSquare, 
  FileText, 
  AlertTriangle,
  Zap,
  TrendingUp,
  Target,
  TrendingDown,
  XCircle,
  Percent,
  BrainCircuit,
  Calculator,
  Flame,
  ArrowUpRight
} from 'lucide-react';

import { 
  findUrgentCases, 
  findObservationCases, 
  findIncompleteGradeCases, 
  findRiskCasesBySubject, 
  findSDAbsencesCases, 
  findSDAssignmentsCases, 
  findAtLimitAbsencesCases, 
  findAtLimitAssignmentsCases,
  findPotentialRiskCases,
  findPotentialRangeCases,
  findRequiredScoreRangeCases,
  calculateRequiredScore
} from '@/lib/dataProcessor';
import { useDashboardFilters } from './DashboardClient';
import { cn } from '@/lib/utils';

interface DashboardKpiProps {
  title: string;
  value: number;
  description: string;
  color: 'red' | 'orange' | 'blue' | 'emerald' | 'purple' | 'black';
  icon: any;
  onClick: () => void;
}

function ModernKpiCard({ title, value, description, color, icon: Icon, onClick }: DashboardKpiProps) {
  const colorStyles = {
    red: "border-l-red-500 bg-red-50/50 hover:bg-red-50 text-red-600",
    orange: "border-l-orange-500 bg-orange-50/50 hover:bg-orange-50 text-orange-600",
    blue: "border-l-blue-500 bg-blue-50/50 hover:bg-blue-50 text-blue-600",
    emerald: "border-l-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-600",
    purple: "border-l-purple-500 bg-purple-50/50 hover:bg-purple-50 text-purple-600",
    black: "border-l-slate-900 bg-slate-900/5 hover:bg-slate-900/10 text-slate-900",
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 border-none border-l-4 shadow-sm hover:shadow-md hover:-translate-y-1",
        colorStyles[color]
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 p-4">
        <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{title}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-black">{value}</div>
            <p className="text-[10px] opacity-60 italic mt-1">{description}</p>
          </div>
          <Icon className="h-8 w-8 opacity-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function SubModuleCard({ title, description, icon: Icon, color, value, onClick }: any) {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-none bg-white/50 backdrop-blur-sm"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110", color)}>
          <Icon className="text-white h-5 w-5" />
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{description}</p>
          </div>
          <div className="text-xl font-black text-primary/40 group-hover:text-primary transition-colors">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { filteredStudents, allStudents, isLoading, hasData, setActiveView, setCaseType, setFilterType, setSelectedValue, weightingSchemes } = useDashboardFilters();

  const metrics = useMemo(() => {
    if (isLoading || !hasData) {
        return { 
            urgentCases: [], atLimitAbsencesCases: [], atLimitAssignmentsCases: [], 
            incompleteGradeCases: [], sdAbsencesCases: [], sdAssignmentsCases: [],
            onlineRiskMundo: [], onlineRiskVida: [], scByProfessor: [], observationCases: [],
            lowPotentialCases: [], veryLowPotentialCases: [],
            pot7075: [], pot7680: [], pot8185: [],
            req100: [], req90: [], req80: [], req70: []
        };
    }
    const studentSource = filteredStudents.length > 0 ? filteredStudents : allStudents;
    
    // Potencial ranges
    const pot7075 = findPotentialRangeCases(studentSource, weightingSchemes, 70, 75.99);
    const pot7680 = findPotentialRangeCases(studentSource, weightingSchemes, 76, 80.99);
    const pot8185 = findPotentialRangeCases(studentSource, weightingSchemes, 81, 85.99);

    // Effort Required
    const req100 = findRequiredScoreRangeCases(studentSource, weightingSchemes, 100, Infinity);
    const req90 = findRequiredScoreRangeCases(studentSource, weightingSchemes, 90, 99.99);
    const req80 = findRequiredScoreRangeCases(studentSource, weightingSchemes, 80, 89.99);
    const req70 = findRequiredScoreRangeCases(studentSource, weightingSchemes, 70, 79.99);

    const sdAbsences = findSDAbsencesCases(studentSource);
    const sdAssignments = findSDAssignmentsCases(studentSource);
    const sdIds = new Set([...sdAbsences.map(s => s.id), ...sdAssignments.map(s => s.id)]);

    const atLimitAbsences = findAtLimitAbsencesCases(studentSource).filter(s => !sdIds.has(s.id));
    const atLimitAssignments = findAtLimitAssignmentsCases(studentSource).filter(s => !sdIds.has(s.id));
    const atLimitIds = new Set([...atLimitAbsences.map(s => s.id), ...atLimitAssignments.map(s => s.id)]);
    
    const highRiskExclusions = new Set([...sdIds, ...atLimitIds]);
    const uc = findUrgentCases(studentSource, highRiskExclusions);
    const urgentCaseIds = new Set(uc.map(s => s.id));
    
    const observationExclusions = new Set([...highRiskExclusions, ...urgentCaseIds]);
    const oc = findObservationCases(studentSource, observationExclusions);

    const incompleteCases = findIncompleteGradeCases(studentSource);
    const riskMundo = findRiskCasesBySubject(studentSource, 'El mundo contemporáneo', 'missedAssignments');
    const riskVida = findRiskCasesBySubject(studentSource, 'Ciencias de la Vida', 'missedAssignments');
    
    const lowPotential = findPotentialRiskCases(studentSource, weightingSchemes, 70);
    const veryLowPotential = findPotentialRiskCases(studentSource, weightingSchemes, 50);

    return {
      urgentCases: uc,
      observationCases: oc,
      atLimitAbsencesCases: atLimitAbsences,
      atLimitAssignmentsCases: atLimitAssignments,
      incompleteGradeCases: incompleteCases,
      sdAbsencesCases: sdAbsences,
      sdAssignmentsCases: sdAssignments,
      onlineRiskMundo: riskMundo,
      onlineRiskVida: riskVida,
      lowPotentialCases: lowPotential,
      veryLowPotentialCases: veryLowPotential,
      pot7075, pot7680, pot8185,
      req100, req90, req80, req70
    };
  }, [filteredStudents, allStudents, isLoading, hasData, weightingSchemes]);

  const handleCaseClick = (caseType: any) => {
    setCaseType(caseType);
    setActiveView('students');
  };

  const handleSubjectRiskClick = (subjectName: string) => {
    setActiveView('students');
    setFilterType('subject');
    setSelectedValue(subjectName);
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {!hasData ? (
         <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-emerald-900 p-8 md:p-12 text-white shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-4xl font-extrabold tracking-tight mb-4">Inicia el Monitoreo</h1>
              <p className="text-emerald-50/80 text-lg leading-relaxed mb-8">
                Sube un reporte diario en formato Excel para poblar la base de datos y visualizar el rendimiento académico.
              </p>
            </div>
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
         </header>
      ) : (
        <>
          <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-emerald-900 p-6 md:p-8 text-white shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">
                  <Zap className="h-3 w-3" /> Resumen de Rendimiento
                </div>
                <h1 className="text-3xl font-black tracking-tight">Análisis Predictivo Académico</h1>
                <p className="text-emerald-50/70 text-sm mt-1">Identificación temprana de riesgos y esfuerzo requerido para aprobar.</p>
              </div>
              <div className="flex gap-4">
                <Button variant="secondary" className="font-bold shadow-lg" onClick={() => setActiveView('change-stats')}>
                  <TrendingUp className="mr-2 h-4 w-4" /> Ver Tendencias
                </Button>
              </div>
            </div>
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          </header>

          <section className="space-y-6">
            <div className="flex items-center gap-2 px-2 text-muted-foreground">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em]">Estados Críticos (Sin Derecho y Límites)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ModernKpiCard title="SD por Faltas" value={metrics.sdAbsencesCases.length} description="Han perdido el derecho oficial." color="red" icon={UserX} onClick={() => handleCaseClick('sd-absences')} />
                <ModernKpiCard title="SD por Tareas (NE)" value={metrics.sdAssignmentsCases.length} description="Sin derecho por falta de tareas." color="red" icon={UserX} onClick={() => handleCaseClick('sd-assignments')} />
                <ModernKpiCard title="Al Límite - Faltas" value={metrics.atLimitAbsencesCases.length} description="A una falta de perder derecho." color="orange" icon={AlertTriangle} onClick={() => handleCaseClick('at-limit-absences')} />
                <ModernKpiCard title="Al Límite - NE" value={metrics.atLimitAssignmentsCases.length} description="A una tarea de perder derecho." color="orange" icon={AlertTriangle} onClick={() => handleCaseClick('at-limit-assignments')} />
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <div className="flex items-center gap-2 px-2 text-muted-foreground">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em]">Focos de Atención</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <SubModuleCard title="Potencial < 70" description="Incluso con 100 en lo restante, no aprueban." icon={TrendingDown} color="bg-red-600" value={metrics.lowPotentialCases.length} onClick={() => handleCaseClick('low-potential')} />
                <SubModuleCard title="Potencial < 50" description="Sin derecho ni a extraordinario." icon={XCircle} color="bg-black" value={metrics.veryLowPotentialCases.length} onClick={() => handleCaseClick('very-low-potential')} />
                <SubModuleCard title="Casos Críticos (Risk %)" description="Riesgo alto en una o más materias." icon={BellRing} color="bg-orange-500" value={metrics.urgentCases.length} onClick={() => handleCaseClick('urgent')} />
                <SubModuleCard title="Incompletos (SC)" description="Actividades sin calificar detectadas." icon={FileText} color="bg-emerald-500" value={metrics.incompleteGradeCases.length} onClick={() => handleCaseClick('incompleteGrade')} />
              </div>
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-xs font-black text-muted-foreground uppercase px-2 tracking-widest">Riesgo en Materias Online (NE)</h3>
                <SubModuleCard title="El Mundo Contemporáneo" description="Alumnos con tareas pendientes." icon={BookX} color="bg-amber-500" value={metrics.onlineRiskMundo.length} onClick={() => handleSubjectRiskClick('El mundo contemporáneo')} />
                <SubModuleCard title="Ciencias de la Vida" description="Alumnos con tareas pendientes." icon={BookX} color="bg-amber-500" value={metrics.onlineRiskVida.length} onClick={() => handleSubjectRiskClick('Ciencias de la Vida')} />
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-2 text-muted-foreground">
                  <Calculator className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em]">Distribución de Potencial Preventivo</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ModernKpiCard title="Zona de Alerta (70-75)" value={metrics.pot7075.length} description="Margen mínimo de aprobación." color="red" icon={Percent} onClick={() => handleCaseClick('pot-70-75')} />
                  <ModernKpiCard title="Zona Seguimiento (76-80)" value={metrics.pot7680.length} description="Potencial estable pero vulnerable." color="orange" icon={Percent} onClick={() => handleCaseClick('pot-76-80')} />
                  <ModernKpiCard title="Zona Estable (81-85)" value={metrics.pot8185.length} description="Buen desempeño académico." color="blue" icon={Percent} onClick={() => handleCaseClick('pot-81-85')} />
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 px-2 text-muted-foreground">
                  <Flame className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em]">Nivel de Esfuerzo Requerido (Para pasar con 70)</h2>
                </div>
                <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden rounded-3xl">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium">Promedio mínimo que el alumno debe obtener en las actividades restantes para alcanzar el 70.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-red-100/50 rounded-2xl border border-red-200 group cursor-pointer transition-all hover:shadow-md" onClick={() => handleCaseClick('req-100')}>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-red-700 tracking-wider">Esfuerzo Heroico (Req. 100)</p>
                          <p className="text-xs text-red-600 font-medium opacity-70">No puede fallar en absolutamente nada.</p>
                        </div>
                        <div className="text-2xl font-black text-red-700 flex items-center gap-2">{metrics.req100.length} <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-orange-100/50 rounded-2xl border border-orange-200 group cursor-pointer transition-all hover:shadow-md" onClick={() => handleCaseClick('req-90')}>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-orange-700 tracking-wider">Esfuerzo Alto (Req. 90+)</p>
                          <p className="text-xs text-orange-600 font-medium opacity-70">Requiere excelencia en lo restante.</p>
                        </div>
                        <div className="text-2xl font-black text-orange-700 flex items-center gap-2">{metrics.req90.length} <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-yellow-100/50 rounded-2xl border border-yellow-200 group cursor-pointer transition-all hover:shadow-md" onClick={() => handleCaseClick('req-80')}>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-yellow-700 tracking-wider">Esfuerzo Notable (Req. 80+)</p>
                          <p className="text-xs text-yellow-600 font-medium opacity-70">Debe subir su promedio actual.</p>
                        </div>
                        <div className="text-2xl font-black text-yellow-700 flex items-center gap-2">{metrics.req80.length} <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-blue-100/50 rounded-2xl border border-blue-200 group cursor-pointer transition-all hover:shadow-md" onClick={() => handleCaseClick('req-70')}>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Esfuerzo Estándar (Req. 70+)</p>
                          <p className="text-xs text-blue-600 font-medium opacity-70">Basta con mantener un nivel aprobatorio.</p>
                        </div>
                        <div className="text-2xl font-black text-blue-700 flex items-center gap-2">{metrics.req70.length} <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
