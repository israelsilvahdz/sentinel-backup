"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { RiskMatrixChart } from './RiskMatrixChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { StudentCard } from './StudentCard';
import { AlertCircle, BarChart2, BellRing, Users } from 'lucide-react';

import type { Student } from '@/types/student';
import { calculateKpis } from '@/lib/dataProcessor';
import { useDashboardFilters } from './DashboardLayout';

export function Dashboard() {
  const { filteredStudents, changes, isLoading, hasData } = useDashboardFilters();

  const kpis = useMemo(() => {
    if (filteredStudents.length === 0) return { criticalRiskCount: 0, observationCount: 0, totalChanges: 0 };
    const { criticalRiskCount, observationCount } = calculateKpis(filteredStudents);
    const studentIds = new Set(filteredStudents.map(s => s.id));
    const totalChanges = changes.filter(c => studentIds.has(c.studentId)).length;
    return { criticalRiskCount, observationCount, totalChanges };
  }, [filteredStudents, changes]);

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
                Sube un reporte diario en formato Excel para ver el panel de control y las alertas de tus alumnos.
                </p>
            </CardContent>
         </Card>
      )}

      {!isLoading && hasData && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard title="Alumnos en Riesgo Crítico" value={kpis.criticalRiskCount} icon={BellRing} color="red" />
            <KpiCard title="Alumnos en Observación" value={kpis.observationCount} icon={Users} color="yellow" />
            <KpiCard title="Total de Cambios Hoy" value={kpis.totalChanges} icon={BarChart2} color="blue" />
          </div>

          {filteredStudents.length > 0 ? (
            <>
              <div className="grid gap-8 md:grid-cols-2">
                <RiskMatrixChart students={filteredStudents} />
                <RiskDistributionChart students={filteredStudents} />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Panel de Alertas y Cambios</h2>
                <div className="space-y-6">
                    {filteredStudents.map(student => (
                        <StudentCard 
                            key={student.id} 
                            student={student} 
                            changes={changes.filter(c => c.studentId === student.id)}
                        />
                    ))}
                </div>
              </div>
            </>
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
                      No se encontraron alumnos con los filtros seleccionados. Intenta con otros valores.
                    </p>
                </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
