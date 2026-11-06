

"use client";

import { useEffect, useState, useMemo }from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineIcon, TimelineTitle, TimelineBody } from '@/components/ui/timeline';
import { useDashboardFilters } from './DashboardClient';
import { type Change, type TeamTask } from '@/types/student';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, BookOpenCheck, Calendar, FileText, FileWarning, UserCog, Users, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';

interface ChangeHistoryProps {
  studentId: string;
}

const ICONS: Record<string, React.ReactElement> = {
    absences: <FileWarning />,
    missedAssignments: <AlertTriangle />,
    leader: <UserCog />,
    tutor: <UserCog />,
    group: <Users />,
    task: <ClipboardList />,
};

function formatFieldName(fieldName: string): string {
    const map: Record<string, string> = {
        'absences': 'Nueva Falta Registrada',
        'missedAssignments': 'Nueva Tarea No Entregada',
        'leader': 'Cambio de Líder',
        'tutor': 'Cambio de Tutor',
        'group': 'Cambio de Grupo',
        'task': 'Pendiente de Equipo Creado',
    };
    return map[fieldName] || fieldName;
}

// Type guard para diferenciar los tipos de items del historial
const isChange = (item: any): item is Change => 'fieldName' in item;
const isTeamTask = (item: any): item is TeamTask => 'situation' in item && 'assignedTo' in item;

type HistoryItem = Change | TeamTask;


export function ChangeHistory({ studentId }: ChangeHistoryProps) {
  const { getStudentChanges, teamTasks, allStudents } = useDashboardFilters();
  const [history, setHistory] = useState<HistoryItem[]>([]);
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
      
      const studentTasks = teamTasks.filter(t => t.studentId === studentId);
      
      const combinedHistory: HistoryItem[] = [...relevantChanges, ...studentTasks];
      
      combinedHistory.sort((a, b) => {
          let dateA: Date;
          if (isChange(a)) dateA = new Date(a.date);
          else dateA = a.createdAt.toDate();

          let dateB: Date;
          if (isChange(b)) dateB = new Date(b.date);
          else dateB = b.createdAt.toDate();

          return dateB.getTime() - dateA.getTime();
      });

      setHistory(combinedHistory);
      setIsLoading(false);
    }
    loadHistory();
  }, [studentId, getStudentChanges, teamTasks]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial Unificado</CardTitle>
                <CardDescription>Línea de tiempo de los eventos de riesgo, y pendientes para este alumno.</CardDescription>
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
        <CardTitle>Historial Unificado</CardTitle>
         <CardDescription>Línea de tiempo de los eventos de riesgo, y pendientes para este alumno.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <Timeline>
            {history.map((item, index) => {
              if (isChange(item)) {
                const subjectName = student?.subjects?.find(s => s.id === item.subjectId)?.name;
                return (
                  <TimelineItem key={`change-${index}`}>
                    <TimelineConnector />
                    <TimelineHeader>
                        <TimelineIcon>
                            {ICONS[item.fieldName] || <AlertTriangle />}
                        </TimelineIcon>
                      <TimelineTitle>{formatFieldName(item.fieldName)}</TimelineTitle>
                    </TimelineHeader>
                    <TimelineBody>
                      <div className="font-mono text-sm text-muted-foreground mb-2">
                         <p>
                            <span className="font-semibold text-foreground">
                                {item.oldValue}
                            </span> → <span className="font-semibold text-primary">{item.newValue}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.date), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                        </div>
                         {subjectName && (
                            <div className="flex items-center gap-1">
                                <BookOpenCheck className="h-3 w-3" />
                                <span>{subjectName} ({item.subjectId})</span>
                            </div>
                         )}
                      </div>
                    </TimelineBody>
                  </TimelineItem>
                )
              } else if (isTeamTask(item)) {
                return (
                  <TimelineItem key={`task-${item.id}`}>
                    <TimelineConnector />
                    <TimelineHeader>
                      <TimelineIcon className="bg-blue-500">{ICONS['task']}</TimelineIcon>
                      <TimelineTitle>{formatFieldName('task')}</TimelineTitle>
                    </TimelineHeader>
                    <TimelineBody>
                       <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              <Badge variant={item.status === 'pendiente' ? 'destructive' : 'default'}>{item.status}</Badge>
                              <Badge variant="secondary">{item.situation}</Badge>
                           </div>
                           <p className="text-sm"><span className="font-semibold">Notas:</span> {item.notes}</p>
                           {item.completionNotes && <p className="text-sm"><span className="font-semibold text-primary">Notas de Cierre:</span> {item.completionNotes}</p>}
                       </div>
                       <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                           <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Creado: {format(item.createdAt.toDate(), "d 'de' LLLL, yyyy", { locale: es })}</span>
                           </div>
                           <div className="flex items-center gap-1">
                                <UserCog className="h-3 w-3" />
                                <span>Asignado a: {item.assignedTo}</span>
                           </div>
                       </div>
                    </TimelineBody>
                  </TimelineItem>
                );
              }
              return null;
            })}
          </Timeline>
        ) : (
          <p className="text-muted-foreground text-center py-4">No se encontraron cambios relevantes ni entradas en la bitácora para este alumno.</p>
        )}
      </CardContent>
    </Card>
  );
}
