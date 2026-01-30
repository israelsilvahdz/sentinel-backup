

"use client";

import React, { useMemo } from 'react';
import { type Subject } from '@/types/student';
import { useDashboardFilters } from './DashboardClient';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Info, Printer } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';

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

export function StudentProfessorsSchedule({ studentSubjects, studentName }: { studentSubjects: Subject[], studentName: string }) {
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        const tableRows = ALL_TIME_SLOTS.map(slot => {
            const cells = DAYS.map(day => {
                const classesInSlot = scheduleByDayAndSlot[`${day}-${slot.start}`] || [];
                const uniqueClasses = Array.from(new Map(classesInSlot.map(c => [`${c.professorName}-${c.name}-${c.group}`, c])).values());
                const cellContent = uniqueClasses.map(subject => `
                    <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 4px; padding: 4px; margin-bottom: 4px; font-size: 8px;">
                        <p style="font-weight: 600; margin: 0; color: #1e3a8a;">${subject.professorName}</p>
                        <p style="color: #6b7280; margin: 0;">${subject.name}</p>
                        <p style="color: #6b7280; margin: 0;">Gpo: ${subject.group}</p>
                    </div>
                `).join('');
                return `<td style="border: 1px solid #e5e7eb; padding: 4px; vertical-align: top; min-height: 50px;">${cellContent}</td>`;
            }).join('');

            return `
                <tr>
                    <td style="border: 1px solid #e5e7eb; padding: 4px; font-weight: 600; text-align: center; background-color: #f9fafb;">${slot.start}</td>
                    ${cells}
                </tr>
            `;
        }).join('');

        const content = `
             <html>
                <head>
                    <title>Horario de Profesores para ${studentName}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 1rem; color: #1f2937; }
                        h1 { color: #155e75; font-size: 1.5rem; }
                        p { font-size: 0.9rem; color: #4b5563;}
                        table { width: 100%; border-collapse: collapse; font-size: 10px; }
                        th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; vertical-align: top; }
                        th { background-color: #f9fafb; text-align: center; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <button class="no-print" onclick="window.print()" style="position: fixed; top: 1rem; right: 1rem; padding: 8px 12px; background: #0e7490; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir</button>
                    <h1>Horario de Profesores de ${studentName}</h1>
                    <p>Este horario muestra la ubicación de todos los profesores del alumno para un seguimiento rápido.</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Hora</th>
                                ${DAYS.map(day => `<th>${DAY_MAP[day]}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
    }
  };

  return (
    <div className="p-4 bg-muted/5 rounded-lg space-y-6">
        <div className="flex justify-between items-start gap-4">
            <Alert className="flex-grow">
              <Info className="h-4 w-4" />
              <AlertTitle>Información Completa</AlertTitle>
              <AlertDescription>
                Este horario muestra todas las clases de los profesores de este alumno. Para una vista completa que incluya horarios de tetramestre y semestre, asegúrate de que el archivo de Excel cargado contenga los datos de ambos periodos.
              </AlertDescription>
            </Alert>
            <Button onClick={handlePrint} variant="outline" className="no-print">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
            </Button>
        </div>

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
