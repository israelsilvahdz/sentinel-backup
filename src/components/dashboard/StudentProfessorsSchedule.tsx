
"use client";

import React, { useMemo } from 'react';
import { type Subject } from '@/types/student';
import { useDashboardFilters } from './DashboardClient';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Info } from 'lucide-react';

const DAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'];
const DAY_MAP: Record<string, string> = {
    'LUN': 'Lunes',
    'MAR': 'Martes',
    'MIE': 'Miércoles',
    'JUE': 'Jueves',
    'VIE': 'Viernes',
};

// Combine both time slots to cover all possibilities
const ALL_TIME_SLOTS = [
    { start: '07:00', end: '07:59' },
    { start: '08:00', end: '08:59' },
    { start: '09:00', end: '09:59' },
    { start: '10:00', end: '10:59' },
    { start: '11:30', end: '12:29' },
    { start: '12:30', end: '13:29' },
    { start: '13:30', end: '14:50' },
];

// Helper to check if a subject falls within a given time slot.
// This needs to be robust to handle both tetra and semestre schedules.
function isSubjectInSlot(subject: Subject, slot: { start: string, end: string }): boolean {
    if (!subject.schedule?.startTime) return false;
    
    // A simple start time match works for most cases
    return subject.schedule.startTime === slot.start;
}

export function StudentProfessorsSchedule({ studentSubjects }: { studentSubjects: Subject[] }) {
  const { allStudents } = useDashboardFilters();

  const scheduleByDayAndSlot = useMemo(() => {
    // 1. Get unique professor names from the current student's subjects.
    const professorNames = new Set(studentSubjects.map(s => s.professorName).filter(Boolean));

    // 2. Find all classes taught by these professors from the global student list.
    const allClassesByProfessors: Subject[] = [];
    allStudents.forEach(student => {
      student.subjects?.forEach(subject => {
        if (subject.professorName && professorNames.has(subject.professorName)) {
          allClassesByProfessors.push(subject);
        }
      });
    });

    // 3. Group these classes by day and time slot.
    const grid: Record<string, Subject[]> = {};

    DAYS.forEach(day => {
      ALL_TIME_SLOTS.forEach(slot => {
        const key = `${day}-${slot.start}`;
        grid[key] = allClassesByProfessors.filter(subject =>
          subject.schedule?.days.includes(day) && isSubjectInSlot(subject, slot)
        );
      });
    });
    
    return grid;
  }, [studentSubjects, allStudents]);

  return (
    <div className="p-4 bg-muted/5 rounded-lg space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Información Completa</AlertTitle>
          <AlertDescription>
            Este horario muestra todas las clases de los profesores de este alumno. Para una vista completa que incluya horarios de tetramestre y semestre, asegúrate de que el archivo de Excel cargado contenga los datos de ambos periodos.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-6 gap-px bg-border rounded-lg border overflow-hidden">
            {/* Header */}
            <div className="p-2 bg-card"></div>
            {DAYS.map(day => (
                <div key={day} className="p-2 bg-card text-center font-bold text-primary text-sm">{DAY_MAP[day]}</div>
            ))}
            
            {/* Body */}
            {ALL_TIME_SLOTS.map(slot => (
                <React.Fragment key={slot.start}>
                    <div className="p-2 bg-card border-t border-border flex items-center justify-center">
                        <Badge variant="outline" className="font-mono text-xs">
                            <Clock className="h-3 w-3 mr-1.5" />
                            {slot.start}
                        </Badge>
                    </div>
                    {DAYS.map(day => {
                        const classesInSlot = scheduleByDayAndSlot[`${day}-${slot.start}`] || [];
                        const uniqueClasses = Array.from(new Map(classesInSlot.map(c => [`${c.professorName}-${c.name}-${c.group}`, c])).values());

                        return (
                            <div key={`${day}-${slot.start}`} className="p-1.5 bg-card border-t border-border min-h-[70px]">
                                {uniqueClasses.map(subject => (
                                    <div key={`${subject.id}-${subject.group}`} className="bg-blue-50 border border-blue-200 rounded-md p-1.5 text-xs shadow-sm mb-1">
                                        <p className="font-semibold leading-tight truncate text-blue-800">{subject.professorName}</p>
                                        <p className="text-muted-foreground truncate">{subject.name}</p>
                                        <p className="text-muted-foreground font-medium">Gpo: {subject.group}</p>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
    </div>
  );
}
