
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
    'LUN': 'Lunes', 'MAR': 'Martes', 'MIE': 'Miércoles', 'JUE': 'Jueves', 'VIE': 'Viernes',
};

const ONLINE_SUBJECTS = ['Ciencias de la Vida', 'El mundo contemporáneo'];

const SUBJECT_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', accent: 'bg-blue-500', icon: 'text-blue-400', dayAccent: 'bg-blue-400' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', accent: 'bg-emerald-500', icon: 'text-emerald-400', dayAccent: 'bg-emerald-400' },
  { bg: 'bg-orange-50', text: 'text-orange-700', accent: 'bg-orange-500', icon: 'text-orange-400', dayAccent: 'bg-orange-400' },
  { bg: 'bg-purple-50', text: 'text-purple-700', accent: 'bg-purple-500', icon: 'text-purple-400', dayAccent: 'bg-purple-400' },
  { bg: 'bg-amber-50', text: 'text-amber-700', accent: 'bg-amber-500', icon: 'text-amber-400', dayAccent: 'bg-amber-400' },
  { bg: 'bg-rose-50', text: 'text-rose-700', accent: 'bg-rose-500', icon: 'text-rose-400', dayAccent: 'bg-rose-400' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', accent: 'bg-indigo-500', icon: 'text-indigo-400', dayAccent: 'bg-indigo-400' },
];

function getSubjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[index];
}

