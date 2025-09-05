


"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Loader2, X, ArrowRightCircle, BookX } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

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
    setSubjectRiskFilter,
    groupId,
    setGroupId
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
    changes: 'Alumnos con Cambios Detectados',
    incompleteGrade: 'Alumnos con Calificaciones Incompletas (SC)',
  };

  const getPanelTitle = () => {
    if (caseType) {
        let title = `Mostrando: ${caseTypeMap[caseType]}`;
        if (caseType === 'incompleteGrade' && groupId) {
          title += ` (Grupo: ${groupId})`
        }
        return <p className="text-muted-foreground">{title}</p>;
    }
    if (subjectRiskFilter) {
        const riskTypeText = subjectRiskFilter.riskType === 'absences' ? 'Faltas' : 'Tareas (NE)';
        return <p className="text-muted-foreground">Mostrando: Alumnos en riesgo por <span className="font-semibold text-primary">{riskTypeText}</span> en <span className="font-semibold text-primary">{subjectRiskFilter.subjectName}</span></p>;
    }
    return <p className="text-muted-foreground">Explora y monitorea los casos individuales de cada alumno.</p>;
  };

  const handleClearFilter = () => {
    setCaseType(null);
    setSubjectRiskFilter(null);
    setGroupId(null);
  };
  
  const hasActiveFilter = !!caseType || !!subjectRiskFilter;

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
       <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Alumnos</h1>
         <div className="flex items-center gap-2 mt-2">
             {getPanelTitle()}
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
                {filteredStudents.map(student => {
                  const extraordinarySubjects = caseType === 'extraordinary'
                    ? student.subjectSummaries?.filter(s => s.finalGrade && s.finalGrade >= 50 && s.finalGrade <= 69)
                    : [];

                  return (
                    <Card key={student.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1">
                              <p className="font-semibold">{student.name}</p>
                              <p className="text-sm text-muted-foreground">Matrícula: {student.id}</p>
                              {extraordinarySubjects && extraordinarySubjects.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Materias para Extraordinario:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {extraordinarySubjects.map(sub => (
                                      <Badge key={sub.id} variant="secondary">{sub.name}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleStudentClick(student.id)}>
                              <ArrowRightCircle className="mr-2 h-4 w-4"/>
                              Ver Detalles
                          </Button>
                      </CardContent>
                    </Card>
                  )
                })}
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
