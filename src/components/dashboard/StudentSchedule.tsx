
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { type Subject, type ProfessorContact } from '@/types/student';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Copy, Mail, Clock, Users, Link as LinkIcon, Check, Info, User as UserIcon, BookOpen, GraduationCap, Calendar, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { Calendar as CalendarPicker } from '../ui/calendar';
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

const SUBJECT_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500', icon: 'text-blue-400', dayAccent: 'bg-blue-400' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500', icon: 'text-emerald-400', dayAccent: 'bg-emerald-400' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-500', icon: 'text-orange-400', dayAccent: 'bg-orange-400' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', accent: 'bg-purple-500', icon: 'text-purple-400', dayAccent: 'bg-purple-400' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-500', icon: 'text-amber-400', dayAccent: 'bg-amber-400' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accent: 'bg-rose-500', icon: 'text-rose-400', dayAccent: 'bg-rose-400' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-500', icon: 'text-indigo-400', dayAccent: 'bg-indigo-400' },
];

function getSubjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[index];
}

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
        
        if (!isPartialAbsence) {
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
      <div className="p-4 sm:p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-200/60 shadow-inner space-y-10 animate-in fade-in duration-700">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
             <div className="space-y-1">
                <h3 className="text-2xl font-black text-primary tracking-tight">Planificador de Agenda</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Distribución Semanal de Bloques
                </p>
             </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button className="rounded-2xl font-black shadow-xl shadow-primary/20 h-12 px-8 hover:scale-[1.02] active:scale-95 transition-all">
                        <Mail className="mr-2 h-5 w-5" />
                        Notificar Profesores
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none shadow-2xl p-8">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-3xl font-black text-primary">Central de Notificaciones</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs uppercase font-black tracking-widest opacity-60">
                      Envío masivo de avisos de ausencia para {studentName}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-6 -mr-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 py-6">
                        <div className="flex flex-col items-center md:col-span-1">
                           <Label className="mb-4 text-[10px] font-black uppercase tracking-widest opacity-70">1. Rango de Fechas</Label>
                           <CalendarPicker
                              mode="range"
                              selected={dateRange}
                              onSelect={setDateRange}
                              locale={es}
                              numberOfMonths={1}
                              className="rounded-3xl border bg-white shadow-sm p-4"
                          />
                        </div>

                        <div className="space-y-8 md:col-span-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 bg-white p-4 rounded-2xl border border-dashed border-primary/20 shadow-sm">
                                <Checkbox id="future-notice" checked={isFutureNotice} onCheckedChange={(checked) => setIsFutureNotice(!!checked)} className="h-5 w-5 rounded-lg" />
                                <Label htmlFor="future-notice" className="text-xs font-black uppercase opacity-70 cursor-pointer">Aviso preventivo</Label>
                            </div>
                             <div className="flex items-center space-x-3 bg-white p-4 rounded-2xl border border-dashed border-primary/20 shadow-sm">
                                <Checkbox id="has-proof" checked={hasProof} onCheckedChange={(checked) => setHasProof(!!checked)} className="h-5 w-5 rounded-lg" />
                                <Label htmlFor="has-proof" className="text-xs font-black uppercase opacity-70 cursor-pointer">Con comprobante</Label>
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-4 block">2. Motivo de la Notificación</Label>
                            <RadioGroup
                                defaultValue="Ausencia"
                                onValueChange={(value) => setNotificationReason(value)}
                                value={notificationReason}
                                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                            >
                                {['Ausencia', 'Enfermedad', 'Cita Médica', 'Asunto Familiar', 'Salida de Difusión', 'Otro'].map(reason => (
                                    <div key={reason} className="flex items-center space-x-2 bg-white border p-3 rounded-xl shadow-sm hover:border-primary/30 transition-all cursor-pointer group/radio">
                                        <RadioGroupItem value={reason} id={`reason-${reason}`} className="h-4 w-4 border-2" />
                                        <Label htmlFor={`reason-${reason}`} className="text-xs font-bold cursor-pointer group-hover/radio:text-primary transition-colors">{reason}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                          </div>
                          
                           <div className="flex items-center space-x-4 bg-primary/5 p-5 rounded-3xl border border-primary/10 shadow-inner">
                              <Switch id="partial-absence" checked={isPartialAbsence} onCheckedChange={(v) => { setIsPartialAbsence(v); if(!v) setSelectedClasses(new Set()); }} />
                              <Label htmlFor="partial-absence" className="text-sm font-black text-primary cursor-pointer flex items-center gap-2">
                                <LinkIcon className="h-4 w-4" /> ¿Es ausencia parcializada por clase?
                              </Label>
                           </div>

                           {isPartialAbsence && (
                             <div className="space-y-3">
                               <Label className="text-[10px] font-black uppercase opacity-60 tracking-widest">Clases afectadas</Label>
                               <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                 {affectedClasses.map(c => (
                                   <div key={c.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all group/clase">
                                      <div className="flex items-center space-x-4">
                                        <Checkbox id={`class-${c.id}`} checked={selectedClasses.has(c.id)} onCheckedChange={() => setSelectedClasses(prev => { const next = new Set(prev); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); return next; })} className="h-5 w-5 rounded-lg" />
                                        <Label htmlFor={`class-${c.id}`} className="text-sm font-bold cursor-pointer group-hover/clase:text-primary transition-colors">{c.name}</Label>
                                      </div>
                                      <Badge variant="secondary" className="text-[10px] font-mono h-6 bg-primary/5 text-primary border-none">{c.schedule?.startTime}</Badge>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}

                          <div className="space-y-3">
                            <Label htmlFor="custom-notes" className="text-[10px] font-black uppercase opacity-60 tracking-widest">3. Notas Estratégicas</Label>
                             <Textarea id="custom-notes" placeholder="Detalles específicos para los profesores..." value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} className="rounded-2xl resize-none min-h-[100px] border-slate-200 focus:ring-primary/20" />
                          </div>
                          
                          <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase opacity-60 tracking-widest flex items-center gap-2">
                                <Users className="h-3 w-3"/>Destinatarios Detectados ({teachersToNotify.length})
                              </Label>
                              <div className="bg-slate-50 p-5 rounded-3xl border-2 border-dashed border-slate-200 flex flex-wrap gap-2">
                                 {teachersToNotify.length > 0 ? teachersToNotify.map(t => (
                                    <Badge key={t.name} variant="outline" className={cn("bg-white border-slate-200 text-[10px] font-black uppercase tracking-tighter py-1.5 px-3 rounded-lg shadow-sm", !t.email && "border-destructive/30 text-destructive bg-destructive/5")}>
                                        {t.name} {!t.email && " (SIN EMAIL)"}
                                    </Badge>
                                 )) : <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest w-full text-center py-4 opacity-40">Define fechas para detectar profesores automáticamente</p>}
                              </div>
                          </div>
                        </div>
                    </div>
                  </ScrollArea>
                  <AlertDialogFooter className="pt-8 border-t gap-3 flex flex-col sm:flex-row">
                    <AlertDialogCancel className="rounded-2xl font-black h-12 uppercase tracking-widest text-[10px]">Cerrar</AlertDialogCancel>
                    <Button variant="outline" onClick={handleCopyToClipboard} className="rounded-2xl font-black h-12 uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5">
                      <Copy className="mr-2 h-4 w-4"/>Copiar Enlace
                    </Button>
                    <Button onClick={() => { const link = generateMailtoLink(); if (link) window.location.href = link; }} className="rounded-2xl font-black h-12 uppercase tracking-widest text-[10px] px-8 shadow-xl shadow-primary/20">
                      <Mail className="mr-2 h-4 w-4" />Abrir Correo Corporativo
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>
           
            <div className="overflow-x-auto pb-6 -mx-2 sm:mx-0">
                <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-6 min-w-[900px] relative">
                    {/* Time Column vertical line */}
                    <div className="absolute left-[40px] top-[100px] bottom-[20px] w-px bg-slate-200/60 z-0" />
                    
                    <div />
                     {DAYS.map(day => {
                        const firstSubjectInDay = Object.values(scheduleByDayAndSlot[day]).find(s => s !== null);
                        const dayColor = firstSubjectInDay ? getSubjectColor(firstSubjectInDay.name) : { dayAccent: 'bg-slate-300' };
                        return (
                          <div key={day} className="space-y-3 group/day">
                              <div className={cn("h-1.5 w-full rounded-full opacity-40 group-hover/day:opacity-100 transition-opacity", dayColor.dayAccent)} />
                              <div className="bg-transparent px-2 flex items-center justify-between">
                                  <span className="font-black text-primary text-sm tracking-widest uppercase">{day}</span>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover/day:opacity-100 transition-all hover:bg-primary/5 text-primary/40 hover:text-primary" onClick={() => handleCopyTeachersForDay(day)}>
                                              <Copy className="h-3.5 w-3.5" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="font-bold">Copiar Profesores</TooltipContent>
                                  </Tooltip>
                              </div>
                          </div>
                        )
                    })}

                    {TIME_SLOTS.map((slot, slotIndex) => (
                        <React.Fragment key={slot.start}>
                            <div className="flex flex-col items-center justify-center pt-2 relative z-10">
                                 <div className="h-3 w-3 rounded-full bg-white border-2 border-slate-300 mb-2 shadow-sm" />
                                 <Badge variant="outline" className="bg-white shadow-md border-none text-primary font-black text-[11px] h-9 px-3 rounded-xl flex items-center gap-2 tabular-nums">
                                    <Clock className="h-3 w-3 opacity-40" />
                                    {slot.start}
                                </Badge>
                            </div>
                            {DAYS.map(day => {
                                const subject = scheduleByDayAndSlot[day][slotIndex];
                                if (!subject) return <div key={`${day}-${slot.start}`} className="min-h-[120px] rounded-[2rem] border border-dashed border-slate-200/60 bg-slate-100/20" />;
                                
                                const color = getSubjectColor(subject.name);
                                
                                return (
                                    <Card 
                                      key={`${day}-${slot.start}`} 
                                      className={cn(
                                        "relative min-h-[120px] rounded-[2rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group/card cursor-default transform hover:-translate-y-1 active:scale-95",
                                        color.bg
                                      )}
                                    >
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-2 transition-all duration-500 group-hover/card:w-3", color.accent)} />
                                        <div className="p-5 space-y-4">
                                            <h4 className={cn("font-black text-[13px] leading-tight tracking-tight uppercase transition-colors duration-500", color.text)}>
                                                {subject.name}
                                            </h4>
                                            
                                            <div className="space-y-2">
                                                {subject.professorName && (
                                                    <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-tighter opacity-60 group-hover/card:opacity-100 transition-opacity">
                                                        <UserIcon className={cn("h-3.5 w-3.5", color.icon)} />
                                                        <button 
                                                            className="hover:underline hover:text-primary truncate max-w-[120px] text-left"
                                                            onClick={(e) => { e.stopPropagation(); handleProfessorClick(subject.professorName!); }}
                                                        >
                                                            {subject.professorName}
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2.5 text-[10px] font-black opacity-40 uppercase tracking-[0.1em] group-hover/card:opacity-80 transition-opacity">
                                                    <BookOpen className={cn("h-3.5 w-3.5", color.icon)} />
                                                    GRUPO: {subject.group}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover/card:opacity-10 transition-opacity transform group-hover/card:rotate-12 duration-700">
                                          <Zap size={60} className={color.text} />
                                        </div>
                                    </Card>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            
            <div className="px-4 py-6 bg-white/40 rounded-3xl border border-white/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div className="text-xs font-bold text-muted-foreground leading-relaxed">
                  Las materias de <span className="text-primary">Tecmilenio</span> se organizan automáticamente para maximizar tu productividad.
                  <br className="hidden sm:block" />
                  Usa el botón de notificaciones para gestionar avisos masivos a tus profesores.
                </div>
              </div>
              <Badge variant="outline" className="rounded-xl border-primary/20 text-primary font-black px-4 py-1 bg-white">
                Ciclo Académico 2026
              </Badge>
            </div>
      </div>
    </TooltipProvider>
  );
}
