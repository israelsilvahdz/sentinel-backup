
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { type Subject } from '@/types/student';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Copy, Mail, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { Calendar } from '../ui/calendar';
import { Checkbox } from '../ui/checkbox';
import { format, isWithinInterval, getDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Badge } from '../ui/badge';

interface StudentScheduleProps {
  subjects: Subject[];
  studentName: string;
}

const DAYS = ['LUN', 'MAR', 'MIER', 'JUE', 'VIER'];
const DAY_MAP: Record<string, string> = {
    'LUN': 'Lunes',
    'MAR': 'Martes',
    'MIER': 'Miércoles',
    'JUE': 'Jueves',
    'VIER': 'Viernes',
};

// JS getDay() -> 0:Dom, 1:Lun, 2:Mar, 3:Mie, 4:Jue, 5:Vie, 6:Sab
const DATE_FNS_DAY_TO_KEY: Record<number, string> = {
    1: 'LUN',
    2: 'MAR',
    3: 'MIER',
    4: 'JUE',
    5: 'VIER',
};


const TIME_SLOTS = [
    { start: '07:00', end: '08:59' },
    { start: '09:00', end: '10:59' },
    { start: '11:30', end: '13:29' },
];

export function StudentSchedule({ subjects, studentName }: StudentScheduleProps) {
  const { toast } = useToast();
  const [notificationReason, setNotificationReason] = useState("Ausencia");
  const [customNotes, setCustomNotes] = useState("");
  const [isFutureNotice, setIsFutureNotice] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [teachersToNotify, setTeachersToNotify] = useState<string[]>([]);

  useEffect(() => {
    if (dateRange?.from) {
        const affectedDays = new Set<string>();
        const start = dateRange.from;
        const end = dateRange.to || start;

        // Iterate through each day in the range
        let currentDate = start;
        while (currentDate <= end) {
            const dayOfWeek = getDay(currentDate); // 0 for Sunday, 1 for Monday, etc.
            if (DATE_FNS_DAY_TO_KEY[dayOfWeek]) {
                affectedDays.add(DATE_FNS_DAY_TO_KEY[dayOfWeek]);
            }
            currentDate = addDays(currentDate, 1);
        }

        const uniqueTeachers = new Set<string>();
        subjects.forEach(subject => {
            if (subject.professorName && subject.schedule?.days) {
                const hasClassOnAffectedDays = subject.schedule.days.some(day => affectedDays.has(day));
                if (hasClassOnAffectedDays) {
                    uniqueTeachers.add(subject.professorName);
                }
            }
        });
        setTeachersToNotify(Array.from(uniqueTeachers));
    } else {
        setTeachersToNotify([]);
    }
  }, [dateRange, subjects]);

  const scheduleByDayAndSlot = useMemo(() => {
    const events: Record<string, Record<string, any>> = {};
    DAYS.forEach(day => {
        events[day] = {};
        TIME_SLOTS.forEach(slot => {
            const slotKey = `${slot.start} - ${slot.end}`;
            events[day][slotKey] = null;
        });
    });

    subjects.forEach(subject => {
        if (!subject.schedule || !subject.schedule.startTime || !subject.schedule.endTime) return;

        subject.schedule.days.forEach(day => {
            if (DAYS.includes(day)) {
                const slotKey = `${subject.schedule.startTime} - ${subject.schedule.endTime}`;
                 if (events[day] && (slotKey in events[day])) {
                    events[day][slotKey] = { id: `${subject.id}-${day}`, subject };
                }
            }
        });
    });
    return events;
  }, [subjects]);

  
  const handleCopyTeachersForDay = (day: string) => {
     const teachersForDay: string[] = [];
     TIME_SLOTS.forEach(slot => {
        const slotKey = `${slot.start} - ${slot.end}`;
        const event = scheduleByDayAndSlot[day] ? scheduleByDayAndSlot[day][slotKey] : null;
        if (event?.subject?.professorName) {
            teachersForDay.push(event.subject.professorName);
        }
     });

    if (teachersForDay.length === 0) {
      toast({
        title: 'Sin Profesores',
        description: `No hay profesores asignados para el ${DAY_MAP[day]}.`,
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
  
  const generateMailtoLink = () => {
    if (teachersToNotify.length === 0) {
        toast({
            variant: "destructive",
            title: 'Sin Profesores Seleccionados',
            description: `No se puede notificar porque no hay profesores con clases en las fechas seleccionadas.`,
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

    const subject = isFutureNotice 
        ? `Aviso a Futuro - Alumno ${studentName}`
        : `Notificación - Alumno ${studentName}`;
    
    let dateText;
    if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
        dateText = `del ${format(dateRange.from, "d 'de' LLLL", { locale: es })} al ${format(dateRange.to, "d 'de' LLLL 'de' yyyy", { locale: es })}`;
    } else {
        dateText = `el día ${format(dateRange.from, "EEEE d 'de' LLLL 'de' yyyy", { locale: es })}`;
    }

    let body = `Estimados profesores,\n\n`;
    if(isFutureNotice) {
        body += `Les notifico sobre el alumno ${studentName} con respecto a los días ${dateText}.\n\n`;
    } else {
        body += `Les notifico sobre el alumno ${studentName} con respecto al día/periodo ${dateText}.\n\n`;
    }
    
    body += `Motivo: ${notificationReason}\n`;
    if (customNotes) {
        body += `\nNotas adicionales:\n${customNotes}\n`;
    }
    body += `\nAgradezco su atención.\n\nSaludos cordiales,`;

    const mailtoLink = `mailto:${teachersToNotify.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
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
                      Selecciona las fechas y el motivo. El sistema filtrará a los profesores que tienen clase en esos días.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                      <div className="flex flex-col items-center md:col-span-1">
                         <Label className="mb-2 font-semibold">1. Selecciona el día o rango</Label>
                         <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            locale={es}
                            numberOfMonths={1}
                        />
                         <div className="flex items-center space-x-2 mt-4">
                            <Checkbox id="future-notice" checked={isFutureNotice} onCheckedChange={(checked) => setIsFutureNotice(!!checked)} />
                            <Label htmlFor="future-notice">Es un aviso a futuro</Label>
                        </div>
                      </div>

                      <div className="space-y-6 md:col-span-2">
                        <div>
                          <Label className="font-semibold">2. Motivo</Label>
                          <RadioGroup
                              id="notification-reason"
                              defaultValue="Ausencia"
                              onValueChange={setNotificationReason}
                              value={notificationReason}
                              className="mt-2"
                          >
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Ausencia Justificada" id="r1" /><Label htmlFor="r1">Ausencia Justificada</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Ausencia" id="r5" /><Label htmlFor="r5">Ausencia (sin justificar)</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Enfermedad" id="r2" /><Label htmlFor="r2">Enfermedad</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Cita Médica" id="r3" /><Label htmlFor="r3">Cita Médica</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Asunto Familiar" id="r4" /><Label htmlFor="r4">Asunto Familiar</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Otro" id="r6" /><Label htmlFor="r6">Otro (especificar en notas)</Label></div>
                          </RadioGroup>
                        </div>
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
                                        {teachersToNotify.map(teacher => <li key={teacher}>{teacher}</li>)}
                                    </ul>
                               ) : (
                                    <p className="text-sm text-muted-foreground text-center">Selecciona una fecha para ver los profesores.</p>
                               )}
                            </Card>
                        </div>
                      </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={generateMailtoLink}>Generar Correo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>
           
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border rounded-lg border overflow-hidden">
                 {DAYS.map(day => (
                    <div key={day} className="p-3 bg-card flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-center text-primary">{DAY_MAP[day]}</h3>
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

                {TIME_SLOTS.map(slot => (
                    <React.Fragment key={slot.start}>
                        {DAYS.map(day => {
                            const slotKey = `${slot.start} - ${slot.end}`;
                            const event = scheduleByDayAndSlot[day]?.[slotKey];
                            return (
                                <div key={`${day}-${slotKey}`} className="p-3 bg-card border-t border-border min-h-[120px]">
                                    {event ? (
                                        <div className="p-3 bg-card rounded-md h-full flex flex-col justify-between">
                                            <div>
                                                <p className="font-semibold text-sm leading-tight">{event.subject.name}</p>
                                                <p className="text-xs text-muted-foreground">{event.subject.professorName}</p>
                                            </div>
                                            <Badge variant="outline" className="mt-2 font-mono w-fit">
                                                <Clock className="h-3 w-3 mr-1.5" />
                                                {event.subject.schedule.startTime} - {event.subject.schedule.endTime}
                                            </Badge>
                                        </div>
                                    ) : (
                                        <div className="min-h-[96px] rounded-md"></div>
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

    