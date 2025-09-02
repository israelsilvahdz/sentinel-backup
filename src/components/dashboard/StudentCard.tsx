
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { type Student, type Change, type Subject } from "@/types/student";
import { getRisk, getStudentOverallRisk, type RiskLevel } from '@/lib/dataProcessor';
import { summarizeStudentChanges } from '@/ai/flows/summarize-student-changes';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';

interface StudentCardProps {
  student: Student;
  changes: Change[];
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

function AiSummary({ student }: { student: Student }) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getStudentChanges } = useDashboardFilters();

  useEffect(() => {
    async function fetchChangesAndSummarize() {
      if (!student.id) return;
      setIsLoading(true);
      
      const studentChanges = await getStudentChanges(student.id);

      if (studentChanges && studentChanges.length > 0) {
        try {
            const summaryResponse = await summarizeStudentChanges({
                studentId: student.id,
                studentName: student.name,
                changes: studentChanges.map(c => `Campo '${c.fieldName}' cambió de '${c.oldValue}' a '${c.newValue}' el ${new Date(c.date).toLocaleDateString()}`),
            });
            setSummary(summaryResponse.summary);
        } catch(e) {
            console.error("AI Summary failed", e);
            setSummary("No se pudo generar el resumen.");
        }
      }
      
      setIsLoading(false);
    }

    // fetchChangesAndSummarize(); // We will call this manually for now to prevent permission errors on load
  }, [student.id, student.name, getStudentChanges]);


  if(isLoading) {
    return <Skeleton className="h-10 w-full" />
  }
  if (!summary) return null;

  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md">
      <Bot className="h-5 w-5 shrink-0 mt-0.5 text-accent"/>
      <p>{summary}</p>
    </div>
  )
}

function OverallRiskBadge({ student, subjects }: { student: Student, subjects: Subject[] }) {
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
    const { loadStudentSubjects } = useDashboardFilters();
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

    return (
        <div className="overflow-x-auto">
            {isOpen && <OverallRiskBadge student={student} subjects={subjects} />}
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
                    {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.name}</TableCell>
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
                            {subject.grade.toFixed(2)}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function StudentCard({ student }: StudentCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="flex items-center">
                        {student.name}
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
        <CardContent className="space-y-4 pt-0">
            <AiSummary student={student} />
            <CollapsibleContent>
              <StudentSubjects student={student} isOpen={isOpen} />
            </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
