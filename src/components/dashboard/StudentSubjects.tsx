

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Phone, Camera, Download, User as UserIcon } from 'lucide-react';
import { type Student, type Subject, type SubjectSummary } from "@/types/student";
import { calculateFinalGrade } from '@/lib/ponderaciones';
import { isWithoutRight } from '@/lib/dataProcessor';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';
import { StudentSchedule } from './StudentSchedule';
import { StudentProfessorsSchedule } from './StudentProfessorsSchedule';
import { StudentContactInfo } from './StudentContactInfo';
import { ActivityBreakdown } from './ActivityBreakdown';
import { GradesTable } from './GradesTable';
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StudentReportImage } from './StudentReportImage';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RiskCell, CopyButton } from './StudentCardShared';
import * as htmlToImage from 'html-to-image';
import { Badge } from '../ui/badge';


function ReportImageDialog({ student, subjects }: { student: Student, subjects: Subject[] | undefined }) {
    const reportRef = useRef<HTMLDivElement>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const subjectSummaries = subjects?.map(s => ({
        id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
        missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
        grade: s.grade, finalGrade: s.finalGrade, group: s.group,
    }));
    
    useEffect(() => {
        if (!reportRef.current) {
            setIsLoading(true);
            const timeoutId = setTimeout(async () => {
                if (reportRef.current) {
                    try {
                        const dataUrl = await htmlToImage.toPng(reportRef.current!, { 
                            pixelRatio: 2,
                            fetchRequestInit: { mode: 'no-cors' }
                        });
                        setImageUrl(dataUrl);
                    } catch (error) {
                       console.error("Error generating image:", error);
                    } finally {
                        setIsLoading(false);
                    }
                }
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [reportRef, subjects]);


    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Reporte Rápido del Alumno</DialogTitle>
                <DialogDescription>
                    Esta es una previsualización del reporte del alumno. Puedes tomar una captura de pantalla.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <StudentReportImage ref={reportRef} student={student} subjects={subjectSummaries} />
            </div>
        </DialogContent>
    );
}


export function StudentSubjects({ student, isOpen }: { student: Student, isOpen: boolean }) {
    const { loadStudentSubjects, planType, professorContacts, setActiveView, setFilterType, setSelectedValue } = useDashboardFilters();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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
    
    const handleProfessorClick = (professorName: string) => {
        setFilterType('professor');
        setSelectedValue(professorName);
        setActiveView('professor-schedule');
    };

    if (isLoading) {
        return <div className="p-4"><Skeleton className="h-24 w-full" /></div>;
    }
    
    if (subjects.length === 0 && isOpen) {
       return <p className="text-muted-foreground text-sm px-6 pb-4">No se encontraron materias para este alumno.</p>
    }

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
                <TabsTrigger value="horario-profes">Horario Profesores</TabsTrigger>
                <TabsTrigger value="contacto"><Phone className="mr-2 h-4 w-4"/>Contacto</TabsTrigger>
            </TabsList>
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Camera className="mr-2 h-4 w-4"/>Generar Reporte</Button>
                </DialogTrigger>
                <ReportImageDialog student={student} subjects={subjects}/>
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
                              <CopyButton 
                                textToCopy={subjects.map(s => s.professorName).filter(Boolean).join('\n')} 
                                tooltipText='Copiar todos los profesores'
                              />
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
                            {subject.professorName ? (
                                <div className="flex items-center gap-1">
                                <Button
                                    variant="link"
                                    className="p-0 h-auto text-muted-foreground hover:text-primary justify-start"
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    handleProfessorClick(subject.professorName!);
                                    }}
                                >
                                    {subject.professorName}
                                </Button>
                                <CopyButton textToCopy={subject.professorName} tooltipText='Copiar nombre del profesor' />
                                </div>
                            ) : (
                                <span>N/A</span>
                            )}
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
                              {isWithoutRight(subject) ? (
                                <Badge variant="destructive">SD</Badge>
                              ) : (
                                calculateFinalGrade(subject, planType).toFixed(2)
                              )}
                          </TableCell>
                      </TableRow>
                      {openSubject === subject.id && (
                        <TableRow>
                            <TableCell colSpan={7} className="p-0">
                              <ActivityBreakdown subject={subject} planType={planType} />
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
          <div className="overflow-x-auto">
            <GradesTable subjects={subjects} />
          </div>
        </TabsContent>
        <TabsContent value="horario">
          <StudentSchedule subjects={subjects} studentName={student.name} planType={planType} professorContacts={professorContacts} />
        </TabsContent>
        <TabsContent value="horario-profes">
          <StudentProfessorsSchedule studentSubjects={subjects} />
        </TabsContent>
         <TabsContent value="contacto">
          <StudentContactInfo studentId={student.id} />
        </TabsContent>
      </Tabs>
    );
}

    
