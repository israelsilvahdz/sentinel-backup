
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { type Subject, type ProfessorContact } from '@/types/student';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Copy, Mail, Clock, Users, Link as LinkIcon, Check, Info, User as UserIcon, BookOpen, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { Checkbox } from '../ui/checkbox';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import { useDashboardFilters } from './DashboardClient';


interface StudentScheduleProps {
  subjects: Subject[];
  studentName: string;
  planType: 'semestral' | 'tetramestral';
  professorContacts: Record<string, ProfessorContact>;
}

const DAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'];
const DAY_MAP: Record<string, string> = {
    'LUN': 'Lunes',
    'MAR': 'Martes',
    'MIE': 'Miércoles',
    'JUE': 'Jueves',
    'VIE': 'Viernes',
};

const DATE_FNS_DAY_TO_KEY: Record<number, string> = {
    1: 'LUN',
    2: 'MAR',
    3: 'MIE',
    4: 'JUE',
    5: 'VIE',
};

const ONLINE_SUBJECTS = ['Ciencias de la Vida', 'El mundo contemporáneo'];


const TIME_SLOTS_TETRA = [
    { start: '07:00', end: '08:59' },
    { start: '09:00', end: '10:59' },
    { start: '11:30', end: '13:29' },
    { start: '13:30', end: '14:50' },
];

const TIME_SLOTS_SEMESTRAL = [
    { start: '07:00', end: '07:59' },
    { start: '08:00', end: '08:59' },
    { start: '09:00', end: '09:59' },
    { start: '10:00', end: '10:59' },
    { start: '11:30', end: '12:29' },
    { start: '12:30', end: '13:29' },
];

function isSubjectInSlot(subject: Subject, slot: { start: string, end: string }, planType: 'semestral' | 'tetramestral'): boolean {
    if (!subject.schedule?.startTime) return false;
    return subject.schedule.startTime === slot.start;
}


