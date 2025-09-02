"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { KpiCard } from './KpiCard';
import { RiskMatrixChart } from './RiskMatrixChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { StudentCard } from './StudentCard';
import { AlertCircle, BarChart2, BellRing, Users } from 'lucide-react';

import type { StudentData, Change } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { compareData, calculateKpis } from '@/lib/dataProcessor';
import { getStudentData, saveStudentData } from '@/lib/firestore';

function getTodayDataKey() {
  const today = new Date();
  return `datos_${today.toISOString().split('T')[0]}`;
}

function getYesterdayDataKey() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `datos_${yesterday.toISOString().split('T')[0]}`;
}

export function Dashboard() {
  const { toast } = useToast();
  const [currentData, setCurrentData] = useState<StudentData | null>(null);
  const [previousData, setPreviousData] = useState<StudentData | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const todayKey = getTodayDataKey();
        const yesterdayKey = getYesterdayDataKey();
        
        const [todayData, yesterdayData] = await Promise.all([
          getStudentData(todayKey),
          getStudentData(yesterdayKey)
        ]);

        setCurrentData(todayData);
        setPreviousData(yesterdayData);

        if (todayData && yesterdayData) {
          setChanges(compareData(todayData, yesterdayData));
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error de Carga',
          description: 'No se pudieron cargar los datos desde la base de datos.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [toast]);
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await parseExcel(file);
      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Error de Formato',
          description: 'El archivo Excel no tiene el formato esperado o está vacío. Por favor, revisa las columnas.',
        });
        setIsLoading(false);
        return;
      }

      const todayKey = getTodayDataKey();
      
      const previousDayData = currentData || await getStudentData(getYesterdayDataKey());

      setCurrentData(data);
      await saveStudentData(todayKey, data);
      
      if (previousDayData) {
        setPreviousData(previousDayData);
        setChanges(compareData(data, previousDayData));
      }
      
      toast({
        title: 'Éxito',
        description: `Reporte cargado. Se encontraron ${Object.keys(data).length} registros de alumnos.`,
      });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error al procesar',
        description: `Hubo un problema al leer el archivo Excel.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allStudents = useMemo(() => {
    if (!currentData) return [];
    return Object.values(currentData);
  }, [currentData]);

  const kpis = useMemo(() => {
    if (allStudents.length === 0) return { criticalRiskCount: 0, observationCount: 0 };
    return calculateKpis(allStudents);
  }, [allStudents]);

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6 flex justify-center">
          <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
        </CardContent>
      </Card>

      {isLoading && <p className="text-center text-muted-foreground">Cargando datos...</p>}

      {!isLoading && !currentData && (
         <Card className="text-center p-12">
            <CardHeader>
                <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                    <AlertCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Comienza a monitorear</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                Sube un reporte diario en formato Excel para ver el panel de control y las alertas de tus alumnos.
                </p>
            </CardContent>
         </Card>
      )}

      {!isLoading && currentData && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard title="Alumnos en Riesgo Crítico" value={kpis.criticalRiskCount} icon={BellRing} color="red" />
            <KpiCard title="Alumnos en Observación" value={kpis.observationCount} icon={Users} color="yellow" />
            <KpiCard title="Total de Cambios Hoy" value={changes.length} icon={BarChart2} color="blue" />
          </div>

          {allStudents.length > 0 ? (
            <>
              <div className="grid gap-8 md:grid-cols-2">
                <RiskMatrixChart students={allStudents} />
                <RiskDistributionChart students={allStudents} />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Panel de Alertas y Cambios</h2>
                <div className="space-y-6">
                    {allStudents.map(student => (
                        <StudentCard 
                            key={student.id} 
                            student={student} 
                            changes={changes.filter(c => c.studentId === student.id)}
                        />
                    ))}
                </div>
              </div>
            </>
          ) : (
            <Card className="text-center p-12">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>No hay alumnos para mostrar</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                    Sube un reporte para empezar a monitorear a tus alumnos.
                    </p>
                </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
