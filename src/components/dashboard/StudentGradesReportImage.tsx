
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { type Student, type Subject } from "@/types/student";
import { GradesTable } from './GradesTable';

interface StudentGradesReportImageProps {
  student: Student;
  subjects: Subject[] | undefined;
}

export const StudentGradesReportImage = React.forwardRef<HTMLDivElement, StudentGradesReportImageProps>(
  ({ student, subjects }, ref) => {
    return (
      <div ref={ref} className="bg-white p-6 rounded-lg border-2 border-primary" style={{ width: '800px', fontFamily: "'Inter', sans-serif" }}>
        <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-primary">{student.name}</h1>
            <p className="text-md text-muted-foreground">{student.id}</p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Desglose de Calificaciones</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {subjects ? <GradesTable subjects={subjects} /> : <p>No hay datos de materias.</p>}
            </CardContent>
        </Card>
      </div>
    );
  }
);

StudentGradesReportImage.displayName = 'StudentGradesReportImage';
