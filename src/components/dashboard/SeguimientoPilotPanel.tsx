
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDashboardFilters } from './DashboardClient';
import { useToast } from '@/hooks/use-toast';
import { addSeguimientoPilotEntry } from '@/lib/firebase-services';
import type { SeguimientoPilotEntry } from '@/types/student';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, FileWarning, User } from 'lucide-react';
import { StudentSearchPopover } from './BitacoraPanel'; 
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const pilotSchema = z.object({
  studentId: z.string().min(1, "Se requiere seleccionar un alumno."),
  studentName: z.string(),
  attendedBy: z.string().min(1, "El campo 'Atendido por' es requerido."),
  topic: z.string().min(1, "El campo 'Tema' es requerido."),
  notes: z.string().optional(),
  parentsContacted: z.boolean().default(false),
});

type PilotFormValues = z.infer<typeof pilotSchema>;

export function SeguimientoPilotPanel() {
  const { seguimientoPilotEntries, fetchSeguimientoPilotEntries, allStudents } = useDashboardFilters();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<PilotFormValues>({
    resolver: zodResolver(pilotSchema),
    defaultValues: {
        studentId: '',
        studentName: '',
        attendedBy: '',
        topic: '',
        notes: '',
        parentsContacted: false,
    }
  });

  useEffect(() => {
    fetchSeguimientoPilotEntries();
  }, [fetchSeguimientoPilotEntries]);

  const studentIdValue = watch('studentId');
  const selectedStudent = allStudents.find(s => s.id === studentIdValue);

  const onSubmit = async (data: PilotFormValues) => {
    if (!selectedStudent) {
        toast({ variant: 'destructive', title: 'Error', description: 'Alumno no encontrado.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
      const totalAbsences = selectedStudent.subjectSummaries?.reduce((acc, s) => acc + s.absences, 0) || 0;
      const totalMissed = selectedStudent.subjectSummaries?.reduce((acc, s) => acc + s.missedAssignments, 0) || 0;

      const newEntry: Omit<SeguimientoPilotEntry, 'id' | 'createdAt'> = {
        ...data,
        absencesAtFollowUp: totalAbsences,
        missedAssignmentsAtFollowUp: totalMissed,
      };

      await addSeguimientoPilotEntry(newEntry);

      toast({ title: 'Seguimiento Guardado', description: 'El nuevo registro ha sido guardado correctamente.' });
      fetchSeguimientoPilotEntries();
      reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving pilot seguimiento entry:", error);
      toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo guardar el registro en la base de datos.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seguimientos (Piloto)</h1>
          <p className="text-muted-foreground">Un tablero para registrar y visualizar seguimientos a alumnos.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Añadir Seguimiento</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Nuevo Seguimiento</DialogTitle>
              <DialogDescription>Completa los campos para registrar un nuevo seguimiento.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Alumno</Label>
                <StudentSearchPopover onStudentSelect={(student) => { setValue('studentId', student.id, { shouldValidate: true }); setValue('studentName', student.name); }} />
                {errors.studentId && <p className="text-sm text-destructive">{errors.studentId.message}</p>}
                {selectedStudent && (
                    <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-4">
                            <span className='font-semibold'>{selectedStudent.name}</span>
                            <Badge variant="outline">Faltas: {selectedStudent.subjectSummaries?.reduce((acc, s) => acc + s.absences, 0) || 0}</Badge>
                            <Badge variant="outline">NE: {selectedStudent.subjectSummaries?.reduce((acc, s) => acc + s.missedAssignments, 0) || 0}</Badge>
                        </div>
                    </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendedBy">Atendido por</Label>
                <Input id="attendedBy" {...register('attendedBy')} placeholder="Ej. Juan Pérez (Tutor)" />
                {errors.attendedBy && <p className="text-sm text-destructive">{errors.attendedBy.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Tema</Label>
                <Input id="topic" {...register('topic')} placeholder="Ej. Aumento de faltas en materias de ciencias" />
                {errors.topic && <p className="text-sm text-destructive">{errors.topic.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" {...register('notes')} placeholder="Añade detalles, acuerdos y siguientes pasos..." />
              </div>
              <div className="flex items-center space-x-2">
                <Controller name="parentsContacted" control={control} render={({ field }) => ( <Checkbox id="parentsContacted" checked={field.value} onCheckedChange={field.onChange} /> )} />
                <Label htmlFor="parentsContacted" className="font-normal">¿Se contactó a los padres?</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar Seguimiento'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Seguimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Atendido por</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Faltas/NE (al momento)</TableHead>
                <TableHead>Padres Contactados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seguimientoPilotEntries.length > 0 ? (
                seguimientoPilotEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                        {entry.studentName}
                        <p className='text-xs text-muted-foreground'>{entry.studentId}</p>
                    </TableCell>
                    <TableCell>{format(entry.createdAt.toDate(), "d MMM yyyy, HH:mm", { locale: es })}</TableCell>
                    <TableCell>{entry.attendedBy}</TableCell>
                    <TableCell>{entry.topic}</TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap">{entry.notes}</TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1">
                            <Badge variant="secondary">F: {entry.absencesAtFollowUp}</Badge>
                            <Badge variant="destructive">NE: {entry.missedAssignmentsAtFollowUp}</Badge>
                        </div>
                    </TableCell>
                    <TableCell>{entry.parentsContacted ? 'Sí' : 'No'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No hay seguimientos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Re-utilizamos el popover de BitacoraPanel para mantener consistencia
// Si no existe, este componente debe crearse o importarse de forma correcta.
// Asumimos que BitacoraPanel.tsx existe y exporta StudentSearchPopover.