export function StudentSchedule({ subjects, studentName, planType, professorContacts }: StudentScheduleProps) {
  const { toast } = useToast();
  const { setActiveView, setFilterType, setSelectedValue } = useDashboardFilters();
  const [notificationReason, setNotificationReason] = useState("Ausencia");
  const [customNotes, setCustomNotes] = useState("");
  const [isPartialAbsence, setIsPartialAbsence] = useState(false);
  const [hasProof, setHasProof] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [teachersToNotify, setTeachersToNotify] = useState<{name: string, email: string | null}[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());

  // GENERACIÓN DINÁMICA DE SLOTS DE TIEMPO SEGÚN LAS MATERIAS DEL ALUMNO
  const timeSlots = useMemo(() => {
    const hours = new Set<string>();
    subjects.forEach(s => {
        if (s.schedule?.startTime) hours.add(s.schedule.startTime);
    });
    return Array.from(hours).sort().map(h => ({ start: h, end: '' }));
  }, [subjects]);

  const scheduleGrid = useMemo(() => {
    const grid: Record<string, Record<string, Subject | null>> = {};
    DAYS.forEach(day => {
        grid[day] = {};
        timeSlots.forEach(slot => {
            grid[day][slot.start] = subjects.find(s => s.schedule?.days.includes(day) && s.schedule.startTime === slot.start) || null;
        });
    });
    return grid;
  }, [subjects, timeSlots]);

  const handleProfessorClick = (professorName: string) => {
    setFilterType('professor');
    setSelectedValue(professorName);
    setActiveView('professor-schedule');
  };

  const handleCopyTeachersForDay = (day: string) => {
     const teachers = Object.values(scheduleGrid[day]).map(s => s?.professorName).filter(Boolean) as string[];
     if (teachers.length === 0) return toast({ title: 'Sin Profesores' });
     navigator.clipboard.writeText([...new Set(teachers)].join('\n')).then(() => toast({ title: '¡Copiado!' }));
  };

  const generateMailtoLink = (): string | undefined => {
    if (!dateRange?.from) return;
    const recipients = teachersToNotify.map(t => t.email).filter(Boolean).join(',');
    const body = `Estimados profesores,\n\nNotifico que el alumno ${studentName} se ausentará por ${notificationReason}.\n\nSaludos.`;
    return `mailto:${recipients}?subject=Notificación de Ausencia&body=${encodeURIComponent(body)}`;
  };

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-200/60 shadow-inner space-y-10 animate-in fade-in duration-700">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
             <div className="space-y-1">
                <h3 className="text-2xl font-black text-primary tracking-tight">Planificador de Agenda</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Horario Completo Detectado
                </p>
             </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button className="rounded-2xl font-black shadow-xl shadow-primary/20 h-12 px-8 hover:scale-[1.02] active:scale-95 transition-all">
                        <Mail className="mr-2 h-5 w-5" /> Notificar Profesores
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-4xl rounded-[2.5rem] p-8">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-3xl font-black text-primary text-center">Central de Notificaciones</AlertDialogTitle>
                  </AlertDialogHeader>
                  <ScrollArea className="max-h-[60vh] py-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <CalendarPicker mode="range" selected={dateRange} onSelect={setDateRange} locale={es} className="rounded-3xl border bg-white shadow-sm p-4" />
                        <div className="md:col-span-2 space-y-6">
                            <div className="space-y-2"><Label className="text-xs font-black uppercase opacity-60">Motivo</Label>
                                <RadioGroup onValueChange={setNotificationReason} className="grid grid-cols-2 gap-2">
                                    {['Ausencia', 'Enfermedad', 'Cita Médica', 'Deporte', 'Otro'].map(r => (
                                        <div key={r} className="flex items-center space-x-2 border p-3 rounded-xl bg-white">
                                            <RadioGroupItem value={r} id={r} /><Label htmlFor={r} className="text-xs font-bold cursor-pointer">{r}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <Textarea placeholder="Notas adicionales..." value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} className="rounded-2xl min-h-[100px]" />
                        </div>
                    </div>
                  </ScrollArea>
                  <AlertDialogFooter className="pt-6 border-t">
                    <AlertDialogCancel className="rounded-xl font-bold">Cerrar</AlertDialogCancel>
                    <Button onClick={() => window.open(generateMailtoLink())} className="rounded-xl font-black px-8">Abrir Correo</Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>
           
            <div className="overflow-x-auto pb-6">
                <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-6 min-w-[900px] relative">
                    <div className="absolute left-[40px] top-[80px] bottom-[20px] w-px bg-slate-200 z-0" />
                    <div />
                    {DAYS.map(day => (
                        <div key={day} className="space-y-3 group/day">
                            <div className="h-1.5 w-full rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                            <div className="flex items-center justify-between px-2">
                                <span className="font-black text-primary text-sm tracking-widest">{day}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleCopyTeachersForDay(day)}><Copy size={12} /></Button>
                            </div>
                        </div>
                    ))}

                    {timeSlots.map((slot) => (
                        <React.Fragment key={slot.start}>
                            <div className="flex flex-col items-center justify-start pt-4 relative z-10">
                                 <Badge className="bg-white shadow-sm border text-primary font-black text-[11px] h-8 px-2 rounded-lg tabular-nums">
                                    {slot.start}
                                </Badge>
                            </div>
                            {DAYS.map(day => {
                                const subject = scheduleGrid[day][slot.start];
                                if (!subject) return <div key={`${day}-${slot.start}`} className="min-h-[120px] rounded-[2rem] border border-dashed border-slate-100 bg-slate-50/20" />;
                                const color = getSubjectColor(subject.name);
                                return (
                                    <Card key={`${day}-${slot.start}`} className={cn("relative min-h-[120px] rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group/card", color.bg)}>
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-2", color.accent)} />
                                        <div className="p-5 space-y-4">
                                            <h4 className={cn("font-black text-[12px] leading-tight uppercase", color.text)}>{subject.name}</h4>
                                            <div className="space-y-1">
                                                {subject.professorName && (
                                                    <button className="text-[9px] font-black text-slate-400 hover:text-primary uppercase truncate block w-full text-left" onClick={() => handleProfessorClick(subject.professorName!)}>
                                                        {subject.professorName}
                                                    </button>
                                                )}
                                                <span className="text-[9px] font-bold text-slate-300 block uppercase">GPO: {subject.group}</span>
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
