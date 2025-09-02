
"use client";

import { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useDashboardFilters, ActiveView } from './DashboardClient';
import { StudentCard } from './StudentCard';
import { ChangeHistory } from './ChangeHistory';

export function StudentHistoryPanel() {
  const { allStudents, isLoading, selectedStudentId, setSelectedStudentId, setActiveView } = useDashboardFilters();

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return allStudents.find(s => s.id === selectedStudentId) ?? null;
  }, [allStudents, selectedStudentId]);

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  const handleBackClick = () => {
    setSelectedStudentId(null);
    setActiveView('dashboard'); // O a la vista anterior que se podría guardar en el estado
  }

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
       <header className="mb-8 flex items-center gap-4">
         <Button variant="outline" size="icon" onClick={handleBackClick}>
            <ArrowLeft className="h-4 w-4" />
         </Button>
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Historial del Alumno</h1>
            <p className="text-muted-foreground">Vista detallada del progreso y cambios de un alumno.</p>
        </div>
      </header>

      {selectedStudent ? (
        <div className="space-y-6">
            <StudentCard student={selectedStudent} startOpen={true} />
            <ChangeHistory studentId={selectedStudent.id} />
        </div>
      ) : (
        <Card className="text-center p-12">
            <CardHeader>
                <CardTitle>Alumno no encontrado</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    No se encontró al alumno seleccionado. Por favor, regresa y elige otro.
                </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

