
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
    const subjectStats: { [name: string]: { riskCount: number, totalCount: number } } = {};

    students.forEach(student => {
        (student.subjectSummaries || []).forEach(subject => {
            if (!subjectStats[subject.name]) {
                subjectStats[subject.name] = { riskCount: 0, totalCount: 0 };
            }
            subjectStats[subject.name].totalCount++;
            
            const value = riskType === 'absences' ? subject.absences : subject.missedAssignments;
            const limit = riskType === 'absences' ? subject.absenceLimit : subject.missedAssignmentLimit;
            const { level } = getRisk(value, limit);
            
            if (level === 'medium' || level === 'high') {
                subjectStats[subject.name].riskCount++;
            }
        });
    });
    
    return Object.entries(subjectStats)
        .map(([name, { riskCount, totalCount }]) => ({
            name: name,
            percentage: totalCount > 0 ? (riskCount / totalCount) * 100 : 0,
            riskCount,
            totalCount,
        }))
        .filter(d => d.riskCount > 0)
        .sort((a, b) => b.percentage - a.percentage)
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
            const data = payload[0].payload;
            return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <p className="font-bold text-base">{label}</p>
                    <p className="text-sm" style={{ color: payload[0].fill }}>
                        Riesgo: {data.percentage.toFixed(1)}% ({data.riskCount}/{data.totalCount} alumnos)
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
                    <XAxis type="number" dataKey="percentage" allowDecimals={false} unit="%" domain={[0, 100]} name="Porcentaje de Alumnos en Riesgo"/>
                    <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="percentage" name="Porcentaje en Riesgo" fill={barColor} barSize={20} onClick={(data) => onBarClick(data.name)} className="cursor-pointer" />
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
        <CardDescription>Top 5 materias con mayor % de alumnos en riesgo. Haz clic en una barra para ver los detalles.</CardDescription>
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
