

"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { type Subject, type ProfessorContact } from '@/types/student';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Copy, Mail, Clock, Users, Link as LinkIcon, Check, Info } from 'lucide-react';
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

// JS getDay() -> 0:Dom, 1:Lun, 2:Mar, 3:Mie, 4:Jue, 5:Vie, 6:Sab
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

    // For semestre, we match the start time exactly.
    if (planType === 'semestral') {
        return subject.schedule.startTime === slot.start;
    }
    
    // For tetra, we check if the subject's start time matches the slot's start time.
    return subject.schedule.startTime === slot.start;
}


export function StudentSchedule({ subjects, studentName, planType, professorContacts }: StudentScheduleProps) {
  const { toast } = useToast();
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
            currentDate = new Date(currentDate.valueOf() + 86400000); // Add one day
        }

        const classesOnAffectedDays = subjects.filter(subject => 
            !ONLINE_SUBJECTS.includes(subject.name) &&
            subject.professorName &&
            subject.schedule?.days.some(day => affectedDays.has(day))
        );
        setAffectedClasses(classesOnAffectedDays);
        
        if (isPartialAbsence) {
            // Wait for user to select classes
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
        
        if (tue9amIndex !== -1) {
            grid['MAR'][tue9amIndex] = thu9amSubject;
        }
        if (tue10amIndex !== -1) {
            grid['MAR'][tue10amIndex] = thu9amSubject;
        }
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
      toast({
        title: 'Sin Profesores',
        description: `No hay profesores de materias presenciales para el ${DAY_MAP[day]}.`,
      });
      return;
    }
    
    const uniqueTeachers = [...new Set(teachersForDay)];
    const teacherListString = uniqueTeachers.join('\n');
    
    navigator.clipboard.writeText(teacherListString).then(() => {
      toast({
        title: '¡Copiado!',
        description: `Se han copiado ${uniqueTeachers.length} nombres de profesores para el ${DAY_MAP[day]}.`,
      });
    });
  };
  
  const generateMailtoLink = (): string | undefined => {
    if (teachersToNotify.length === 0) {
        toast({
            variant: "destructive",
            title: 'Sin Profesores a Notificar',
            description: `No hay profesores seleccionados. Revisa las fechas y las clases marcadas.`,
        });
        return;
    }
     if (!dateRange || !dateRange.from) {
        toast({
            variant: "destructive",
            title: 'Fechas no seleccionadas',
            description: `Por favor, selecciona el día o rango de días.`,
        });
        return;
    }

    let dateText;
    if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
        dateText = `del ${format(dateRange.from, "d 'de' LLLL", { locale: es })} al ${format(dateRange.to, "d 'de' LLLL 'de' yyyy", { locale: es })}`;
    } else {
        dateText = `el día ${format(dateRange.from, "EEEE d 'de' LLLL 'de' yyyy", { locale: es })}`;
    }

    let body = `Estimados profesores,\n\n`;
    if (isFutureNotice) {
        body += `Les notifico sobre el alumno ${studentName} con respecto a los días ${dateText}.\n\n`;
    } else {
        body += `Les notifico sobre el alumno ${studentName} con respecto al día/periodo ${dateText}.\n\n`;
    }

    body += `Motivo: ${notificationReason}\n`;

    if (isPartialAbsence) {
        const selectedClassNames = affectedClasses.filter(c => selectedClasses.has(c.id)).map(c => c.name).join(', ');
        body += `Clases afectadas: ${selectedClassNames || 'Ninguna seleccionada'}\n`;
    }

    if (hasProof) {
        body += `El alumno presentó comprobante del motivo.\n`;
    }

    if (notificationReason === 'Salida de Difusión (Embajadores)') {
        body = `Estimados profesores,\n\nLes informo que el alumno(a) ${studentName}, quien forma parte del equipo de embajadores, se ausentará de sus clases ${dateText} por motivo de una salida de difusión.\n\nAgradezco de antemano su apoyo y comprensión.\n\nSaludos cordiales,`;
    }

    if (customNotes) {
        body += `\nNotas adicionales:\n${customNotes}\n`;
    }
    body += `\nAgradezco su atención.\n\nSaludos cordiales,`;
    
    const recipients = teachersToNotify.map(t => t.email).filter(Boolean).join(',');
    
    let subject = 'Notificación';
    if(notificationReason === 'Ausencia') {
        subject = 'Notificación de Ausencia';
    }

    return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  const handleCopyToClipboard = () => {
    const link = generateMailtoLink();
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        toast({
          title: '¡Enlace copiado!',
          description: 'Pega el enlace en la barra de direcciones de tu navegador.',
        });
      });
    }
  };

  const handlePartialAbsenceToggle = (checked: boolean) => {
    setIsPartialAbsence(checked);
    if (!checked) {
        setSelectedClasses(new Set()); // Clear selection when toggled off
    }
  }

  return (
    <TooltipProvider>
      <div className="p-4 bg-muted/5 rounded-lg space-y-6">
           <div className="flex justify-end mb-4">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button>
                        <Mail className="mr-2 h-4 w-4" />
                        Notificar a Profesores
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-4xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Notificar a Profesores - {studentName}</AlertDialogTitle>
                    <AlertDialogDescription>
                      Selecciona las fechas y el motivo. El sistema filtrará a los profesores que tienen clase en esos días, excluyendo materias online.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                        <div className="flex flex-col items-center md:col-span-1">
                           <Label className="mb-2 font-semibold">1. Selecciona el día o rango</Label>
                           <Calendar
                              mode="range"
                              selected={dateRange}
                              onSelect={setDateRange}
                              locale={es}
                              numberOfMonths={1}
                              classNames={{
                                  day_selected: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:bg-destructive/90",
                                  day_range_start: "day-range-start",
                                  day_range_end: "day-range-end",
                                  day_range_middle: "bg-destructive/20 text-accent-foreground",
                              }}
                          />
                        </div>

                        <div className="space-y-6 md:col-span-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="future-notice" checked={isFutureNotice} onCheckedChange={(checked) => setIsFutureNotice(!!checked)} />
                                <Label htmlFor="future-notice">Es un aviso a futuro</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="has-proof" checked={hasProof} onCheckedChange={(checked) => setHasProof(!!checked)} />
                                <Label htmlFor="has-proof">Se presentó comprobante</Label>
                            </div>
                          </div>

                          <div>
                            <Label className="font-semibold">2. Motivo</Label>
                            <RadioGroup
                                id="notification-reason"
                                defaultValue="Ausencia"
                                onValueChange={(value) => setNotificationReason(value)}
                                value={notificationReason}
                                className="mt-2"
                            >
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Ausencia" id="r5" /><Label htmlFor="r5">Ausencia</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Enfermedad" id="r2" /><Label htmlFor="r2">Enfermedad</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Cita Médica" id="r3" /><Label htmlFor="r3">Cita Médica</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Asunto Familiar" id="r4" /><Label htmlFor="r4">Asunto Familiar</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Salida de Difusión (Embajadores)" id="r7" /><Label htmlFor="r7">Salida de Difusión (Embajadores)</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Otro" id="r6" /><Label htmlFor="r6">Otro (especificar en notas)</Label></div>
                            </RadioGroup>
                          </div>
                          
                           <div className="flex items-center space-x-2">
                              <Switch id="partial-absence" checked={isPartialAbsence} onCheckedChange={handlePartialAbsenceToggle} />
                              <Label htmlFor="partial-absence">¿Es ausencia parcializada?</Label>
                           </div>

                           {isPartialAbsence && (
                             <div className="space-y-2">
                               <Label>Clases afectadas en el período</Label>
                               <Card className="p-3 bg-muted/50 max-h-32 overflow-y-auto">
                                 {affectedClasses.length > 0 ? (
                                   affectedClasses.map(c => (
                                     <div key={c.id} className="flex items-center space-x-2 justify-between">
                                        <div className="flex items-center space-x-2">
                                          <Checkbox id={`class-${c.id}`} checked={selectedClasses.has(c.id)} onCheckedChange={() => setSelectedClasses(prev => { const next = new Set(prev); if (next.has(c.id)) { next.delete(c.id); } else { next.add(c.id); } return next; })} />
                                          <Label htmlFor={`class-${c.id}`} className="font-normal">{c.name}</Label>
                                        </div>
                                        {c.schedule?.startTime && (
                                          <Badge variant="secondary">{c.schedule.startTime} - {c.schedule.endTime}</Badge>
                                        )}
                                     </div>
                                   ))
                                 ) : <p className="text-xs text-muted-foreground">No hay clases en las fechas seleccionadas.</p>}
                               </Card>
                             </div>
                           )}

                          <div>
                            <Label htmlFor="custom-notes" className="font-semibold">3. Notas adicionales (opcional)</Label>
                             <Textarea
                                id="custom-notes"
                                placeholder="Añade aquí cualquier detalle relevante..."
                                value={customNotes}
                                onChange={(e) => setCustomNotes(e.target.value)}
                                className="mt-2"
                            />
                          </div>
                          <div className="space-y-2">
                              <Label className="font-semibold flex items-center gap-2"><Users className="h-4 w-4"/>Profesores a Notificar</Label>
                              <Card className="p-3 bg-muted/50 max-h-32 overflow-y-auto">
                                 {teachersToNotify.length > 0 ? (
                                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                                          {teachersToNotify.map(teacher => (
                                            <li key={teacher.name}>
                                              {teacher.name}
                                              {!teacher.email && <span className="text-xs text-destructive font-semibold"> (Sin correo)</span>}
                                            </li>
                                          ))}
                                      </ul>
                                 ) : (
                                      <p className="text-sm text-muted-foreground text-center">Selecciona una fecha (y clases, si es parcial) para ver los profesores.</p>
                                 )}
                              </Card>
                          </div>
                        </div>
                    </div>
                  </ScrollArea>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                     <Button variant="outline" onClick={handleCopyToClipboard}><Copy className="mr-2"/>Copiar Enlace para Web</Button>
                    <AlertDialogAction onClick={() => {
                        const link = generateMailtoLink();
                        if (link) window.location.href = link;
                    }}>Abrir en App de Correo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>
           
            <div className="grid grid-cols-6 gap-px bg-border rounded-lg border overflow-hidden">
                {/* Time column */}
                <div className="p-3 bg-card flex flex-col space-y-2">
                  <h3 className="font-bold text-center text-primary invisible">Hora</h3>
                </div>
                 {DAYS.map(day => (
                    <div key={day} className="p-3 bg-card flex flex-col items-center">
                        <div className="flex items-center justify-between w-full">
                            <h3 className="font-bold text-center text-primary flex-1">{DAY_MAP[day]}</h3>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyTeachersForDay(day)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copiar profesores del {DAY_MAP[day]}</p>
                            </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ))}

                {TIME_SLOTS.map((slot, slotIndex) => (
                    <React.Fragment key={slot.start}>
                        {/* Time slot label */}
                        <div className="p-3 bg-card border-t border-border flex items-center justify-center">
                             <Badge variant="outline" className="font-mono text-xs">
                                <Clock className="h-3 w-3 mr-1.5" />
                                {slot.start}
                            </Badge>
                        </div>
                        {DAYS.map(day => {
                            const subject = scheduleByDayAndSlot[day][slotIndex];
                            return (
                                <div key={`${day}-${slot.start}`} className="p-2 bg-card border-t border-border min-h-[90px] flex flex-col justify-center">
                                    {subject ? (
                                        <div className="p-2 bg-card rounded-md h-full flex flex-col justify-center">
                                            <div>
                                                <p className="font-semibold text-xs leading-tight">{subject.name}</p>
                                                <p className="text-xs text-muted-foreground">{subject.professorName}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="min-h-[74px] rounded-md"></div>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
      </div>
    </TooltipProvider>
  );
}
