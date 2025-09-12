
"use client";

import React, { useState, useMemo } from 'react';
import { type Subject } from '@/types/student';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Copy, Mail, Clock } from 'lucide-react';
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
}

// Fixed time slots as defined by the user
const TIME_SLOTS = [
    { start: '07:00', end: '08:59' },
    { start: '09:00', end: '10:59' },
    { start: '11:30', end: '13:29' },
];

export function StudentSchedule({ subjects, studentName }: StudentScheduleProps) {
  const { toast } = useToast();
  const [absenceReason, setAbsenceReason] = useState("Sin justificar");
  const [customNotes, setCustomNotes] = useState("");
  const [isFutureAbsence, setIsFutureAbsence] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  if (!subjects || subjects.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay información de horario disponible para este alumno.
      </div>
    );
  }

  const hasScheduleData = subjects.some(s => s.schedule && s.schedule.days.length > 0 && s.schedule.startTime && s.schedule.endTime);

  const scheduleByDayAndSlot = useMemo(() => {
    const events: Record<string, Record<string, any>> = {};
    DAYS.forEach(day => { events[day] = {}; });

    subjects.forEach(subject => {
        if (!subject.schedule || !subject.schedule.startTime || !subject.schedule.endTime) return;

        subject.schedule.days.forEach(day => {
            if (DAYS.includes(day)) {
                // Find which slot this subject fits into
                const slotKey = `${subject.schedule.startTime} - ${subject.schedule.endTime}`;
                events[day][slotKey] = {
                    id: `${subject.id}-${day}`,
                    subject,
                };
            }
        });
    });
    return events;
  }, [subjects]);
  
  const handleCopyTeachersForDay = (day: string) => {
     const teachersForDay: string[] = [];
     Object.values(scheduleByDayAndSlot[day]).forEach((event: any) => {
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
    const allTeacherEmails = [...new Set(subjects.map(s => s.professorName).filter(Boolean))];

    if (allTeacherEmails.length === 0) {
        toast({
            variant: "destructive",
            title: 'Sin Profesores',
            description: `No se puede notificar porque no hay profesores con correo electrónico asignado a este alumno.`,
        });
        return;
    }
     if (!dateRange || !dateRange.from) {
        toast({
            variant: "destructive",
            title: 'Fechas no seleccionadas',
            description: `Por favor, selecciona el día o rango de días de la ausencia.`,
        });
        return;
    }


    const subject = isFutureAbsence 
        ? `Aviso de Ausencia Futura - ${studentName}`
        : `Notificación de Ausencia - ${studentName}`;
    
    let dateText;
    if (dateRange.to) {
        dateText = `del ${format(dateRange.from, "d 'de' LLLL", { locale: es })} al ${format(dateRange.to, "d 'de' LLLL 'de' yyyy", { locale: es })}`;
    } else {
        dateText = `el día ${format(dateRange.from, "EEEE d 'de' LLLL 'de' yyyy", { locale: es })}`;
    }

    let body = `Estimados profesores,\n\n`;
    if(isFutureAbsence) {
        body += `Les informo que el alumno ${studentName} se ausentará ${dateText}.\n\n`;
    } else {
        body += `Les informo que el alumno ${studentName} no ha asistido a clases ${dateText}.\n\n`;
    }
    
    body += `Motivo: ${absenceReason}\n`;
    if (customNotes) {
        body += `\nNotas adicionales:\n${customNotes}\n`;
    }
    body += `\nAgradezco su atención.\n\nSaludos cordiales,`;

    const mailtoLink = `mailto:${allTeacherEmails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  }


  if (!hasScheduleData) {
     return (
        <div className="p-6 bg-muted/20 rounded-lg">
            <h3 className="font-sans font-bold text-lg mb-4">Datos del Horario (Modo Verificación)</h3>
            <div className="font-mono text-sm space-y-4">
                {subjects.filter(s => s.schedule).map((subject) => (
                    <div key={subject.id} className="p-3 bg-background rounded-md shadow-sm">
                        <p className="font-bold text-primary">{subject.name} (CRN: {subject.id})</p>
                        <p><span className="text-muted-foreground">Días:</span> {subject.schedule?.days.join(', ') || 'No especificado'}</p>
                        <p><span className="text-muted-foreground">Hora:</span> {subject.schedule?.startTime || 'N/A'} - {subject.schedule?.endTime || 'N/A'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 bg-muted/5 rounded-lg space-y-6">
           <div className="flex justify-end mb-4">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline">
                        <Mail className="mr-2 h-4 w-4" />
                        Notificar Ausencia a Profesores
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Notificar Ausencia - {studentName}</AlertDialogTitle>
                    <AlertDialogDescription>
                      Selecciona las fechas y el motivo para generar el borrador del correo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                      <div className="flex flex-col items-center">
                         <Label className="mb-2 font-semibold">1. Selecciona el día o rango de días</Label>
                         <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            locale={es}
                            numberOfMonths={1}
                        />
                         <div className="flex items-center space-x-2 mt-4">
                            <Checkbox id="future-absence" checked={isFutureAbsence} onCheckedChange={(checked) => setIsFutureAbsence(!!checked)} />
                            <Label htmlFor="future-absence">Es una ausencia futura</Label>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <Label className="font-semibold">2. Motivo de la ausencia</Label>
                          <RadioGroup
                              id="absence-reason"
                              defaultValue="Sin justificar"
                              onValueChange={setAbsenceReason}
                              value={absenceReason}
                              className="mt-2"
                          >
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Falta Justificada" id="r1" /><Label htmlFor="r1">Falta Justificada</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Enfermedad" id="r2" /><Label htmlFor="r2">Enfermedad</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Cita Médica" id="r3" /><Label htmlFor="r3">Cita Médica</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Asunto Familiar" id="r4" /><Label htmlFor="r4">Asunto Familiar</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="Sin justificar" id="r5" /><Label htmlFor="r5">Sin justificar</Label></div>
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
                      </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={generateMailtoLink}>Generar Correo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {DAYS.map(day => (
                <div key={day} className="p-3 bg-muted/30 rounded-lg flex flex-col space-y-4">
                    <div className="flex items-center justify-between mb-2">
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
                    <div className="space-y-4">
                        {TIME_SLOTS.map(slot => {
                            const slotKey = `${slot.start} - ${slot.end}`;
                            const event = scheduleByDayAndSlot[day] ? scheduleByDayAndSlot[day][slotKey] : null;

                            if (event) {
                                return (
                                     <div key={event.id} className="p-3 bg-card rounded-md border shadow-sm min-h-[120px] flex flex-col justify-between">
                                        <div>
                                            <p className="font-semibold text-sm leading-tight">{event.subject.name}</p>
                                            <p className="text-xs text-muted-foreground">{event.subject.professorName}</p>
                                        </div>
                                        <Badge variant="outline" className="mt-2 font-mono w-fit">
                                            <Clock className="h-3 w-3 mr-1.5" />
                                            {event.subject.schedule.startTime} - {event.subject.schedule.endTime}
                                        </Badge>
                                    </div>
                                )
                            } else {
                                // Render a placeholder to keep the grid structure
                                return <div key={slotKey} className="min-h-[120px] rounded-md"></div>
                            }
                        })}
                    </div>
                </div>
            ))}
           </div>
      </div>
    </TooltipProvider>
  );
}

    