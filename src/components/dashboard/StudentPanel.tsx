

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Loader2, X, ArrowRightCircle } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { Button } from '../ui/button';

export function StudentPanel() {
  const { 
    filteredStudents, 
    hasData, 
    isLoading, 
    caseType, 
    setCaseType, 
    setActiveView, 
    setSelectedStudentId,
    subjectRiskFilter,
    setSubjectRiskFilter 
  } = useDashboardFilters();

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveView('history');
  }

  const caseTypeMap = {
    lost: 'Casos Perdidos',
    urgent: 'Casos Urgentes',
    observation: 'Alumnos en Observación',
    extraordinary: 'Alumnos con derecho a extraordinario',
  };

  const getPanelTitle = () => {
    if (caseType) {
        return <>Mostrando: <span className="font-semibold text-primary">{caseTypeMap[caseType]}</span></>;
    }
    if (subjectRiskFilter) {
        const riskTypeText = subjectRiskFilter.riskType === 'absences' ? 'Faltas' : 'Tareas (NE)';
        return <>Mostrando: Alumnos en riesgo por <span className="font-semibold text-primary">{riskTypeText}</span> en <span className="font-semibold text-primary">{subjectRiskFilter.subjectName}</span></>;
    }
    return 'Explora y monitorea los casos individuales de cada alumno.';
  };

  const handleClearFilter = () => {
    setCaseType(null);
    setSubjectRiskFilter(null);
  };
  
  const hasActiveFilter = !!caseType || !!subjectRiskFilter;

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
       <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Alumnos</h1>
         <div className="flex items-center gap-2 mt-2">
             <p className="text-muted-foreground">
                {getPanelTitle()}
            </p>
            {hasActiveFilter && (
                 <Button variant="ghost" size="sm" onClick={handleClearFilter}>
                   <X className="mr-2 h-4 w-4"/>
                   Limpiar filtro
                </Button>
            )}
        </div>
      </header>

      {hasData && (
        <>
          {filteredStudents.length > 0 ? (
            <div className="space-y-4">
                {filteredStudents.map(student => (
                    <Card key={student.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                          <div>
                              <p className="font-semibold">{student.name}</p>
                              <p className="text-sm text-muted-foreground">Matrícula: {student.id}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleStudentClick(student.id)}>
                              <ArrowRightCircle className="mr-2 h-4 w-4"/>
                              Ver Detalles
                          </Button>
                      </CardContent>
                    </Card>
                ))}
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
                      No se encontraron alumnos con los filtros seleccionados.
                    </p>
                </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
