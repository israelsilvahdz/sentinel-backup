
"use client";

import React from 'react';
import { type Subject } from '@/types/student';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface StudentScheduleProps {
  subjects: Subject[];
}

const DAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'];
const DAY_MAP: Record<string, string> = {
    'LUN': 'Lunes',
    'MAR': 'Martes',
    'MIÉ': 'Miércoles',
    'JUE': 'Jueves',
    'VIE': 'Viernes',
}
const START_HOUR = 7;
const END_HOUR = 16; // 4 PM

const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const generateTimeSlots = () => {
    const slots = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
};

export function StudentSchedule({ subjects }: StudentScheduleProps) {

  if (!subjects || subjects.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay información de horario disponible para este alumno.
      </div>
    );
  }

  const hasScheduleData = subjects.some(s => s.schedule && s.schedule.days.length > 0 && s.schedule.startTime && s.schedule.endTime);

  const timeSlots = generateTimeSlots();
  const minuteHeight = 1.5; // Height per minute in px, you can adjust this

  const scheduleEvents = subjects.flatMap(subject => {
      if (!subject.schedule || !subject.schedule.startTime || !subject.schedule.endTime) return [];
      
      const startMinutes = timeToMinutes(subject.schedule.startTime);
      const endMinutes = timeToMinutes(subject.schedule.endTime);
      const duration = endMinutes - startMinutes;
      
      if (duration <= 0 || startMinutes < START_HOUR * 60 || endMinutes > END_HOUR * 60) return [];
      
      return subject.schedule.days.map(day => {
          const dayIndex = DAYS.indexOf(day);
          if (dayIndex === -1) return null;
          
          return {
              id: `${subject.id}-${day}`,
              dayIndex,
              startMinutes,
              duration,
              subject,
          };
      }).filter(Boolean);
  });
  

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
      <div className="p-4 bg-muted/5 rounded-lg">
          <div className="relative" style={{ height: `${(END_HOUR - START_HOUR) * 60 * minuteHeight}px` }}>
              {/* Grid background & lines */}
              <div className="absolute inset-0 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] h-full">
                  {/* Time column */}
                  <div className="w-14 border-r border-border/50"></div>
                  {/* Day columns */}
                  {DAYS.map((_, index) => (
                      <div key={index} className={cn("border-r border-border/50", index === 0 ? "col-start-2" : "")}></div>
                  ))}
                  {/* Hour rows */}
                  {timeSlots.slice(0).map((_, index) => (
                      <div key={index} className="col-span-full border-t border-border/30" style={{ height: `${60 * minuteHeight}px` }}></div>
                  ))}
              </div>

              {/* Time labels */}
              <div className="absolute -left-1 top-0 w-12 text-right">
                  {timeSlots.map(time => (
                      <div key={time} className="text-xs text-muted-foreground -translate-y-2" style={{ height: `${60 * minuteHeight}px`}}>
                          {time}
                      </div>
                  ))}
              </div>

              {/* Day headers */}
              <div className="sticky top-0 z-10 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] h-10 bg-muted/5 backdrop-blur-sm -translate-y-10">
                  <div className="w-14"></div>
                  {DAYS.map(day => (
                      <div key={day} className="flex items-center justify-center font-semibold text-foreground">
                          {DAY_MAP[day]}
                      </div>
                  ))}
              </div>
              
              {/* Events */}
              <div className="absolute top-0 left-14 right-0 bottom-0 grid grid-cols-5">
                  {scheduleEvents.map(event => (
                      event && (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <div
                                className="absolute w-full p-2 rounded-lg bg-primary/10 border border-primary/50 overflow-hidden cursor-pointer flex items-center justify-center"
                                style={{
                                    left: `${event.dayIndex * 20}%`,
                                    top: `${(event.startMinutes - START_HOUR * 60) * minuteHeight + 4}px`, // +4 for margin top
                                    height: `${event.duration * minuteHeight * 0.9}px`, // 90% of original height
                                    width: `calc(20% - 4px)`,
                                    marginLeft: '2px',
                                    marginRight: '2px'
                                }}
                            >
                                <p className="font-bold text-xs leading-tight text-primary text-center">{event.subject.name}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-bold">{event.subject.name}</p>
                            <p className="text-sm text-muted-foreground">{event.subject.schedule?.startTime} - {event.subject.schedule?.endTime}</p>
                            <p className="text-sm text-muted-foreground">{event.subject.professorName}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                  ))}
              </div>
          </div>
      </div>
    </TooltipProvider>
  );
}
