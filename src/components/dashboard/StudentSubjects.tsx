"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Phone, Camera, User as UserIcon } from 'lucide-react';
import { type Student, type Subject } from "@/types/student";
import { getActivityList } from '@/lib/ponderaciones';
import { isWithoutRight } from '@/lib/dataProcessor';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';
import { StudentSchedule } from './StudentSchedule';
import { StudentProfessorsSchedule } from './StudentProfessorsSchedule';
import { StudentContactInfo } from './StudentContactInfo';
import { ActivityBreakdown } from './ActivityBreakdown';
import { GradesTable } from './GradesTable';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StudentReportImage } from './StudentReportImage';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RiskCell, CopyButton } from './StudentCardShared';
import * as htmlToImage from 'html-to-image';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';


function ReportImageDialog({ student, subjects }: { student: Student, subjects: Subject[] | undefined }) {
    const reportRef = useRef<HTMLDivElement>(null);
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
                        await htmlToImage.toPng(reportRef.current!, { 
                            pixelRatio: 2,
                            fetchRequestInit: { mode: 'no-cors' }
                        });
                    } catch (error) {
                       console.error("Error generating image:", error);
                    } finally {
                        setIsLoading(false);
                    }
                }
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [subjects]);


    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Reporte Rápido del Alumno</DialogTitle>
                <DialogDescription>
                    Esta es una previsualización del reporte del alumno. Puedes tomar una captura de pantalla.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 overflow-x-auto">
                <StudentReportImage ref={reportRef} student={student} subjects={subjectSummaries} />
            </div>
        </DialogContent>
    );
}


