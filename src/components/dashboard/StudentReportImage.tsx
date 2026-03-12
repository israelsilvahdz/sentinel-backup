"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Student, type Subject } from "@/types/student";
import { getRisk, RiskLevel, isWithoutRight } from '@/lib/dataProcessor';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { getActivityList } from '@/lib/ponderaciones';
import { useDashboardFilters } from './DashboardClient';


interface StudentReportImageProps {
  student: Student;
  subjects: Subject[] | undefined;
}

function RiskCellSimple({ value, limit }: { value: number; limit: number; }) {
  const { level } = getRisk(value, limit);
  
  const riskColorMapping: Record<RiskLevel, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    at_limit: 'bg-red-200 text-red-900',
    sd: 'bg-red-500 text-red-100'
  };

  return (
    <div className={cn("px-2 py-1 rounded-md text-center font-semibold text-xs", riskColorMapping[level])}>
        {`${value} / ${limit}`}
    </div>
  );
}


export const StudentReportImage = React.forwardRef<HTMLDivElement, StudentReportImageProps>(
  ({ student, subjects }, ref) => {
    const { weightingSchemes } = useDashboardFilters();

    return (
      <div ref={ref} className="bg-white p-6 rounded-lg border-2 border-primary" style={{ width: '800px', fontFamily: "'Inter', sans-serif" }}>
        <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-primary">{student.name}</h1>
            <p className="text-md text-muted-foreground">{student.id}</p>
        </div>
        <Card>
            <CardContent className="p-0">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px] font-bold">Materia</TableHead>
                            <TableHead className="text-center font-bold">Faltas (Límite)</TableHead>
                            <TableHead className="text-center font-bold">Tareas NE (Límite)</TableHead>
                            <TableHead className="text-right font-bold">Puntos / Potencial</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(subjects || []).map((subject) => {
                            const activityList = getActivityList(subject, weightingSchemes);
                            let totalEarnedPoints = 0;
                            let maxPossiblePoints = 0;

                            if (activityList.length > 0) {
                                activityList.forEach(item => {
                                    const isGraded = typeof item.score === 'string' ? item.score.toUpperCase() !== 'SC' && item.score.trim() !== '' : true;
                                    if (isGraded) {
                                        const score = Number(item.score) || 0;
                                        totalEarnedPoints += (score / 100) * item.weight;
                                        maxPossiblePoints += item.weight;
                                    }
                                });
                            }

                            const maxPotentialGrade = 100 - (maxPossiblePoints - totalEarnedPoints);

                            return (
                                <TableRow key={subject.id}>
                                    <TableCell className="font-medium">
                                        <div className="text-sm">{subject.name}</div>
                                        <div className="text-[10px] text-muted-foreground">Grupo: {subject.group}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <div className="inline-block">
                                        <RiskCellSimple value={subject.absences} limit={subject.absenceLimit} />
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                       <div className="inline-block">
                                        <RiskCellSimple value={subject.missedAssignments} limit={subject.missedAssignmentLimit} />
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {isWithoutRight(subject) ? (
                                          <Badge variant="destructive" className="text-xs font-black">SD</Badge>
                                        ) : maxPossiblePoints > 0 ? (
                                          <div className="flex flex-col items-end">
                                            <span className="text-primary font-mono font-bold text-sm">
                                                {totalEarnedPoints.toFixed(1)}/{maxPossiblePoints.toFixed(0)}
                                            </span>
                                            <div className="text-[9px] font-black uppercase text-muted-foreground/60 flex items-center gap-1">
                                                Máx: <span className="text-foreground">{maxPotentialGrade.toFixed(1)}</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">N/D</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <div className="mt-4 text-center">
            <p className="text-[10px] text-muted-foreground italic">
                * Potencial: Calificación máxima si se obtiene 100 en todas las actividades restantes.
            </p>
        </div>
      </div>
    );
  }
);

StudentReportImage.displayName = 'StudentReportImage';
