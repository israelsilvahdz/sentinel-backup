
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RiskFocusChart } from './RiskFocusChart';
import { RiskDistributionChart } from './RiskDistributionChart';
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
  ArrowRight,
  TrendingDown,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { 
  findUrgentCases, 
  findObservationCases, 
  findExtraordinaryCases, 
  findIncompleteGradeCases, 
  findRiskCasesBySubject, 
  findSDAbsencesCases, 
  findSDAssignmentsCases, 
  findAtLimitAbsencesCases, 
  findAtLimitAssignmentsCases,
  findPotentialRiskCases
} from '@/lib/dataProcessor';
import { useDashboardFilters } from './DashboardClient';
import { cn } from '@/lib/utils';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold text-base">{label}</p>
          <p className="text-sm" style={{ color: payload[0].fill }}>
            Actividades SC: {data.value}
          </p>
        </div>
      );
    }
    return null;
};

interface DashboardKpiProps {
  title: string;
  value: number;
  description: string;
  color: 'red' | 'orange' | 'blue' | 'emerald';
  icon: any;
  onClick: () => void;
}

function ModernKpiCard({ title, value, description, color, icon: Icon, onClick }: DashboardKpiProps) {
  const colorStyles = {
    red: "border-l-red-500 bg-red-50/50 hover:bg-red-50 text-red-600",
    orange: "border-l-orange-500 bg-orange-50/50 hover:bg-orange-50 text-orange-600",
    blue: "border-l-blue-500 bg-blue-50/50 hover:bg-blue-50 text-blue-600",
    emerald: "border-l-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-600",
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
            lowPotentialCases: [], veryLowPotentialCases: []
        };
    }
    const studentSource = filteredStudents.length > 0 ? filteredStudents : allStudents;
    
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

    const professorPendingActivities = new Map<string, Set<string>>();
    studentSource.forEach(student => {
        student.subjects?.forEach(subject => {
            if (!subject.professorName) return;
            for (const activityKey in subject.activities) {
                if (subject.activities[activityKey] === 'SC') {
                    if (!professorPendingActivities.has(subject.professorName)) {
                        professorPendingActivities.set(subject.professorName, new Set());
                    }
                    const uniqueActivityIdentifier = `${subject.professorName}-${subject.name}-${activityKey}`;
                    professorPendingActivities.get(subject.professorName)!.add(uniqueActivityIdentifier);
                }
            }
        });
    });
    
    const professorChartData = Array.from(professorPendingActivities.entries())
        .map(([name, activities]) => ({ name, value: activities.size }))
        .filter(item => item.value > 0)
        .sort((a,b) => b.value - a.value)
        .slice(0,10);

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
      scByProfessor: professorChartData,
      lowPotentialCases: lowPotential,
      veryLowPotentialCases: veryLowPotential
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

  const handleProfessorClick = (professorName: string) => {
    setCaseType(null);
    setFilterType('professor');
    setSelectedValue(professorName);
    setActiveView('students');
  };

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
                <h1 className="text-3xl font-black tracking-tight">Progreso Estudiantil</h1>
                <p className="text-emerald-50/70 text-sm mt-1">Análisis profundo de riesgos, asistencia y actividades académicas.</p>
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
              <Target className="h-4 w-4" />
              <h2 className="text-sm font-bold uppercase tracking-widest">Alertas de Estado (Sin Derecho y Límites)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ModernKpiCard 
                  title="SD por Faltas" 
                  value={metrics.sdAbsencesCases.length} 
                  description="Alumnos que perdieron derecho." 
                  color="red" 
                  icon={UserX} 
                  onClick={() => handleCaseClick('sd-absences')} 
                />
                <ModernKpiCard 
                  title="SD por Tareas (NE)" 
                  value={metrics.sdAssignmentsCases.length} 
                  description="Alumnos sin derecho por NE." 
                  color="red" 
                  icon={UserX} 
                  onClick={() => handleCaseClick('sd-assignments')} 
                />
                <ModernKpiCard 
                  title="Al Límite - Faltas" 
                  value={metrics.atLimitAbsencesCases.length} 
                  description="A una falta de perder derecho." 
                  color="orange" 
                  icon={AlertTriangle} 
                  onClick={() => handleCaseClick('at-limit-absences')} 
                />
                <ModernKpiCard 
                  title="Al Límite - NE" 
                  value={metrics.atLimitAssignmentsCases.length} 
                  description="A una tarea de perder derecho." 
                  color="orange" 
                  icon={AlertTriangle} 
                  onClick={() => handleCaseClick('at-limit-assignments')} 
                />
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="flex items-center gap-2 px-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <h2 className="text-sm font-bold uppercase tracking-widest">Focos de Atención</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <SubModuleCard 
                  title="Potencial < 70"
                  description="Incluso con 100 en lo restante, no aprueban."
                  icon={TrendingDown}
                  color="bg-red-600"
                  value={metrics.lowPotentialCases.length}
                  onClick={() => handleCaseClick('low-potential')}
                />
                <SubModuleCard 
                  title="Potencial < 50"
                  description="Sin derecho ni a extraordinario."
                  icon={XCircle}
                  color="bg-black"
                  value={metrics.veryLowPotentialCases.length}
                  onClick={() => handleCaseClick('very-low-potential')}
                />
                <SubModuleCard 
                  title="Casos Críticos"
                  description="Riesgo alto en una o más materias."
                  icon={BellRing}
                  color="bg-red-500"
                  value={metrics.urgentCases.length}
                  onClick={() => handleCaseClick('urgent')}
                />
                <SubModuleCard 
                  title="En Observación"
                  description="Alumnos con riesgo preventivo."
                  icon={Users}
                  color="bg-blue-500"
                  value={metrics.observationCases.length}
                  onClick={() => handleCaseClick('observation')}
                />
                <SubModuleCard 
                  title="Incompletos (SC)"
                  description="Actividades sin calificar registradas."
                  icon={FileText}
                  color="bg-emerald-500"
                  value={metrics.incompleteGradeCases.length}
                  onClick={() => handleCaseClick('incompleteGrade')}
                />
              </div>
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-xs font-bold text-muted-foreground uppercase px-2">Riesgo en Materias Online (NE)</h3>
                <SubModuleCard 
                  title="El Mundo Contemporáneo"
                  description="Alumnos con tareas pendientes."
                  icon={BookX}
                  color="bg-amber-500"
                  value={metrics.onlineRiskMundo.length}
                  onClick={() => handleSubjectRiskClick('El mundo contemporáneo')}
                />
                <SubModuleCard 
                  title="Ciencias de la Vida"
                  description="Alumnos con tareas pendientes."
                  icon={BookX}
                  color="bg-amber-500"
                  value={metrics.onlineRiskVida.length}
                  onClick={() => handleSubjectRiskClick('Ciencias de la Vida')}
                />
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center gap-2 px-2 text-muted-foreground">
                <Zap className="h-4 w-4" />
                <h2 className="text-sm font-bold uppercase tracking-widest">Analíticos Visuales</h2>
              </div>
              <div className="grid gap-8">
                <RiskDistributionChart students={filteredStudents.length > 0 ? filteredStudents : allStudents} />
                <RiskFocusChart students={filteredStudents.length > 0 ? filteredStudents : allStudents} />
              </div>
            </div>
          </section>

          <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-emerald-900">
                    <UserSquare className="h-6 w-6 text-primary" />
                    Top 10 Profesores con Actividades 'SC'
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Actividades únicas sin calificar por materia. Haz clic en una barra para ver detalles.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.scByProfessor} layout="vertical" margin={{ left: 150, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                        <XAxis type="number" allowDecimals={false} hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150} 
                          tick={{ fontSize: 11, fontWeight: 'bold' }} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                        <Bar 
                          dataKey="value" 
                          name="Actividades SC" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 10, 10, 0]}
                          onClick={(data) => handleProfessorClick(data.name)} 
                          className="cursor-pointer"
                          barSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
