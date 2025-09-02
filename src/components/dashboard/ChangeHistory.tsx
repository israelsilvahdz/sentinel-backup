
"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineIcon, TimelineTitle, TimelineBody } from '@/components/ui/timeline';
import { useDashboardFilters } from './DashboardClient';
import { type Change } from '@/types/student';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, BookOpenCheck, Calendar, Hash, Milestone } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChangeHistoryProps {
  studentId: string;
}

function formatFieldName(fieldName: string): string {
    if (fieldName.startsWith('activities.')) {
        return `Actividad ${fieldName.split('.')[1]}`;
    }
    const map: Record<string, string> = {
        'absences': 'Faltas',
        'missedAssignments': 'Tareas (NE)',
        'grade': 'Calificación Ponderada',
        'finalGrade': 'Calificación Final',
        'statusDescription': 'Estatus',
        'materia': 'Materia',
    };
    return map[fieldName] || fieldName;
}

function formatValue(value: any): string {
    if (value === null) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value);
}

export function ChangeHistory({ studentId }: ChangeHistoryProps) {
  const { getStudentChanges } = useDashboardFilters();
  const [history, setHistory] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      const changes = await getStudentChanges(studentId);
      // Ordenar por fecha, más reciente primero
      changes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(changes);
      setIsLoading(false);
    }
    loadHistory();
  }, [studentId, getStudentChanges]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Cambios</CardTitle>
                <CardDescription>Línea de tiempo de las actualizaciones para este alumno.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </CardContent>
        </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Cambios</CardTitle>
         <CardDescription>Línea de tiempo de las actualizaciones para este alumno.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <Timeline>
            {history.map((change, index) => (
              <TimelineItem key={index}>
                <TimelineConnector />
                <TimelineHeader>
                    <TimelineIcon>
                        {change.fieldName === 'materia' ? <Milestone /> : <AlertTriangle />}
                    </TimelineIcon>
                  <TimelineTitle>{formatFieldName(change.fieldName)} cambió</TimelineTitle>
                </TimelineHeader>
                <TimelineBody>
                  <div className="font-mono text-sm text-muted-foreground mb-2">
                    <p>
                        <span className="font-semibold text-foreground">Valor Anterior:</span> {formatValue(change.oldValue)}
                    </p>
                    <p>
                        <span className="font-semibold text-foreground">Valor Nuevo:</span> {formatValue(change.newValue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(change.date), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                    </div>
                     <div className="flex items-center gap-1">
                        <BookOpenCheck className="h-3 w-3" />
                        <span>{change.subjectId}</span>
                    </div>
                  </div>
                </TimelineBody>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <p className="text-muted-foreground">No se encontraron cambios para este alumno.</p>
        )}
      </CardContent>
    </Card>
  );
}
