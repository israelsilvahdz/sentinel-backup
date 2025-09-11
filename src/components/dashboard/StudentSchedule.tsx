
"use client";

import React from 'react';
import { type Subject } from '@/types/student';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StudentScheduleProps {
  subjects: Subject[];
}

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

const DAY_MAP: Record<string, number> = { 'LUN': 1, 'MAR': 2, 'MIÉ': 3, 'JUE': 4, 'VIE': 5 };
const COLORS = [
  'bg-blue-200 border-blue-400', 'bg-green-200 border-green-400', 'bg-yellow-200 border-yellow-400',
  'bg-purple-200 border-purple-400', 'bg-pink-200 border-pink-400', 'bg-indigo-200 border-indigo-400',
  'bg-teal-200 border-teal-400', 'bg-orange-200 border-orange-400'
];

// Helper to convert time string (HH:MM) to minutes from midnight
const timeToMinutes = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function StudentSchedule({ subjects }: StudentScheduleProps) {

  if (!subjects || subjects.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay información de horario disponible para este alumno.
      </div>
    );
  }

  const scheduleEvents = subjects.flatMap((subject, index) => 
    subject.schedule?.days.map(day => ({
      ...subject,
      day,
      color: COLORS[index % COLORS.length]
    })) ?? []
  ).filter(event => event.schedule && event.schedule.startTime && event.schedule.endTime);

  return (
    <div className="p-4 bg-muted/20 rounded-lg">
      <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-2 text-xs font-semibold text-center bg-slate-50">Hora</div>
        <div className="p-2 text-xs font-semibold text-center bg-slate-50">Lunes</div>
        <div className="p-2 text-xs font-semibold text-center bg-slate-50">Martes</div>
        <div className="p-2 text-xs font-semibold text-center bg-slate-50">Miércoles</div>
        <div className="p-2 text-xs font-semibold text-center bg-slate-50">Jueves</div>
        <div className="p-2 text-xs font-semibold text-center bg-slate-50">Viernes</div>

        {/* Time Slots and Grid */}
        {TIME_SLOTS.map((time, index) => (
          <React.Fragment key={time}>
            {/* Time Label */}
            <div className="p-2 text-xs font-mono text-right bg-slate-50 border-t border-slate-200">
              {time}
            </div>
            {/* Day Cells */}
            <div className="relative bg-white border-t border-slate-200"></div>
            <div className="relative bg-white border-t border-slate-200"></div>
            <div className="relative bg-white border-t border-slate-200"></div>
            <div className="relative bg-white border-t border-slate-200"></div>
            <div className="relative bg-white border-t border-slate-200"></div>
          </React.Fragment>
        ))}

        {/* Render Events */}
        {scheduleEvents.map((event, index) => {
          if (!event.schedule) return null;
          const startMinutes = timeToMinutes(event.schedule.startTime);
          const endMinutes = timeToMinutes(event.schedule.endTime);
          
          if(startMinutes >= endMinutes) return null;

          const top = ((startMinutes - timeToMinutes(TIME_SLOTS[0])) / 60) * 44 + 33; // 44px is row height, 33px is header height
          const height = ((endMinutes - startMinutes) / 60) * 44;
          const gridColumnStart = DAY_MAP[event.day];

          if (!gridColumnStart) return null;

          return (
            <div
              key={`${event.id}-${event.day}-${index}`}
              className={cn(
                'absolute w-full p-2 rounded-lg border text-xs overflow-hidden',
                event.color
              )}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                gridColumnStart: gridColumnStart + 1,
              }}
            >
              <p className="font-bold truncate">{event.name}</p>
              <p className="truncate">{event.schedule.startTime} - {event.schedule.endTime}</p>
              <p className="truncate text-slate-600">{event.professorName}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
