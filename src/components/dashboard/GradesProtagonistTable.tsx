
"use client";

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Subject } from "@/types/student";
import { isWithoutRight } from '@/lib/dataProcessor';
import { cn } from '@/lib/utils';

interface GradesProtagonistTableProps {
  subjects: Subject[];
}

export function GradesProtagonistTable({ subjects }: GradesProtagonistTableProps) {
  // 1. Identificar el número máximo de actividades A1, A2... que realmente TIENEN datos (0, SC, NE o número)
  const maxActivities = useMemo(() => {
    let max = 0;
    subjects.forEach(subject => {
      Object.entries(subject.activities || {}).forEach(([key, value]) => {
        const match = key.match(/^A(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          // Si hay algún valor (incluyendo 0 o texto), cuenta la columna
          const hasAnyValue = value !== undefined && value !== null && String(value).trim() !== '';
          if (hasAnyValue && num > max) max = num;
        }
      });
    });
    return max;
  }, [subjects]);

  const activityHeaders = Array.from({ length: maxActivities }, (_, i) => `A${i + 1}`);

  return (
    <div className="rounded-3xl border border-muted/20 overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-b border-muted/20">
            <TableHead className="w-[180px] px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Materia</TableHead>
            <TableHead className="text-center px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-x border-muted/10">Faltas</TableHead>
            <TableHead className="text-center px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-r border-muted/10">NE</TableHead>
            {activityHeaders.map(h => (
              <TableHead key={h} className="px-1 text-center text-[10px] font-bold text-slate-400">{h}</TableHead>
            ))}
            <TableHead className="text-center px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 border-l border-muted/10">Final</TableHead>
            <TableHead className="text-right px-6 text-[11px] font-black uppercase tracking-widest text-primary bg-primary/5">Pond.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => {
            const isSD = isWithoutRight(subject);
            const ponderado = subject.grade || 0;
            const scoreFinal = subject.activities['EXAMEN_FINAL'];

            return (
              <TableRow key={subject.id} className="group/row hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-6 py-4">
                  <p className="text-[11px] font-bold text-slate-700 leading-tight group-hover/row:text-primary transition-colors uppercase">{subject.name}</p>
                  <p className="text-[9px] font-black text-slate-400 mt-0.5">GPO: {subject.group}</p>
                </TableCell>
                
                <TableCell className="text-center px-2 border-x border-muted/10">
                   <div className={cn(
                     "inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black tabular-nums",
                     subject.absences > subject.absenceLimit ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                   )}>
                     {subject.absences}/{subject.absenceLimit}
                   </div>
                </TableCell>

                <TableCell className="text-center px-2 border-r border-muted/10">
                   <div className={cn(
                     "inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black tabular-nums",
                     subject.missedAssignments > subject.missedAssignmentLimit ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                   )}>
                     {subject.missedAssignments}/{subject.missedAssignmentLimit}
                   </div>
                </TableCell>

                {activityHeaders.map((header) => {
                  const score = subject.activities[header];
                  // FIDELIDAD: Si el valor es exactamente 0, mostrar 0. Si está vacío, nada.
                  const displayValue = (score === 0 || score === '0') ? '0' : (score || '');
                  const isNE = typeof score === 'string' && score.toUpperCase() === 'NE';
                  const isSD_Val = typeof score === 'string' && score.toUpperCase() === 'SD';

                  return (
                    <TableCell key={header} className="px-1 text-center">
                      <span className={cn(
                        "text-[10px] font-bold tabular-nums",
                        (isNE || isSD_Val) ? "text-red-500" : "text-slate-500"
                      )}>
                         {displayValue}
                      </span>
                    </TableCell>
                  );
                })}

                <TableCell className="text-center px-2 border-l border-muted/10 bg-slate-50/30">
                   <span className="text-[10px] font-bold text-slate-600">{(scoreFinal === 0 || scoreFinal === '0') ? '0' : (scoreFinal || '')}</span>
                </TableCell>

                <TableCell className="text-right px-6 py-4 bg-primary/[0.02]">
                  <div className="flex flex-col items-end">
                    {isSD ? (
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter bg-red-50 px-1 rounded">SD</span>
                    ) : (
                      <span className={cn(
                        "text-sm font-black tabular-nums tracking-tighter",
                        ponderado >= 70 ? "text-emerald-700" : "text-red-700"
                      )}>
                        {ponderado.toFixed(2)}
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
