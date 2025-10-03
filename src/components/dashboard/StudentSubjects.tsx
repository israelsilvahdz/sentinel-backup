
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Phone, Camera, Download, ClipboardCopy, Check } from 'lucide-react';
import { type Student, type Subject } from "@/types/student";
import { calculateFinalGrade } from '@/lib/ponderaciones';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';
import { StudentSchedule } from './StudentSchedule';
import { StudentContactInfo } from './StudentContactInfo';
import { ActivityBreakdown } from './ActivityBreakdown';
import { GradesTable } from './GradesTable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import * as htmlToImage from 'html-to-image';
import { StudentReportImage } from './StudentReportImage';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RiskCell, CopyButton } from './StudentCardShared';


function ReportImageDialog({ student, subjects, isOpen }: { student: Student, subjects: Subject[] | undefined, isOpen: boolean }) {
    const reportRef = useRef<HTMLDivElement>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && reportRef.current) {
            setIsLoading(true);
            setImageUrl(null);
            
            // Give the browser a moment to render the off-screen element
            const timer = setTimeout(() => {
                if (reportRef.current) {
                    htmlToImage.toPng(reportRef.current, { cacheBust: true, pixelRatio: 2 })
                        .then((dataUrl) => {
                            setImageUrl(dataUrl);
                        })
                        .catch((err) => {
                            console.error('oops, something went wrong!', err);
                        })
                        .finally(() => {
                            setIsLoading(false);
                        });
                }
            }, 100); // 100ms delay

            return () => clearTimeout(timer);
        }
    }, [isOpen, subjects, student]);
    
    const subjectSummaries = subjects?.map(s => ({
        id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
        missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
        grade: s.grade, finalGrade: s.finalGrade, group: s.group,
    }));

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Reporte Rápido del Alumno</DialogTitle>
                <DialogDescription>
                    Esta es una previsualización de la imagen que se descargará.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <div className="absolute -left-[9999px] top-0">
                  <StudentReportImage ref={reportRef} student={student} subjects={subjectSummaries} />
                </div>
                 {isLoading && <Skeleton className="w-full aspect-[4/3]" />}
                 {imageUrl && !isLoading && (
                    <img src={imageUrl} alt={`Reporte de ${student.name}`} className="w-full h-auto rounded-md border" />
                )}
            </div>
            <DialogFooter>
                {imageUrl && !isLoading ? (
                    <Button asChild>
                        <a href={imageUrl} download={`reporte_${student.id}.png`}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar Imagen
                        </a>
                    </Button>
                ) : (
                    <Button disabled>
                        <Download className="mr-2 h-4 w-4" />
                        Generando imagen...
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    );
}


export function StudentSubjects({ student, isOpen }: { student: Student, isOpen: boolean }) {
    const { loadStudentSubjects, planType } = useDashboardFilters();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAllCopied, setIsAllCopied] = useState(false);
    const [openSubject, setOpenSubject] = useState<string | null>(null);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

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

    const handleCopyAllTeachers = (e: React.MouseEvent) => {
        e.stopPropagation();
        const teacherNames = subjects
            .map(s => s.professorName)
            .filter(Boolean) // Remove empty names
            .join('\n');
        
        if (teacherNames) {
            navigator.clipboard.writeText(teacherNames).then(() => {
                setIsAllCopied(true);
                setTimeout(() => setIsAllCopied(false), 2500);
            });
        }
    };
    
    const handleToggleSubject = (subjectId: string) => {
      setOpenSubject(prev => (prev === subjectId ? null : subjectId));
    };

    return (
      <Tabs defaultValue="materias" className="w-full">
        <div className="flex justify-between items-center px-6">
            <TabsList>
                <TabsTrigger value="materias">Materias</TabsTrigger>
                <TabsTrigger value="calificaciones">Calificaciones</TabsTrigger>
                <TabsTrigger value="horario">Horario</TabsTrigger>
                <TabsTrigger value="contacto"><Phone className="mr-2 h-4 w-4"/>Contacto</TabsTrigger>
            </TabsList>
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Camera className="mr-2 h-4 w-4"/>Generar Reporte</Button>
                </DialogTrigger>
                <ReportImageDialog student={student} subjects={subjects} isOpen={isReportDialogOpen}/>
            </Dialog>
        </div>
        <TabsContent value="materias">
          <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Materia</TableHead>
                      <TableHead>
                          <div className="flex items-center gap-2">
                              Profesor
                              <TooltipProvider>
                                  <Tooltip open={isAllCopied}>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAllTeachers}>
                                              {isAllCopied ? <Check className="h-4 w-4 text-primary" /> : <ClipboardCopy className="h-4 w-4" />}
                                              <span className="sr-only">Copiar todos los profesores</span>
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p>{isAllCopied ? '¡Copiado!' : 'Copiar todos los profesores'}</p>
                                      </TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          </div>
                      </TableHead>
                      <TableHead className="text-center">Faltas</TableHead>
                      <TableHead className="text-center">Tareas (NE)</TableHead>
                      <TableHead className="text-right">Calif. Reporte</TableHead>
                      <TableHead className="text-right">Calif. Calculada</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                  {subjects.map((subject) => (
                    <React.Fragment key={subject.id}>
                      <TableRow className="cursor-pointer" onClick={() => handleToggleSubject(subject.id)}>
                          <TableCell>
                              <div className="flex items-center justify-center">
                                  {openSubject === subject.id ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                              </div>
                          </TableCell>
                          <TableCell className="font-medium">
                              {subject.name}
                              <span className="text-muted-foreground text-xs block">Grupo: {subject.group}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                              <div className="flex items-center gap-1">
                                  <span>{subject.professorName}</span>
                                  {subject.professorName && <CopyButton textToCopy={subject.professorName} tooltipText='Copiar nombre del profesor' />}
                              </div>
                          </TableCell>
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
                      {openSubject === subject.id && (
                        <TableRow>
                            <TableCell colSpan={7} className="p-0">
                              <ActivityBreakdown subject={subject} />
                            </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  </TableBody>
              </Table>
          </div>
        </TabsContent>
         <TabsContent value="calificaciones">
          <GradesTable subjects={subjects} />
        </TabsContent>
        <TabsContent value="horario">
          <StudentSchedule subjects={subjects} studentName={student.name} planType={planType} />
        </TabsContent>
         <TabsContent value="contacto">
          <StudentContactInfo studentId={student.id} />
        </TabsContent>
      </Tabs>
    );
}
