
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDashboardFilters } from './DashboardClient';
import type { BitacoraEntry } from '@/types/student';
import { getBitacoraEntries, addBitacoraEntry, deleteBitacoraEntry } from '@/lib/firebase-services';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Loader2, PlusCircle, Search, Trash2, User, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';


const bitacoraSchema = z.object({
  studentId: z.string().min(1, 'La matrícula es requerida.'),
  studentName: z.string().min(1, 'El nombre del alumno es requerido.'),
  reportedBy: z.string().min(1, 'El campo "Reportado por" es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
  agreements: z.string().min(1, 'Los acuerdos son requeridos.'),
  caseType: z.enum(['academica', 'conductual'], { required_error: 'Debes seleccionar un tipo de caso.' }),
  academicCommittee: z.boolean().default(false),
});

type BitacoraFormValues = z.infer<typeof bitacoraSchema>;

export function BitacoraPanel() {
  const { allStudents, bitacoraEntries, leaders, tutors, fetchBitacoraEntries, allStudentsMap } = useDashboardFilters();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<string | null>(null);
  const [selectedReporter, setSelectedReporter] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();


  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<BitacoraFormValues>({
    resolver: zodResolver(bitacoraSchema),
    defaultValues: { studentId: '', studentName: '', reportedBy: '', description: '', agreements: '', caseType: 'academica', academicCommittee: false, },
  });


  useEffect(() => {
    fetchBitacoraEntries();
  }, [fetchBitacoraEntries]);

  const onSubmit = async (data: BitacoraFormValues) => {
    setIsSubmitting(true);
    try {
      await addBitacoraEntry(data);
      toast({ title: 'Reporte Guardado', description: 'La nueva entrada de la bitácora se ha guardado correctamente.', });
      reset();
      fetchBitacoraEntries(); // Refresh the list
    } catch (error) {
      console.error("Error saving bitácora entry:", error);
      toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo guardar el reporte en la base de datos.', });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBitacoraEntry(id);
      toast({ title: 'Registro Eliminado', description: 'La entrada de la bitácora ha sido eliminada.', });
      fetchBitacoraEntries(); // Refresh the list
    } catch (error) {
      console.error("Error deleting bitácora entry:", error);
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo eliminar el registro.', });
    }
  }

  const studentIdValue = watch('studentId');

  useEffect(() => {
    const student = allStudents.find(s => s.id === studentIdValue);
    setValue('studentName', student ? student.name : '');
  }, [studentIdValue, allStudents, setValue]);

  const reporters = useMemo(() => {
    const reporterSet = new Set(bitacoraEntries.map(e => e.reportedBy));
    return Array.from(reporterSet).sort();
  }, [bitacoraEntries]);

  const filteredEntries = useMemo(() => {
      const hasActiveFilters = searchTerm || selectedLeader || selectedTutor || selectedReporter || selectedDate;
      if (!hasActiveFilters) return [];

      return bitacoraEntries.filter(entry => {
          const student = allStudentsMap.get(entry.studentId);
          const lowercasedSearch = searchTerm.toLowerCase();

          const searchMatch = !searchTerm ||
              entry.studentName.toLowerCase().includes(lowercasedSearch) ||
              entry.studentId.toLowerCase().includes(lowercasedSearch);

          const leaderMatch = !selectedLeader || (student && student.leader === selectedLeader);
          const tutorMatch = !selectedTutor || (student && student.tutor === selectedTutor);
          const reporterMatch = !selectedReporter || entry.reportedBy === selectedReporter;
          const dateMatch = !selectedDate || isSameDay(entry.timestamp.toDate(), selectedDate);


          return searchMatch && leaderMatch && tutorMatch && reporterMatch && dateMatch;
      });
  }, [searchTerm, selectedLeader, selectedTutor, selectedReporter, selectedDate, bitacoraEntries, allStudentsMap]);
  
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLeader(null);
    setSelectedTutor(null);
    setSelectedReporter(null);
    setSelectedDate(undefined);
  };


  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bitácora de Casos</h1>
        <p className="text-muted-foreground"> Un registro centralizado para el seguimiento de casos de alumnos, guardado en tiempo real.</p>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Nuevo Reporte de Bitácora</CardTitle>
            <CardDescription>Completa los campos para registrar un nuevo caso de seguimiento.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <Controller control={control} name="studentId" render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Matrícula del Alumno</Label>
                       <StudentSearchPopover onStudentSelect={(student) => { setValue('studentId', student.id, { shouldValidate: true }); setValue('studentName', student.name, { shouldValidate: true }); }} />
                      {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
                    </div>
                  )} />
              <div className="space-y-2">
                <Label htmlFor="studentName">Nombre del Alumno</Label>
                <Input id="studentName" {...register('studentName')} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportedBy">Reportado por</Label>
                <Input id="reportedBy" {...register('reportedBy')} placeholder="Ej. Juan Pérez (Tutor)" />
                 {errors.reportedBy && <p className="text-sm text-destructive">{errors.reportedBy.message?.toString()}</p>}
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descripción del Caso</Label>
                <Textarea id="description" {...register('description')} rows={3} placeholder="Describe la situación, el motivo del reporte, los antecedentes, etc." />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message?.toString()}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreements">Acuerdos y Siguientes Pasos</Label>
                <Textarea id="agreements" {...register('agreements')} rows={2} placeholder="Detalla los compromisos, las acciones a tomar y las fechas de seguimiento."/>
                {errors.agreements && <p className="text-sm text-destructive">{errors.agreements.message?.toString()}</p>}
              </div>
               <Controller name="caseType" control={control} render={({ field }) => (
                    <div className="space-y-2">
                      <Label>Tipo de Caso</Label>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-1">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="academica" id="academica" /><Label htmlFor="academica">Académica</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="conductual" id="conductual" /><Label htmlFor="conductual">Conductual</Label></div>
                      </RadioGroup>
                      {errors.caseType && <p className="text-sm text-destructive">{errors.caseType.message}</p>}
                    </div>
                  )} />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
             <div className="flex items-center space-x-2">
                <Controller name="academicCommittee" control={control} render={({ field }) => ( <Checkbox id="academicCommittee" checked={field.value} onCheckedChange={field.onChange} /> )} />
                <Label htmlFor="academicCommittee" className="font-normal"> ¿El caso terminó en comité académico? </Label>
              </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Guardar Reporte
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de la Bitácora</CardTitle>
          <CardDescription>Utiliza los filtros para buscar y visualizar los registros guardados.</CardDescription>
        </CardHeader>
        <CardContent>
             <Card className="mb-6 bg-muted/50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="lg:col-span-2 space-y-2">
                        <Label htmlFor="search-term">Buscar Alumno</Label>
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                           <Input id="search-term" placeholder="Matrícula o nombre..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="filter-date">Fecha</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP", {locale: es}) : <span>Seleccionar fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                initialFocus
                                locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="filter-leader">Líder</Label>
                        <Select value={selectedLeader || 'all'} onValueChange={(val) => setSelectedLeader(val === 'all' ? null : val)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{leaders.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="filter-tutor">Tutor</Label>
                        <Select value={selectedTutor || 'all'} onValueChange={(val) => setSelectedTutor(val === 'all' ? null : val)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{tutors.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="filter-reporter">Reportado por</Label>
                        <Select value={selectedReporter || 'all'} onValueChange={(val) => setSelectedReporter(val === 'all' ? null : val)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{reporters.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="ghost" onClick={clearFilters} disabled={!searchTerm && !selectedLeader && !selectedTutor && !selectedReporter && !selectedDate}><X className="mr-2 h-4 w-4"/>Limpiar Filtros</Button>
                </div>
            </Card>

          {filteredEntries.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{filteredEntries.length} registro(s) encontrado(s).</p>
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="border p-4 rounded-lg relative group">
                   <div className="absolute top-2 right-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el registro de la bitácora.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(entry.id!)} className="bg-destructive hover:bg-destructive/90">Sí, eliminar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  <p className="text-sm text-muted-foreground">{format(entry.timestamp.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{entry.studentName} <span className="text-sm text-muted-foreground font-normal">({entry.studentId})</span></h3>
                    {entry.caseType && (<Badge variant={entry.caseType === 'academica' ? 'secondary' : 'default'}>{entry.caseType === 'academica' ? 'Académica' : 'Conductual'}</Badge>)}
                    {entry.academicCommittee && (<Badge variant="destructive">En Comité Académico</Badge>)}
                  </div>
                  <p className="text-sm text-muted-foreground">Reportado por: {entry.reportedBy}</p>
                  <div className="mt-4 space-y-2">
                    <div><h4 className="font-semibold">Descripción:</h4><p className="text-sm whitespace-pre-wrap">{entry.description}</p></div>
                    <div><h4 className="font-semibold">Acuerdos:</h4><p className="text-sm whitespace-pre-wrap">{entry.agreements}</p></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Sin resultados</h3>
                <p className="text-muted-foreground mt-2">No se han encontrado registros con los filtros actuales, o no se ha realizado ninguna búsqueda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentSearchPopover({ onStudentSelect }: { onStudentSelect: (student: { id: string, name: string }) => void }) {
  const { allStudents } = useDashboardFilters();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredStudents = useMemo(() => {
    if (!searchValue) return allStudents;
    const lowercasedFilter = searchValue.toLowerCase();
    return allStudents.filter(student => student.name.toLowerCase().includes(lowercasedFilter) || student.id.toLowerCase().includes(lowercasedFilter));
  }, [searchValue, allStudents]);

  const handleSelect = (student: { id: string, name: string }) => {
    onStudentSelect(student);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          <User className="mr-2 h-4 w-4" /> Buscar alumno por matrícula o nombre...
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Escribe para buscar..." value={searchValue} onValueChange={setSearchValue} />
          <CommandEmpty>No se encontraron alumnos.</CommandEmpty>
          <CommandGroup>
            {filteredStudents.slice(0, 100).map((student) => (
              <CommandItem key={student.id} onSelect={() => handleSelect(student)}>
                {student.name} ({student.id})
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
