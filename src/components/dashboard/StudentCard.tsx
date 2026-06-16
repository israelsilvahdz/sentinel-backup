
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, FileText, Award, Copy, Check, ClipboardCopy, Send, Users, RefreshCw, Loader2, User as UserIcon, Calendar, CheckCircle2, AlertCircle, TrendingDown, Flag } from 'lucide-react';
import { type Student, type SubjectSummary, type Team, type Change, type Subject } from "@/types/student";
import { getStudentOverallRisk, type RiskLevel, getRisk, getCriticalSubjectsList, calculateSubjectPotential } from '@/lib/dataProcessor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from '../ui/scroll-area';
import { StudentSubjects } from './StudentSubjects';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';


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
    if (overallRisk === 'low') return <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-black uppercase tracking-tighter h-5">Estable</Badge>;
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
            toast({ title: "¡Matrícula copiada!", description: `Se copió la matrícula ${studentId}.` });
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
                <TooltipContent><p className="font-bold text-xs">¡Copiado!</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function StudentCard({ student, teams, changes, startOpen = false, isDialog = false, isSelected = false, onSelectionChange = () => {} }: StudentCardProps) {
  const [isOpen, setIsOpen] = useState(startOpen);
  const { studentContacts, toast, loadStudentSubjects, weightingSchemes, fetchStudentContact, filterType, selectedValue, priorityCases, togglePriorityCase } = useDashboardFilters();
  const [isNotifying, setIsNotifying] = useState<'student' | 'parent' | false>(false);
  
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [priorityTopic, setPriorityTopic] = useState(priorityCases[student.id]?.topic || '');

  const isPriority = !!priorityCases[student.id];

  const formatWhatsAppNumber = (phone: string): string => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    return `52${clean.slice(-10)}`;
  };

  const generateMessage = (recipient: 'student' | 'parent'): string => {
    const increaseChangesBySubject: Record<string, { absences: boolean, missed: boolean }> = {};
    
    (changes || []).forEach(change => {
        if (change.fieldName === 'absences' || change.fieldName === 'missedAssignments') {
            const subject = student.subjectSummaries?.find(s => s.id === change.subjectId);
            if (subject && change.changeType === 'increase') {
                if (!increaseChangesBySubject[subject.name]) increaseChangesBySubject[subject.name] = { absences: false, missed: false };
                if (change.fieldName === 'absences') increaseChangesBySubject[subject.name].absences = true;
                if (change.fieldName === 'missedAssignments') increaseChangesBySubject[subject.name].missed = true;
            }
        }
    });
    
    let firstName = student.name.split(',')[1]?.trim().split(' ')[0] || student.name.split(' ')[0];
    let message = '';

    if (Object.keys(increaseChangesBySubject).length > 0) {
        message = recipient === 'student' 
            ? `Hola ${firstName}, te escribo para recordarte que recientemente has tenido nuevas faltas y/o tareas no entregadas en:\n\n`
            : `Estimados padres de ${student.name}, les notificamos un aumento en el riesgo académico de su hijo/a en:\n\n`;

        for (const subName in increaseChangesBySubject) {
            const info = student.subjectSummaries?.find(s => s.name === subName);
            if (!info) continue;
            const details = [];
            if (increaseChangesBySubject[subName].absences) details.push(`Faltas: ${info.absences}/${info.absenceLimit}`);
            if (increaseChangesBySubject[subName].missed) details.push(`Tareas NE: ${info.missedAssignments}/${info.missedAssignmentLimit}`);
            message += `• *${subName}*: ${details.join(' y ')}.\n`;
        }
    } else {
        message = `Hola, te contacto del área de Mentoría de Tecmilenio para dar seguimiento al progreso académico de ${student.name}. ¿Podemos conversar?`;
    }
    return message;
  };

  const handleSend = async (e: React.MouseEvent, recipient: 'student' | 'parent') => {
    e.stopPropagation();
    const contact = studentContacts[student.id];
    const phoneNumber = recipient === 'student' ? contact?.studentPhone : (contact?.momPhone || contact?.dadPhone);
    
    if (!phoneNumber) {
        toast({ variant: "destructive", title: "Teléfono no encontrado", description: "Carga el directorio o añade el número manualmente." });
        return;
    }

    const message = generateMessage(recipient);
    const whatsappUrl = `https://wa.me/${formatWhatsAppNumber(phoneNumber)}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePriorityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPriority) togglePriorityCase(student.id, false);
    else setIsPriorityModalOpen(true);
  };

  const handleSavePriority = () => {
    togglePriorityCase(student.id, true, priorityTopic);
    setIsPriorityModalOpen(false);
  };

  const initials = useMemo(() => {
    const parts = student.name.split(',').reverse().join(' ').trim().split(' ').filter(Boolean);
    return (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '');
  }, [student.name]);

  if (isDialog) {
    return (
      <Card className="h-full flex flex-col border-none shadow-none">
        <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-900 flex items-center justify-center text-white font-black text-lg shadow-inner shrink-0">{initials}</div>
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
        <ScrollArea className="flex-1 pr-6 -mr-6"><StudentSubjects student={student} isOpen={true} /></ScrollArea>
      </Card>
    )
  }

  return (
    <Card className={cn("transition-all duration-300 border-none shadow-sm hover:shadow-md group/student", isSelected ? 'ring-2 ring-primary' : '', isOpen && 'shadow-lg ring-1 ring-primary/5')}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4 cursor-pointer flex items-center justify-between" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="flex items-center gap-3 shrink-0">
                    <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelectionChange(student.id, !!checked)} onClick={(e) => e.stopPropagation()} className="h-5 w-5 rounded-md border-primary/20 data-[state=checked]:bg-primary" />
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-sm uppercase group-hover/student:from-primary group-hover/student:to-emerald-900 group-hover/student:text-white transition-all duration-500 shadow-inner">{initials}</div>
                </div>
                <div className="overflow-hidden space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn("text-base font-bold tracking-tight truncate max-w-[200px] sm:max-w-md", isOpen && "text-primary")}>{student.name}</h3>
                        {isPriority && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] font-black uppercase h-5 gap-1 shadow-sm">
                                <Flag className="h-2.5 w-2.5 fill-current" /> {priorityCases[student.id].topic}
                            </Badge>
                        )}
                        {student.subjectSummaries && <OverallRiskBadge student={student} subjects={student.subjectSummaries} />}
                    </div>
                    <div className="flex items-center gap-3">
                        <MatriculaCopy studentId={student.id} />
                        <span className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest hidden sm:inline">Líder: {student.leader}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 opacity-0 group-hover/student:opacity-100 transition-opacity">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50" onClick={(e) => handleSend(e, 'student')}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="font-bold">Notificar Alumno</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-50" onClick={(e) => handleSend(e, 'parent')}>
                                    <Users className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="font-bold">Notificar Padres</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", isPriority ? "text-amber-600 bg-amber-50" : "text-muted-foreground hover:bg-amber-50 hover:text-amber-600")} onClick={handlePriorityToggle}>
                                    <Flag className={cn("h-4 w-4", isPriority && "fill-current")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="font-bold">Marcar Seguimiento</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className={cn("p-1 rounded-full transition-colors", isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </div>
        </div>
        <CollapsibleContent><div className="border-t border-muted/50 bg-muted/5 p-2 sm:p-4 rounded-b-3xl"><StudentSubjects student={student} isOpen={isOpen} /></div></CollapsibleContent>
      </Collapsible>

      <Dialog open={isPriorityModalOpen} onOpenChange={setIsPriorityModalOpen}>
          <DialogContent className="rounded-3xl max-w-sm">
              <DialogHeader>
                  <DialogTitle className="font-black">Seguimiento Prioritario</DialogTitle>
                  <DialogDescription className="font-bold text-xs">Escribe el tema o motivo de seguimiento para este alumno.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Input 
                    placeholder="Ej. Faltas por salud, Riesgo de baja..." 
                    value={priorityTopic} 
                    onChange={(e) => setPriorityTopic(e.target.value)}
                    className="rounded-xl font-bold"
                  />
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsPriorityModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                  <Button onClick={handleSavePriority} className="rounded-xl font-bold shadow-lg shadow-primary/20">Guardar Marcado</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
