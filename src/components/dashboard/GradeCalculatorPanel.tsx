
"use client";

import React, { useMemo } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calculator, Info, Loader2 } from 'lucide-react';
import { getAreaForMateria, PONDERACIONES_POR_AREA, EXAM_INTERMEDIO_PONDERACION, EXAM_FINAL_PONDERACION } from '@/lib/ponderaciones';
import type { Student, Subject } from '@/types/student';

// Función para calcular la calificación final de una materia
function calculateFinalGrade(subject: Subject): number {
  const area = getAreaForMateria(subject.name);
  const ponderacion = PONDERACIONES_POR_AREA[area];

  if (!ponderacion) {
    return NaN; // Retorna NaN si no hay ponderación definida
  }

  // Ordenar las actividades cronológicamente (A1, A2, A10, etc.)
  const sortedActivities = Object.entries(subject.activities)
    .filter(([key]) => /^A\d+$/.test(key))
    .sort(([keyA], [keyB]) => {
      const numA = parseInt(keyA.substring(1), 10);
      const numB = parseInt(keyB.substring(1), 10);
      return numA - numB;
    })
    .map(([, value]) => (typeof value === 'number' ? value : parseFloat(String(value)) || 0));

  let totalScore = 0;
  let activityIndex = 0;

  // 1. Actividades Antes del Intermedio (AAI)
  for (let i = 0; i < ponderacion.aai; i++) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vcu_aai;
  }

  // 2. Proyecto Antes del Intermedio (VPAI)
  if (ponderacion.vpai) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vpai;
  }

  // 3. Examen Intermedio
  const intermedioScore = sortedActivities[activityIndex++] ?? 0;
  totalScore += (intermedioScore / 100) * EXAM_INTERMEDIO_PONDERACION;

  // 4. Actividades Antes del Final (AAF)
  for (let i = 0; i < ponderacion.aaf; i++) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vcu_aaf;
  }

  // 5. Proyecto Antes del Final (VPAF)
  if (ponderacion.vpaf) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vpaf;
  }
  
  // 6. Segundo Proyecto Antes del Final (VPAF2)
  if (ponderacion.vpaf2) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vpaf2;
  }

  // 7. Examen Final
  const finalScore = sortedActivities[activityIndex++] ?? 0;
  totalScore += (finalScore / 100) * EXAM_FINAL_PONDERACION;
  
  return totalScore;
}


export function GradeCalculatorPanel() {
  const { allStudents, isLoading, hasData, filteredStudents } = useDashboardFilters();

  const calculatedData = useMemo(() => {
    return filteredStudents
      .flatMap(student => 
        (student.subjects || []).map(subject => ({
          studentId: student.id,
          studentName: student.name,
          subjectName: subject.name,
          calculatedGrade: calculateFinalGrade(subject),
        }))
      )
      .filter(item => !isNaN(item.calculatedGrade));
  }, [filteredStudents]);
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Calculador de Ponderaciones</h1>
        <p className="text-muted-foreground">
          Calcula la calificación final según las ponderaciones de cada área.
        </p>
      </header>

      {!hasData ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No hay datos para calcular</AlertTitle>
          <AlertDescription>
            Por favor, carga un reporte de Excel para comenzar a calcular las ponderaciones.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Calificaciones Calculadas</CardTitle>
            <CardDescription>
                Se muestran las calificaciones finales calculadas para los alumnos y materias según los filtros activos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nombre del Alumno</TableHead>
                  <TableHead>Materia</TableHead>
                  <TableHead className="text-right">Calificación Calculada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedData.length > 0 ? (
                  calculatedData.map((item, index) => (
                    <TableRow key={`${item.studentId}-${item.subjectName}-${index}`}>
                      <TableCell className="font-mono">{item.studentId}</TableCell>
                      <TableCell>{item.studentName}</TableCell>
                      <TableCell>{item.subjectName}</TableCell>
                      <TableCell className="text-right font-bold font-mono">
                        {item.calculatedGrade.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      No se encontraron resultados para los filtros actuales o las materias no tienen ponderaciones definidas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
