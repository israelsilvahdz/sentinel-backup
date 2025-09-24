
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDashboardFilters } from './DashboardClient';
import type { Student, SeguimientoEntry } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { addSeguimientoEntry } from '@/lib/firebase-services';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle, Loader2, FileWarning, Search, Info, Filter, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { cn } from '@/lib/utils';


type RiskCategory = 'ne' | 'faltas' | 'both' | 'other';
type FilterTopic = 'all' | RiskCategory;

const RISK_CATEGORY_TEXT: Record<RiskCategory, string> = {
    'ne': 'Riesgo por NE',
    'faltas': 'Riesgo por Faltas',
    'both': 'Riesgo por Faltas y NE',
    'other': 'Otro'
};

function AddSeguimientoForm({ student, riskCategory, onTaskAdded }: { student: Student, riskCategory: RiskCategory, onTaskAdded: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<{ attendedBy: string, topic: string, notes: string }>({
    defaultValues: {
      topic: RISK_CATEGORY_TEXT[riskCategory] || 'Otro'
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
       {highRiskSubjects.length > 0 && (
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
                        {Object.values(RISK_CATEGORY_TEXT).map(text => (
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Guardar Seguimiento
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SeguimientoPanel() {
  const { filteredStudents, allStudents, seguimientoEntries, fetchSeguimientoEntries, isLoading } = useDashboardFilters();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState<FilterTopic>('all');
  
  useEffect(() => {
    fetchSeguimientoEntries();
  }, [fetchSeguimientoEntries]);
  
  const studentList = useMemo(() => {
    let studentSource = filteredStudents.length > 0 ? filteredStudents : allStudents;

    if (searchTerm) {
        const lowercasedSearch = searchTerm.toLowerCase();
        studentSource = allStudents.filter(s => s.name.toLowerCase().includes(lowercasedSearch) || s.id.toLowerCase().includes(lowercasedSearch));
    }

    const studentsWithRisk: { student: Student; riskCategory: RiskCategory }[] = [];
    const processedIds = new Set<string>();

    studentSource.forEach(student => {
      if (!student.subjectSummaries || student.subjectSummaries.length === 0) return;

      let highRiskNE = false;
      let highRiskFaltas = false;

      student.subjectSummaries.forEach(subject => {
        if (subject.missedAssignmentLimit > 0 && (subject.missedAssignments / subject.missedAssignmentLimit) >= 0.5) {
          highRiskNE = true;
        }
        if (subject.absenceLimit > 0 && (subject.absences / subject.absenceLimit) >= 0.5) {
          highRiskFaltas = true;
        }
      });
      
      let riskCategory: RiskCategory | null = null;
      if (highRiskNE && highRiskFaltas) {
        riskCategory = 'both';
      } else if (highRiskNE) {
        riskCategory = 'ne';
      } else if (highRiskFaltas) {
        riskCategory = 'faltas';
      }

      if (riskCategory) {
        studentsWithRisk.push({ student, riskCategory });
        processedIds.add(student.id);
      }
    });

    Object.keys(seguimientoEntries).forEach(studentId => {
      if (!processedIds.has(studentId)) {
        const student = studentSource.find(s => s.id === studentId);
        if (student) {
          studentsWithRisk.push({ student, riskCategory: 'other' });
          processedIds.add(student.id);
        }
      }
    });
    
    let finalFilteredList = searchTerm 
      ? studentSource.map(s => {
          const existing = studentsWithRisk.find(sr => sr.student.id === s.id);
          return existing || { student: s, riskCategory: 'other' };
        })
      : studentsWithRisk;

    if (filterTopic !== 'all') {
        finalFilteredList = finalFilteredList.filter(item => item.riskCategory === filterTopic);
    }
    
    return finalFilteredList;

  }, [filteredStudents, allStudents, seguimientoEntries, searchTerm, filterTopic]);
  
  const riskDisplayInfo: Record<RiskCategory, { text: string; badgeClass: string; borderClass: string; }> = {
    ne: { text: 'Riesgo por NE', badgeClass: 'bg-red-100 text-red-800', borderClass: 'border-red-500' },
    faltas: { text: 'Riesgo por Faltas', badgeClass: 'bg-yellow-100 text-yellow-800', borderClass: 'border-yellow-400' },
    both: { text: 'Riesgo por Faltas y NE', badgeClass: 'bg-orange-100 text-orange-800', borderClass: 'border-orange-500' },
    other: { text: 'Otro Caso', badgeClass: 'bg-gray-100 text-gray-800', borderClass: 'border-transparent' },
  };


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
          <p className="text-muted-foreground">Tablero de seguimiento para casos de riesgo y alumnos específicos.</p>
        </header>

        <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar alumno por nombre o matrícula para añadirlo al tablero..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                   <Filter className="h-5 w-5 text-muted-foreground" />
                   <Select value={filterTopic} onValueChange={(val) => setFilterTopic(val as FilterTopic)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por tema..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Casos de Riesgo</SelectItem>
                            <SelectItem value="faltas">Riesgo por Faltas</SelectItem>
                            <SelectItem value="ne">Riesgo por NE</SelectItem>
                            <SelectItem value="both">Riesgo por Faltas y NE</SelectItem>
                            <SelectItem value="other">Otros Casos (manuales)</SelectItem>
                        </SelectContent>
                   </Select>
                </div>
            </div>
        </Card>
        
        <div className="space-y-6">
          {studentList.length > 0 ? studentList.map(({ student, riskCategory }) => {
            const studentSeguimientos = seguimientoEntries[student.id] || [];
            const displayInfo = riskDisplayInfo[riskCategory];
            return (
              <div key={student.id} className="grid grid-cols-[250px_1fr] items-start gap-4 border-b pb-6">
                <Card className={cn("sticky top-20 border-l-4", displayInfo.borderClass)}>
                    <CardHeader className="p-4">
                       <CardTitle className="text-base">{student.name}</CardTitle>
                       <CardDescription>{student.id}</CardDescription>
                       <div className="pt-2">
                          <Badge className={cn("font-medium", displayInfo.badgeClass)}>{displayInfo.text}</Badge>
                       </div>
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
                        <AddSeguimientoForm student={student} riskCategory={riskCategory} onTaskAdded={fetchSeguimientoEntries} />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          }) : (
            <Card className="text-center p-12 col-span-full">
              <Info className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle className="mt-4">Tablero de Seguimiento Vacío</CardTitle>
              <CardDescription className="mt-2 max-w-md mx-auto">
                No se encontraron alumnos con los criterios de riesgo alto o los filtros seleccionados. Puedes usar el buscador para añadir manualmente un alumno y registrar un seguimiento.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

    