

"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Student, type SubjectSummary } from "@/types/student";
import { getRisk, RiskLevel, isWithoutRight } from '@/lib/dataProcessor';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';


interface StudentReportImageProps {
  student: Student;
  subjects: SubjectSummary[] | undefined;
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
                            <TableHead className="w-[350px] font-bold">Materia</TableHead>
                            <TableHead className="text-center font-bold">Faltas (Límite)</TableHead>
                            <TableHead className="text-center font-bold">Tareas NE (Límite)</TableHead>
                            <TableHead className="text-right font-bold">Calif. Final / Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(subjects || []).map((subject) => (
                            <TableRow key={subject.id}>
                                <TableCell className="font-medium">{subject.name}</TableCell>
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
                                <TableCell className="text-right font-mono font-bold">
                                    {isWithoutRight(subject) ? (
                                      <Badge variant="destructive" className="text-base">SD</Badge>
                                    ) : (
                                      <span className="text-primary">{(subject.grade || 0).toFixed(2)}</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    );
  }
);

StudentReportImage.displayName = 'StudentReportImage';


