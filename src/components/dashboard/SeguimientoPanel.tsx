

"use client";

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useDashboardFilters, type CaseType } from './DashboardClient';
import type { Student, SeguimientoEntry } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { addSeguimientoEntry } from '@/lib/firebase-services';
import { findUrgentCases, findLostCases } from '@/lib/dataProcessor';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle, Loader2, FileWarning, Search, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function AddSeguimientoForm({ student, onTaskAdded }: { student: Student, onTaskAdded: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ attendedBy: string, topic: string, notes: string }>();

  const onSubmit = async (data: { attendedBy: string, topic: string, notes: string }) => {
    setIsSubmitting(true);
    try {
      const totalAbsences = student.subjectSummaries?.reduce((acc, s) => acc + s.absences, 0) || 0;
      const totalMissed = student.subjectSummaries?.reduce((acc, s) => acc + s.missedAssignments, 0) || 0;
      
      const newEntry: Omit<SeguimientoEntry, 'id' | 'createdAt'> = {
        studentId: student.id,
        studentName: student.name,
        attendedBy: data.attendedBy,
        topic: data.topic,
        notes: data.notes,
        absencesAtFollowUp: totalAbsences,
        missedAssignmentsAtFollowUp: totalMissed,
      };

      await addSeguimientoEntry(newEntry);
      toast({ title: 'Seguimiento añadido', description: `Se ha añadido un nuevo seguimiento para ${student.name}.` });
      onTaskAdded();
      reset();
    } catch (error) {
      console.error("Error adding seguimiento entry", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el seguimiento.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="attendedBy">Atendido por</Label>
        <Input id="attendedBy" {...register('attendedBy', { required: 'Este campo es requerido' })} placeholder="Ej. Líder de Generación" />
        {errors.attendedBy && <p className="text-sm text-destructive">{errors.attendedBy.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="topic">Tema</Label>
        <Input id="topic" {...register('topic', { required: 'Este campo es requerido' })} placeholder="Ej. Aumento de Faltas" />
        {errors.topic && <p className="text-sm text-destructive">{errors.topic.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" {...register('notes')} placeholder="Detalles del seguimiento, si se contactó a los padres, etc." />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Guardar Seguimiento
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SeguimientoPanel() {
  const { allStudents, seguimientoEntries, fetchSeguimientoEntries, isLoading } = useDashboardFilters();
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchSeguimientoEntries();
  }, [fetchSeguimientoEntries]);
  
  const studentList = useMemo(() => {
    const urgentCaseStudents = findUrgentCases(allStudents, new Set(findLostCases(allStudents).map(s => s.id)));
    const urgentCaseIds = new Set(urgentCaseStudents.map(s => s.id));
    
    // Add any student who already has a seguimiento entry, if not already included
    const studentsWithEntries = new Set(Object.keys(seguimientoEntries));
    
    let combinedStudents = [...urgentCaseStudents];
    studentsWithEntries.forEach(studentId => {
      if (!urgentCaseIds.has(studentId)) {
        const student = allStudents.find(s => s.id === studentId);
        if (student) {
          combinedStudents.push(student);
        }
      }
    });

    if (searchTerm) {
      return allStudents.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return combinedStudents;
  }, [allStudents, seguimientoEntries, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8 p-4 md:p-8 pt-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Seguimientos</h1>
          <p className="text-muted-foreground">Tablero de seguimiento de casos por alumno.</p>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Buscar alumno por nombre o matrícula para añadirlo al tablero..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="space-y-6">
          {studentList.length > 0 ? studentList.map(student => {
            const studentSeguimientos = seguimientoEntries[student.id] || [];
            return (
              <div key={student.id} className="grid grid-cols-[200px_1fr] items-start gap-4 border-b pb-6">
                <Card className="sticky top-20">
                    <CardHeader className="p-4">
                       <CardTitle className="text-base">{student.name}</CardTitle>
                       <CardDescription>{student.id}</CardDescription>
                    </CardHeader>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {studentSeguimientos.map((entry, index) => (
                    <Dialog key={entry.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full flex flex-col">
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">Seguimiento #{index + 1}</CardTitle>
                                <CardDescription>{format(entry.createdAt.toDate(), "d MMM, yyyy", {locale: es})}</CardDescription>
                              </CardHeader>
                              <CardContent className="p-4 pt-0 space-y-2 text-xs flex-grow">
                                <p><strong className="text-muted-foreground">Atendido por:</strong> {entry.attendedBy}</p>
                                <p><strong className="text-muted-foreground">Tema:</strong> {entry.topic}</p>
                                <div className="flex items-center gap-2 text-muted-foreground pt-2">
                                  <Badge variant="secondary">F: {entry.absencesAtFollowUp}</Badge>
                                  <Badge variant="destructive">NE: {entry.missedAssignmentsAtFollowUp}</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="max-w-xs text-sm">{entry.notes || "Sin notas adicionales."}</p>
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Detalle del Seguimiento #{index + 1} - {student.name}</DialogTitle>
                           <DialogDescription>
                             Registrado por {entry.attendedBy} el {format(entry.createdAt.toDate(), "PPPP", {locale: es})}.
                           </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p><strong>Tema:</strong> {entry.topic}</p>
                          <p><strong>Notas:</strong> <pre className="whitespace-pre-wrap font-sans bg-muted/50 p-2 rounded-md">{entry.notes || "N/A"}</pre></p>
                          <div className="flex items-center gap-4 text-sm">
                             <Badge>Faltas en ese momento: {entry.absencesAtFollowUp}</Badge>
                             <Badge>NE en ese momento: {entry.missedAssignmentsAtFollowUp}</Badge>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}

                  <Dialog onOpenChange={(isOpen) => !isOpen && fetchSeguimientoEntries()}>
                    <DialogTrigger asChild>
                       <Card className="border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer min-h-[160px] flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                              <PlusCircle className="mx-auto h-8 w-8" />
                              <p className="mt-2 font-medium">Añadir Nuevo Seguimiento</p>
                          </div>
                       </Card>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nuevo Seguimiento para {student.name}</DialogTitle>
                            <DialogDescription>
                                Se registrarán las faltas y NE actuales del alumno.
                            </DialogDescription>
                        </DialogHeader>
                        <AddSeguimientoForm student={student} onTaskAdded={fetchSeguimientoEntries} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          }) : (
            <Card className="text-center p-12 col-span-full">
              <Info className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle className="mt-4">Tablero de Seguimiento Vacío</CardTitle>
              <CardDescription className="mt-2">
                Los alumnos con casos urgentes aparecerán aquí automáticamente. También puedes buscar un alumno para añadirlo manualmente al tablero.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}