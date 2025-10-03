

"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Student, type SubjectSummary } from "@/types/student";

interface StudentReportImageProps {
  student: Student;
  subjects: SubjectSummary[] | undefined;
}

export const StudentReportImage = React.forwardRef<HTMLDivElement, StudentReportImageProps>(
  ({ student, subjects }, ref) => {
    return (
      <div ref={ref} className="bg-white p-6 rounded-lg border-2 border-primary" style={{ width: '600px', fontFamily: "'Inter', sans-serif" }}>
        <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-primary">{student.name}</h1>
            <p className="text-md text-muted-foreground">{student.id}</p>
        </div>
        <Card>
            <CardContent className="p-0">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">Materia</TableHead>
                            <TableHead className="text-center">Faltas (Límite)</TableHead>
                            <TableHead className="text-center">Tareas NE (Límite)</TableHead>
                            <TableHead className="text-right font-bold">Ponderado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(subjects || []).map((subject) => (
                            <TableRow key={subject.id}>
                                <TableCell className="font-medium">{subject.name}</TableCell>
                                <TableCell className="text-center font-mono">{subject.absences} / {subject.absenceLimit}</TableCell>
                                <TableCell className="text-center font-mono">{subject.missedAssignments} / {subject.missedAssignmentLimit}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-primary">
                                    {(subject.grade || 0).toFixed(2)}
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