export function StudentSubjects({ student, isOpen }: { student: Student, isOpen: boolean }) {
    const { loadStudentSubjects, planType, professorContacts, weightingSchemes, setActiveView, setFilterType, setSelectedValue } = useDashboardFilters();
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 sm:px-6 gap-2">
            <ScrollArea className="w-full sm:w-auto whitespace-nowrap pb-2 sm:pb-0">
                <TabsList className="inline-flex h-9 p-1">
                    <TabsTrigger value="materias" className="text-xs sm:text-sm">Materias</TabsTrigger>
                    <TabsTrigger value="calificaciones" className="text-xs sm:text-sm">Calificaciones</TabsTrigger>
                    <TabsTrigger value="horario" className="text-xs sm:text-sm">Horario</TabsTrigger>
                    <TabsTrigger value="horario-profes" className="text-xs sm:text-sm">Profesores</TabsTrigger>
                    <TabsTrigger value="contacto" className="text-xs sm:text-sm"><Phone className="mr-1 h-3 w-3 sm:h-4 sm:w-4"/>Contacto</TabsTrigger>
                </TabsList>
            </ScrollArea>
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto"><Camera className="mr-2 h-4 w-4"/>Reporte Visual</Button>
                </DialogTrigger>
                <ReportImageDialog student={student} subjects={subjects}/>
            </Dialog>
        </div>
        
        <TabsContent value="materias" className="mt-4">
          <div className="overflow-x-auto border-t">
              <Table>
                  <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8 px-2 sm:px-4"></TableHead>
                        <TableHead className="px-2 sm:px-4 text-xs sm:text-sm">Materia</TableHead>
                        <TableHead className="hidden md:table-cell px-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                                Profesor
                                <CopyButton 
                                    textToCopy={subjects.map(s => s.professorName).filter(Boolean).join('\n')} 
                                    tooltipText='Copiar todos'
                                />
                            </div>
                        </TableHead>
                        <TableHead className="text-center px-1 sm:px-4 text-xs sm:text-sm">Faltas</TableHead>
                        <TableHead className="text-center px-1 sm:px-4 text-xs sm:text-sm">Tareas</TableHead>
                        <TableHead className="text-right px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap">Calif. Calc.</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                  {subjects.map((subject) => {
                    const activityList = getActivityList(subject, weightingSchemes);
                      
                    let totalEarnedPoints = 0;
                    let maxPossiblePoints = 0;

                    if (activityList.length > 0) {
                      activityList.forEach(item => {
                          const isGraded = typeof item.score === 'string' ? item.score.toUpperCase() !== 'SC' && item.score.trim() !== '' : true;
                          
                          if (isGraded) {
                              const score = Number(item.score) || 0;
                              totalEarnedPoints += (score / 100) * item.weight;
                              maxPossiblePoints += item.weight;
                          }
                      });
                    }
                    
                    return (
                    <React.Fragment key={subject.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => handleToggleSubject(subject.id)}>
                          <TableCell className="px-2 sm:px-4">
                              <div className="flex items-center justify-center">
                                  {openSubject === subject.id ? <Minus className="h-3 w-3 sm:h-4 sm:w-4" /> : <Plus className="h-3 w-3 sm:h-4 sm:w-4" />}
                              </div>
                          </TableCell>
                          <TableCell className="font-medium px-2 sm:px-4 py-3">
                              <div className="text-xs sm:text-sm leading-tight">{subject.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">Gpo: {subject.group}</div>
                              
                              {/* Visible only on mobile below subject name */}
                              <div className="md:hidden mt-1 flex items-center gap-1">
                                {subject.professorName ? (
                                    <Button
                                        variant="link"
                                        className="p-0 h-auto text-[10px] text-primary/70 hover:text-primary justify-start"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleProfessorClick(subject.professorName!);
                                        }}
                                    >
                                        <UserIcon className="h-2.5 w-2.5 mr-1" />
                                        {subject.professorName.split(' ').slice(0, 2).join(' ')}...
                                    </Button>
                                ) : <span className="text-[10px] text-muted-foreground">N/A</span>}
                              </div>
                          </TableCell>
                         <TableCell className="hidden md:table-cell text-muted-foreground px-4">
                            {subject.professorName ? (
                                <div className="flex items-center gap-1">
                                <Button
                                    variant="link"
                                    className="p-0 h-auto text-xs text-muted-foreground hover:text-primary justify-start"
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    handleProfessorClick(subject.professorName!);
                                    }}
                                >
                                    {subject.professorName}
                                </Button>
                                <CopyButton textToCopy={subject.professorName} tooltipText='Copiar nombre' />
                                </div>
                            ) : (
                                <span>N/A</span>
                            )}
                         </TableCell>
                          <TableCell className="text-center px-1 sm:px-4">
                              <div className='inline-block scale-90 sm:scale-100'>
                                  <RiskCell value={subject.absences} limit={subject.absenceLimit} />
                              </div>
                          </TableCell>
                          <TableCell className="text-center px-1 sm:px-4">
                              <div className='inline-block scale-90 sm:scale-100'>
                                  <RiskCell value={subject.missedAssignments} limit={subject.missedAssignmentLimit} />
                              </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary px-2 sm:px-4 text-xs sm:text-sm">
                                {isWithoutRight(subject) ? (
                                <Badge variant="destructive" className="h-5 px-1 sm:px-2">SD</Badge>
                                ) : activityList.length > 0 && maxPossiblePoints > 0 ? (
                                <TooltipProvider>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="cursor-help">{`${totalEarnedPoints.toFixed(1)}/${maxPossiblePoints.toFixed(0)}`}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">
                                        Puntos acumulados / Puntos posibles hasta ahora
                                        </p>
                                    </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                ) : (
                                <Badge variant="secondary" className="h-5 px-1 sm:px-2 text-[10px]">N/D</Badge>
                                )}
                          </TableCell>
                      </TableRow>
                      {openSubject === subject.id && (
                        <TableRow>
                            <TableCell colSpan={7} className="p-0">
                              <ActivityBreakdown subject={subject} schemes={weightingSchemes} />
                            </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )})}
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
          <StudentProfessorsSchedule studentSubjects={subjects} studentName={student.name} />
        </TabsContent>
         <TabsContent value="contacto">
          <StudentContactInfo studentId={student.id} />
        </TabsContent>
      </Tabs>
    );
}
