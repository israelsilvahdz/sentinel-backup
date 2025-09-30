

"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useDashboardFilters } from './DashboardClient';
import type { Student, SeguimientoEntry, BitacoraEntry, TeamTask, Subject } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { addSeguimientoEntry, updateSeguimientoEntry, deleteSeguimientoEntry, addTeamTask, updateTeamTaskStatus } from '@/lib/firebase-services';
import { StudentCard } from './StudentCard';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle, Loader2, FileWarning, Search, Info, Filter, AlertTriangle, Edit, Trash2, StickyNote, ClipboardCheck, FileCheck2, FileText as FileTextIcon, Phone, HelpCircle, Users, Award } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Switch } from '../ui/switch';


type RiskCategory = 'ne' | 'faltas' | 'both' | 'other' | 'reporte' | 'pendiente';
type FilterTopic = 'all' | RiskCategory;

const RISK_CATEGORY_TEXT: Record<RiskCategory, string> = {
    'ne': 'Riesgo por NE',
    'faltas': 'Riesgo por Faltas',
    'both': 'Riesgo por Faltas y NE',
    'reporte': 'Reporte',
    'pendiente': 'Pendiente',
    'other': 'Con Seguimiento'
};

const SITUATION_MAP: Record<TeamTask['situation'], { icon: React.ReactNode, text: string }> = {
  'faltas': { icon: <FileWarning className="h-4 w-4 text-yellow-600" />, text: 'Faltas' },
  'no-entregados': { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, text: 'Tareas No Entregadas' },
  'otro': { icon: <HelpCircle className="h-4 w-4 text-blue-600" />, text: 'Pendiente' },
};


