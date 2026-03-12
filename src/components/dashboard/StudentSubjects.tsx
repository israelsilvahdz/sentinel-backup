"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Phone, Camera, User as UserIcon, Download, Sparkles } from 'lucide-react';
import { type Student, type Subject, type ContinuityLocalStatus } from "@/types/student";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { StudentReportImage } from './StudentReportImage';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RiskCell, CopyButton } from './StudentCardShared';
import { RiasecChart } from './RiasecChart';
import { getContinuityLocalStatus } from '@/lib/firebase-services';
import * as htmlToImage from 'html-to-image';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';


function ReportImageDialog({ student, subjects }: { student: Student, subjects: Subject[] | undefined }) {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const subjectSummaries = subjects?.map(s => {
        const activityList = getActivityList(s, []); // This might be tricky since we need schemes here too for accuracy
        // For simplicity in the summary type, we'll rely on the parent component's logic if possible
        return {
            id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
            missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
            grade: s.grade, finalGrade: s.finalGrade, group: s.group,
        }
    });

    const handleDownload = async () => {
        if (!reportRef.current) return;
        setIsGenerating(true);
        try {
            const dataUrl = await htmlToImage.toPng(reportRef.current, { pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `Reporte_${student.name.replace(/\s+/g, '_')}_${student.id}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error("Error downloading image:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <DialogContent className="max-w-2xl sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Reporte Rápido del Alumno</DialogTitle>
                <DialogDescription>
                    Previsualización del reporte visual. Puedes guardarlo en tu dispositivo o tomar captura.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 overflow-x-auto bg-muted/20 rounded-md">
                <div className="min-w-[800px] flex justify-center p-4">
                    <StudentReportImage ref={reportRef} student={student} subjects={subjects} />
                </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button onClick={handleDownload} disabled={isGenerating} className="w-full sm:w-auto">
                    {isGenerating ? <Skeleton className="h-4 w-4 rounded-full mr-2" /> : <Download className="mr-2 h-4 w-4" />}
                    Descargar Imagen
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}


export function StudentSubjects({ student, isOpen }: { student: Student, isOpen: boolean }) {
    const { loadStudentSubjects, planType, professorContacts, weightingSchemes, setActiveView, setFilterType, setSelectedValue } = useDashboardFilters();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [openSubject, setOpenSubject] = useState<string | null>(null);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [localStatus, setLocalStatus] = useState<ContinuityLocalStatus | null>(null);

    useEffect(() => {
        async function loadData() {
            if (isOpen && student.id) {
                setIsLoading(true);
                try {
                    const [fetchedSubjects, status] = await Promise.all([
                        subjects.length === 0 ? loadStudentSubjects(student.id) : subjects,
                        getContinuityLocalStatus(student.id)
                    ]);
                    setSubjects(fetchedSubjects);
                    setLocalStatus(status);
                } catch (error) {
                    console.error("Failed to load subjects for student " + student.id, error);
                } finally {
                    setIsLoading(false);
                }
            }
        }
        loadData();
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
                    {localStatus?.riasecDiagnosis && (
                      <TabsTrigger value="vocacional" className="text-xs sm:text-sm text-primary font-bold">
                        <Sparkles className="mr-1 h-3 w-3 sm:h-4 sm:w-4"/> Vocacional
                      </TabsTrigger>
                    )}
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
              <Table className="min-w-[500px] md:min-w-full">
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

                    const maxPotentialGrade = 100 - (maxPossiblePoints - totalEarnedPoints);
                    
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
                          <TableCell className="text-right px-2 sm:px-4">
                                <div className="flex flex-col items-end">
                                    {isWithoutRight(subject) ? (
                                        <Badge variant="destructive" className="h-5 px-1 sm:px-2 font-black uppercase text-[10px]">Sin Derecho</Badge>
                                    ) : activityList.length > 0 && maxPossiblePoints > 0 ? (
                                        <>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help font-mono font-black text-primary text-xs sm:text-sm">
                                                            {`${totalEarnedPoints.toFixed(1)}/${maxPossiblePoints.toFixed(0)}`}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="font-bold">
                                                        <p className="text-xs">Puntos acumulados / Puntos posibles a la fecha</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-tighter">Potencial:</span>
                                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-black border-primary/20 text-primary bg-primary/5">
                                                    {maxPotentialGrade.toFixed(1)}
                                                </Badge>
                                            </div>
                                        </>
                                    ) : (
                                        <Badge variant="secondary" className="h-5 px-1 sm:px-2 text-[10px] font-black uppercase">N/D</Badge>
                                    )}
                                </div>
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
        <TabsContent value="vocacional" className="p-4 sm:p-6 bg-muted/10 rounded-xl mt-4">
          {localStatus?.riasecDiagnosis ? (
            <RiasecChart diagnosis={localStatus.riasecDiagnosis} />
          ) : (
            <div className="py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No hay diagnóstico RIASEC cargado para este alumno.</p>
            </div>
          )}
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
