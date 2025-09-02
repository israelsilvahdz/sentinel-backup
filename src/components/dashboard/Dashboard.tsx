"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { MonitoredStudents } from './MonitoredStudents';
import { KpiCard } from './KpiCard';
import { RiskMatrixChart } from './RiskMatrixChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { StudentCard } from './StudentCard';
import { AlertCircle, BarChart2, BellRing, Users } from 'lucide-react';

import type { StudentData, Change } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { compareData, calculateKpis } from '@/lib/dataProcessor';
import { getMonitoredStudentIds, saveMonitoredStudentIds, getStudentData, saveStudentData } from '@/lib/firestore';

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
  const [monitoredIdsInput, setMonitoredIdsInput] = useState<string>('');
  const [monitoredStudentIds, setMonitoredStudentIds] = useState<string[]>([]);
  const [currentData, setCurrentData] = useState<StudentData | null>(null);
  const [previousData, setPreviousData] = useState<StudentData | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const { ids, idsString } = await getMonitoredStudentIds();
        setMonitoredStudentIds(ids);
        setMonitoredIdsInput(idsString);

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

  const handleUpdateMonitoredIds = useCallback(async (ids: string[], idsString: string) => {
    try {
      await saveMonitoredStudentIds(ids, idsString);
      setMonitoredStudentIds(ids);
      setMonitoredIdsInput(idsString);
      toast({
        title: 'Lista Guardada',
        description: 'La lista de matrículas de alumnos ha sido guardada en la base de datos.',
      });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: 'No se pudo guardar la lista de matrículas.',
      });
    }
  }, [toast]);
  
  const handleMonitoredIdsInputChange = useCallback((value: string) => {
    setMonitoredIdsInput(value);
  }, []);

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

  const monitoredStudents = useMemo(() => {
    if (!currentData || monitoredStudentIds.length === 0) return [];
    return monitoredStudentIds.map(id => currentData[id]).filter(Boolean);
  }, [currentData, monitoredStudentIds]);

  const kpis = useMemo(() => {
    if (monitoredStudents.length === 0) return { criticalRiskCount: 0, observationCount: 0 };
    return calculateKpis(monitoredStudents);
  }, [monitoredStudents]);
  
  const filteredChanges = useMemo(() => {
    if (monitoredStudentIds.length === 0) return [];
    const idSet = new Set(monitoredStudentIds);
    return changes.filter(c => idSet.has(c.studentId));
  }, [changes, monitoredStudentIds]);
  

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
            <MonitoredStudents 
              value={monitoredIdsInput}
              onChange={handleMonitoredIdsInputChange}
              onUpdateIds={handleUpdateMonitoredIds}
            />
          </div>
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
            <KpiCard title="Total de Cambios Hoy" value={filteredChanges.length} icon={BarChart2} color="blue" />
          </div>

          {monitoredStudents.length > 0 ? (
            <>
              <div className="grid gap-8 md:grid-cols-2">
                <RiskMatrixChart students={monitoredStudents} />
                <RiskDistributionChart students={monitoredStudents} />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Panel de Alertas y Cambios</h2>
                <div className="space-y-6">
                    {monitoredStudents.map(student => (
                        <StudentCard 
                            key={student.id} 
                            student={student} 
                            changes={filteredChanges.filter(c => c.studentId === student.id)}
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
                    Agrega las matrículas de los alumnos que supervisas en el campo de texto de arriba para ver su progreso.
                    </p>
                </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
