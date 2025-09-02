

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StudentCard } from './StudentCard';
import { Users, Loader2, X } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { Button } from '../ui/button';

export function StudentPanel() {
  const { filteredStudents, hasData, isLoading, caseType, setCaseType } = useDashboardFilters();

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  const caseTypeMap = {
    lost: 'Casos Perdidos',
    urgent: 'Casos Urgentes',
    observation: 'Alumnos en Observación',
  };

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
       <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Alumnos</h1>
         {caseType ? (
            <div className="flex items-center gap-2 mt-2">
                 <p className="text-muted-foreground">
                    Mostrando: <span className="font-semibold text-primary">{caseTypeMap[caseType]}</span>
                </p>
                <Button variant="ghost" size="sm" onClick={() => setCaseType(null)}>
                   <X className="mr-2 h-4 w-4"/>
                   Limpiar filtro
                </Button>
            </div>
         ) : (
            <p className="text-muted-foreground">Explora y monitorea los casos individuales de cada alumno.</p>
         )}
      </header>

      {hasData && (
        <>
          {filteredStudents.length > 0 ? (
            <div className="space-y-6">
                {filteredStudents.map(student => (
                    <StudentCard 
                        key={student.id} 
                        student={student} 
                    />
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
