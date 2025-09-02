
"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type Student } from '@/types/student';
import { getRisk } from '@/lib/dataProcessor';
import { useDashboardFilters } from './DashboardClient';

interface RiskFocusChartProps {
  students: Student[];
}

function processRiskData(students: Student[], riskType: 'absences' | 'missedAssignments') {
    const subjectRisks: { [name: string]: number } = {};

    students.forEach(student => {
        (student.subjectSummaries || []).forEach(subject => {
            if (!subjectRisks[subject.name]) {
                subjectRisks[subject.name] = 0;
            }
            const value = riskType === 'absences' ? subject.absences : subject.missedAssignments;
            const limit = riskType === 'absences' ? subject.absenceLimit : subject.missedAssignmentLimit;
            const { level } = getRisk(value, limit);
            
            // Contar si el alumno está en riesgo medio o alto
            if (level === 'medium' || level === 'high') {
                subjectRisks[subject.name]++;
            }
        });
    });
    
    return Object.entries(subjectRisks)
        .map(([name, count]) => ({
            name: name,
            alumnos: count, 
        }))
        .filter(d => d.alumnos > 0)
        .sort((a, b) => b.alumnos - a.alumnos)
        .slice(0, 5); // Top 5
}

function ChartComponent({ 
    data, 
    title, 
    barColor, 
    onBarClick 
}: { 
    data: any[], 
    title: string, 
    barColor: string,
    onBarClick: (subjectName: string) => void
}) {
    
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                <p className="font-bold text-base">{label}</p>
                <p className="text-sm" style={{ color: payload[0].fill }}>
                    Alumnos en Riesgo: {payload[0].value}
                </p>
                </div>
            );
        }
        return null;
    };
    
    return (
        <div className="h-[250px]">
            <h3 className="text-center font-semibold text-muted-foreground mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 100, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" dataKey="alumnos" allowDecimals={false} name="Nro. de Alumnos"/>
                    <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="alumnos" name="Alumnos en Riesgo" fill={barColor} barSize={20} onClick={(data) => onBarClick(data.name)} className="cursor-pointer" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}


export function RiskFocusChart({ students }: RiskFocusChartProps) {
  const { setSubjectRiskFilter, setActiveView } = useDashboardFilters();

  const absenceData = useMemo(() => processRiskData(students, 'absences'), [students]);
  const assignmentData = useMemo(() => processRiskData(students, 'missedAssignments'), [students]);

  const handleBarClick = (subjectName: string, riskType: 'absences' | 'missedAssignments') => {
    setSubjectRiskFilter({ subjectName, riskType });
    setActiveView('students');
  };

  const hasData = absenceData.length > 0 || assignmentData.length > 0;

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Focos de Riesgo por Materia</CardTitle>
        <CardDescription>Top 5 materias con más alumnos en riesgo. Haz clic en una barra para ver los detalles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasData ? (
          <>
            <ChartComponent 
                data={absenceData} 
                title="Riesgo por Faltas" 
                barColor="hsl(var(--chart-4))" 
                onBarClick={(subjectName) => handleBarClick(subjectName, 'absences')}
            />
            <ChartComponent 
                data={assignmentData} 
                title="Riesgo por Tareas No Entregadas" 
                barColor="hsl(var(--chart-3))" 
                onBarClick={(subjectName) => handleBarClick(subjectName, 'missedAssignments')}
            />
          </>
        ) : (
            <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No hay datos de riesgo para mostrar.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
