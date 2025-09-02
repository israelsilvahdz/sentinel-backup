
"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type Student } from '@/types/student';
import { getRisk, type RiskLevel } from '@/lib/dataProcessor';

interface RiskDistributionChartProps {
  students: Student[];
}

export function RiskDistributionChart({ students }: RiskDistributionChartProps) {
  const data = useMemo(() => {
    // Si no hay estudiantes o no tienen materias, no mostrar datos.
    if (!students || students.length === 0 || !students.every(s => s.subjects)) {
        return [];
    }

    let absenceRisks = { low: 0, medium: 0, high: 0 };
    let assignmentRisks = { low: 0, medium: 0, high: 0 };

    students.forEach(student => {
      let maxAbsenceLevel: RiskLevel = 'low';
      let maxAssignmentLevel: RiskLevel = 'low';
      const subjects = student.subjects || [];

      subjects.forEach(subject => {
        const absenceLevel = getRisk(subject.absences, subject.absenceLimit).level;
        const assignmentLevel = getRisk(subject.missedAssignments, subject.missedAssignmentLimit).level;

        if (absenceLevel === 'high') maxAbsenceLevel = 'high';
        else if (absenceLevel === 'medium' && maxAbsenceLevel !== 'high') maxAbsenceLevel = 'medium';
        
        if (assignmentLevel === 'high') maxAssignmentLevel = 'high';
        else if (assignmentLevel === 'medium' && maxAssignmentLevel !== 'high') maxAssignmentLevel = 'medium';
      });

      absenceRisks[maxAbsenceLevel]++;
      assignmentRisks[maxAssignmentLevel]++;
    });
    
    const totalStudents = students.length || 1;

    return [
      {
        name: 'Faltas',
        Bajo: (absenceRisks.low / totalStudents) * 100,
        Observación: (absenceRisks.medium / totalStudents) * 100,
        Crítico: (absenceRisks.high / totalStudents) * 100,
      },
      {
        name: 'Tareas (NE)',
        Bajo: (assignmentRisks.low / totalStudents) * 100,
        Observación: (assignmentRisks.medium / totalStudents) * 100,
        Crítico: (assignmentRisks.high / totalStudents) * 100,
      }
    ];
  }, [students]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold text-base">{label}</p>
          {payload.map((entry: any, index: number) => (
             <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
                {entry.name}: {entry.value.toFixed(1)}%
             </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Alumnos por Nivel de Riesgo</CardTitle>
        <CardDescription>Porcentaje de alumnos por categoría de riesgo.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" domain={[0, 100]} />
            <YAxis type="category" dataKey="name" width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Bajo" stackId="a" fill="hsl(var(--chart-2) / 0.6)" />
            <Bar dataKey="Observación" stackId="a" fill="hsl(var(--chart-4) / 0.6)" />
            <Bar dataKey="Crítico" stackId="a" fill="hsl(var(--chart-3) / 0.6)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
