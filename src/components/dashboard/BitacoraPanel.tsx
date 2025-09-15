
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Loader2, PlusCircle, Search, Trash2, User } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';

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
  const { allStudents } = useDashboardFilters();
  const { toast } = useToast();
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<BitacoraFormValues>({
    resolver: zodResolver(bitacoraSchema),
    defaultValues: {
      studentId: '',
      studentName: '',
      reportedBy: '',
      description: '',
      agreements: '',
      caseType: 'academica',
      academicCommittee: false,
    },
  });

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedEntries = await getBitacoraEntries();
      setEntries(fetchedEntries);
    } catch (error) {
      console.error("Error fetching bitácora entries:", error);
      toast({
        variant: 'destructive',
        title: 'Error al cargar la bitácora',
        description: 'No se pudieron obtener los registros de la base de datos.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const onSubmit = async (data: BitacoraFormValues) => {
    setIsSubmitting(true);
    try {
      await addBitacoraEntry(data);
      toast({
        title: 'Reporte Guardado',
        description: 'La nueva entrada de la bitácora se ha guardado correctamente.',
      });
      reset();
      fetchEntries(); // Refresh the list
    } catch (error) {
      console.error("Error saving bitácora entry:", error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudo guardar el reporte en la base de datos.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBitacoraEntry(id);
      toast({
        title: 'Registro Eliminado',
        description: 'La entrada de la bitácora ha sido eliminada.',
      });
      fetchEntries(); // Refresh the list
    } catch (error) {
      console.error("Error deleting bitácora entry:", error);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: 'No se pudo eliminar el registro.',
      });
    }
  }

  const studentIdValue = watch('studentId');

  useEffect(() => {
    const student = allStudents.find(s => s.id === studentIdValue);
    if (student) {
      setValue('studentName', student.name);
    } else {
      setValue('studentName', '');
    }
  }, [studentIdValue, allStudents, setValue]);


  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bitácora de Casos</h1>
        <p className="text-muted-foreground">
          Un registro centralizado para el seguimiento de casos de alumnos, guardado en tiempo real.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Nuevo Reporte de Bitácora</CardTitle>
            <CardDescription>Completa los campos para registrar un nuevo caso de seguimiento.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <Controller
                  control={control}
                  name="studentId"
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Matrícula del Alumno</Label>
                       <StudentSearchPopover 
                          onStudentSelect={(student) => {
                              setValue('studentId', student.id, { shouldValidate: true });
                              setValue('studentName', student.name, { shouldValidate: true });
                          }} 
                      />
                      {fieldState.error && <p className="text-sm text-destructive">{fieldState.error.message}</p>}
                    </div>
                  )}
                />
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
               <Controller
                  name="caseType"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label>Tipo de Caso</Label>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4 pt-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="academica" id="academica" />
                          <Label htmlFor="academica">Académica</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="conductual" id="conductual" />
                          <Label htmlFor="conductual">Conductual</Label>
                        </div>
                      </RadioGroup>
                      {errors.caseType && <p className="text-sm text-destructive">{errors.caseType.message}</p>}
                    </div>
                  )}
                />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
             <div className="flex items-center space-x-2">
                <Controller
                  name="academicCommittee"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                        id="academicCommittee"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="academicCommittee" className="font-normal">
                    ¿El caso terminó en comité académico?
                </Label>
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
          <CardDescription>Registros guardados ordenados por fecha descendente.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="border p-4 rounded-lg relative group">
                   <div className="absolute top-2 right-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de la bitácora.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(entry.id!)} className="bg-destructive hover:bg-destructive/90">
                              Sí, eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                  <p className="text-sm text-muted-foreground">
                    {format(entry.timestamp.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{entry.studentName} <span className="text-sm text-muted-foreground font-normal">({entry.studentId})</span></h3>
                    {entry.caseType && (
                      <Badge variant={entry.caseType === 'academica' ? 'secondary' : 'default'}>
                        {entry.caseType === 'academica' ? 'Académica' : 'Conductual'}
                      </Badge>
                    )}
                    {entry.academicCommittee && (
                      <Badge variant="destructive">En Comité Académico</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Reportado por: {entry.reportedBy}</p>
                  <div className="mt-4 space-y-2">
                    <div>
                      <h4 className="font-semibold">Descripción:</h4>
                      <p className="text-sm whitespace-pre-wrap">{entry.description}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Acuerdos:</h4>
                      <p className="text-sm whitespace-pre-wrap">{entry.agreements}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No hay registros</h3>
                <p className="text-muted-foreground mt-2">
                    Aún no se ha guardado ninguna entrada en la bitácora. ¡Crea la primera!
                </p>
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
    return allStudents.filter(student =>
      student.name.toLowerCase().includes(lowercasedFilter) ||
      student.id.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchValue, allStudents]);

  const handleSelect = (student: { id: string, name: string }) => {
    onStudentSelect(student);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          <User className="mr-2 h-4 w-4" />
          Buscar alumno por matrícula o nombre...
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Escribe para buscar..." 
            value={searchValue} 
            onValueChange={setSearchValue}
          />
          <CommandEmpty>No se encontraron alumnos.</CommandEmpty>
          <CommandGroup>
            {filteredStudents.slice(0, 100).map((student) => (
              <CommandItem
                key={student.id}
                onSelect={() => handleSelect(student)}
              >
                {student.name} ({student.id})
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
