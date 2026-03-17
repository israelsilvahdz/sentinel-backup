
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, FileText, Award, Copy, Check, ClipboardCopy, Send, Users, RefreshCw, Loader2, User as UserIcon, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { type Student, type SubjectSummary, type Team, type Change, type Subject } from "@/types/student";
import { getStudentOverallRisk, type RiskLevel, getRisk, getCriticalSubjectsList } from '@/lib/dataProcessor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from '../ui/scroll-area';
import { ChangeHistory } from './ChangeHistory';
import { StudentSubjects } from './StudentSubjects';
import { Checkbox } from '../ui/checkbox';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getActivityList } from '@/lib/ponderaciones';
import { cn } from '@/lib/utils';
import * as htmlToImage from 'html-to-image';


interface StudentCardProps {
  student: Student;
  teams: Team[];
  changes: Change[];
  startOpen?: boolean;
  isDialog?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (studentId: string, isSelected: boolean) => void;
}

function OverallRiskBadge({ student, subjects }: { student: Student, subjects: (SubjectSummary[]) }) {
    const { overallRisk } = getStudentOverallRisk(student, subjects);

    if (overallRisk === 'low') {
        return <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-black uppercase tracking-tighter h-5">Estable</Badge>;
    }
    
    const config: Record<string, { text: string; className: string; }> = {
        medium: { text: 'En Observación', className: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
        high: { text: 'Crítico', className: 'bg-orange-50 text-orange-700 border-orange-100' },
        at_limit: { text: 'Al Límite', className: 'bg-red-50 text-red-700 border-red-100' },
        sd: { text: 'Sin Derecho', className: 'bg-red-600 text-white border-none' },
    };

    const riskConfig = config[overallRisk];
    if (!riskConfig) return null;

    return <Badge variant="outline" className={cn("ml-2 text-[10px] font-black uppercase tracking-tighter h-5", riskConfig.className)}>{riskConfig.text}</Badge>;
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
                    <span onClick={handleCopy} className="group/copy-id inline-flex items-center gap-1 cursor-pointer rounded-md px-1 py-0.5 bg-muted/30 hover:bg-muted transition-colors font-mono font-bold text-xs text-muted-foreground uppercase tracking-tighter">
                        {studentId}
                        <span className="opacity-0 group-hover/copy-id:opacity-100 transition-opacity">
                            {isCopied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-2.5 w-2.5" />}
                        </span>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-bold text-xs">¡Copiado!</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function StudentCard({ student, teams, changes, startOpen = false, isDialog = false, isSelected = false, onSelectionChange = () => {} }: StudentCardProps) {
  const [isOpen, setIsOpen] = useState(startOpen);
  const { studentContacts, toast, loadStudentSubjects, weightingSchemes, fetchStudentContact } = useDashboardFilters();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isNotifying, setIsNotifying] = useState<'student' | 'parent' | false>(false);
  
  const teamName = useMemo(() => {
    if (!teams || teams.length === 0) return null;
    const studentTeam = teams.find(team => 
        Array.isArray(team.members) && team.members.some(member => member.id === student.id)
    );
    return studentTeam?.name;
  }, [teams, student.id]);

  const criticalSubjects = useMemo(() => {
    return getCriticalSubjectsList(student, weightingSchemes);
  }, [student, weightingSchemes]);

  const hasChanges = changes && changes.length > 0;

  const initials = useMemo(() => {
    const parts = student.name.split(',').reverse().join(' ').trim().split(' ').filter(Boolean);
    return (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '');
  }, [student.name]);

  const formatWhatsAppNumber = (phone: string): string => {
    if (!phone) return '';
    const trimmed = phone.trim();
    if (trimmed.startsWith('+')) {
        return trimmed.replace(/\D/g, '');
    }
    const clean = trimmed.replace(/\D/g, '');
    return `52${clean.slice(-10)}`;
  };

  const generateMessage = (recipient: 'student' | 'parent'): string => {
        const increaseChangesBySubject: Record<string, { absences: boolean, missed: boolean }> = {};
        const decreaseChangesBySubject: Record<string, { absences: boolean, missed: boolean }> = {};

        changes.forEach(change => {
            if (change.fieldName === 'absences' || change.fieldName === 'missedAssignments') {
                const subject = student.subjectSummaries?.find(s => s.id === change.subjectId);
                if (subject) {
                    const target = change.changeType === 'decrease' ? decreaseChangesBySubject : increaseChangesBySubject;
                    if (!target[subject.name]) {
                        target[subject.name] = { absences: false, missed: false };
                    }
                    if (change.fieldName === 'absences') target[subject.name].absences = true;
                    if (change.fieldName === 'missedAssignments') target[subject.name].missed = true;
                }
            }
        });
        
        const hasIncreases = Object.keys(increaseChangesBySubject).length > 0;
        const hasDecreases = Object.keys(decreaseChangesBySubject).length > 0;
        
        let message = '';
        let firstName = student.name.split(' ')[0];
        if (student.name.includes(',')) {
            const nameParts = student.name.split(',');
            if (nameParts.length > 1 && nameParts[1].trim()) {
                firstName = nameParts[1].trim().split(' ')[0];
            }
        }
        
        if (hasIncreases) {
            if (recipient === 'student') {
                 message += `Hola ${firstName}, te escribo para recordarte que recientemente has tenido nuevas faltas y/o tareas no entregadas (NE) en las siguientes materias:\n\n`;
            } else {
                 message += `Estimados padres de ${student.name}, les notificamos que ha habido un aumento en el riesgo académico de su hijo/a en las siguientes materias:\n\n`;
            }

            for (const subjectName in increaseChangesBySubject) {
                const subjectInfo = student.subjectSummaries?.find(s => s.name === subjectName);
                if (!subjectInfo) continue;
                
                const { absences, missed } = increaseChangesBySubject[subjectName];
                let changeDetails: string[] = [];
                if (absences) {
                    changeDetails.push(`Faltas: ${subjectInfo.absences}/${subjectInfo.absenceLimit}`);
                }
                if (missed) {
                    changeDetails.push(`Tareas NE: ${subjectInfo.missedAssignments}/${subjectInfo.missedAssignmentLimit}`);
                }
                message += `• *${subjectName}*: ${changeDetails.join(' y ')}.\n`;
            }
            if (recipient === 'student') {
                message += `\nRecuerda que es importante cuidar tu asistencia y la entrega de actividades. ¡Estoy para apoyarte!`;
            } else {
                message += `\nLes recomendamos conversar con él/ella sobre estos puntos para evitar que el riesgo aumente. Quedamos a su disposición para cualquier duda o para agendar una reunión si lo consideran necesario.`;
            }
        }

        if (hasDecreases) {
            if (hasIncreases) {
                message += '\n\n---\n\n';
            }
            if (recipient === 'student') {
                message += `¡Felicidades, ${firstName}! Veo que has mejorado tu situación en las siguientes materias:\n\n`;
                for (const subjectName in decreaseChangesBySubject) {
                    message += `• *${subjectName}*: ¡Me alegro de que hayas entregado actividades pendientes y/o mejorado tu asistencia!\n`;
                }
                message += `\n¡Sigue así, vas por excelente camino!`;
            } else { // Parent message
                message += `Adicionalmente, nos complace informarles de una mejora en la situación de ${firstName}:\n\n`;
                 for (const subjectName in decreaseChangesBySubject) {
                    message += `• *${subjectName}*: Ha habido una mejora en la entrega de actividades y/o en la asistencia.\n`;
                }
                message += `\nReconocemos su esfuerzo y el de ${firstName}.`;
            }
        }

        return message;
    }

    const handleSend = async (e: React.MouseEvent, recipient: 'student' | 'parent') => {
        e.stopPropagation();
        setIsNotifying(recipient);

        try {
            let contact = studentContacts[student.id];
            if (!contact) {
                contact = (await fetchStudentContact(student.id)) || undefined;
            }

            let phoneNumber: string | undefined;

            if (recipient === 'student') {
                phoneNumber = contact?.studentPhone;
            } else {
                phoneNumber = contact?.momPhone || contact?.dadPhone;
            }

            if (!phoneNumber) {
                toast({ variant: "destructive", title: "Teléfono no encontrado", description: `No hay un número de ${recipient === 'student' ? 'alumno' : 'padres'} registrado.` });
                return;
            }

            const message = generateMessage(recipient);
            if (!message) {
                toast({ title: "Sin nada que notificar", description: "No se generó ningún mensaje para este alumno."});
                return;
            }

            const formattedNumber = formatWhatsAppNumber(phoneNumber);
            const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
            
            window.open(whatsappUrl, '_blank');
            
            toast({ title: "WhatsApp Abierto", description: `Se ha abierto WhatsApp con el mensaje para ${recipient === 'student' ? 'el alumno' : 'los padres'}.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Error al notificar", description: "No se pudo obtener la información de contacto." });
        } finally {
            setIsNotifying(false);
        }
    };
    
    const handleSendDetailedReport = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsGeneratingReport(true);
        
        try {
            let contact = studentContacts[student.id];
            if (!contact) {
                contact = (await fetchStudentContact(student.id)) || undefined;
            }
            
            const parentPhone = contact?.momPhone || contact?.dadPhone;
            if (!parentPhone) {
                throw new Error("No hay teléfono de padres para este alumno.");
            }

            const subjects = await loadStudentSubjects(student.id);
            if (!subjects || subjects.length === 0) {
                throw new Error("No se encontraron materias para este alumno.");
            }
            
            const intro = `Estimados padres de ${student.name},\n\nA continuación, les compartimos un resumen del progreso académico de su hijo/a.\nLas calificaciones se presentan en puntos obtenidos respecto al total posible en cada materia, lo cual nos permite ver con claridad su desempeño hasta este momento.`;

            const subjectReports = subjects.map(subject => {
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
                const calculatedGradeText = maxPossiblePoints > 0 ? `${totalEarnedPoints.toFixed(2)} de ${maxPossiblePoints.toFixed(2)} pts` : 'N/D';
                
                return [
                    `*${subject.name}*:`,
                    `  • Faltas: ${subject.absences} de ${subject.absenceLimit}`,
                    `  • Tareas NE: ${subject.missedAssignments} de ${subject.missedAssignmentLimit}`,
                    `  • Calif. Calculada: ${calculatedGradeText}`
                ].join('\n');
            });
            
            const outro = `Quedamos a su disposición para cualquier duda.`;
            
            const reportMessage = [
                intro,
                ...subjectReports,
                outro
            ].join('\n\n');


            const formattedParentPhone = formatWhatsAppNumber(parentPhone);
            const whatsappUrl = `https://wa.me/${formattedParentPhone}?text=${encodeURIComponent(reportMessage)}`;

            window.open(whatsappUrl, '_blank');
            toast({ title: "WhatsApp Abierto", description: "Se ha abierto WhatsApp con el reporte detallado." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error al generar reporte", description: error.message });
        } finally {
            setIsGeneratingReport(false);
        }
    };


  if (isDialog) {
    return (
      <Card className="h-full flex flex-col border-none shadow-none">
        <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-900 flex items-center justify-center text-white font-black text-lg shadow-inner shrink-0">
                    {initials}
                </div>
                <div>
                    <CardTitle className="text-xl font-black flex items-center gap-2 tracking-tight">
                      {student.name}
                      {student.subjectSummaries && <OverallRiskBadge student={student} subjects={student.subjectSummaries} />}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-0.5">
                        <MatriculaCopy studentId={student.id} />
                        <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">• Líder: {student.leader}</span>
                    </CardDescription>
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
    <Card className={cn(
        "transition-all duration-300 border-none shadow-sm hover:shadow-md group/student",
        isSelected ? 'ring-2 ring-primary' : '',
        isOpen && 'shadow-lg ring-1 ring-primary/5'
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div 
            className="p-4 cursor-pointer flex items-center justify-between" 
            onClick={() => setIsOpen(!isOpen)}
        >
            <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="flex items-center gap-3 shrink-0">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectionChange(student.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5 rounded-md border-primary/20 data-[state=checked]:bg-primary"
                    />
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-sm uppercase group-hover/student:from-primary group-hover/student:to-emerald-900 group-hover/student:text-white transition-all duration-500 shadow-inner">
                        {initials}
                    </div>
                </div>
                
                <div className="overflow-hidden space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn(
                            "text-base font-bold tracking-tight truncate max-w-[200px] sm:max-w-md",
                            isOpen && "text-primary"
                        )}>
                            {student.name}
                        </h3>
                        {teamName && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Award className="h-4 w-4 text-blue-600 shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-lg font-bold">Equipo: {teamName}</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {student.subjectSummaries && <OverallRiskBadge student={student} subjects={student.subjectSummaries} />}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                            <MatriculaCopy studentId={student.id} />
                            <span className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest hidden sm:inline">Líder: {student.leader}</span>
                        </div>
                        
                        {/* Materias en Riesgo / Reprobadas Resumen */}
                        {!isOpen && criticalSubjects.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center mt-1 animate-in fade-in duration-500">
                                <span className="text-[9px] font-black text-destructive uppercase tracking-tighter flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Materias Críticas:
                                </span>
                                {criticalSubjects.map((sub, idx) => (
                                    <Badge 
                                        key={idx} 
                                        variant="secondary" 
                                        className={cn(
                                            "text-[8px] h-4 px-1.5 font-bold border-none uppercase tracking-tighter",
                                            sub.reason === 'sd' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                                        )}
                                    >
                                        {sub.name} {sub.reason === 'sd' ? '(SD)' : ''}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 opacity-0 group-hover/student:opacity-100 transition-opacity">
                    <TooltipProvider>
                        {hasChanges && (
                            <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-50 text-emerald-600" onClick={(e) => handleSend(e, 'student')} disabled={!!isNotifying}>
                                            {isNotifying === 'student' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-lg font-bold">Notificar Alumno</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50 text-blue-600" onClick={(e) => handleSend(e, 'parent')} disabled={!!isNotifying}>
                                            {isNotifying === 'parent' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Users className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="rounded-lg font-bold">Notificar Padres</TooltipContent>
                                </Tooltip>
                            </>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-600" onClick={handleSendDetailedReport} disabled={isGeneratingReport}>
                                    {isGeneratingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-lg font-bold">Enviar Reporte Detallado</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                
                <div className={cn(
                    "p-1 rounded-full transition-colors",
                    isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </div>
        </div>
        
        <CollapsibleContent>
          <div className="border-t border-muted/50 bg-muted/5 p-2 sm:p-4 rounded-b-3xl">
            <StudentSubjects student={student} isOpen={isOpen} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
