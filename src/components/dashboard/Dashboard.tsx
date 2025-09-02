
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { RiskMatrixChart } from './RiskMatrixChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { AlertCircle, BarChart2, BellRing, Users, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

import { calculateKpis } from '@/lib/dataProcessor';
import { useDashboardFilters } from './DashboardClient';
import type { Student, Subject } from '@/types/student';

// Componente Wrapper para cargar las materias necesarias para los gráficos.
function StudentSubjectsLoader({ children }: { children: (subjectsLoaded: boolean, studentsWithSubjects: Student[]) => React.ReactNode }) {
    const { filteredStudents, loadStudentSubjects } = useDashboardFilters();
    const [studentsWithSubjects, setStudentsWithSubjects] = useState<Student[]>([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

    useEffect(() => {
        const fetchSubjectsForCharts = async () => {
            if (filteredStudents.length > 0) {
                setIsLoadingSubjects(true);
                try {
                    const studentsWithSubjectsPromises = filteredStudents.map(async (student) => {
                        const subjects = await loadStudentSubjects(student.id);
                        return { ...student, subjects };
                    });
                    const results = await Promise.all(studentsWithSubjectsPromises);
                    setStudentsWithSubjects(results);
                } catch (error) {
                    console.error("Failed to load subjects for charts", error);
                    setStudentsWithSubjects([]);
                } finally {
                    setIsLoadingSubjects(false);
                }
            } else {
                setStudentsWithSubjects([]);
                setIsLoadingSubjects(false);
            }
        };

        fetchSubjectsForCharts();
    }, [filteredStudents, loadStudentSubjects]);

    if (isLoadingSubjects) {
        return (
            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-[300px]">
                           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                         <div className="flex items-center justify-center h-[300px]">
                           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    const subjectsLoaded = studentsWithSubjects.length > 0 && studentsWithSubjects.every(s => s.subjects);
    
    return <>{children(subjectsLoaded, studentsWithSubjects)}</>;
}


export function Dashboard() {
  const { filteredStudents, isLoading, hasData } = useDashboardFilters();

  const kpis = useMemo(() => {
    if (filteredStudents.length === 0) return { totalStudents: 0 };
    // Los KPIs de riesgo se calcularán dentro del loader para no duplicar lógica
    return { totalStudents: filteredStudents.length };
  }, [filteredStudents]);

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
       <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Progreso Estudiantil</h1>
        <p className="text-muted-foreground">Una vista general del rendimiento y riesgo de los alumnos.</p>
      </header>
      
      {isLoading && <p className="text-center text-muted-foreground">Cargando datos...</p>}

      {!isLoading && !hasData && (
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

      {!isLoading && hasData && (
        <StudentSubjectsLoader>
        {(subjectsLoaded, studentsWithSubjects) => {
            const riskKpis = subjectsLoaded ? calculateKpis(studentsWithSubjects) : { criticalRiskCount: 0, observationCount: 0 };
            return (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard title="Alumnos en Riesgo Crítico" value={riskKpis.criticalRiskCount} icon={BellRing} color="red" />
                <KpiCard title="Alumnos en Observación" value={riskKpis.observationCount} icon={Users} color="yellow" />
                <KpiCard title="Total de Alumnos" value={kpis.totalStudents} icon={BarChart2} color="blue" />
              </div>

              {filteredStudents.length > 0 ? (
                  <div className="grid gap-8 md:grid-cols-2">
                    <RiskMatrixChart students={studentsWithSubjects} />
                    <RiskDistributionChart students={studentsWithSubjects} />
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
            )
        }}
        </StudentSubjectsLoader>
      )}
    </div>
  );
}
