

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDashboardFilters, type CaseType } from './DashboardClient';
import type { Student, Subject, TeamTask } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { addTeamTask, updateTeamTaskStatus, deleteTeamTask } from '@/lib/firebase-services';
import { StudentSearchPopover } from './BitacoraPanel';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, Printer, AlertTriangle, FileWarning, HelpCircle, ClipboardList, PlusCircle, FileCheck2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SITUATION_MAP: Record<TeamTask['situation'], { icon: React.ReactNode, text: string }> = {
  'faltas': { icon: <FileWarning className="h-4 w-4 text-yellow-600" />, text: 'Faltas' },
  'no-entregados': { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, text: 'Tareas No Entregadas' },
  'otro': { icon: <HelpCircle className="h-4 w-4 text-blue-600" />, text: 'Otro' },
};


export function TeamTasksPanel() {
  const { allStudentsMap, studentContacts, selectedValue, filterType, teamTasks, fetchTeamTasks, loadStudentSubjects } = useDashboardFilters();
  const [isLoading, setIsLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completingTask, setCompletingTask] = useState<TeamTask | null>(null);
  
  // States for new task form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [situation, setSituation] = useState<'faltas' | 'no-entregados' | 'otro'>('otro');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState<'leader' | 'tutor' | 'both'>('leader');
  const [studentSubjects, setStudentSubjects] = useState<Subject[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const { toast } = useToast();
  const { register: registerCompletion, handleSubmit: handleSubmitCompletion, reset: resetCompletion } = useForm<{ completionNotes: string }>();

  useEffect(() => {
    fetchTeamTasks().finally(() => setIsLoading(false));
  }, [fetchTeamTasks]);

  const filteredTasks = useMemo(() => {
    let baseTasks = teamTasks;
    
    if (!showCompleted) {
        baseTasks = baseTasks.filter(task => task.status === 'pendiente');
    }

    if (!selectedValue) return baseTasks;
    
    return baseTasks.filter(task => {
        if (filterType === 'leader') {
            return task.assignedTo !== 'tutor' && task.leader === selectedValue;
        }
        if (filterType === 'tutor') {
            return task.assignedTo !== 'leader' && task.tutor === selectedValue;
        }
        return true;
    });

  }, [teamTasks, selectedValue, filterType, showCompleted]);
  
  const pendingCount = useMemo(() => filteredTasks.filter(e => e.status === 'pendiente').length, [filteredTasks]);

  const handleOpenCompletionDialog = (task: TeamTask) => {
    if (task.status === 'completado') {
        updateTeamTaskStatus(task.id, 'pendiente').then(() => {
            fetchTeamTasks();
            toast({ title: 'Tarea reabierta' });
        }).catch(() => {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reabrir la tarea.'});
        });
    } else {
        setCompletingTask(task);
    }
  };


  const onCompleteSubmit = async (data: { completionNotes: string }) => {
    if (!completingTask) return;
    try {
      await updateTeamTaskStatus(completingTask.id, 'completado', data.completionNotes);
      fetchTeamTasks();
      toast({ title: 'Tarea completada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado del caso.' });
    } finally {
      setCompletingTask(null);
      resetCompletion();
    }
  };


  const handleDelete = async (id: string) => {
    try {
      await deleteTeamTask(id);
      fetchTeamTasks();
      toast({ title: 'Tarea eliminada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el caso.' });
    }
  };
  
  const resetForm = () => {
    setSelectedStudent(null);
    setSituation('otro');
    setSelectedSubjects([]);
    setNotes('');
    setAssignedTo('leader');
    setStudentSubjects([]);
  }

  const handleStudentSelect = async (student: { id: string, name: string }) => {
      const fullStudent = allStudentsMap.get(student.id);
      if (fullStudent) {
          setSelectedStudent(fullStudent);
          const subjects = await loadStudentSubjects(fullStudent.id);
          setStudentSubjects(subjects);
      }
  };

  const handleSituationChange = useCallback((value: 'faltas' | 'no-entregados' | 'otro') => {
        setSituation(value);
        if (value === 'faltas' || value === 'no-entregados') {
            const subjectsToSelect = (studentSubjects || [])
                .filter(s => (value === 'faltas' ? s.absences > 0 : s.missedAssignments > 0))
                .map(s => s.id);
            setSelectedSubjects(subjectsToSelect);
        } else {
            setSelectedSubjects([]);
        }
    }, [studentSubjects]);

    const handleSubjectToggle = (subjectId: string) => {
        setSelectedSubjects(prev => 
            prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
        );
    };

    const relevantSubjects = (studentSubjects || []).filter(s => {
        if (situation === 'faltas') return s.absences > 0;
        if (situation === 'no-entregados') return s.missedAssignments > 0;
        return false;
    });

    const handleCreateTask = async () => {
        if (!selectedStudent) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un alumno.' });
            return;
        }
        if (situation !== 'otro' && selectedSubjects.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar al menos una materia.' });
            return;
        }
        if (situation === 'otro' && !notes.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes añadir una nota para la situación "Otro".' });
            return;
        }

        setIsSubmitting(true);
        try {
            const entry: Omit<TeamTask, 'id' | 'createdAt' | 'status'> = {
                studentId: selectedStudent.id,
                studentName: selectedStudent.name,
                leader: selectedStudent.leader,
                tutor: selectedStudent.tutor,
                situation,
                subjects: selectedSubjects,
                notes: notes.trim(),
                assignedTo,
            };
            await addTeamTask(entry);
            toast({ title: 'Éxito', description: `Se ha creado una nueva tarea.` });
            setIsFormOpen(false);
            resetForm();
            fetchTeamTasks();
        } catch (error) {
            console.error("Error creating team task:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la tarea.' });
        } finally {
            setIsSubmitting(false);
        }
    };


  const handleGenerateReport = () => {
    const tasksToPrint = filteredTasks.filter(e => e.status === 'pendiente');

    if (tasksToPrint.length === 0) {
      toast({
        title: "No hay tareas pendientes para imprimir",
        description: "No hay tareas marcadas como 'pendientes' en la vista actual.",
      });
      return;
    }

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      const studentData = (id: string) => allStudentsMap.get(id);

      const content = `
        <html>
          <head>
            <title>Reporte de Tareas de Equipo - ${format(new Date(), 'dd/MM/yyyy')}</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                line-height: 1.5;
                color: #27272a; 
                margin: 0.5in;
                font-size: 9px;
              }
              @page {
                size: letter;
                margin: 0.5in;
              }
              @media print {
                .no-print { display: none; }
                body { font-size: 8px; }
              }
              h1 { 
                color: #17594A; 
                border-bottom: 2px solid #17594A; 
                padding-bottom: 8px; 
                margin-bottom: 1rem; 
                font-size: 1.5em; 
              }
              .print-button { 
                position: fixed; 
                top: 1rem; 
                right: 1rem; 
                padding: 8px 12px; 
                background: #17594A; 
                color: white; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
              }
               .report-entry {
                margin-bottom: 0.75rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid #e2e8f0;
                page-break-inside: avoid;
              }
              .student-header { font-weight: bold; }
              .details-section { margin-top: 2px; }
              .materias-list, .notes-text {
                  white-space: pre-wrap;
                  line-height: 1.3;
              }
              .materia-item {
                  display: block;
                  margin-bottom: 1px;
              }
              strong { font-weight: bold; }
            </style>
          </head>
          <body>
            <button class="print-button no-print" onclick="window.print()">Imprimir Reporte</button>
            <h1>Reporte de Tareas de Equipo - ${selectedValue ? `${filterType}: ${selectedValue} - ` : ''}${format(new Date(), "d 'de' LLLL, yyyy", { locale: es })}</h1>
            <p>Total de tareas pendientes: ${tasksToPrint.length}</p>
            
            <div id="report-content">
              ${tasksToPrint.map(task => {
                const student = studentData(task.studentId);
                const subjectsInCase = task.subjects.map(subjectId => student?.subjects?.find(s => s.id === subjectId)).filter(Boolean);
                const situationText = SITUATION_MAP[task.situation].text || task.situation;

                let materiasHtml = '';
                if (subjectsInCase.length > 0) {
                    const subjectItems = subjectsInCase.map(s => {
                        const schedule = s?.schedule;
                        const scheduleInfo = schedule && schedule.days.length > 0
                            ? ` - [${schedule.days.join(', ')}, ${schedule.startTime}-${schedule.endTime}]`
                            : '';
                        
                        let detail = '';
                        if (task.situation === 'faltas') {
                            detail = `(${s!.absences} de ${s!.absenceLimit} Faltas)`;
                        } else if (task.situation === 'no-entregados') {
                            detail = `(${s!.missedAssignments} de ${s!.missedAssignmentLimit} Tareas NE)`;
                        }

                        return `<span class="materia-item">${s!.name} (Gpo: ${s!.group}) ${detail}${scheduleInfo}</span>`;
                    }).join('');
                    materiasHtml = `<div class="details-section"><strong>Materias:</strong><div class="materias-list">${subjectItems}</div></div>`;
                }

                let notasHtml = '';
                if (task.notes) {
                    notasHtml = `<div class="details-section"><strong>Notas:</strong> <span class="notes-text">${task.notes}</span></div>`;
                }

                return `
                  <div class="report-entry">
                      <p class="student-header">
                        ${task.studentName} (${task.studentId}) - <strong>Situación:</strong> ${situationText}
                      </p>
                      ${materiasHtml}
                      ${notasHtml}
                  </div>
                `;
              }).join('')}
            </div>
          </body>
        </html>
      `;
      reportWindow.document.write(content);
      reportWindow.document.close();
    }
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
            <h1 className="text-3xl font-bold tracking-tight">Tareas de Equipo</h1>
            <p className="text-muted-foreground">Casos de alumnos que requieren atención y seguimiento especial.</p>
        </div>
        <div className="flex items-center gap-4">
            <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Tarea
            </Button>
            <div className="flex items-center space-x-2">
              <Switch id="show-completed" checked={showCompleted} onCheckedChange={setShowCompleted} />
              <Label htmlFor="show-completed">Mostrar completados</Label>
            </div>
            <Button onClick={handleGenerateReport}>
                <Printer className="mr-2 h-4 w-4" />
                Generar Reporte ({pendingCount})
            </Button>
        </div>
      </header>

      {/* Formulario de Nueva Tarea */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) resetForm(); }}>
          <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                  <DialogTitle>Crear Nueva Tarea de Equipo</DialogTitle>
                  <DialogDescription>
                      Busca un alumno y completa los detalles de la tarea a asignar.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                   <div className="space-y-2">
                      <Label>1. Buscar Alumno</Label>
                      <StudentSearchPopover onStudentSelect={handleStudentSelect} />
                      {selectedStudent && (
                          <div className="text-sm text-muted-foreground pt-2">
                              <p>Líder: <span className="font-semibold">{selectedStudent.leader}</span></p>
                              <p>Tutor: <span className="font-semibold">{selectedStudent.tutor}</span></p>
                          </div>
                      )}
                  </div>
                  
                  {selectedStudent && (
                    <>
                      <div className="space-y-2">
                          <Label>2. Asignar Tarea a</Label>
                           <Select value={assignedTo} onValueChange={(value) => setAssignedTo(value as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="leader">Líder de Generación</SelectItem>
                                <SelectItem value="tutor">Tutor/a</SelectItem>
                                <SelectItem value="both">Ambos</SelectItem>
                              </SelectContent>
                           </Select>
                      </div>

                      <div className="space-y-2">
                          <Label>3. Situación a reportar</Label>
                          <RadioGroup value={situation} onValueChange={handleSituationChange as any} className="flex gap-4">
                              <div className="flex items-center space-x-2"><RadioGroupItem value="faltas" id="faltas" /><Label htmlFor="faltas">Faltas</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="no-entregados" id="no-entregados" /><Label htmlFor="no-entregados">Tareas NE</Label></div>
                              <div className="flex items-center space-x-2"><RadioGroupItem value="otro" id="otro" /><Label htmlFor="otro">Otro</Label></div>
                          </RadioGroup>
                      </div>

                       {situation !== 'otro' && (
                          <div className="space-y-2">
                              <Label>4. Materias con riesgo</Label>
                              {relevantSubjects.length > 0 ? (
                                  <Card className="p-3 max-h-36 overflow-y-auto">
                                      <div className="space-y-2">
                                          {relevantSubjects.map(s => (
                                              <div key={s.id} className="flex items-center space-x-2">
                                                  <Checkbox id={`subject-${s.id}`} checked={selectedSubjects.includes(s.id)} onCheckedChange={() => handleSubjectToggle(s.id)} />
                                                  <Label htmlFor={`subject-${s.id}`} className="font-normal w-full flex justify-between">
                                                      <span>{s.name}</span>
                                                      <Badge variant="secondary">{situation === 'faltas' ? `${s.absences} Faltas` : `${s.missedAssignments} NE`}</Badge>
                                                  </Label>
                                              </div>
                                          ))}
                                      </div>
                                  </Card>
                              ) : <p className="text-sm text-muted-foreground italic">No se encontraron materias con riesgo para esta situación.</p>}
                          </div>
                      )}

                       <div className="space-y-2">
                          <Label htmlFor="notes">5. Notas adicionales</Label>
                          <Textarea id="notes" placeholder="Describe el contexto, acuerdos o cualquier información relevante..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                    </>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancelar</Button>
                  <Button onClick={handleCreateTask} disabled={isSubmitting || !selectedStudent}>
                    {isSubmitting ? 'Guardando...' : 'Crear Tarea'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>


      <div className="space-y-4">
        {filteredTasks.length > 0 ? filteredTasks.map(task => {
          const student = allStudentsMap.get(task.studentId);
          const subjectsInCase = task.subjects.map(subjectId => 
            student?.subjects?.find(s => s.id === subjectId)
          ).filter(Boolean);

          return (
            <Card key={task.id} className={task.status === 'completado' ? 'bg-muted/30' : ''}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Checkbox
                        checked={task.status === 'completado'}
                        onCheckedChange={() => handleOpenCompletionDialog(task)}
                        className="mr-2"
                     />
                    <span className={task.status === 'completado' ? 'line-through text-muted-foreground' : ''}>
                        {task.studentName}
                    </span>
                    <Badge variant="secondary">{task.studentId}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Agregado el: {format(task.createdAt.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción es permanente y eliminará la tarea.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(task.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                 <div className="flex items-center gap-4 font-semibold text-sm">
                    <div className="flex items-center gap-2">
                        {SITUATION_MAP[task.situation].icon}
                        <span>{SITUATION_MAP[task.situation].text}</span>
                    </div>
                     <Badge variant="outline">Asignado a: {task.assignedTo === 'both' ? 'Ambos' : task.assignedTo}</Badge>
                 </div>
                 {subjectsInCase.length > 0 && (
                    <div>
                        <h4 className="font-medium text-sm">Materias involucradas:</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {subjectsInCase.map(s => <Badge key={s!.id} variant="outline">{s!.name}</Badge>)}
                        </div>
                    </div>
                 )}
                 {task.notes && (
                    <div>
                        <h4 className="font-medium text-sm">Notas:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-gray-50 p-2 rounded-md">{task.notes}</p>
                    </div>
                 )}
                 {task.status === 'completado' && (
                    <div className="border-t pt-3 mt-3">
                        <h4 className="font-medium text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary"/>Notas de Cierre:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{task.completionNotes || 'Sin notas.'}</p>
                        <p className="text-xs text-muted-foreground mt-1 pl-6">Completado el: {task.completedAt ? format(task.completedAt.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es }) : 'N/A'}</p>
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
                    <CardTitle>No hay tareas de equipo</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                      {showCompleted ? "No se encontraron tareas con los filtros actuales." : "No hay tareas pendientes. ¡Buen trabajo! Activa el interruptor para ver las tareas completadas."}
                    </p>
                </CardContent>
            </Card>
        )}
      </div>
      
      <Dialog open={!!completingTask} onOpenChange={(open) => !open && setCompletingTask(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Completar Tarea de Equipo</DialogTitle>
                <DialogDescription>Añade una nota de cierre para documentar las acciones tomadas.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitCompletion(onCompleteSubmit)}>
                <div className="py-4 space-y-2">
                    <Label htmlFor="completionNotes">Notas de Cierre (Opcional)</Label>
                    <Textarea id="completionNotes" {...registerCompletion('completionNotes')} placeholder="Ej. Se contactó a los padres, el alumno se comprometió a..." />
                </div>
                <DialogFooter>
                     <Button type="button" variant="ghost" onClick={() => setCompletingTask(null)}>Cancelar</Button>
                     <Button type="submit">Marcar como Completada</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
