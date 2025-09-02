"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Bot } from 'lucide-react';
import { type Student, type Change } from "@/types/student";
import { getRisk, type RiskLevel } from '@/lib/dataProcessor';
import { summarizeStudentChanges } from '@/ai/flows/summarize-student-changes';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentCardProps {
  student: Student;
  changes: Change[];
}

function RiskCell({ value, limit }: { value: number; limit: number; change?: number }) {
  const { level } = getRisk(value, limit);
  
  const riskColorMapping: Record<RiskLevel, string> = {
    low: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
    medium: 'bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-300',
    high: 'bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-300',
  };

  return (
    <div className={`px-2 py-1 rounded-md text-center ${riskColorMapping[level]}`}>
        {value} / {limit}
    </div>
  );
}

function ChangeIndicator({ value, type = 'number' }: { value: number, type?: 'number' | 'grade' }) {
    if (value === 0) return null;
    const isUp = value > 0;
    const isGrade = type === 'grade';
    return (
        <span className={`inline-flex items-center text-xs ml-1 ${isUp ? 'text-red-500' : 'text-green-500'}`}>
            ({isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(value)})
        </span>
    );
}

function AiSummary({ student, changes }: StudentCardProps) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getSummary() {
      if (changes.length === 0) {
        setSummary("No se detectaron cambios recientes en el rendimiento del alumno.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const changeDescriptions = changes.map(c => {
          const changeType = c.type === 'absence' ? 'Faltas' : c.type === 'missedAssignment' ? 'Tareas NE' : 'Calificación';
          return `${c.subjectName}: ${changeType} cambió de ${c.oldValue} a ${c.newValue}.`;
        });
        const result = await summarizeStudentChanges({
          studentName: student.name,
          studentId: student.id,
          changes: changeDescriptions
        });
        setSummary(result.summary);
      } catch (error) {
        console.error("AI summary failed:", error);
        setSummary("No se pudo generar el resumen de cambios.");
      } finally {
        setIsLoading(false);
      }
    }
    getSummary();
  }, [student, changes]);

  if(isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md">
      <Bot className="h-5 w-5 shrink-0 mt-0.5 text-accent"/>
      <p>{summary}</p>
    </div>
  )
}

export function StudentCard({ student, changes }: StudentCardProps) {
  const getChangeFor = (subjectName: string, type: 'absence' | 'missedAssignment' | 'grade') => {
    const change = changes.find(c => c.subjectName === subjectName && c.type === type);
    return change ? change.newValue - change.oldValue : 0;
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{student.name}</CardTitle>
                <CardDescription>Matrícula: {student.id}</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <AiSummary student={student} changes={changes} />
        
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Materia</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="text-center">Tareas (NE)</TableHead>
                    <TableHead className="text-right">Calificación Ponderada</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {student.subjects.map((subject) => (
                    <TableRow key={subject.name}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell className="text-center">
                            <div className='inline-block'>
                                <RiskCell value={subject.absences} limit={subject.absenceLimit} />
                            </div>
                            <ChangeIndicator value={getChangeFor(subject.name, 'absence')} />
                        </TableCell>
                        <TableCell className="text-center">
                            <div className='inline-block'>
                                <RiskCell value={subject.missedAssignments} limit={subject.missedAssignmentLimit} />
                            </div>
                             <ChangeIndicator value={getChangeFor(subject.name, 'missedAssignment')} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {subject.grade.toFixed(2)}
                            <ChangeIndicator value={getChangeFor(subject.name, 'grade')} type="grade" />
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
