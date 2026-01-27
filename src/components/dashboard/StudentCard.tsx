
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, FileText, Award, Copy, Check, ClipboardCopy, Send, Users, RefreshCw, Loader2 } from 'lucide-react';
import { type Student, type SubjectSummary, type Team, type Change, type SeguimientoEntry, type BitacoraEntry, type Subject } from "@/types/student";
import { getStudentOverallRisk, type RiskLevel } from '@/lib/dataProcessor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { ChangeHistory } from './ChangeHistory';
import { StudentSubjects } from './StudentSubjects';
import { Checkbox } from '../ui/checkbox';
import { addSeguimientoEntry } from '@/lib/firebase-services';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as htmlToImage from 'html-to-image';
import { StudentReportImage } from './StudentReportImage';

interface StudentCardProps {
  student: Student;
  teams: Team[];
  changes: Change[];
  seguimiento: (SeguimientoEntry | BitacoraEntry)[];
  startOpen?: boolean;
  isDialog?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (studentId: string, isSelected: boolean) => void;
}

function OverallRiskBadge({ student, subjects }: { student: Student, subjects: (SubjectSummary[]) }) {
    const { overallRisk } = getStudentOverallRisk(student, subjects);

    if (overallRisk === 'low') return null;
    
    const config: Record<string, { text: string; className: string; }> = {
        medium: { text: 'En Observación', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
        high: { text: 'Crítico', className: 'bg-orange-100 text-orange-800 border-orange-300' },
        at_limit: { text: 'Al Límite', className: 'bg-red-200 text-red-900 border-red-400' },
        sd: { text: 'SD', className: 'bg-red-500 text-white border-red-700' },
    };

    const riskConfig = config[overallRisk];
    if (!riskConfig) return null;

    return <Badge variant="outline" className={`ml-2 ${riskConfig.className}`}>{riskConfig.text}</Badge>;
}

function MatriculaCopy({ studentId }: { studentId: string }) {
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useDashboardFilters();

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(studentId).then(() => {
            setIsCopied(true);
            toast({
                title: "¡Matrícula copiada!",
                description: `Se copió la matrícula ${studentId}.`,
            });
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <TooltipProvider>
            <Tooltip open={isCopied}>
                <TooltipTrigger asChild>
                    <span onClick={handleCopy} className="group/copy-id inline-flex items-center gap-1 cursor-pointer rounded-md p-1 -m-1 hover:bg-muted/50 transition-colors">
                        {studentId}
                        <span className="opacity-0 group-hover/copy-id:opacity-50 transition-opacity">
                            {isCopied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                        </span>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <span>¡Copiado!</span>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function DetailedReportDialog({ student, onOpenChange }: { student: Student; onOpenChange: (open: boolean) => void }) {
    const { loadStudentSubjects, studentContacts, toast } = useDashboardFilters();
    const reportRef = useRef<HTMLDivElement>(null);
    const [subjects, setSubjects] = useState<SubjectSummary[] | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function getSubjects() {
            setIsLoading(true);
            const fullSubjects = await loadStudentSubjects(student.id);
            const summaries = fullSubjects.map(s => ({
                id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
                missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
                grade: s.grade, finalGrade: s.finalGrade, group: s.group
            }));
            setSubjects(summaries);
            setIsLoading(false);
        }
        getSubjects();
    }, [student.id, loadStudentSubjects]);

    const handleCopyImage = () => {
        if (!reportRef.current) return;
        htmlToImage.toBlob(reportRef.current, { pixelRatio: 2 })
            .then(blob => {
                if (blob) {
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    toast({ title: "Reporte Copiado", description: "La imagen del reporte está en tu portapapeles." });
                }
            }).catch(err => {
                toast({ variant: "destructive", title: "Error", description: "No se pudo copiar la imagen." });
                console.error(err);
            });
    };
    
    const handleOpenWhatsApp = () => {
        const contact = studentContacts[student.id];
        const parentPhone = contact?.dadPhone || contact?.momPhone;
        if (!parentPhone) {
            toast({ variant: 'destructive', title: "Teléfono no encontrado", description: "No hay teléfono de padres para este alumno." });
            return;
        }
        
        const message = `Estimados padres de ${student.name}, les comparto su reporte de calificaciones y asistencias. Por favor, peguen la imagen que acaban de copiar para verla.`;
        const whatsappUrl = `https://wa.me/52${parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        onOpenChange(false);
    };

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Reporte Detallado de {student.name}</DialogTitle>
                <DialogDescription>
                    Copia la imagen del reporte y luego abre WhatsApp para enviarla a los padres.
                </DialogDescription>
            </DialogHeader>
            {isLoading ? (
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <div className="py-4">
                    <div ref={reportRef} className="inline-block">
                        <StudentReportImage student={student} subjects={subjects} />
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={handleCopyImage} disabled={isLoading}>
                    <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar Imagen
                </Button>
                <Button onClick={handleOpenWhatsApp} disabled={isLoading}>
                    <Send className="mr-2 h-4 w-4" /> Abrir WhatsApp y Pegar
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function ChangeNotificationActions({ student, changes, seguimiento, onSent }: { student: Student, changes: Change[], seguimiento: (SeguimientoEntry | BitacoraEntry)[], onSent: () => void }) {
    const { studentContacts, toast } = useDashboardFilters();
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    const { lastChangeDate, hasChanges } = useMemo(() => {
        if (!changes || changes.length === 0) return { lastChangeDate: null, hasChanges: false };
        const lastChangeDate = new Date(changes[0].date);
        return { lastChangeDate, hasChanges: true };
    }, [changes]);

    const lastStudentNotification = useMemo(() => {
        return seguimiento
            .filter((s): s is SeguimientoEntry => 'topic' in s && s.topic === 'Notificación WhatsApp (Alumno)')
            .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0];
    }, [seguimiento]);
    
    const lastParentNotification = useMemo(() => {
        return seguimiento
            .filter((s): s is SeguimientoEntry => 'topic' in s && s.topic === 'Notificación WhatsApp (Padres)')
            .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0];
    }, [seguimiento]);

    const studentNotifiedForThisBatch = useMemo(() => {
        if (!lastStudentNotification || !lastChangeDate) return false;
        return lastStudentNotification.createdAt.toDate() > lastChangeDate;
    }, [lastStudentNotification, lastChangeDate]);
    
    const parentNotifiedForThisBatch = useMemo(() => {
        if (!lastParentNotification || !lastChangeDate) return false;
        return lastParentNotification.createdAt.toDate() > lastChangeDate;
    }, [lastParentNotification, lastChangeDate]);

    const generateMessage = (recipient: 'student' | 'parent'): string => {
        const changesBySubject: Record<string, { absences: boolean, missed: boolean }> = {};

        changes.forEach(change => {
            if (change.fieldName === 'absences' || change.fieldName === 'missedAssignments') {
                const subject = student.subjectSummaries?.find(s => s.id === change.subjectId);
                if (subject) {
                    if (!changesBySubject[subject.name]) {
                        changesBySubject[subject.name] = { absences: false, missed: false };
                    }
                    if (change.fieldName === 'absences') changesBySubject[subject.name].absences = true;
                    if (change.fieldName === 'missedAssignments') changesBySubject[subject.name].missed = true;
                }
            }
        });
        
        let firstName = student.name.split(' ')[0];
        if (student.name.includes(',')) {
            const nameParts = student.name.split(',');
            if (nameParts.length > 1 && nameParts[1].trim()) {
                firstName = nameParts[1].trim().split(' ')[0];
            }
        }
        
        let message = '';
        if (recipient === 'student') {
             message = `Hola ${firstName}, te escribo para recordarte que recientemente has tenido nuevas faltas y/o tareas no entregadas (NE) en las siguientes materias:\n\n`;
        } else {
             message = `Estimados padres de ${firstName}, les notificamos que ha acumulado nuevas faltas y/o tareas no entregadas (NE) en las siguientes materias:\n\n`;
        }

        for (const subjectName in changesBySubject) {
            const subjectInfo = student.subjectSummaries?.find(s => s.name === subjectName);
            if (!subjectInfo) continue;
            
            const { absences, missed } = changesBySubject[subjectName];
            let changeDetails: string[] = [];
            if (absences) {
                changeDetails.push(`ahora tiene ${subjectInfo.absences} de ${subjectInfo.absenceLimit} faltas`);
            }
            if (missed) {
                changeDetails.push(`ahora tiene ${subjectInfo.missedAssignments} de ${subjectInfo.missedAssignmentLimit} tareas NE`);
            }
            message += `• *${subjectName}*: ${changeDetails.join(' y ')}.\n`;
        }

        message += `\nRecuerden que es importante cuidar la asistencia y la entrega de actividades. ¡Estamos para apoyarles!`;
        return message;
    }
    
    const handleSend = async (e: React.MouseEvent, recipient: 'student' | 'parent') => {
        e.stopPropagation();

        const contact = studentContacts[student.id];
        let phoneNumber: string | undefined;
        let logTopic: string;

        if (recipient === 'student') {
            phoneNumber = contact?.studentPhone;
            logTopic = 'Notificación WhatsApp (Alumno)';
        } else {
            phoneNumber = contact?.dadPhone || contact?.momPhone;
            logTopic = 'Notificación WhatsApp (Padres)';
        }

        if (!phoneNumber) {
            toast({ variant: "destructive", title: "Teléfono no encontrado", description: `No hay un número de ${recipient === 'student' ? 'alumno' : 'padres'} registrado.` });
            return;
        }

        const message = generateMessage(recipient);
        const whatsappUrl = `https://wa.me/52${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        const totalAbsences = student.subjectSummaries?.reduce((acc, s) => acc + s.absences, 0) || 0;
        const totalMissed = student.subjectSummaries?.reduce((acc, s) => acc + s.missedAssignments, 0) || 0;
        const newEntry: Omit<SeguimientoEntry, 'id' | 'createdAt'> = {
            studentId: student.id,
            studentName: student.name,
            attendedBy: 'Sistema Automático',
            topic: logTopic,
            notes: message,
            absencesAtFollowUp: totalAbsences,
            missedAssignmentsAtFollowUp: totalMissed,
        };

        try {
            await addSeguimientoEntry(newEntry);
            onSent();
            toast({ title: "Notificación Registrada", description: `Se ha guardado el registro del envío.` });
        } catch(err) {
            console.error("Failed to log notification:", err);
        }
    };
    
    if (!hasChanges) {
        return null;
    }

    return (
        <div className="flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={(e) => handleSend(e, 'student')}>
                            {studentNotifiedForThisBatch ? <RefreshCw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{studentNotifiedForThisBatch ? 'Reenviar a alumno' : 'Enviar a alumno'}</p></TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={(e) => handleSend(e, 'parent')}>
                            {parentNotifiedForThisBatch ? <RefreshCw className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{parentNotifiedForThisBatch ? 'Reenviar a padres' : 'Notificar a padres'}</p></TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); setIsReportDialogOpen(true);}}>
                            <FileText className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Enviar reporte detallado a padres</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DetailedReportDialog student={student} onOpenChange={setIsReportDialogOpen} />
            </Dialog>
        </div>
    );
}

export function StudentCard({ student, teams, changes, seguimiento, startOpen = false, isDialog = false, isSelected = false, onSelectionChange = () => {} }: StudentCardProps) {
  const [isOpen, setIsOpen] = useState(startOpen);
  const { fetchSeguimientoEntries } = useDashboardFilters();
  
  const teamName = useMemo(() => {
    if (!teams || teams.length === 0) return null;
    const studentTeam = teams.find(team => 
        Array.isArray(team.members) && team.members.some(member => member.id === student.id)
    );
    return studentTeam?.name;
  }, [teams, student.id]);


  const cardTitleContent = (
    <div className="flex items-center">
      {student.name}
      {teamName && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-2">
                <Award className="h-5 w-5 text-blue-600" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Equipo: {teamName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {student.subjectSummaries && <OverallRiskBadge student={student} subjects={student.subjectSummaries} />}
    </div>
  );

  const cardDescriptionContent = (
    <div className="text-sm text-muted-foreground">
        Matrícula: <MatriculaCopy studentId={student.id} /> | Líder: {student.leader}
    </div>
  )

  if (isDialog) {
    // Render content directly without collapsible for Dialog view
    return (
      <Card className="h-full flex flex-col border-none shadow-none">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="flex items-center text-lg">
                      {cardTitleContent}
                    </CardTitle>
                    {cardDescriptionContent}
                </div>
            </div>
        </CardHeader>
        <ScrollArea className="flex-1 pr-6 -mr-6">
            <StudentSubjects student={student} isOpen={true} />
        </ScrollArea>
      </Card>
    )
  }

  return (
    <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectionChange(student.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                    />
                    <div>
                        <CardTitle className="flex items-center text-lg">
                        {cardTitleContent}
                        </CardTitle>
                        {cardDescriptionContent}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ChangeNotificationActions student={student} changes={changes} seguimiento={seguimiento} onSent={fetchSeguimientoEntries} />
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>EXPEDIENTE</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                             <DialogHeader>
                                <DialogTitle className="flex items-center text-2xl gap-3">
                                    <FileText />
                                    Expediente del Alumno
                                </DialogTitle>
                                <DialogDescription>
                                  {student.name} ({student.id}) | Líder: {student.leader}
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="pr-6 flex-1">
                                <ChangeHistory studentId={student.id} />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>
        </CardHeader>
        <CollapsibleContent>
          <StudentSubjects student={student} isOpen={isOpen} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
