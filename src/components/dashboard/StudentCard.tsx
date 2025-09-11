

"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type Student, type Subject, type SubjectSummary } from "@/types/student";
import { getRisk, getStudentOverallRisk, type RiskLevel } from '@/lib/dataProcessor';
import { calculateFinalGrade } from '@/lib/ponderaciones';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';

interface StudentCardProps {
  student: Student;
  startOpen?: boolean;
}

function RiskCell({ value, limit }: { value: number; limit: number; }) {
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

function OverallRiskBadge({ student, subjects }: { student: Student, subjects: (Subject[] | SubjectSummary[]) }) {
    const { overallRisk } = getStudentOverallRisk(student, subjects);

    if (overallRisk === 'low') return null;

    const config: Record<string, { text: string; className: string; }> = {
        medium: { text: 'En Observación', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
        high: { text: 'Crítico', className: 'bg-red-100 text-red-800 border-red-300' },
    };

    const riskConfig = config[overallRisk];
    if (!riskConfig) return null;

    return <Badge variant="outline" className={`ml-2 ${riskConfig.className}`}>{riskConfig.text}</Badge>;
}

function StudentSubjects({ student, isOpen }: { student: Student, isOpen: boolean }) {
    const { loadStudentSubjects, setSelectedStudentId, setActiveView } = useDashboardFilters();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function loadSubjects() {
            if (isOpen && student.id && subjects.length === 0) {
                setIsLoading(true);
                try {
                    const fetchedSubjects = await loadStudentSubjects(student.id);
                    setSubjects(fetchedSubjects);
                } catch (error) {
                    console.error("Failed to load subjects for student " + student.id, error);
                } finally {
                    setIsLoading(false);
                }
            }
        }
        loadSubjects();
    }, [isOpen, student.id, subjects.length, loadStudentSubjects]);

    if (isLoading) {
        return <div className="p-4"><Skeleton className="h-24 w-full" /></div>;
    }
    
    if (subjects.length === 0 && isOpen) {
       return <p className="text-muted-foreground text-sm px-6 pb-4">No se encontraron materias para este alumno.</p>
    }

    const handleHistoryClick = () => {
      setSelectedStudentId(student.id);
      setActiveView('history');
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Materia</TableHead>
                    <TableHead>Profesor</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="text-center">Tareas (NE)</TableHead>
                    <TableHead className="text-right">Calif. Reporte</TableHead>
                    <TableHead className="text-right">Calif. Calculada</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                        <TableCell className="font-medium">
                          {subject.name}
                          <span className="text-muted-foreground text-xs block">Grupo: {subject.group}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{subject.professorName}</TableCell>
                        <TableCell className="text-center">
                            <div className='inline-block'>
                                <RiskCell value={subject.absences} limit={subject.absenceLimit} />
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <div className='inline-block'>
                                <RiskCell value={subject.missedAssignments} limit={subject.missedAssignmentLimit} />
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {typeof subject.grade === 'number' && !isNaN(subject.grade) ? subject.grade.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                            {calculateFinalGrade(subject).toFixed(2)}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="px-6 py-4 border-t">
              <Button variant="outline" size="sm" onClick={handleHistoryClick}>Ver Historial de Cambios</Button>
            </div>
        </div>
    );
}

export function StudentCard({ student, startOpen = true }: StudentCardProps) {
  const [isOpen, setIsOpen] = useState(startOpen);
  
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="flex items-center text-lg">
                        {student.name}
                        {student.subjectSummaries && <OverallRiskBadge student={student} subjects={student.subjectSummaries} />}
                    </CardTitle>
                    <CardDescription>Matrícula: {student.id} | Líder: {student.leader} | Tutor: {student.tutor}</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
            </div>
        </CardHeader>
        <CollapsibleContent>
          <StudentSubjects student={student} isOpen={isOpen} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
