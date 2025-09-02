
"use client";

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Label } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type Student } from '@/types/student';
import { getRisk } from '@/lib/dataProcessor';

interface RiskMatrixChartProps {
  students: Student[];
}

export function RiskMatrixChart({ students }: RiskMatrixChartProps) {
  const data = useMemo(() => {
    // Si no hay estudiantes o no tienen materias, no mostrar datos.
    if (!students || students.length === 0 || !students.every(s => s.subjects)) {
        return [];
    }

    return students.map(student => {
      const subjects = student.subjects || [];
      let totalAbsenceRisk = 0;
      let totalAssignmentRisk = 0;
      let subjectCount = subjects.length;

      if (subjectCount === 0) {
        return { name: student.name, x: 0, y: 0 };
      }

      subjects.forEach(subject => {
        totalAbsenceRisk += getRisk(subject.absences, subject.absenceLimit).risk;
        totalAssignmentRisk += getRisk(subject.missedAssignments, subject.missedAssignmentLimit).risk;
      });

      return {
        name: student.name,
        x: (totalAbsenceRisk / subjectCount) * 100,
        y: (totalAssignmentRisk / subjectCount) * 100
      };
    });
  }, [students]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="font-bold">{data.name}</p>
          <p className="text-sm text-muted-foreground">Faltas: {data.x.toFixed(2)}%</p>
          <p className="text-sm text-muted-foreground">Tareas NE: {data.y.toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Riesgo</CardTitle>
        <CardDescription>Riesgo por Faltas vs. Tareas No Entregadas (Promedio)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            
            <ReferenceArea x1={50} x2={101} y1={50} y2={101} stroke="none" fill="hsl(var(--destructive) / 0.1)" />
            <ReferenceArea x1={0} x2={50} y1={50} y2={101} stroke="none" fill="hsl(var(--chart-4) / 0.1)" />
            <ReferenceArea x1={50} x2={101} y1={0} y2={50} stroke="none" fill="hsl(var(--chart-4) / 0.1)" />
            <ReferenceArea x1={0} x2={50} y1={0} y2={50} stroke="none" fill="hsl(var(--chart-2) / 0.1)" />

            <XAxis type="number" dataKey="x" name="Faltas" unit="%" domain={[0, 100]}>
              <Label value="% Límite de Faltas" offset={-15} position="insideBottom" />
            </XAxis>
            <YAxis type="number" dataKey="y" name="Tareas NE" unit="%" domain={[0, 100]}>
              <Label value="% Límite de Tareas NE" angle={-90} offset={-10} position="insideLeft" />
            </YAxis>
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Alumnos" data={data} fill="hsl(var(--primary))" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
