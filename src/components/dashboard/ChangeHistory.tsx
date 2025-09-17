

"use client";

import { useEffect, useState, useMemo }from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineIcon, TimelineTitle, TimelineBody } from '@/components/ui/timeline';
import { useDashboardFilters } from './DashboardClient';
import { type Change, type BitacoraEntry } from '@/types/student';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, BookOpenCheck, Calendar, FileText, FileWarning, UserCog, Users } from 'lucide-react';
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
    bitacora: <FileText />,
};

function formatFieldName(fieldName: string): string {
    const map: Record<string, string> = {
        'absences': 'Nueva Falta Registrada',
        'missedAssignments': 'Nueva Tarea No Entregada',
        'leader': 'Cambio de Líder',
        'tutor': 'Cambio de Tutor',
        'group': 'Cambio de Grupo',
        'bitacora': 'Entrada en Bitácora',
    };
    return map[fieldName] || fieldName;
}

export function ChangeHistory({ studentId }: ChangeHistoryProps) {
  const { getStudentChanges, bitacoraEntries, allStudents } = useDashboardFilters();
  const [history, setHistory] = useState<(Change | BitacoraEntry)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const student = allStudents.find(s => s.id === studentId);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      
      // 1. Get changes from comparison history
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
      
      // 2. Get bitacora entries for this student
      const studentBitacoraEntries = bitacoraEntries.filter(e => e.studentId === studentId);
      
      // 3. Combine and sort
      const combinedHistory = [...relevantChanges, ...studentBitacoraEntries];
      
      combinedHistory.sort((a, b) => {
          const dateA = new Date('timestamp' in a ? a.timestamp.toDate() : a.date).getTime();
          const dateB = new Date('timestamp' in b ? b.timestamp.toDate() : b.date).getTime();
          return dateB - dateA;
      });

      setHistory(combinedHistory);
      setIsLoading(false);
    }
    loadHistory();
  }, [studentId, getStudentChanges, bitacoraEntries]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial Unificado</CardTitle>
                <CardDescription>Línea de tiempo de los eventos de riesgo y bitácora para este alumno.</CardDescription>
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
         <CardDescription>Línea de tiempo de los eventos de riesgo y bitácora para este alumno.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <Timeline>
            {history.map((item, index) => {
              // Type guard to differentiate Change and BitacoraEntry
              if ('fieldName' in item) { // It's a Change
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
              } else { // It's a BitacoraEntry
                return (
                    <TimelineItem key={`bitacora-${item.id}`}>
                        <TimelineConnector />
                        <TimelineHeader>
                            <TimelineIcon className="bg-blue-500">
                                {ICONS['bitacora']}
                            </TimelineIcon>
                            <TimelineTitle>{formatFieldName('bitacora')}</TimelineTitle>
                        </TimelineHeader>
                        <TimelineBody>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                     <Badge variant={item.caseType === 'academica' ? 'secondary' : 'default'}>{item.caseType}</Badge>
                                     {item.academicCommittee && <Badge variant="destructive">Comité Académico</Badge>}
                                </div>
                                <p className="text-sm"><span className="font-semibold">Descripción:</span> {item.description}</p>
                                <p className="text-sm"><span className="font-semibold">Acuerdos:</span> {item.agreements}</p>
                            </div>
                             <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>Evento: {format(item.eventDate.toDate(), "d 'de' LLLL, yyyy", { locale: es })}</span>
                                </div>
                                 <div className="flex items-center gap-1">
                                    <UserCog className="h-3 w-3" />
                                    <span>Reportado por: {item.reportedBy}</span>
                                </div>
                            </div>
                        </TimelineBody>
                    </TimelineItem>
                )
              }
            })}
          </Timeline>
        ) : (
          <p className="text-muted-foreground text-center py-4">No se encontraron cambios relevantes ni entradas en la bitácora para este alumno.</p>
        )}
      </CardContent>
    </Card>
  );
}
