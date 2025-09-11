
"use client";

import React from 'react';
import { type Subject } from '@/types/student';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StudentScheduleProps {
  subjects: Subject[];
}

export function StudentSchedule({ subjects }: StudentScheduleProps) {

  if (!subjects || subjects.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No hay información de horario disponible para este alumno.
      </div>
    );
  }

  const hasScheduleData = subjects.some(s => s.schedule && s.schedule.days.length > 0);

  return (
    <div className="p-6 bg-muted/20 rounded-lg">
        <h3 className="font-sans font-bold text-lg mb-4">Datos del Horario (Modo Verificación)</h3>
        {!hasScheduleData ? (
             <p className="font-sans text-muted-foreground">No se encontró información de días u horas en el reporte para estas materias.</p>
        ) : (
            <div className="font-mono text-sm space-y-4">
                {subjects.map((subject) => (
                    <div key={subject.id} className="p-3 bg-background rounded-md shadow-sm">
                        <p className="font-bold text-primary">{subject.name} (CRN: {subject.id})</p>
                        <p><span className="text-muted-foreground">Días:</span> {subject.schedule?.days.join(', ') || 'No especificado'}</p>
                        <p><span className="text-muted-foreground">Hora:</span> {subject.schedule?.startTime || 'N/A'} - {subject.schedule?.endTime || 'N/A'}</p>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
}
