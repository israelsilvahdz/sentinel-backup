
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from './KpiCard';
import { RiskFocusChart } from './RiskFocusChart';
import { RiskDistributionChart } from './RiskDistributionChart';
import { AlertCircle, BarChart2, BellRing, Users, UserX, UserCheck, Loader2, ArrowRightCircle, Award } from 'lucide-react';

import { calculateKpis, findLostCases, findUrgentCases, findObservationCases, findExtraordinaryCases } from '@/lib/dataProcessor';
import { useDashboardFilters } from './DashboardClient';
import type { Student } from '@/types/student';

export function Dashboard() {
  const { filteredStudents, isLoading, hasData, setActiveView, setCaseType } = useDashboardFilters();

  const { kpis, lostCases, urgentCases, observationCases, extraordinaryCases } = useMemo(() => {
    if (isLoading || !hasData) {
        return { 
            kpis: { totalStudents: 0 },
            lostCases: [],
            urgentCases: [],
            observationCases: [],
            extraordinaryCases: []
        };
    }
    const lc = findLostCases(filteredStudents);
    const lostCaseIds = new Set(lc.map(s => s.id));
    
    const uc = findUrgentCases(filteredStudents, lostCaseIds);
    const urgentCaseIds = new Set(uc.map(s => s.id));
    
    const combinedExclusions = new Set([...lostCaseIds, ...urgentCaseIds]);
    const oc = findObservationCases(filteredStudents, combinedExclusions);

    const extraCases = findExtraordinaryCases(filteredStudents);

    return {
      kpis: { totalStudents: filteredStudents.length },
      lostCases: lc,
      urgentCases: uc,
      observationCases: oc,
      extraordinaryCases: extraCases,
    };
  }, [filteredStudents, isLoading, hasData]);

  const handleCaseClick = (caseType: 'lost' | 'urgent' | 'observation' | 'extraordinary' | null) => {
    setCaseType(caseType);
    setActiveView('students');
  };

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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Progreso Estudiantil</h1>
        <p className="text-muted-foreground">Una vista general del rendimiento y riesgo de los alumnos.</p>
      </header>
      
      {!hasData && (
         <Card className="text-center p-12 mt-16">
            <CardHeader>
                <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                    <AlertCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Comienza a monitorear</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                Sube un reporte diario en formato Excel para poblar la base de datos y ver el panel de control.
                </p>
            </CardContent>
         </Card>
      )}

      {hasData && (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard title="Casos Perdidos" value={lostCases.length} icon={UserX} color="red" onClick={() => handleCaseClick('lost')} />
                <KpiCard title="Casos Urgentes" value={urgentCases.length} icon={BellRing} color="yellow" onClick={() => handleCaseClick('urgent')} />
                <KpiCard title="En Observación" value={observationCases.length} icon={Users} color="blue" onClick={() => handleCaseClick('observation')} />
                <KpiCard title="A Extraordinario" value={extraordinaryCases.length} icon={Award} onClick={() => handleCaseClick('extraordinary')} />
            </div>

            {filteredStudents.length > 0 ? (
                <div className="grid grid-cols-1 gap-8">
                    <RiskDistributionChart students={filteredStudents} />
                    <RiskFocusChart students={filteredStudents} />
                </div>
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
                        No se encontraron alumnos con los filtros seleccionados o no se ha cargado ningún reporte.
                    </p>
                </CardContent>
            </Card>
            )}
        </>
      )}
    </div>
  );
}
