"use client";
import React, { useMemo } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Change, type Student, type SubjectSummary } from '@/types/student';
import { differenceInDays, addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Projection {
    studentId: string;
    studentName: string;
    subjectName: string;
    riskType: 'Faltas' | 'NE';
    currentValue: number;
    limit: number;
    velocity: number; // units per day
    projectedDate: Date;
    daysUntilLimit: number;
    changeCount: number;
}

const calculateProjections = (students: Student[], history: Record<string, Change[]>): Projection[] => {
    const projections: Projection[] = [];
    const today = new Date();

    for (const student of students) {
        if (!student.subjectSummaries) continue;

        for (const subject of student.subjectSummaries) {
            const studentChanges = history[student.id] || [];

            const processRiskType = (
                riskType: 'absences' | 'missedAssignments',
                displayType: 'Faltas' | 'NE',
                currentValue: number,
                limit: number
            ) => {
                if (limit <= 0 || currentValue >= limit) return;

                const relevantChanges = studentChanges
                    .filter(c => c.subjectId === subject.id && c.fieldName === riskType && (c.newValue as number) > (c.oldValue as number))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (relevantChanges.length < 2) return;

                const firstChange = relevantChanges[0];
                const lastChange = relevantChanges[relevantChanges.length - 1];

                const firstDate = new Date(firstChange.date);
                const lastDate = new Date(lastChange.date);

                const daysDiff = differenceInDays(lastDate, firstDate);
                if (daysDiff < 7) return; // Need at least a week of data for a meaningful trend

                const valueDiff = (lastChange.newValue as number) - (firstChange.oldValue as number);
                if (valueDiff <= 0) return;

                const velocity = valueDiff / daysDiff; // items per day

                const remainingValue = limit - currentValue;
                const daysUntilLimit = Math.ceil(remainingValue / velocity);

                if (daysUntilLimit > 0 && daysUntilLimit <= 180) { // Only project up to 6 months
                    const projectedDate = addDays(today, daysUntilLimit);
                    projections.push({
                        studentId: student.id,
                        studentName: student.name,
                        subjectName: subject.name,
                        riskType: displayType,
                        currentValue,
                        limit,
                        velocity,
                        projectedDate,
                        daysUntilLimit,
                        changeCount: relevantChanges.length,
                    });
                }
            };

            processRiskType('absences', 'Faltas', subject.absences, subject.absenceLimit);
            processRiskType('missedAssignments', 'NE', subject.missedAssignments, subject.missedAssignmentLimit);
        }
    }

    return projections.sort((a, b) => a.daysUntilLimit - b.daysUntilLimit);
};

export function ProjectionsPanel() {
    const { allStudents, studentHistory, isLoading } = useDashboardFilters();

    const projections = useMemo(() => {
        if (isLoading || allStudents.length === 0 || Object.keys(studentHistory).length === 0) {
            return [];
        }
        return calculateProjections(allStudents, studentHistory);
    }, [allStudents, studentHistory, isLoading]);
    
    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Proyecciones de Riesgo</h1>
                <p className="text-muted-foreground">
                    Analiza tendencias históricas para predecir qué alumnos podrían alcanzar el límite de faltas o NE.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Alumnos en Trayectoria de Riesgo</CardTitle>
                    <CardDescription>
                        Esta tabla muestra a los alumnos cuya tendencia de acumulación de faltas/NE los pone en riesgo. Se requiere un mínimo de 2 cambios registrados en un período de 7 días para generar una proyección.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {projections.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Alumno</TableHead>
                                    <TableHead>Materia</TableHead>
                                    <TableHead>Riesgo Actual</TableHead>
                                    <TableHead>Tendencia (eventos/semana)</TableHead>
                                    <TableHead>Puntos de Datos</TableHead>
                                    <TableHead className="text-right">Fecha de Riesgo Proyectada</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projections.map((p, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{p.studentName}<br/><span className="text-xs text-muted-foreground">{p.studentId}</span></TableCell>
                                        <TableCell>{p.subjectName}</TableCell>
                                        <TableCell>
                                            <Badge variant={p.riskType === 'Faltas' ? 'secondary' : 'destructive'}>{p.riskType}</Badge>
                                            <span className="ml-2 font-mono text-sm">{p.currentValue}/{p.limit}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                <span>{(p.velocity * 7).toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{p.changeCount}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {format(p.projectedDate, "d 'de' LLLL, yyyy", { locale: es })}
                                            <br/>
                                            <span className="text-xs font-normal text-muted-foreground">(en {p.daysUntilLimit} días)</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12">
                           <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                           <h3 className="mt-4 text-lg font-medium">No hay proyecciones de riesgo</h3>
                           <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                             No se encontraron proyecciones. Se requiere un mínimo de 2 cambios en 7 días para cada materia. Sigue usando el "Análisis de Cambios" para acumular más datos históricos.
                           </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
