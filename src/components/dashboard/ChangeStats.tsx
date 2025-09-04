
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDashboardFilters } from './DashboardClient';
import { KpiCard } from './KpiCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle, AlertTriangle, BookOpenCheck, User, Users, FileText } from 'lucide-react';
import { type Change } from '@/types/student';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold text-base">{label}</p>
          {payload.map((entry: any, index: number) => (
             <p key={`item-${index}`} style={{ color: entry.fill }} className="text-sm">
                {entry.name}: {entry.value}
             </p>
          ))}
        </div>
      );
    }
    return null;
};

export function ChangeStats() {
    const { studentHistory, allStudents, isLoading, hasData, setActiveView, setCaseType } = useDashboardFilters();

    const { totalChanges, studentsWithChanges, changesByLeader, changesByTutor, changesBySubject } = useMemo(() => {
        if (isLoading || Object.keys(studentHistory).length === 0) {
            return {
                totalChanges: 0,
                studentsWithChanges: 0,
                changesByLeader: [],
                changesByTutor: [],
                changesBySubject: [],
            };
        }

        const allChanges: Change[] = Object.values(studentHistory).flat();
        const studentsWithChangesSet = new Set(allChanges.map(c => c.studentId));

        const leaderCounts: Record<string, { absences: number, missedAssignments: number }> = {};
        const tutorCounts: Record<string, { absences: number, missedAssignments: number }> = {};
        const subjectCounts: Record<string, { absences: number, missedAssignments: number }> = {};

        for (const change of allChanges) {
            const student = allStudents.find(s => s.id === change.studentId);
            if (!student) continue;

            const subject = student.subjects?.find(s => s.id === change.subjectId);
            const subjectName = subject?.name || 'Desconocida';

            // By Leader
            if (!leaderCounts[student.leader]) leaderCounts[student.leader] = { absences: 0, missedAssignments: 0 };
            leaderCounts[student.leader][change.fieldName]++;
            
            // By Tutor
            if (!tutorCounts[student.tutor]) tutorCounts[student.tutor] = { absences: 0, missedAssignments: 0 };
            tutorCounts[student.tutor][change.fieldName]++;
            
            // By Subject
            if (!subjectCounts[subjectName]) subjectCounts[subjectName] = { absences: 0, missedAssignments: 0 };
            subjectCounts[subjectName][change.fieldName]++;
        }

        const formatChartData = (data: Record<string, any>) => Object.entries(data).map(([name, counts]) => ({ name, Faltas: counts.absences, 'Tareas (NE)': counts.missedAssignments })).sort((a,b) => (b.Faltas + b['Tareas (NE)']) - (a.Faltas + a['Tareas (NE)'])).slice(0, 10);

        return {
            totalChanges: allChanges.length,
            studentsWithChanges: studentsWithChangesSet.size,
            changesByLeader: formatChartData(leaderCounts),
            changesByTutor: formatChartData(tutorCounts),
            changesBySubject: formatChartData(subjectCounts),
        };

    }, [studentHistory, allStudents, isLoading]);

    const handleCaseClick = (caseType: 'changes') => {
        setCaseType(caseType);
        setActiveView('students');
    };

    if (!hasData) {
        return (
             <Card className="text-center p-12 mt-16 m-8">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                        <AlertCircle className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>Sin Datos para Comparar</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Carga un reporte anterior y uno actual para generar y visualizar el análisis de cambios.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
     if (totalChanges === 0 && hasData && !isLoading) {
        return (
             <Card className="text-center p-12 mt-16 m-8">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                        <AlertCircle className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>No se Encontraron Cambios</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        No se detectaron nuevas faltas o tareas no entregadas entre los dos reportes cargados.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Análisis de Cambios</h1>
                <p className="text-muted-foreground">Estadísticas sobre los cambios detectados entre los dos reportes cargados.</p>
            </header>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Total de Cambios" value={totalChanges} icon={AlertTriangle} color="yellow" />
                <KpiCard title="Alumnos con Cambios" value={studentsWithChanges} icon={Users} color="blue" onClick={() => handleCaseClick('changes')} />
                <KpiCard title="Materia con más Faltas" value={changesBySubject[0]?.name || 'N/A'} icon={AlertTriangle} />
                <KpiCard title="Materia con más Tareas (NE)" value={changesBySubject.sort((a,b) => b['Tareas (NE)'] - a['Tareas (NE)'])[0]?.name || 'N/A'} icon={BookOpenCheck} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Cambios por Líder de Campus</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={changesByLeader} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }}/>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="Faltas" stackId="a" fill="hsl(var(--chart-4))" />
                                <Bar dataKey="Tareas (NE)" stackId="a" fill="hsl(var(--chart-3))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Cambios por Tutor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={changesByTutor} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="Faltas" stackId="a" fill="hsl(var(--chart-4))" />
                                <Bar dataKey="Tareas (NE)" stackId="a" fill="hsl(var(--chart-3))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

