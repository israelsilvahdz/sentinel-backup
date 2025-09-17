
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { getSeguimientoEntries, updateSeguimientoStatus, deleteSeguimientoEntry } from '@/lib/firebase-services';
import type { SeguimientoEntry } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Trash2, Printer, AlertTriangle, FileWarning, HelpCircle, ClipboardList } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

export function SeguimientoPanel() {
  const { allStudentsMap } = useDashboardFilters();
  const [entries, setEntries] = useState<SeguimientoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedEntries = await getSeguimientoEntries();
      setEntries(fetchedEntries);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los casos de seguimiento.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleStatusChange = async (id: string, currentStatus: 'pendiente' | 'completado') => {
    const newStatus = currentStatus === 'pendiente' ? 'completado' : 'pendiente';
    try {
      await updateSeguimientoStatus(id, newStatus);
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
      toast({ title: 'Estado actualizado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado del caso.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSeguimientoEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Caso eliminado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el caso.' });
    }
  };

  const SITUATION_MAP: Record<SeguimientoEntry['situation'], { icon: React.ReactNode, text: string }> = {
    'faltas': { icon: <FileWarning className="h-4 w-4 text-yellow-600" />, text: 'Faltas' },
    'no-entregados': { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, text: 'Tareas No Entregadas' },
    'otro': { icon: <HelpCircle className="h-4 w-4 text-blue-600" />, text: 'Otro' },
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
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Reporte de Seguimiento</h1>
            <p className="text-muted-foreground">Casos de alumnos que requieren atención y seguimiento especial.</p>
        </div>
        <Button disabled>
            <Printer className="mr-2 h-4 w-4" />
            Terminar y Generar Reporte
        </Button>
      </header>

      <div className="space-y-4">
        {entries.length > 0 ? entries.map(entry => {
          const student = allStudentsMap.get(entry.studentId);
          const subjectsInCase = entry.subjects.map(subjectId => 
            student?.subjects?.find(s => s.id === subjectId)
          ).filter(Boolean);

          return (
            <Card key={entry.id} className={entry.status === 'completado' ? 'bg-muted/30' : ''}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Checkbox
                        checked={entry.status === 'completado'}
                        onCheckedChange={() => handleStatusChange(entry.id, entry.status)}
                        className="mr-2"
                     />
                    <span className={entry.status === 'completado' ? 'line-through text-muted-foreground' : ''}>
                        {entry.studentName}
                    </span>
                    <Badge variant="secondary">{entry.studentId}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Agregado el: {format(entry.createdAt.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                  </CardDescription>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción es permanente y eliminará el caso de seguimiento.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="space-y-3">
                 <div className="flex items-center gap-2 font-semibold">
                    {SITUATION_MAP[entry.situation].icon}
                    <span>Situación: {SITUATION_MAP[entry.situation].text}</span>
                 </div>
                 {subjectsInCase.length > 0 && (
                    <div>
                        <h4 className="font-medium text-sm">Materias involucradas:</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {subjectsInCase.map(s => <Badge key={s!.id} variant="outline">{s!.name}</Badge>)}
                        </div>
                    </div>
                 )}
                 {entry.notes && (
                    <div>
                        <h4 className="font-medium text-sm">Notas:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-gray-50 p-2 rounded-md">{entry.notes}</p>
                    </div>
                 )}
              </CardContent>
            </Card>
          );
        }) : (
            <Card className="text-center p-12">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                        <ClipboardList className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>No hay casos de seguimiento</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                      Agrega un caso desde el Panel de Alumnos para comenzar.
                    </p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
