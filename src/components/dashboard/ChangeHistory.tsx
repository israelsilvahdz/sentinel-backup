
"use client";

import { useEffect, useState }from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineIcon, TimelineTitle, TimelineBody } from '@/components/ui/timeline';
import { useDashboardFilters } from './DashboardClient';
import { type Change } from '@/types/student';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, BookOpenCheck, Calendar, FileWarning, UserCog, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChangeHistoryProps {
  studentId: string;
}

const ICONS: Record<string, React.ReactElement> = {
    absences: <FileWarning />,
    missedAssignments: <AlertTriangle />,
    leader: <UserCog />,
    tutor: <UserCog />,
    group: <Users />,
};

function formatFieldName(fieldName: string): string {
    const map: Record<string, string> = {
        'absences': 'Nueva Falta Registrada',
        'missedAssignments': 'Nueva Tarea No Entregada',
        'leader': 'Cambio de Líder',
        'tutor': 'Cambio de Tutor',
        'group': 'Cambio de Grupo'
    };
    return map[fieldName] || fieldName;
}

export function ChangeHistory({ studentId }: ChangeHistoryProps) {
  const { getStudentChanges, allStudents } = useDashboardFilters();
  const [history, setHistory] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const student = allStudents.find(s => s.id === studentId);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      const allChanges = await getStudentChanges(studentId);
      
      const isIncrement = (change: Change) => 
        typeof change.newValue === 'number' &&
        typeof change.oldValue === 'number' &&
        change.newValue > change.oldValue;

      const relevantChanges = allChanges.filter(change => 
        (change.fieldName === 'absences' && isIncrement(change)) ||
        (change.fieldName === 'missedAssignments' && isIncrement(change)) ||
        change.fieldName === 'leader' ||
        change.fieldName === 'tutor' ||
        change.fieldName === 'group'
      );
      
      relevantChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(relevantChanges);
      setIsLoading(false);
    }
    loadHistory();
  }, [studentId, getStudentChanges]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Cambios</CardTitle>
                <CardDescription>Línea de tiempo de los eventos de riesgo y cambios para este alumno.</CardDescription>
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
         <CardDescription>Línea de tiempo de los eventos de riesgo y cambios para este alumno.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <Timeline>
            {history.map((change, index) => {
              const subjectName = student?.subjects?.find(s => s.id === change.subjectId)?.name;
              return (
                <TimelineItem key={index}>
                  <TimelineConnector />
                  <TimelineHeader>
                      <TimelineIcon>
                          {ICONS[change.fieldName] || <AlertTriangle />}
                      </TimelineIcon>
                    <TimelineTitle>{formatFieldName(change.fieldName)}</TimelineTitle>
                  </TimelineHeader>
                  <TimelineBody>
                    <div className="font-mono text-sm text-muted-foreground mb-2">
                       <p>
                          <span className="font-semibold text-foreground">
                              {change.oldValue}
                          </span> → <span className="font-semibold text-primary">{change.newValue}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(change.date), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                      </div>
                       {subjectName && (
                          <div className="flex items-center gap-1">
                              <BookOpenCheck className="h-3 w-3" />
                              <span>{subjectName} ({change.subjectId})</span>
                          </div>
                       )}
                    </div>
                  </TimelineBody>
                </TimelineItem>
              )
            })}
          </Timeline>
        ) : (
          <p className="text-muted-foreground">No se encontraron cambios relevantes entre los dos reportes para este alumno.</p>
        )}
      </CardContent>
    </Card>
  );
}
