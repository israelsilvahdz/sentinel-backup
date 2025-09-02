
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
    const subjectRisks: { [name: string]: { totalRisk: number, count: number } } = {};

    students.forEach(student => {
        (student.subjectSummaries || []).forEach(subject => {
            if (!subjectRisks[subject.name]) {
                subjectRisks[subject.name] = { totalRisk: 0, count: 0 };
            }
            const value = riskType === 'absences' ? subject.absences : subject.missedAssignments;
            const limit = riskType === 'absences' ? subject.absenceLimit : subject.missedAssignmentLimit;
            const { risk } = getRisk(value, limit);
            subjectRisks[subject.name].totalRisk += risk;
            subjectRisks[subject.name].count++;
        });
    });
    
    return Object.entries(subjectRisks)
        .map(([name, data]) => ({
            name: name,
            riesgo: (data.totalRisk / data.count) * 100, 
        }))
        .filter(d => d.riesgo > 0)
        .sort((a, b) => b.riesgo - a.riesgo)
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
                    Riesgo Promedio: {payload[0].value.toFixed(1)}%
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
                    <XAxis type="number" unit="%" domain={[0, 100]} />
                    <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="riesgo" fill={barColor} barSize={20} onClick={(data) => onBarClick(data.name)} className="cursor-pointer" />
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
        <CardDescription>Top 5 materias con mayor riesgo promedio. Haz clic en una barra para ver los alumnos.</CardDescription>
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
