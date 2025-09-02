
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { RiskFocusChart } from './RiskFocusChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { AlertCircle, BarChart2, BellRing, Users, UserX, UserCheck, Loader2, ArrowRightCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { calculateKpis, findLostCases, findUrgentCases } from '@/lib/dataProcessor';
import { useDashboardFilters } from './DashboardClient';
import type { Student } from '@/types/student';

// Componente para mostrar listas de alumnos (Casos Urgentes / Perdidos)
function StudentCaseList({ title, description, students, icon: Icon, color, onStudentClick }: { title: string, description: string, students: Student[], icon: React.ElementType, color?: "red" | "yellow" | "blue", onStudentClick: (studentId: string) => void }) {
    if (students.length === 0) return null;

    const colorClasses = {
        red: "text-red-600 dark:text-red-400",
        yellow: "text-yellow-600 dark:text-yellow-400",
        blue: "text-blue-600 dark:text-blue-400",
      };

    return (
        <Card>
            <CardHeader>
                <div className='flex items-center gap-3'>
                     <Icon className={`h-6 w-6 ${color ? colorClasses[color] : 'text-primary'}`} />
                    <CardTitle>{title} ({students.length})</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {students.map(student => (
                    <Button 
                        key={student.id} 
                        variant="ghost" 
                        className="w-full justify-between"
                        onClick={() => onStudentClick(student.id)}
                    >
                        <span>{student.name}</span>
                        <ArrowRightCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}

export function Dashboard() {
  const { filteredStudents, isLoading, hasData, setActiveView, setSelectedStudentId } = useDashboardFilters();

  const { kpis, lostCases, urgentCases } = useMemo(() => {
    if (isLoading || !hasData) {
        return { 
            kpis: { criticalRiskCount: 0, observationCount: 0, totalStudents: 0 },
            lostCases: [],
            urgentCases: []
        };
    }
    const kpiResults = calculateKpis(filteredStudents);
    const lc = findLostCases(filteredStudents);
    const lostCaseIds = new Set(lc.map(s => s.id));
    const uc = findUrgentCases(filteredStudents, lostCaseIds);

    return {
      kpis: { ...kpiResults, totalStudents: filteredStudents.length },
      lostCases: lc,
      urgentCases: uc,
    };
  }, [filteredStudents, isLoading, hasData]);

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveView('history');
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Progreso Estudiantil</h1>
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
                <KpiCard title="Casos Perdidos" value={lostCases.length} icon={UserX} color="red" />
                <KpiCard title="Casos Urgentes" value={urgentCases.length} icon={BellRing} color="yellow" />
                <KpiCard title="Alumnos en Observación" value={kpis.observationCount} icon={Users} color="blue" />
                <KpiCard title="Total de Alumnos" value={kpis.totalStudents} icon={UserCheck} />
            </div>

            {filteredStudents.length > 0 ? (
                <div className="space-y-8">
                    <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                        <RiskFocusChart students={filteredStudents} />
                        <RiskDistributionChart students={filteredStudents} />
                    </div>
                     <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                        <StudentCaseList 
                            title="Casos Perdidos"
                            description="Alumnos que han reprobado por superar el límite de faltas o tareas no entregadas."
                            students={lostCases}
                            icon={UserX}
                            color="red"
                            onStudentClick={handleStudentClick}
                        />
                         <StudentCaseList 
                            title="Casos Urgentes"
                            description="Alumnos con 2 o más materias en riesgo crítico que aún no son casos perdidos."
                            students={urgentCases}
                            icon={BellRing}
                            color="yellow"
                            onStudentClick={handleStudentClick}
                        />
                    </div>
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
