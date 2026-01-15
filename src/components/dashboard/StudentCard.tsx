

"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, FileText, Award, Copy, Check, ClipboardCopy, Send } from 'lucide-react';
import { type Student, type SubjectSummary, type Team, type Change, type SeguimientoEntry } from "@/types/student";
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

interface StudentCardProps {
  student: Student;
  teams: Team[];
  changes: Change[];
  seguimiento: (SeguimientoEntry)[];
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

function WhatsAppNotification({ student, changes, seguimiento, onSent }: { student: Student, changes: Change[], seguimiento: SeguimientoEntry[], onSent: () => void }) {
    const { studentContacts, toast } = useDashboardFilters();
    
    const phoneNumber = studentContacts[student.id]?.studentPhone?.replace(/\D/g, '');

    const lastSentNotification = useMemo(() => {
        return seguimiento
            .filter(s => s.topic === 'Notificación WhatsApp (Auto)')
            .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0];
    }, [seguimiento]);

    const handleSend = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!phoneNumber) {
            toast({
                variant: "destructive",
                title: "Teléfono no encontrado",
                description: "No hay un número de teléfono registrado para este alumno.",
            });
            return;
        }

        const changesBySubject: Record<string, { absences: boolean, missed: boolean }> = {};

        changes.forEach(change => {
            if (change.fieldName === 'absences' || change.fieldName === 'missedAssignments') {
                const subject = student.subjects?.find(s => s.id === change.subjectId);
                if (subject) {
                    if (!changesBySubject[subject.name]) {
                        changesBySubject[subject.name] = { absences: false, missed: false };
                    }
                    if (change.fieldName === 'absences') changesBySubject[subject.name].absences = true;
                    if (change.fieldName === 'missedAssignments') changesBySubject[subject.name].missed = true;
                }
            }
        });

        let message = `Hola ${student.name.split(' ')[0]}, te escribo para recordarte que recientemente has tenido nuevas faltas y/o tareas no entregadas (NE) en las siguientes materias:\n\n`;

        for (const subjectName in changesBySubject) {
            const { absences, missed } = changesBySubject[subjectName];
            let changeTypes = [];
            if (absences) changeTypes.push('faltas');
            if (missed) changeTypes.push('NE');
            message += `• *${subjectName}*: Nuevas ${changeTypes.join(' y ')}.\n`;
        }

        message += `\nRecuerda que es importante cuidar tu asistencia y la entrega de actividades para no afectar tu calificación. ¡Estoy para apoyarte si tienes alguna duda!`;
        
        const whatsappUrl = `https://wa.me/52${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Registrar el envío en Firestore
        const totalAbsences = student.subjectSummaries?.reduce((acc, s) => acc + s.absences, 0) || 0;
        const totalMissed = student.subjectSummaries?.reduce((acc, s) => acc + s.missedAssignments, 0) || 0;
        const newEntry: Omit<SeguimientoEntry, 'id' | 'createdAt'> = {
            studentId: student.id,
            studentName: student.name,
            attendedBy: 'Sistema Automático',
            topic: 'Notificación WhatsApp (Auto)',
            notes: message,
            absencesAtFollowUp: totalAbsences,
            missedAssignmentsAtFollowUp: totalMissed,
        };

        addSeguimientoEntry(newEntry).then(() => {
            onSent(); // Actualiza la UI
            toast({
                title: "Notificación Registrada",
                description: `Se ha guardado un registro del envío para ${student.name}.`
            });
        }).catch(err => {
            console.error("Failed to log notification:", err);
        });
    };
    
    // Si hay cambios y un número de teléfono...
    if (changes && changes.length > 0 && phoneNumber) {
        if (lastSentNotification) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" disabled>
                                <Check className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Notificación enviada el {format(lastSentNotification.createdAt.toDate(), "d MMM, HH:mm", { locale: es })}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
        
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={handleSend}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Enviar recordatorio por WhatsApp</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    return null;
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
     <>
        Matrícula: <MatriculaCopy studentId={student.id} /> | Líder: {student.leader} | Tutor: {student.tutor}
    </>
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
                    <CardDescription>{cardDescriptionContent}</CardDescription>
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
                        <CardDescription>{cardDescriptionContent}</CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <WhatsAppNotification student={student} changes={changes} seguimiento={seguimiento} onSent={fetchSeguimientoEntries} />
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
                                  {student.name} ({student.id}) | Líder: {student.leader} | Tutor: {student.tutor}
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
