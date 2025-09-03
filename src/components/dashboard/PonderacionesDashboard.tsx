
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PONDERACIONES_POR_AREA, CLASIFICACION_MATERIAS, EXAM_INTERMEDIO_PONDERACION, EXAM_FINAL_PONDERACION, type AreaName } from '@/lib/ponderaciones';
import { BookCopy } from 'lucide-react';

export function PonderacionesDashboard() {
  const areas = Object.keys(PONDERACIONES_POR_AREA).filter(area => area !== 'Unknown') as AreaName[];

  const calculateTotalPercentage = (area: AreaName) => {
    const ponderacion = PONDERACIONES_POR_AREA[area];
    if (!ponderacion) return 0;
    
    let total = 0;
    total += ponderacion.aai * ponderacion.vcu_aai;
    total += ponderacion.aaf * ponderacion.vcu_aaf;
    if (ponderacion.vpai) total += ponderacion.vpai;
    if (ponderacion.vpaf) total += ponderacion.vpaf;
    if (ponderacion.vpaf2) total += ponderacion.vpaf2;
    total += EXAM_INTERMEDIO_PONDERACION;
    total += EXAM_FINAL_PONDERACION;
    
    return total;
  };

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Guía de Ponderación por Área</h1>
        <p className="text-muted-foreground">
          Consulta rápida de las materias y sus esquemas de evaluación correspondientes.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {areas.map((area) => {
          const ponderacion = PONDERACIONES_POR_AREA[area];
          const materias = CLASIFICACION_MATERIAS[area] || [];
          const totalPercentage = calculateTotalPercentage(area);

          return (
            <Card key={area} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>{area}</CardTitle>
                    <Badge variant={totalPercentage === 100 ? "default" : "destructive"}>
                        Total: {totalPercentage}%
                    </Badge>
                </div>
                <CardDescription>Esquema de evaluación para esta área.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                {ponderacion ? (
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold mb-2">Ponderaciones:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li><strong>Actividades Pre-Intermedio:</strong> {ponderacion.aai} de {ponderacion.vcu_aai}% c/u</li>
                        {ponderacion.vpai && <li><strong>Proyecto Pre-Intermedio:</strong> {ponderacion.vpai}%</li>}
                        <li><strong>Examen Intermedio:</strong> {EXAM_INTERMEDIO_PONDERACION}%</li>
                        <li><strong>Actividades Pre-Final:</strong> {ponderacion.aaf} de {ponderacion.vcu_aaf}% c/u</li>
                        {ponderacion.vpaf && <li><strong>1er Proyecto Pre-Final:</strong> {ponderacion.vpaf}%</li>}
                        {ponderacion.vpaf2 && <li><strong>2do Proyecto Pre-Final:</strong> {ponderacion.vpaf2}%</li>}
                        <li><strong>Examen Final:</strong> {EXAM_FINAL_PONDERACION}%</li>
                    </ul>
                  </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No hay ponderación definida para esta área.</p>
                )}
                
                <div className="space-y-2 pt-4">
                    <h4 className="font-semibold">Materias Incluidas:</h4>
                    <div className="flex flex-wrap gap-2">
                        {materias.map(materia => (
                            <Badge key={materia} variant="secondary">{materia}</Badge>
                        ))}
                    </div>
                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
