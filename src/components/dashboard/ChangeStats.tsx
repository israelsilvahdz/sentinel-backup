
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDashboardFilters } from './DashboardClient';
import { KpiCard } from './KpiCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle, AlertTriangle, BookOpenCheck, User, Users, FileText, UploadCloud, FileClock, FileCheck2, Library, BadgeAlert, FileWarning } from 'lucide-react';
import { type Change, type Student, type StudentData } from '@/types/student';
import { FileUpload } from './FileUpload';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseExcel } from '@/lib/excelParser';
import { Progress } from '../ui/progress';

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

const legendFormatter = (value: string) => {
    if (value === 'Tareas (NE)') return 'Nuevas Tareas (NE)';
    if (value === 'Faltas') return 'Nuevas Faltas';
    return value;
}

export function ChangeStats() {
    const { allStudents, hasData: hasCurrentData, studentHistory, setStudentHistory, setUploadHistory, setActiveView, setCaseType } = useDashboardFilters();
    const { toast } = useToast();

    const [previousFile, setPreviousFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const processAndCompareData = (previousData: StudentData, currentData: Student[]) => {
        const newHistory: Record<string, Change[]> = {};
        let changesCount = 0;
        
        const currentDataMap: StudentData = currentData.reduce((acc, student) => {
            acc[student.id] = student;
            return acc;
        }, {} as StudentData);


        for (const studentId in currentDataMap) {
            const currentStudent = currentDataMap[studentId];
            const previousStudent = previousData[studentId];
            
            if (!newHistory[studentId]) {
                newHistory[studentId] = [];
            }

            if (previousStudent) {
                // Compare Leader and Tutor
                if (currentStudent.leader !== previousStudent.leader) {
                newHistory[studentId].push({
                    date: new Date().toISOString(), studentId: studentId, subjectId: 'N/A',
                    fieldName: 'leader', oldValue: previousStudent.leader, newValue: currentStudent.leader
                });
                changesCount++;
                }
                if (currentStudent.tutor !== previousStudent.tutor) {
                newHistory[studentId].push({
                    date: new Date().toISOString(), studentId: studentId, subjectId: 'N/A',
                    fieldName: 'tutor', oldValue: previousStudent.tutor, newValue: currentStudent.tutor
                });
                changesCount++;
                }
                 if (currentStudent.subjects) {
                    currentStudent.subjects.forEach(currentSubject => {
                        const previousSubject = previousStudent.subjects?.find(s => s.id === currentSubject.id);

                        if (previousSubject) {
                            if (currentSubject.absences > previousSubject.absences) {
                                newHistory[studentId].push({
                                    date: new Date().toISOString(), studentId: studentId, subjectId: currentSubject.id,
                                    fieldName: 'absences', oldValue: previousSubject.absences, newValue: currentSubject.absences,
                                });
                                changesCount++;
                            }
                            if (currentSubject.missedAssignments > previousSubject.missedAssignments) {
                                newHistory[studentId].push({
                                    date: new Date().toISOString(), studentId: studentId, subjectId: currentSubject.id,
                                    fieldName: 'missedAssignments', oldValue: previousSubject.missedAssignments, newValue: currentSubject.missedAssignments,
                                });
                                changesCount++;
                            }
                            if (currentSubject.group !== previousSubject.group) {
                                newHistory[studentId].push({
                                    date: new Date().toISOString(), studentId: studentId, subjectId: currentSubject.id,
                                    fieldName: 'group', oldValue: previousSubject.group, newValue: currentSubject.group
                                });
                                changesCount++;
                            }
                        }
                    });
                }
            }
        }
        setStudentHistory(newHistory);
        return { processed: Object.keys(currentData).length, changes: changesCount };
    };
    
    useEffect(() => {
        const runComparison = async () => {
            if (!previousFile) {
                return;
            }
            if (!hasCurrentData) {
                toast({
                    variant: 'destructive',
                    title: 'Falta reporte actual',
                    description: 'Por favor, carga primero el reporte diario general en la barra superior.',
                });
                setPreviousFile(null);
                return;
            }

            setIsProcessing(true);
            setProgress(10);
            try {
                const previousData = await parseExcel(previousFile);
                setProgress(50);
                
                if (!previousData) {
                    toast({
                      variant: 'destructive',
                      title: 'Error de Formato',
                      description: 'El archivo del reporte anterior no tiene el formato esperado o está vacío.',
                    });
                    setIsProcessing(false);
                    setProgress(0);
                    return;
                }

                const { processed, changes } = processAndCompareData(previousData, allStudents);
                setProgress(90);
                
                setUploadHistory(prev => [{ 
                    id: Date.now().toString(), 
                    fileName: `COMPARE: ${previousFile.name} vs Reporte Actual`, 
                    uploadedAt: new Date().toISOString() 
                }, ...prev].slice(0, 10));

                toast({
                    title: 'Éxito',
                    description: `Se procesaron ${processed} alumnos y se detectaron ${changes} cambios.`,
                });

            } catch (error) {
               toast({
                variant: 'destructive',
                title: 'Error al procesar',
                description: `Hubo un problema al procesar el archivo. Revisa la consola.`,
              });
              console.error(error);
            } finally {
                setTimeout(() => {
                    setIsProcessing(false);
                    setProgress(0);
                    setPreviousFile(null);
                }, 500);
            }
        };

        runComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previousFile, hasCurrentData, allStudents]);


    const { 
        totalChanges, studentsWithChanges, totalNewAbsences, totalNewMissedAssignments, 
        changesByLeader, changesByTutor, changesBySubject 
    } = useMemo(() => {
        const hasHistory = Object.keys(studentHistory).length > 0;
        if (!hasHistory) {
            return {
                totalChanges: 0,
                studentsWithChanges: 0,
                totalNewAbsences: 0,
                totalNewMissedAssignments: 0,
                changesByLeader: [],
                changesByTutor: [],
                changesBySubject: [],
            };
        }

        const allChanges: Change[] = Object.values(studentHistory).flat();
        const studentsWithChangesSet = new Set(allChanges.map(c => c.studentId));

        let newAbsences = 0;
        let newMissedAssignments = 0;

        const leaderCounts: Record<string, { absences: number, missedAssignments: number }> = {};
        const tutorCounts: Record<string, { absences: number, missedAssignments: number }> = {};
        const subjectCounts: Record<string, { absences: number, missedAssignments: number }> = {};

        for (const change of allChanges) {
            const isRiskIncrement = change.fieldName === 'absences' || change.fieldName === 'missedAssignments';
            if (!isRiskIncrement) continue;

            const increment = (change.newValue as number) - (change.oldValue as number);
            if (change.fieldName === 'absences') newAbsences += increment;
            if (change.fieldName === 'missedAssignments') newMissedAssignments += increment;
            
            const student = allStudents.find(s => s.id === change.studentId);
            if (!student) continue;

            const subject = student.subjects?.find(s => s.id === change.subjectId);
            const subjectName = subject?.name || 'Desconocida';

            if (!leaderCounts[student.leader]) leaderCounts[student.leader] = { absences: 0, missedAssignments: 0 };
            if (change.fieldName === 'absences') leaderCounts[student.leader].absences += increment;
            else leaderCounts[student.leader].missedAssignments += increment;
            
            if (!tutorCounts[student.tutor]) tutorCounts[student.tutor] = { absences: 0, missedAssignments: 0 };
            if (change.fieldName === 'absences') tutorCounts[student.tutor].absences += increment;
            else tutorCounts[student.tutor].missedAssignments += increment;

            if (!subjectCounts[subjectName]) subjectCounts[subjectName] = { absences: 0, missedAssignments: 0 };
            if (change.fieldName === 'absences') subjectCounts[subjectName].absences += increment;
            else subjectCounts[subjectName].missedAssignments += increment;
        }

        const formatChartData = (data: Record<string, any>) => Object.entries(data).map(([name, counts]) => ({ name, Faltas: counts.absences, 'Tareas (NE)': counts.missedAssignments })).sort((a,b) => (b.Faltas + b['Tareas (NE)']) - (a.Faltas + a['Tareas (NE)'])).slice(0, 10);

        return {
            totalChanges: allChanges.filter(c => c.fieldName === 'absences' || c.fieldName === 'missedAssignments').length,
            studentsWithChanges: studentsWithChangesSet.size,
            totalNewAbsences: newAbsences,
            totalNewMissedAssignments: newMissedAssignments,
            changesByLeader: formatChartData(leaderCounts),
            changesByTutor: formatChartData(tutorCounts),
            changesBySubject: formatChartData(subjectCounts),
        };

    }, [studentHistory, allStudents]);

    const handleCaseClick = (caseType: 'changes') => {
        setCaseType(caseType);
        setActiveView('students');
    };
    
    const hasComparisonData = useMemo(() => Object.keys(studentHistory).length > 0, [studentHistory]);

    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Análisis de Cambios</h1>
                <p className="text-muted-foreground">Compara el reporte diario actual con uno anterior para detectar nuevas faltas, tareas no entregadas y cambios de grupo.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Iniciar Comparación</CardTitle>
                    <CardDescription>Al cargar un reporte anterior, éste se comparará con el reporte que ya tienes cargado.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
                    <FileUpload onFileSelect={setPreviousFile} selectedFile={previousFile} isLoading={isProcessing} label="Cargar Reporte Anterior" icon={<FileClock />} />
                </CardContent>
                {isProcessing && <Progress value={progress} className="w-full h-1 mt-2" />}
            </Card>

            {!hasComparisonData && (
                 <Card className="text-center p-12 mt-8">
                    <CardHeader>
                        <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                            <AlertCircle className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Sin Datos para Comparar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Carga un reporte anterior para generar y visualizar el análisis de cambios. Asegúrate de haber cargado el reporte actual primero.
                        </p>
                    </CardContent>
                </Card>
            )}

            {hasComparisonData && (
                 <>
                    {totalChanges === 0 && !isProcessing ? (
                         <Card className="text-center p-12 mt-8">
                            <CardHeader>
                                <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                                    <FileCheck2 className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle>No se Encontraron Cambios de Riesgo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    No se detectaron nuevas faltas o tareas no entregadas entre los dos reportes. Puede haber otros cambios (ej. de grupo o tutor).
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <KpiCard title="Alumnos con Cambios" value={studentsWithChanges} icon={Users} onClick={() => handleCaseClick('changes')} />
                                <KpiCard title="Total de Cambios de Riesgo" value={totalChanges} icon={AlertTriangle} />
                                <KpiCard title="Total Faltas (nuevas)" value={totalNewAbsences} icon={FileWarning} color="yellow" />
                                <KpiCard title="Total Tareas NE (nuevas)" value={totalNewMissedAssignments} icon={BadgeAlert} color="red" />
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
                                                <Legend formatter={legendFormatter} />
                                                <Bar dataKey="Faltas" name="Nuevas Faltas" stackId="a" fill="hsl(var(--chart-4))" />
                                                <Bar dataKey="Tareas (NE)" name="Nuevas Tareas (NE)" stackId="a" fill="hsl(var(--chart-3))" />
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
                                                <Legend formatter={legendFormatter} />
                                                <Bar dataKey="Faltas" name="Nuevas Faltas" stackId="a" fill="hsl(var(--chart-4))" />
                                                <Bar dataKey="Tareas (NE)" name="Nuevas Tareas (NE)" stackId="a" fill="hsl(var(--chart-3))" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Cambios por Materia</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={changesBySubject} layout="vertical" margin={{ left: 150 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend formatter={legendFormatter} />
                                            <Bar dataKey="Faltas" name="Nuevas Faltas" stackId="a" fill="hsl(var(--chart-4))" />
                                            <Bar dataKey="Tareas (NE)" name="Nuevas Tareas (NE)" stackId="a" fill="hsl(var(--chart-3))" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

    