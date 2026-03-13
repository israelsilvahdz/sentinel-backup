"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Phone, Camera, User as UserIcon, Download, Sparkles, ChevronRight, ChevronDown } from 'lucide-react';
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
    const { toast } = useDashboardFilters();

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
        <DialogContent className="max-w-2xl sm:max-w-4xl rounded-3xl border-none shadow-2xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black text-primary">Reporte Visual de Progreso</DialogTitle>
                <DialogDescription className="text-xs uppercase font-black tracking-widest opacity-60">
                    Captura de rendimiento académico para compartir
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 overflow-x-auto bg-muted/20 rounded-2xl">
                <div className="min-w-[800px] flex justify-center p-4">
                    <StudentReportImage ref={reportRef} student={student} subjects={subjects} />
                </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button onClick={handleDownload} disabled={isGenerating} className="w-full sm:w-auto rounded-xl font-bold h-11 px-8 shadow-xl shadow-primary/20">
                    {isGenerating ? <Loader2 className="h-4 w-4 rounded-full mr-2 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Descargar Reporte PNG
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
        return <div className="p-8 space-y-4"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /></div>;
    }
    
    if (subjects.length === 0 && isOpen) {
       return <p className="text-muted-foreground text-sm px-6 pb-8 italic text-center">No se encontraron materias registradas para este alumno.</p>
    }

    const handleToggleSubject = (subjectId: string) => {
      setOpenSubject(prev => (prev === subjectId ? null : subjectId));
    };

    return (
      <Tabs defaultValue="materias" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 sm:px-6 gap-4">
            <ScrollArea className="w-full sm:w-auto whitespace-nowrap pb-2 sm:pb-0">
                <TabsList className="inline-flex h-11 p-1.5 bg-muted/50 rounded-2xl">
                    <TabsTrigger value="materias" className="text-xs sm:text-sm rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Materias</TabsTrigger>
                    <TabsTrigger value="calificaciones" className="text-xs sm:text-sm rounded-xl data-[state=active]:bg-white">Calificaciones</TabsTrigger>
                    <TabsTrigger value="horario" className="text-xs sm:text-sm rounded-xl data-[state=active]:bg-white">Horario</TabsTrigger>
                    {localStatus?.riasecDiagnosis && (
                      <TabsTrigger value="vocacional" className="text-xs sm:text-sm text-primary font-bold rounded-xl data-[state=active]:bg-white">
                        <Sparkles className="mr-1.5 h-3.5 w-3.5"/> Vocacional
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="horario-profes" className="text-xs sm:text-sm rounded-xl data-[state=active]:bg-white">Profesores</TabsTrigger>
                    <TabsTrigger value="contacto" className="text-xs sm:text-sm rounded-xl data-[state=active]:bg-white"><Phone className="mr-1.5 h-3.5 w-3.5"/>Contacto</TabsTrigger>
                </TabsList>
            </ScrollArea>
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto rounded-xl font-bold border-primary/20 hover:bg-primary/5 text-primary h-10 px-5 transition-all"><Camera className="mr-2 h-4 w-4"/>Generar Reporte Visual</Button>
                </DialogTrigger>
                <ReportImageDialog student={student} subjects={subjects}/>
            </Dialog>
        </div>
        
        <TabsContent value="materias" className="mt-6">
          <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                  <TableHeader>
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="w-12 px-4"></TableHead>
                        <TableHead className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Asignatura</TableHead>
                        <TableHead className="hidden md:table-cell px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Profesor</TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Faltas</TableHead>
                        <TableHead className="text-center px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Tareas NE</TableHead>
                        <TableHead className="text-right px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Estatus Académico</TableHead>
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
                    const isSD = isWithoutRight(subject);
                    
                    // Logic for potential colors
                    const potentialColor = maxPotentialGrade >= 85 ? 'text-emerald-600' : maxPotentialGrade >= 70 ? 'text-amber-600' : 'text-red-600';
                    const potentialBg = maxPotentialGrade >= 85 ? 'bg-emerald-50' : maxPotentialGrade >= 70 ? 'bg-amber-50' : 'bg-red-50';

                    return (
                    <React.Fragment key={subject.id}>
                      <TableRow className="group/row cursor-pointer border-b border-muted/30 transition-all hover:bg-muted/10" onClick={() => handleToggleSubject(subject.id)}>
                          <TableCell className="px-4 py-5">
                              <div className="flex items-center justify-center transition-transform duration-300">
                                  {openSubject === subject.id ? (
                                    <div className="p-1 rounded-md bg-primary/10 text-primary"><ChevronDown className="h-4 w-4" /></div>
                                  ) : (
                                    <div className="p-1 rounded-md text-muted-foreground group-hover/row:bg-muted group-hover/row:text-foreground"><ChevronRight className="h-4 w-4" /></div>
                                  )}
                              </div>
                          </TableCell>
                          <TableCell className="px-4 py-5">
                              <div className="flex flex-col space-y-1">
                                <span className="text-sm font-black text-foreground tracking-tight leading-none group-hover/row:text-primary transition-colors">{subject.name}</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase bg-muted/30 border-none h-4 px-1.5 opacity-70">GPO: {subject.group}</Badge>
                                    <span className="text-[9px] font-mono text-muted-foreground opacity-50">{subject.id}</span>
                                </div>
                              </div>
                          </TableCell>
                         <TableCell className="hidden md:table-cell px-4 py-5">
                            {subject.professorName ? (
                                <div className="flex items-center gap-2 max-w-[180px]">
                                    <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <button
                                        className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors truncate text-left"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleProfessorClick(subject.professorName!);
                                        }}
                                    >
                                        {subject.professorName}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[10px] text-muted-foreground italic">No asignado</span>
                            )}
                         </TableCell>
                          <TableCell className="text-center px-4 py-5">
                              <div className='inline-block scale-95'>
                                  <RiskCell value={subject.absences} limit={subject.absenceLimit} />
                              </div>
                          </TableCell>
                          <TableCell className="text-center px-4 py-5">
                              <div className='inline-block scale-95'>
                                  <RiskCell value={subject.missedAssignments} limit={subject.missedAssignmentLimit} />
                              </div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-5">
                                <div className="flex flex-col items-end gap-1">
                                    {isSD ? (
                                        <Badge variant="destructive" className="h-6 px-3 font-black uppercase text-[10px] shadow-sm animate-pulse">Sin Derecho (SD)</Badge>
                                    ) : activityList.length > 0 && maxPossiblePoints > 0 ? (
                                        <div className="flex flex-col items-end group/grade">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-[10px] font-black text-muted-foreground opacity-40 mr-1 uppercase">PUNTOS:</span>
                                                            <span className="text-sm font-black text-foreground tabular-nums tracking-tighter">
                                                                {totalEarnedPoints.toFixed(1)}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-muted-foreground opacity-40">/ {maxPossiblePoints.toFixed(0)}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="font-bold">Puntos acumulados vs posibles a la fecha</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            
                                            <div className={cn(
                                                "mt-1 px-2.5 py-1 rounded-xl flex items-baseline gap-2 transition-all duration-500 shadow-inner group-hover/grade:scale-105",
                                                potentialBg
                                            )}>
                                                <span className={cn("text-[9px] font-black uppercase tracking-widest opacity-60", potentialColor)}>Potencial</span>
                                                <span className={cn("text-lg font-black leading-none tabular-nums tracking-tight", potentialColor)}>
                                                    {maxPotentialGrade.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <Badge variant="secondary" className="h-5 px-2 text-[10px] font-black uppercase tracking-widest opacity-40">Pendiente</Badge>
                                    )}
                                </div>
                          </TableCell>
                      </TableRow>
                      {openSubject === subject.id && (
                        <TableRow className="bg-muted/5">
                            <TableCell colSpan={7} className="p-0 border-none">
                              <div className="animate-in slide-in-from-top-2 duration-300">
                                <ActivityBreakdown subject={subject} schemes={weightingSchemes} />
                              </div>
                            </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )})}
                  </TableBody>
              </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="calificaciones" className="mt-6">
          <div className="overflow-x-auto bg-white p-4 rounded-3xl shadow-inner border border-muted/20">
            <GradesTable subjects={subjects} />
          </div>
        </TabsContent>
        <TabsContent value="horario" className="mt-6">
          <StudentSchedule subjects={subjects} studentName={student.name} planType={planType} professorContacts={professorContacts} />
        </TabsContent>
        <TabsContent value="vocacional" className="p-6 bg-white rounded-[2.5rem] mt-6 shadow-inner border border-muted/20">
          {localStatus?.riasecDiagnosis ? (
            <RiasecChart diagnosis={localStatus.riasecDiagnosis} />
          ) : (
            <div className="py-20 text-center">
              <Sparkles className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-40">No hay diagnóstico RIASEC en la nube</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="horario-profes" className="mt-6">
          <StudentProfessorsSchedule studentSubjects={subjects} studentName={student.name} />
        </TabsContent>
         <TabsContent value="contacto" className="mt-6">
          <StudentContactInfo studentId={student.id} />
        </TabsContent>
      </Tabs>
    );
}
