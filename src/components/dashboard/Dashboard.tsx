
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { RiskFocusChart } from './RiskFocusChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { AlertCircle, BarChart2, BellRing, Users, UserX, UserCheck, Loader2, ArrowRightCircle, Award, BookX, UserCog } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { calculateKpis, findLostCases, findUrgentCases, findObservationCases, findExtraordinaryCases, findIncompleteGradeCases, findRiskCasesBySubject } from '@/lib/dataProcessor';
import { useDashboardFilters } from './DashboardClient';
import type { Student } from '@/types/student';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold text-base">{label}</p>
          <p className="text-sm" style={{ color: payload[0].fill }}>
            {data.value} alumnos
          </p>
        </div>
      );
    }
    return null;
};

export function Dashboard() {
  const { filteredStudents, allStudents, isLoading, hasData, setActiveView, setCaseType, setFilterType, setSelectedValue } = useDashboardFilters();

  const { kpis, lostCases, urgentCases, observationCases, extraordinaryCases, incompleteGradeCases, onlineRiskMundo, onlineRiskVida, scByProfessor } = useMemo(() => {
    if (isLoading || !hasData) {
        return { 
            kpis: { totalStudents: 0 },
            lostCases: [],
            urgentCases: [],
            observationCases: [],
            extraordinaryCases: [],
            incompleteGradeCases: [],
            onlineRiskMundo: [],
            onlineRiskVida: [],
            scByProfessor: [],
        };
    }
    const studentSource = filteredStudents.length > 0 ? filteredStudents : allStudents;
    
    const lc = findLostCases(studentSource);
    const lostCaseIds = new Set(lc.map(s => s.id));
    
    const uc = findUrgentCases(studentSource, lostCaseIds);
    const urgentCaseIds = new Set(uc.map(s => s.id));
    
    const combinedExclusions = new Set([...lostCaseIds, ...urgentCaseIds]);
    const oc = findObservationCases(studentSource, combinedExclusions);

    const extraCases = findExtraordinaryCases(studentSource);
    const incompleteCases = findIncompleteGradeCases(studentSource);

    const riskMundo = findRiskCasesBySubject(studentSource, 'El mundo contemporáneo', 'missedAssignments');
    const riskVida = findRiskCasesBySubject(studentSource, 'Ciencias de la Vida', 'missedAssignments');
    
    const scCounts: Record<string, number> = {};
    studentSource.forEach(student => {
        student.subjects?.forEach(subject => {
            if(subject.finalGrade === null) {
                if(!scCounts[subject.professorName]) {
                    scCounts[subject.professorName] = 0;
                }
                scCounts[subject.professorName]++;
            }
        });
    });

    const professorChartData = Object.entries(scCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
        .slice(0,10);


    return {
      kpis: { totalStudents: studentSource.length },
      lostCases: lc,
      urgentCases: uc,
      observationCases: oc,
      extraordinaryCases: extraCases,
      incompleteGradeCases: incompleteCases,
      onlineRiskMundo: riskMundo,
      onlineRiskVida: riskVida,
      scByProfessor: professorChartData
    };
  }, [filteredStudents, allStudents, isLoading, hasData]);

  const handleCaseClick = (caseType: 'lost' | 'urgent' | 'observation' | 'extraordinary' | 'incompleteGrade' | null) => {
    setCaseType(caseType);
    setActiveView('students');
  };

  const handleSubjectRiskClick = (subjectName: string) => {
    setActiveView('students');
    setFilterType('subject');
    setSelectedValue(subjectName);
  }

  const handleProfessorClick = (professorName: string) => {
    setCaseType('incompleteGrade');
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
    <div className="space-y-8 p-4 md:p-8 pt-6">
       <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Progreso Estudiantil</h1>
        <p className="text-muted-foreground">Una vista general del rendimiento y riesgo de los alumnos.</p>
      </header>
      
      {!hasData && (
         <Card className="text-center p-12 mt-16">
            <CardHeader>
                <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                    <AlertCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Comienza a monitorear</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                Sube un reporte diario en formato Excel para poblar la base de datos y ver el panel de control.
                </p>
            </CardContent>
         </Card>
      )}

      {hasData && (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Casos Perdidos" value={lostCases.length} icon={UserX} color="red" onClick={() => handleCaseClick('lost')} />
                <KpiCard title="Casos Urgentes" value={urgentCases.length} icon={BellRing} color="yellow" onClick={() => handleCaseClick('urgent')} />
                <KpiCard title="En Observación" value={observationCases.length} icon={Users} color="blue" onClick={() => handleCaseClick('observation')} />
                <KpiCard title="A Extraordinario" value={extraordinaryCases.length} icon={Award} onClick={() => handleCaseClick('extraordinary')} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Focos de Riesgo</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                     <KpiCard title="Alumnos con NE en 'El Mundo Contemporáneo'" value={onlineRiskMundo.length} icon={BookX} color="yellow" onClick={() => handleSubjectRiskClick('El mundo contemporáneo')} />
                     <KpiCard title="Alumnos con NE en 'Ciencias de la Vida'" value={onlineRiskVida.length} icon={BookX} color="yellow" onClick={() => handleSubjectRiskClick('Ciencias de la Vida')} />
                     <KpiCard title="Alumnos con Calificación Incompleta (SC)" value={incompleteGradeCases.length} icon={UserCog} color="blue" onClick={() => handleCaseClick('incompleteGrade')} />
                </CardContent>
            </Card>


            {filteredStudents.length > 0 ? (
                <div className="grid grid-cols-1 gap-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Top 10 Profesores con Alumnos SC</CardTitle>
                            <CardDescription>Profesores con más alumnos sin calificación final. Haz clic para ver los alumnos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={scByProfessor} layout="vertical" margin={{ left: 150 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} interval={0}/>
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                    <Bar dataKey="value" fill="hsl(var(--chart-5))" onClick={(data) => handleProfessorClick(data.name)} className="cursor-pointer"/>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <RiskDistributionChart students={filteredStudents} />
                    <RiskFocusChart students={filteredStudents} />
                </div>
            ) : (
            <Card className="text-center p-12">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>No hay alumnos para mostrar</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        No se encontraron alumnos con los filtros seleccionados o no se ha cargado ningún reporte.
                    </p>
                </CardContent>
            </Card>
            )}
        </>
      )}
    </div>
  );
}
