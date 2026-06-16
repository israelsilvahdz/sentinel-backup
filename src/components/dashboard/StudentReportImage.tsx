"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Student, type Subject, type WeightingScheme } from "@/types/student";
import { isWithoutRight } from '@/lib/dataProcessor';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { getActivityList } from '@/lib/ponderaciones';


interface StudentReportImageProps {
  student: Student;
  subjects: Subject[] | undefined;
  weightingSchemes: WeightingScheme[];
}

export const StudentReportImage = React.forwardRef<HTMLDivElement, StudentReportImageProps>(
  ({ student, subjects, weightingSchemes }, ref) => {
    
    const maxActivities = 12;
    const activityHeaders = Array.from({ length: maxActivities }, (_, i) => `A${i + 1}`);

    return (
      <div ref={ref} className="bg-white p-8 rounded-none shadow-none overflow-hidden" style={{ width: '800px', minHeight: '1050px', fontFamily: "'Inter', sans-serif" }}>
        {/* Encabezado Principal Institucional */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <span className="font-black text-2xl text-primary tracking-tighter uppercase">Tecmilenio</span>
                    <div className="h-6 w-[2px] bg-slate-200"></div>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-black text-[10px] uppercase tracking-[0.2em] px-3">Reporte de Desempeño</Badge>
                </div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{student.name}</h1>
                <div className="flex items-center gap-3 font-mono text-sm font-bold text-slate-400">
                    <span>MATRÍCULA: {student.id}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                    <span>LÍDER: {student.leader}</span>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SISTEMA SENTINEL</p>
                <p className="text-xs font-bold text-slate-500 mt-1">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
        </div>
        
        <div className="space-y-4">
            <div className="border rounded-2xl overflow-hidden shadow-sm">
                 <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="border-none hover:bg-slate-900">
                            <TableHead className="w-[240px] text-white font-black uppercase text-[9px] tracking-widest py-4 px-4">Asignatura</TableHead>
                            <TableHead className="text-center text-white font-black uppercase text-[9px] tracking-widest py-4 px-2">Riesgo</TableHead>
                            {activityHeaders.map((h) => (
                                <TableHead key={h} className="text-center text-white/40 font-black uppercase text-[8px] py-4 px-0.5">{h}</TableHead>
                            ))}
                            <TableHead className="text-right text-white font-black uppercase text-[9px] tracking-widest py-4 px-4 bg-primary">Ponderado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(subjects || []).map((subject) => {
                            const activities = getActivityList(subject, weightingSchemes);
                            const isSD = isWithoutRight(subject);
                            const ponderado = subject.grade || 0;

                            return (
                                <TableRow key={subject.id} className="border-b border-slate-100 hover:bg-transparent">
                                    <TableCell className="py-4 px-4">
                                        <div className="text-[10px] font-black text-slate-800 leading-tight uppercase whitespace-normal break-words">{subject.name}</div>
                                        <div className="text-[9px] font-bold text-slate-400 mt-1">GPO: {subject.group}</div>
                                    </TableCell>
                                    
                                    <TableCell className="px-2">
                                        <div className="flex flex-col gap-1 items-center">
                                            <div className={cn(
                                                "text-[8px] font-black px-1.5 py-0.5 rounded border tabular-nums",
                                                subject.absences > subject.absenceLimit ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"
                                            )}>
                                                F: {subject.absences}/{subject.absenceLimit}
                                            </div>
                                            <div className={cn(
                                                "text-[8px] font-black px-1.5 py-0.5 rounded border tabular-nums",
                                                subject.missedAssignments > subject.missedAssignmentLimit ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200"
                                            )}>
                                                NE: {subject.missedAssignments}/{subject.missedAssignmentLimit}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {activityHeaders.map((_, index) => {
                                        const act = activities[index];
                                        const score = act?.score;
                                        const isNE = typeof score === 'string' && score.toUpperCase() === 'NE';
                                        const isSC = typeof score === 'string' && score.toUpperCase() === 'SC';

                                        return (
                                            <TableCell key={index} className="px-0.5 text-center border-l border-slate-50">
                                                <span className={cn(
                                                    "text-[9px] font-bold tabular-nums",
                                                    isNE ? "text-red-500" : isSC ? "text-slate-100" : "text-slate-500"
                                                )}>
                                                    {score && score !== 'SC' ? score : ''}
                                                </span>
                                            </TableCell>
                                        );
                                    })}

                                    <TableCell className="text-right px-4 py-4 bg-primary/[0.03] border-l border-primary/10">
                                        {isSD ? (
                                            <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter bg-red-100 px-2 py-1 rounded">Sin Derecho</span>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className={cn(
                                                    "text-2xl font-black tabular-nums tracking-tighter leading-none",
                                                    ponderado >= 70 ? "text-emerald-700" : "text-red-700"
                                                )}>
                                                    {ponderado.toFixed(1)}
                                                </span>
                                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Puntos Ponderados</span>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                 </Table>
            </div>
        </div>

        <div className="mt-12">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                    <span className="font-bold text-slate-700 uppercase block mb-1">Nota sobre la evaluación:</span>
                    Este reporte muestra el avance ponderado acumulado a la fecha capturado directamente del registro institucional oficial de Tecmilenio. 
                    Un resultado menor a 70 puntos al final del periodo se considera no aprobatorio. 
                    El estatus "Sin Derecho" invalida cualquier puntaje acumulado debido a faltas o tareas no entregadas de acuerdo al reglamento institucional.
                </p>
            </div>
        </div>
      </div>
    );
  }
);

StudentReportImage.displayName = 'StudentReportImage';