function SeguimientoForm({ 
  student, 
  riskCategory, 
  onTaskAdded,
  existingEntry,
  onClose,
}: { 
  student: Student, 
  riskCategory: RiskCategory, 
  onTaskAdded: () => void,
  existingEntry?: SeguimientoEntry,
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<{ attendedBy: string, topic: string, notes: string }>({
    defaultValues: {
      topic: existingEntry ? existingEntry.topic : (RISK_CATEGORY_TEXT[riskCategory] || 'Otro'),
      attendedBy: existingEntry?.attendedBy || '',
      notes: existingEntry?.notes || '',
    }
  });
  
  const highRiskSubjects = useMemo(() => {
    return student.subjectSummaries?.filter(s => {
      const isHighRiskNE = s.missedAssignmentLimit > 0 && (s.missedAssignments / s.missedAssignmentLimit) >= 0.5;
      const isHighRiskFaltas = s.absenceLimit > 0 && (s.absences / s.absenceLimit) >= 0.5;
      return isHighRiskFaltas || isHighRiskNE;
    }) || [];
  }, [student.subjectSummaries]);

  const onSubmit = async (data: { attendedBy: string, topic: string, notes: string }) => {
    setIsSubmitting(true);
    try {
      if (existingEntry) {
        // Editing existing entry
        await updateSeguimientoEntry(existingEntry.id, data);
        toast({ title: 'Seguimiento actualizado', description: `Se ha actualizado el seguimiento para ${student.name}.` });
      } else {
        // Creating new entry
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
      }
      onTaskAdded();
      onClose(); // Close the dialog on success
      reset();
    } catch (error) {
      console.error("Error saving seguimiento entry", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el seguimiento.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
       {highRiskSubjects.length > 0 && !existingEntry && (
         <div className="space-y-2">
            <Label className="font-semibold">Contexto del Riesgo</Label>
            <Card className="p-3 bg-muted/50 max-h-32 overflow-y-auto">
              <div className="space-y-2">
                  {highRiskSubjects.map(s => {
                      const isHighRiskNE = s.missedAssignmentLimit > 0 && (s.missedAssignments / s.missedAssignmentLimit) >= 0.5;
                      const isHighRiskFaltas = s.absenceLimit > 0 && (s.absences / s.absenceLimit) >= 0.5;
                      return (
                        <div key={s.id} className="text-sm flex justify-between items-center">
                          <span className="font-medium">{s.name}</span>
                           <div className="flex gap-2">
                            {isHighRiskFaltas && <Badge variant="secondary">F: {s.absences} / {s.absenceLimit}</Badge>}
                            {isHighRiskNE && <Badge variant="destructive">NE: {s.missedAssignments} / {s.missedAssignmentLimit}</Badge>}
                          </div>
                        </div>
                      )
                  })}
              </div>
            </Card>
         </div>
       )}
      <div className="space-y-2">
        <Label htmlFor="attendedBy">Atendido por</Label>
        <Input id="attendedBy" {...register('attendedBy', { required: 'Este campo es requerido' })} placeholder="Ej. Líder de Generación" />
        {errors.attendedBy && <p className="text-sm text-destructive">{errors.attendedBy.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="topic">Tema</Label>
        <Controller
            name="topic"
            control={control}
            rules={{ required: 'Este campo es requerido' }}
            render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.values(RISK_CATEGORY_TEXT).filter(t => !['Pendiente', 'Reporte'].includes(t)).map(text => (
                             <SelectItem key={text} value={text}>{text}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        />
        {errors.topic && <p className="text-sm text-destructive">{errors.topic.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" {...register('notes')} placeholder="Detalles del seguimiento, si se contactó a los padres, etc." />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          {existingEntry ? 'Actualizar Registro' : 'Guardar Registro'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SeguimientoPanel() {
  const { filteredStudents, allStudents, allStudentsMap, seguimientoEntries, fetchSeguimientoEntries, teamTasks, fetchTeamTasks, isLoading, loadStudentSubjects } = useDashboardFilters();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState<FilterTopic>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchSeguimientoEntries();
    fetchTeamTasks();
  }, [fetchSeguimientoEntries, fetchTeamTasks]);
  
  const studentList = useMemo(() => {
    if (searchTerm) {
        const lowercasedSearch = searchTerm.toLowerCase();
        return allStudents
            .filter(s => s.name.toLowerCase().includes(lowercasedSearch) || s.id.toLowerCase().includes(lowercasedSearch))
            .map(student => ({ student, riskCategory: 'other' as RiskCategory }));
    }

    let studentSource = filteredStudents.length > 0 ? filteredStudents : allStudents;
    
    const studentsWithItems: { student: Student; riskCategory: RiskCategory }[] = [];
    const processedIds = new Set<string>();

    const addStudent = (student: Student, category: RiskCategory) => {
        if (processedIds.has(student.id)) return;
        studentsWithItems.push({ student, riskCategory: category });
        processedIds.add(student.id);
    };

    // 1. Prioritize by pending tasks
    teamTasks.forEach(task => {
        if (task.status === 'pendiente') {
            const student = studentSource.find(s => s.id === task.studentId);
            if (student) addStudent(student, 'pendiente');
        }
    });
    
    // 2. Add students with bitacora reports
    Object.keys(seguimientoEntries).forEach(studentId => {
        const hasReporte = seguimientoEntries[studentId].some(e => ('description' in e));
        if(hasReporte) {
            const student = studentSource.find(s => s.id === studentId);
            if (student) addStudent(student, 'reporte');
        }
    });

    // 3. Add students with risk
    studentSource.forEach(student => {
      if (!student.subjectSummaries || student.subjectSummaries.length === 0) return;
      let highRiskNE = false;
      let highRiskFaltas = false;
      student.subjectSummaries.forEach(subject => {
        if (subject.missedAssignmentLimit > 0 && (subject.missedAssignments / subject.missedAssignmentLimit) >= 0.5) highRiskNE = true;
        if (subject.absenceLimit > 0 && (subject.absences / subject.absenceLimit) >= 0.5) highRiskFaltas = true;
      });
      if (highRiskNE && highRiskFaltas) addStudent(student, 'both');
      else if (highRiskNE) addStudent(student, 'ne');
      else if (highRiskFaltas) addStudent(student, 'faltas');
    });

    // 4. Add students with any other interaction (seguimiento, completed tasks)
    const allInteractionIds = new Set([
        ...Object.keys(seguimientoEntries),
        ...teamTasks.map(t => t.studentId)
    ]);

    allInteractionIds.forEach(studentId => {
        const student = studentSource.find(s => s.id === studentId);
        if (student) {
            addStudent(student, 'other');
        }
    });
    
    let finalFilteredList = studentsWithItems;
    
    // Filter by topic
    if (filterTopic !== 'all') {
        finalFilteredList = finalFilteredList.filter(item => {
            if (filterTopic === 'pendiente') return (teamTasks.some(t => t.studentId === item.student.id && t.status === 'pendiente'));
            if (filterTopic === 'reporte') return item.riskCategory === 'reporte';
            return item.riskCategory === filterTopic;
        });
    }

    if (!showCompleted) {
        finalFilteredList = finalFilteredList.filter(item => {
            const hasPendingTasks = teamTasks.some(t => t.studentId === item.student.id && t.status === 'pendiente');
            const hasRisk = item.riskCategory === 'faltas' || item.riskCategory === 'ne' || item.riskCategory === 'both';
            const hasInteractions = seguimientoEntries[item.student.id] && seguimientoEntries[item.student.id].length > 0;
            
            // Show if it has risk but no interactions/tasks yet
            if (hasRisk && !hasPendingTasks && !hasInteractions) return true;
            
            // Show if it has pending tasks or any kind of interaction history
            return hasPendingTasks || hasInteractions;
        });
    }
    
    return finalFilteredList;

  }, [filteredStudents, allStudents, seguimientoEntries, teamTasks, searchTerm, filterTopic, showCompleted]);
  
  const riskDisplayInfo: Record<RiskCategory, { text: string; badgeClass: string; borderClass: string; }> = {
    ne: { text: 'Riesgo por NE', badgeClass: 'bg-red-100 text-red-800', borderClass: 'border-red-500' },
    faltas: { text: 'Riesgo por Faltas', badgeClass: 'bg-yellow-100 text-yellow-800', borderClass: 'border-yellow-400' },
    both: { text: 'Riesgo por Faltas y NE', badgeClass: 'bg-orange-100 text-orange-800', borderClass: 'border-orange-500' },
    reporte: { text: 'Reporte de Bitácora', badgeClass: 'bg-red-100 text-red-800', borderClass: 'border-red-500' },
    pendiente: { text: 'Pendiente', badgeClass: 'bg-blue-100 text-blue-800', borderClass: 'border-blue-500' },
    other: { text: 'Con Seguimiento', badgeClass: 'bg-gray-100 text-gray-800', borderClass: 'border-transparent' },
  };

  const handleDelete = useCallback(async (id: string, isBitacora: boolean) => {
    if (isBitacora) {
        toast({ variant: 'destructive', title: "Acción no permitida", description: "Los reportes de bitácora no se pueden eliminar desde este panel." });
        return;
    }
    try {
      await deleteSeguimientoEntry(id);
      toast({ title: "Registro eliminado", description: "El seguimiento ha sido borrado." });
      fetchSeguimientoEntries();
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el registro." });
    }
  }, [toast, fetchSeguimientoEntries]);


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
          <h1 className="text-3xl font-bold tracking-tight">Seguimientos y Pendientes</h1>
          <p className="text-muted-foreground">Tablero unificado para registrar interacciones y gestionar tareas pendientes por alumno.</p>
        </header>

        <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar alumno por nombre o matrícula..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                     <Filter className="h-5 w-5 text-muted-foreground" />
                     <Select value={filterTopic} onValueChange={(val) => setFilterTopic(val as FilterTopic)}>
                          <SelectTrigger>
                              <SelectValue placeholder="Filtrar por tema..." />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todos los Casos</SelectItem>
                              <SelectItem value="pendiente">Pendientes</SelectItem>
                              <SelectItem value="reporte">Reportes de Bitácora</SelectItem>
                              <SelectItem value="faltas">Riesgo por Faltas</SelectItem>
                              <SelectItem value="ne">Riesgo por NE</SelectItem>
                              <SelectItem value="both">Riesgo por Faltas y NE</SelectItem>
                              <SelectItem value="other">Otros Casos</SelectItem>
                          </SelectContent>
                     </Select>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Switch id="show-completed" checked={showCompleted} onCheckedChange={setShowCompleted} />
                     <Label htmlFor="show-completed">Mostrar completados</Label>
                    </div>
                </div>
            </div>
        </Card>
        
        <div className="space-y-6">
          {studentList.length > 0 ? studentList.map(({ student, riskCategory }) => {
            const studentInteractions = seguimientoEntries[student.id] || [];
            const studentTasks = teamTasks.filter(t => t.studentId === student.id);
            const allItems = [...studentInteractions, ...studentTasks]
              .filter(item => showCompleted || !('status' in item) || item.status === 'pendiente')
              .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

            const hasPendingTask = studentTasks.some(t => t.status === 'pendiente');
            const displayInfo = riskDisplayInfo[hasPendingTask ? 'pendiente' : riskCategory];

            return (
              <div key={student.id} className="grid grid-cols-1 md:grid-cols-[250px_1fr] items-start gap-4 border-b pb-6">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Card className={cn("sticky top-20 border-l-4 cursor-pointer hover:shadow-md transition-shadow", displayInfo.borderClass)}>
                            <CardHeader className="p-4">
                            <CardTitle className="text-base flex items-center">
                              {student.name}
                              {student.sport && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="ml-2"><Award className="h-4 w-4 text-blue-600" /></span>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Equipo Representativo: {student.sport}</p></TooltipContent>
                                </Tooltip>
                              )}
                            </CardTitle>
                            <CardDescription>{student.id}</CardDescription>
                            <div className="pt-2">
                                <Badge className={cn("font-medium", displayInfo.badgeClass)}>{displayInfo.text}</Badge>
                            </div>
                            </CardHeader>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Expediente del Alumno</DialogTitle>
                          <DialogDescription>
                            {student.name} ({student.id})
                          </DialogDescription>
                        </DialogHeader>
                        <StudentCard student={student} startOpen={true} isDialog={true} />
                    </DialogContent>
                </Dialog>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {allItems.map((item) => {
                    const isTask = 'situation' in item;
                    return isTask 
                      ? <TaskCard key={item.id} task={item as TeamTask} student={student} onUpdate={fetchTeamTasks} />
                      : <InteractionCard key={item.id} entry={item as SeguimientoEntry | BitacoraEntry} student={student} onUpdate={fetchSeguimientoEntries} />;
                  })}
                  <NewItemCard student={student} riskCategory={riskCategory} onUpdate={() => {fetchSeguimientoEntries(); fetchTeamTasks();}} />
                </div>
              </div>
            );
          }) : (
            <Card className="text-center p-12 col-span-full">
              <Info className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle className="mt-4">Tablero Vacío</CardTitle>
              <CardDescription className="mt-2 max-w-md mx-auto">
                No se encontraron alumnos con los criterios de riesgo o los filtros seleccionados. Puedes usar el buscador para añadir manualmente un alumno y registrar un seguimiento.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}


// --- Components for cards ---

function TaskCard({ task, student, onUpdate }: { task: TeamTask, student: Student, onUpdate: () => void }) {
    const { toast } = useToast();
    const [isCompleting, setIsCompleting] = useState(false);
    const { register, handleSubmit, reset } = useForm<{ completionNotes: string }>();

    const handleStatusChange = async (e: React.MouseEvent, checked: boolean) => {
        e.stopPropagation();
        if (!checked) { // Re-opening task
            await updateTeamTaskStatus(task.id, 'pendiente');
            onUpdate();
        } else { // Completing task
            setIsCompleting(true);
        }
    };
    
    const onCompleteSubmit = async (data: { completionNotes: string }) => {
        await updateTeamTaskStatus(task.id, 'completado', data.completionNotes);
        toast({ title: "Pendiente completado" });
        setIsCompleting(false);
        reset();
        onUpdate();
    };
    
    const subjectsInCase = task.subjects.map(subjectId => 
            student?.subjects?.find(s => s.id === subjectId)
          ).filter(Boolean) as Subject[];


    return (
        <>
            <Dialog>
                <DialogTrigger asChild>
                    <Card className={cn("h-full flex flex-col group relative cursor-pointer hover:bg-muted/50 transition-colors", task.status === 'completado' && 'bg-muted/50')}>
                        <CardHeader className="p-4 flex flex-row items-start gap-3 space-y-0">
                            <div onClick={(e) => handleStatusChange(e, !(task.status === 'completado'))}>
                                <Checkbox checked={task.status === 'completado'} className="mt-1" />
                            </div>
                            <div className="grid gap-1">
                                <CardTitle className={cn("text-sm", task.status === 'completado' && 'line-through text-muted-foreground')}>
                                    {SITUATION_MAP[task.situation].text}
                                </CardTitle>
                                <CardDescription>
                                    {format(task.createdAt.toDate(), "d MMM, yyyy", { locale: es })}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2 text-xs flex-grow">
                            <p className="text-foreground/80 line-clamp-3">{task.notes}</p>
                            {task.status === 'completado' && task.completionNotes && (
                            <div className="pt-2">
                                <p className="font-semibold text-primary flex items-center gap-1"><FileCheck2 className="h-4 w-4" /> Cierre:</p>
                                <p className="text-muted-foreground pl-1 line-clamp-2">{task.completionNotes}</p>
                            </div>
                            )}
                        </CardContent>
                    </Card>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {SITUATION_MAP[task.situation].icon}
                            {SITUATION_MAP[task.situation].text}
                        </DialogTitle>
                        <DialogDescription>
                            Pendiente para {task.studentName} | {format(task.createdAt.toDate(), "d 'de' LLLL, yyyy", { locale: es })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">Asignado a: {task.assignedTo === 'both' ? 'Ambos' : task.assignedTo}</Badge>
                            <Badge variant={task.status === 'pendiente' ? 'destructive' : 'default'}>{task.status}</Badge>
                        </div>

                        <div><p className="font-semibold">Notas:</p><p className="whitespace-pre-wrap text-muted-foreground">{task.notes}</p></div>
                        
                        {subjectsInCase.length > 0 && (
                            <div>
                                <h4 className="font-semibold">Materias involucradas:</h4>
                                <div className="flex flex-col gap-2 mt-2">
                                    {subjectsInCase.map(s => <Badge key={s.id} variant="secondary" className="w-fit">{s.name}</Badge>)}
                                </div>
                            </div>
                        )}
                        
                        {task.status === 'completado' && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary"/>Notas de Cierre:</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap mt-1">{task.completionNotes || 'Sin notas.'}</p>
                                <p className="text-xs text-muted-foreground mt-2">Completado el: {task.completedAt ? format(task.completedAt.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es }) : 'N/A'}</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCompleting} onOpenChange={setIsCompleting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Completar Pendiente</DialogTitle>
                        <DialogDescription>Añade una nota de cierre para documentar la resolución.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onCompleteSubmit)}>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="completionNotes">Notas de Cierre (Opcional)</Label>
                            <Textarea id="completionNotes" {...register('completionNotes')} placeholder="Ej. Se contactó a los padres, el alumno se comprometió a..." />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsCompleting(false)}>Cancelar</Button>
                            <Button type="submit">Marcar como Completado</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

function InteractionCard({ entry, student, onUpdate }: { entry: SeguimientoEntry | BitacoraEntry, student: Student, onUpdate: () => void }) {
    const { toast } = useToast();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const isBitacora = 'description' in entry;

    const handleDelete = async () => {
        if (isBitacora) {
            toast({ variant: 'destructive', title: "Acción no permitida", description: "Los reportes de bitácora no se pueden eliminar desde aquí." });
            return;
        }
        try {
            await deleteSeguimientoEntry(entry.id);
            toast({ title: "Registro eliminado" });
            onUpdate();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el registro." });
        }
    }
    
    const cardTitle = isBitacora ? 'Reporte de Bitácora' : (entry.topic || 'Registro de Interacción');
    const contentToShow = isBitacora ? (entry as BitacoraEntry).description : (entry as SeguimientoEntry).notes;
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className="h-full flex flex-col group relative cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardHeader className="p-4 flex-grow">
                        <CardTitle className="text-sm">{cardTitle}</CardTitle>
                        <CardDescription>{format(entry.createdAt.toDate(), "d MMM, yyyy", { locale: es })}</CardDescription>
                        <div className="pt-2 text-xs text-muted-foreground line-clamp-3">
                            {contentToShow}
                        </div>
                    </CardHeader>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isBitacora && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setIsEditOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar</p></TooltipContent>
                            </Tooltip>
                        )}
                        <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Eliminar</p></TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción es permanente.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </Card>
            </DialogTrigger>

            {/* Dialog for Detailed View */}
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{cardTitle}</DialogTitle>
                    <DialogDescription>
                        {student.name} | {format(entry.createdAt.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {isBitacora ? (
                        <div className="space-y-3 text-sm">
                            <div><p className="font-semibold">Descripción:</p><p className="whitespace-pre-wrap text-muted-foreground">{contentToShow}</p></div>
                            <div><p className="font-semibold">Acuerdos:</p><p className="whitespace-pre-wrap text-muted-foreground">{(entry as BitacoraEntry).agreements}</p></div>
                             <div className="flex gap-4 pt-2">
                                {(entry as BitacoraEntry).academicCommittee && <Badge variant="destructive">En Comité Académico</Badge>}
                                {(entry as BitacoraEntry).parentsContacted && <Badge variant="outline" className="text-blue-600 border-blue-600"><Phone className="mr-1 h-3 w-3"/>Padres Contactados</Badge>}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <div><p className="font-semibold">Notas:</p><p className="whitespace-pre-wrap text-muted-foreground">{contentToShow}</p></div>
                        </div>
                    )}

                    <div className="flex items-center text-sm text-muted-foreground gap-4 border-t pt-4">
                        <div className="flex items-center gap-1"><FileWarning className="h-4 w-4" /> Faltas al momento: <span className="font-bold">{entry.absencesAtFollowUp ?? 0}</span></div>
                        <div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> NE al momento: <span className="font-bold">{entry.missedAssignmentsAtFollowUp ?? 0}</span></div>
                    </div>
                </div>
            </DialogContent>
            
            {/* Dialog for Editing (only for non-bitacora) */}
            {!isBitacora && (
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Editar Registro</DialogTitle></DialogHeader>
                        <SeguimientoForm student={student} riskCategory="other" onTaskAdded={onUpdate} existingEntry={entry as SeguimientoEntry} onClose={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
}


function NewItemCard({ student, riskCategory, onUpdate }: { student: Student, riskCategory: RiskCategory, onUpdate: () => void }) {
    const { loadStudentSubjects } = useDashboardFilters();
    const [creationType, setCreationType] = useState<'interaction' | 'task' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentSubjects, setStudentSubjects] = useState<Student['subjects']>([]);
    const { toast } = useToast();
    
    // Form states for the new task
    const [situation, setSituation] = useState<'faltas' | 'no-entregados' | 'otro'>('otro');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [assignedTo, setAssignedTo] = useState<'leader' | 'tutor' | 'both'>('leader');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleOpen = async (type: 'interaction' | 'task') => {
        setCreationType(type);
        if (type === 'task') {
            const subjects = await loadStudentSubjects(student.id);
            setStudentSubjects(subjects);
        }
        setIsDialogOpen(true);
    }
    
    const handleClose = () => {
        setIsDialogOpen(false);
        // Reset form after a delay to allow animation
        setTimeout(() => {
            setCreationType(null);
            setSituation('otro');
            setSelectedSubjects([]);
            setNotes('');
            setAssignedTo('leader');
        }, 300);
    }

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
        setIsSubmitting(true);
        try {
            const entry: Omit<TeamTask, 'id' | 'createdAt' | 'status'> = {
                studentId: student.id, studentName: student.name, leader: student.leader, tutor: student.tutor,
                situation, subjects: selectedSubjects, notes: notes.trim(), assignedTo,
            };
            await addTeamTask(entry);
            toast({ title: 'Éxito', description: `Se ha creado un nuevo pendiente.` });
            handleClose();
            onUpdate();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el pendiente.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsDialogOpen(true); }}>
            <DialogTrigger asChild>
                <Card className="border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer min-h-[160px] flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <PlusCircle className="mx-auto h-8 w-8" />
                        Añadir
                    </div>
                </Card>
            </DialogTrigger>
            <DialogContent>
                {creationType === null ? (
                    <>
                        <DialogHeader><DialogTitle>¿Qué deseas añadir?</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <Button variant="outline" className="h-24 flex-col" onClick={() => handleOpen('interaction')}>
                                <FileTextIcon className="h-6 w-6 mb-2"/>
                                Registro de Interacción
                            </Button>
                            <Button variant="outline" className="h-24 flex-col" onClick={() => handleOpen('task')}>
                                <ClipboardCheck className="h-6 w-6 mb-2"/>
                                Nuevo Pendiente
                            </Button>
                        </div>
                    </>
                ) : creationType === 'interaction' ? (
                     <>
                        <DialogHeader><DialogTitle>Nuevo Registro de Interacción</DialogTitle></DialogHeader>
                        <SeguimientoForm student={student} riskCategory={riskCategory} onTaskAdded={onUpdate} onClose={handleClose} />
                     </>
                ) : (
                    <>
                         <DialogHeader>
                            <DialogTitle>Crear Nuevo Pendiente</DialogTitle>
                            <DialogDescription>Asigna una tarea para {student.name}.</DialogDescription>
                         </DialogHeader>
                         <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>1. Asignar Tarea a</Label>
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
                                <Label>2. Situación a reportar</Label>
                                <RadioGroup value={situation} onValueChange={handleSituationChange} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="faltas" id="faltas-new" /><Label htmlFor="faltas-new">Faltas</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="no-entregados" id="no-entregados-new" /><Label htmlFor="no-entregados-new">Tareas NE</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="otro" id="otro-new" /><Label htmlFor="otro-new">Otro</Label></div>
                                </RadioGroup>
                            </div>
                            {situation !== 'otro' && (
                                <div className="space-y-2">
                                    <Label>3. Materias con riesgo</Label>
                                    {relevantSubjects.length > 0 ? (
                                        <Card className="p-3 max-h-36 overflow-y-auto">
                                            <div className="space-y-2">
                                                {relevantSubjects.map(s => (
                                                    <div key={s.id} className="flex items-center space-x-2">
                                                        <Checkbox id={`subject-new-${s.id}`} checked={selectedSubjects.includes(s.id)} onCheckedChange={() => handleSubjectToggle(s.id)} />
                                                        <Label htmlFor={`subject-new-${s.id}`} className="font-normal w-full flex justify-between">
                                                            <span>{s.name}</span>
                                                            <Badge variant="secondary">{situation === 'faltas' ? `${s.absences} Faltas` : `${s.missedAssignments} NE`}</Badge>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    ) : <p className="text-sm text-muted-foreground italic">No se encontraron materias con riesgo.</p>}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="notes-new">4. Notas adicionales</Label>
                                <Textarea id="notes-new" placeholder="Describe el contexto, acuerdos o información relevante..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                            </div>
                         </div>
                         <DialogFooter>
                             <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
                             <Button onClick={handleCreateTask} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Crear Pendiente'}
                             </Button>
                         </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}


    





      

    