export function StudentSchedule({ subjects, studentName, planType, professorContacts }: StudentScheduleProps) {
  const { toast } = useToast();
  const { setActiveView, setFilterType, setSelectedValue } = useDashboardFilters();
  const [notificationReason, setNotificationReason] = useState("Ausencia");
  const [customNotes, setCustomNotes] = useState("");
  const [isFutureNotice, setIsFutureNotice] = useState(false);
  const [isPartialAbsence, setIsPartialAbsence] = useState(false);
  const [hasProof, setHasProof] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [teachersToNotify, setTeachersToNotify] = useState<{name: string, email: string | null}[]>([]);
  const [affectedClasses, setAffectedClasses] = useState<Subject[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());

  const TIME_SLOTS = planType === 'semestral' ? TIME_SLOTS_SEMESTRAL : TIME_SLOTS_TETRA;
  
  const getProfessorEmail = useCallback((name: string): string | null => {
      if (!name) return null;
      const normalizedNameId = name.toLowerCase().replace(/\s+/g, '');
      return professorContacts[normalizedNameId]?.email || null;
  }, [professorContacts]);
  
  const handleProfessorClick = (professorName: string) => {
    setFilterType('professor');
    setSelectedValue(professorName);
    setActiveView('professor-schedule');
  };

  useEffect(() => {
    if (dateRange?.from) {
        const affectedDays = new Set<string>();
        const start = dateRange.from;
        const end = dateRange.to || start;

        let currentDate = start;
        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay(); 
            if (DATE_FNS_DAY_TO_KEY[dayOfWeek]) {
                affectedDays.add(DATE_FNS_DAY_TO_KEY[dayOfWeek]);
            }
            currentDate = new Date(currentDate.valueOf() + 86400000);
        }

        const classesOnAffectedDays = subjects.filter(subject => 
            !ONLINE_SUBJECTS.includes(subject.name) &&
            subject.professorName &&
            subject.schedule?.days.some(day => affectedDays.has(day))
        );
        setAffectedClasses(classesOnAffectedDays);
        
        if (isPartialAbsence) {
            // Wait for selection
        } else {
            const uniqueTeachers = new Map<string, {name: string, email: string | null}>();
            classesOnAffectedDays.forEach(subject => {
                 if (!uniqueTeachers.has(subject.professorName!)) {
                    const email = getProfessorEmail(subject.professorName!);
                    uniqueTeachers.set(subject.professorName!, { name: subject.professorName!, email });
                }
            });
            setTeachersToNotify(Array.from(uniqueTeachers.values()));
        }

    } else {
        setTeachersToNotify([]);
        setAffectedClasses([]);
    }
  }, [dateRange, subjects, isPartialAbsence, getProfessorEmail]);
  
  useEffect(() => {
    if (isPartialAbsence && affectedClasses.length > 0) {
      const uniqueTeachers = new Map<string, {name: string, email: string | null}>();
      affectedClasses.forEach(subject => {
        if (selectedClasses.has(subject.id) && subject.professorName) {
           if (!uniqueTeachers.has(subject.professorName)) {
              const email = getProfessorEmail(subject.professorName);
              uniqueTeachers.set(subject.professorName, { name: subject.professorName, email });
          }
        }
      });
      setTeachersToNotify(Array.from(uniqueTeachers.values()));
    }
  }, [isPartialAbsence, selectedClasses, affectedClasses, getProfessorEmail]);


  const scheduleByDayAndSlot = useMemo(() => {
    const grid: Record<string, (Subject | null)[]> = {};

    const thu9amSubject = planType === 'semestral' 
        ? subjects.find(subject => 
            subject.schedule?.days.includes('JUE') && subject.schedule.startTime === '09:00'
          )
        : undefined;

    DAYS.forEach(day => {
        grid[day] = TIME_SLOTS.map(slot => {
            return subjects.find(subject => 
                subject.schedule?.days.includes(day) && isSubjectInSlot(subject, slot, planType)
            ) || null;
        });
    });
    
    if (thu9amSubject) {
        const tue9amIndex = TIME_SLOTS.findIndex(slot => slot.start === '09:00');
        const tue10amIndex = TIME_SLOTS.findIndex(slot => slot.start === '10:00');
        
        if (tue9amIndex !== -1) grid['MAR'][tue9amIndex] = thu9amSubject;
        if (tue10amIndex !== -1) grid['MAR'][tue10amIndex] = thu9amSubject;
    }
    
    return grid;
  }, [subjects, TIME_SLOTS, planType]);

  
  const handleCopyTeachersForDay = (day: string) => {
     const teachersForDay: string[] = [];
     scheduleByDayAndSlot[day].forEach(subject => {
        if (subject?.professorName && !ONLINE_SUBJECTS.includes(subject.name)) {
            teachersForDay.push(subject.professorName);
        }
     });

    if (teachersForDay.length === 0) {
      toast({ title: 'Sin Profesores', description: `No hay profesores presenciales el ${DAY_MAP[day]}.` });
      return;
    }
    
    const uniqueTeachers = [...new Set(teachersForDay)];
    navigator.clipboard.writeText(uniqueTeachers.join('\n')).then(() => {
      toast({ title: '¡Copiado!', description: `Se copiaron ${uniqueTeachers.length} profesores del ${DAY_MAP[day]}.` });
    });
  };
  
  const generateMailtoLink = (): string | undefined => {
    if (teachersToNotify.length === 0) {
        toast({ variant: "destructive", title: 'Sin Profesores', description: `Selecciona fechas y clases.` });
        return;
    }
     if (!dateRange?.from) {
        toast({ variant: "destructive", title: 'Fechas no seleccionadas' });
        return;
    }

    let dateText;
    if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
        dateText = `del ${format(dateRange.from, "d 'de' LLLL", { locale: es })} al ${format(dateRange.to, "d 'de' LLLL 'de' yyyy", { locale: es })}`;
    } else {
        dateText = `el día ${format(dateRange.from, "EEEE d 'de' LLLL 'de' yyyy", { locale: es })}`;
    }

    let body = `Estimados profesores,\n\n`;
    body += `Les notifico sobre el alumno ${studentName} con respecto al periodo ${dateText}.\n\n`;
    body += `Motivo: ${notificationReason}\n`;

    if (isPartialAbsence) {
        const selectedClassNames = affectedClasses.filter(c => selectedClasses.has(c.id)).map(c => c.name).join(', ');
        body += `Clases afectadas: ${selectedClassNames || 'Ninguna seleccionada'}\n`;
    }

    if (hasProof) body += `El alumno presentó comprobante del motivo.\n`;
    if (customNotes) body += `\nNotas adicionales:\n${customNotes}\n`;
    body += `\nAgradezco su atención.\n\nSaludos cordiales,`;
    
    const recipients = teachersToNotify.map(t => t.email).filter(Boolean).join(',');
    const subject = notificationReason === 'Ausencia' ? 'Notificación de Ausencia' : 'Notificación Académica';

    return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  const handleCopyToClipboard = () => {
    const link = generateMailtoLink();
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        toast({ title: 'Enlace copiado', description: 'Pégalo en tu navegador para abrir el correo.' });
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="p-2 sm:p-6 bg-white/50 backdrop-blur-sm rounded-3xl border border-primary/5 shadow-inner space-y-8 animate-in fade-in duration-700">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="space-y-1">
                <h3 className="text-xl font-black text-primary tracking-tight">Agenda Semestral</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Distribución de bloques académicos
                </p>
             </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button className="rounded-xl font-black shadow-lg shadow-primary/20 h-11 px-8 hover:scale-[1.02] active:scale-95 transition-all">
                        <Mail className="mr-2 h-4 w-4" />
                        Notificar Profesores
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-4xl rounded-3xl border-none shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black">Central de Notificaciones</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs uppercase font-black tracking-widest opacity-60">
                      Envío masivo de avisos de ausencia para {studentName}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6">
                        <div className="flex flex-col items-center md:col-span-1">
                           <Label className="mb-4 text-xs font-black uppercase tracking-tighter opacity-70">1. Rango de Fechas</Label>
                           <Calendar
                              mode="range"
                              selected={dateRange}
                              onSelect={setDateRange}
                              locale={es}
                              numberOfMonths={1}
                              className="rounded-2xl border bg-muted/20"
                          />
                        </div>

                        <div className="space-y-8 md:col-span-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 bg-muted/30 p-3 rounded-xl border border-dashed">
                                <Checkbox id="future-notice" checked={isFutureNotice} onCheckedChange={(checked) => setIsFutureNotice(!!checked)} />
                                <Label htmlFor="future-notice" className="text-xs font-bold cursor-pointer">Aviso preventivo</Label>
                            </div>
                             <div className="flex items-center space-x-3 bg-muted/30 p-3 rounded-xl border border-dashed">
                                <Checkbox id="has-proof" checked={hasProof} onCheckedChange={(checked) => setHasProof(!!checked)} />
                                <Label htmlFor="has-proof" className="text-xs font-bold cursor-pointer">Con comprobante</Label>
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs font-black uppercase tracking-tighter opacity-70 mb-3 block">2. Motivo de la Notificación</Label>
                            <RadioGroup
                                defaultValue="Ausencia"
                                onValueChange={(value) => setNotificationReason(value)}
                                value={notificationReason}
                                className="grid grid-cols-2 gap-3"
                            >
                                {['Ausencia', 'Enfermedad', 'Cita Médica', 'Asunto Familiar', 'Salida de Difusión', 'Otro'].map(reason => (
                                    <div key={reason} className="flex items-center space-x-2 bg-white border p-3 rounded-xl shadow-sm hover:border-primary/30 transition-colors cursor-pointer">
                                        <RadioGroupItem value={reason} id={`reason-${reason}`} />
                                        <Label htmlFor={`reason-${reason}`} className="text-xs font-bold cursor-pointer">{reason}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                          </div>
                          
                           <div className="flex items-center space-x-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                              <Switch id="partial-absence" checked={isPartialAbsence} onCheckedChange={(v) => { setIsPartialAbsence(v); if(!v) setSelectedClasses(new Set()); }} />
                              <Label htmlFor="partial-absence" className="text-sm font-black text-primary cursor-pointer flex items-center gap-2">
                                <LinkIcon className="h-4 w-4" /> ¿Es ausencia parcializada por clase?
                              </Label>
                           </div>

                           {isPartialAbsence && (
                             <div className="space-y-3">
                               <Label className="text-xs font-black uppercase opacity-60">Clases afectadas</Label>
                               <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2">
                                 {affectedClasses.map(c => (
                                   <div key={c.id} className="flex items-center justify-between bg-white p-3 rounded-xl border shadow-sm">
                                      <div className="flex items-center space-x-3">
                                        <Checkbox id={`class-${c.id}`} checked={selectedClasses.has(c.id)} onCheckedChange={() => setSelectedClasses(prev => { const next = new Set(prev); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); return next; })} />
                                        <Label htmlFor={`class-${c.id}`} className="text-xs font-bold cursor-pointer">{c.name}</Label>
                                      </div>
                                      <Badge variant="secondary" className="text-[10px] font-mono">{c.schedule?.startTime}</Badge>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}

                          <div className="space-y-3">
                            <Label htmlFor="custom-notes" className="text-xs font-black uppercase opacity-60">3. Notas Estratégicas</Label>
                             <Textarea id="custom-notes" placeholder="Detalles para los profesores..." value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} className="rounded-2xl resize-none" />
                          </div>
                          <div className="space-y-3">
                              <Label className="text-xs font-black uppercase opacity-60 flex items-center gap-2"><Users className="h-3 w-3"/>Destinatarios Detectados ({teachersToNotify.length})</Label>
                              <div className="bg-muted/30 p-4 rounded-2xl border border-dashed flex flex-wrap gap-2">
                                 {teachersToNotify.length > 0 ? teachersToNotify.map(t => (
                                    <Badge key={t.name} variant="outline" className={cn("bg-white border-primary/10 text-[10px] font-bold py-1", !t.email && "border-destructive/30 text-destructive")}>
                                        {t.name} {!t.email && " (Sin Email)"}
                                    </Badge>
                                 )) : <p className="text-xs text-muted-foreground italic w-full text-center py-2">Define fechas para detectar profesores.</p>}
                              </div>
                          </div>
                        </div>
                    </div>
                  </ScrollArea>
                  <AlertDialogFooter className="pt-6 border-t gap-2">
                    <AlertDialogCancel className="rounded-xl font-bold">Cerrar</AlertDialogCancel>
                    <Button variant="outline" onClick={handleCopyToClipboard} className="rounded-xl font-bold h-11"><Copy className="mr-2 h-4 w-4"/>Copiar Enlace</Button>
                    <Button onClick={() => { const link = generateMailtoLink(); if (link) window.location.href = link; }} className="rounded-xl font-black h-11 px-8 shadow-xl shadow-primary/20"><Mail className="mr-2 h-4 w-4" />Abrir Correo</Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>
           
            <div className="overflow-x-auto pb-4 -mx-2 sm:mx-0">
                <div className="grid grid-cols-6 gap-4 min-w-[800px]">
                    <div />
                     {DAYS.map(day => (
                        <div key={day} className="bg-white/80 p-4 rounded-2xl shadow-sm border border-primary/5 flex items-center justify-between group/day">
                            <span className="font-black text-primary text-sm tracking-tight">{DAY_MAP[day]}</span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover/day:opacity-100 transition-all hover:bg-primary/10 text-primary" onClick={() => handleCopyTeachersForDay(day)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="font-bold">Copiar Profesores</TooltipContent>
                            </Tooltip>
                        </div>
                    ))}

                    {TIME_SLOTS.map((slot, slotIndex) => (
                        <React.Fragment key={slot.start}>
                            <div className="flex items-center justify-center pr-2">
                                 <Badge variant="outline" className="bg-white shadow-sm border-primary/10 text-primary font-mono text-[11px] h-8 px-3 rounded-xl flex items-center gap-2">
                                    <Clock className="h-3 w-3 opacity-40" />
                                    {slot.start}
                                </Badge>
                            </div>
                            {DAYS.map(day => {
                                const subject = scheduleByDayAndSlot[day][slotIndex];
                                if (!subject) return <div key={`${day}-${slot.start}`} className="min-h-[100px] rounded-2xl border border-dashed border-muted-foreground/10" />;
                                
                                return (
                                    <Card key={`${day}-${slot.start}`} className="relative min-h-[100px] rounded-2xl border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group/card bg-white">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 group-hover/card:bg-primary transition-colors" />
                                        <div className="p-4 space-y-3">
                                            <h4 className="font-black text-[13px] leading-tight text-foreground tracking-tight group-hover/card:text-primary transition-colors">
                                                {subject.name}
                                            </h4>
                                            
                                            <div className="space-y-1.5">
                                                {subject.professorName && (
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground group-hover/card:text-foreground transition-colors">
                                                        <UserIcon className="h-3 w-3 text-primary/40" />
                                                        <button 
                                                            className="hover:underline hover:text-primary truncate max-w-[100px] text-left"
                                                            onClick={() => handleProfessorClick(subject.professorName!)}
                                                        >
                                                            {subject.professorName}
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/50 uppercase tracking-tighter">
                                                    <BookOpen className="h-3 w-3" />
                                                    Grupo: {subject.group}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
      </div>
    </TooltipProvider>
  );
}
