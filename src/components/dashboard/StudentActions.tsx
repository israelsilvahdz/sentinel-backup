

"use client";

import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useDashboardFilters } from './DashboardClient';
import { useToast } from '@/hooks/use-toast';
import { addSeguimientoEntry, addBitacoraEntry } from '@/lib/firebase-services';
import type { Student, Subject, SeguimientoEntry, BitacoraEntry } from '@/types/student';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';


// --- Dialog para "Añadir a Reporte de Seguimiento" ---

export function AddToSeguimientoDialog({ student, children }: { student: Student, children: React.ReactNode }) {
    const { toast } = useToast();
    const { loadStudentSubjects } = useDashboardFilters();
    const [isOpen, setIsOpen] = useState(false);
    const [situation, setSituation] = useState<'faltas' | 'no-entregados' | 'otro'>('otro');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentSubjects, setStudentSubjects] = useState<Subject[]>([]);

    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);
        if (open && studentSubjects.length === 0) {
            const subjects = await loadStudentSubjects(student.id);
            setStudentSubjects(subjects);
        }
    }

    const relevantSubjects = (studentSubjects || []).filter(s => {
        if (situation === 'faltas') return s.absences > 0;
        if (situation === 'no-entregados') return s.missedAssignments > 0;
        return false;
    });
    
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

    const handleSubmit = async () => {
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
            const entry: Omit<SeguimientoEntry, 'id' | 'createdAt' | 'status'> = {
                studentId: student.id,
                studentName: student.name,
                leader: student.leader,
                tutor: student.tutor,
                situation,
                subjects: selectedSubjects,
                notes: notes.trim(),
            };
            await addSeguimientoEntry(entry);
            toast({ title: 'Éxito', description: `${student.name} ha sido añadido al reporte de seguimiento.` });
            setIsOpen(false);
            // Reset state for next time
            setSituation('otro');
            setSelectedSubjects([]);
            setNotes('');
        } catch (error) {
            console.error("Error adding to seguimiento report:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el caso de seguimiento.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Agregar Caso de Seguimiento</AlertDialogTitle>
                    <AlertDialogDescription>
                        Crea un nuevo caso para {student.name} ({student.id})
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Situación a reportar</Label>
                        <RadioGroup value={situation} onValueChange={handleSituationChange} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="faltas" id="faltas" /><Label htmlFor="faltas">Faltas</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="no-entregados" id="no-entregados" /><Label htmlFor="no-entregados">Tareas No Entregadas</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="otro" id="otro" /><Label htmlFor="otro">Otro</Label></div>
                        </RadioGroup>
                    </div>

                    {situation !== 'otro' && (
                        <div className="space-y-2">
                            <Label>Materias con riesgo</Label>
                            {relevantSubjects.length > 0 ? (
                                <Card className="p-3 max-h-36 overflow-y-auto">
                                    <div className="space-y-2">
                                        {relevantSubjects.map(s => (
                                            <div key={s.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`subject-${s.id}`}
                                                    checked={selectedSubjects.includes(s.id)}
                                                    onCheckedChange={() => handleSubjectToggle(s.id)}
                                                />
                                                <Label htmlFor={`subject-${s.id}`} className="font-normal w-full flex justify-between">
                                                    <span>{s.name}</span>
                                                    <Badge variant="secondary">
                                                        {situation === 'faltas' ? `${s.absences} Faltas` : `${s.missedAssignments} NE`}
                                                    </Badge>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No se encontraron materias con riesgo para esta situación.</p>
                            )}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas adicionales</Label>
                        <Textarea id="notes" placeholder="Describe el contexto, acuerdos o cualquier información relevante..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : 'Agregar al Reporte'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Dialog para "Crear Reporte de Bitácora" ---

const bitacoraSchema = z.object({
  reportedBy: z.string().min(1, 'El campo "Reportado por" es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
  agreements: z.string().min(1, 'Los acuerdos son requeridos.'),
  caseType: z.enum(['academica', 'conductual'], { required_error: 'Debes seleccionar un tipo de caso.' }),
  academicCommittee: z.boolean().default(false),
  eventDate: z.date({ required_error: 'La fecha del evento es requerida.' }),
});

type BitacoraFormValues = z.infer<typeof bitacoraSchema>;

export function CreateBitacoraDialog({ student, children }: { student: Student, children: React.ReactNode }) {
    const { toast } = useToast();
    const { fetchBitacoraEntries } = useDashboardFilters();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<BitacoraFormValues>({
        resolver: zodResolver(bitacoraSchema),
        defaultValues: { 
            reportedBy: '', description: '', agreements: '', 
            caseType: 'academica', academicCommittee: false, eventDate: new Date() 
        },
    });

    const onSubmit = async (data: BitacoraFormValues) => {
        setIsSubmitting(true);
        try {
            const entryData = {
                ...data,
                studentId: student.id,
                studentName: student.name,
            };
            await addBitacoraEntry(entryData);
            toast({ title: 'Reporte Guardado', description: 'La nueva entrada de la bitácora se ha guardado correctamente.' });
            
            // Refetch entries to update the global state
            await fetchBitacoraEntries();

            setIsOpen(false);
            reset({ 
                reportedBy: '', description: '', agreements: '', 
                caseType: 'academica', academicCommittee: false, eventDate: new Date() 
            });
        } catch (error) {
            console.error("Error saving bitácora entry:", error);
            toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudo guardar el reporte en la base de datos.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Dialog.Trigger asChild>
                {children}
            </Dialog.Trigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Nuevo Reporte de Bitácora</DialogTitle>
                    <DialogDescription>
                        Registrando caso para <span className="font-bold">{student.name} ({student.id})</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reportedBy">Reportado por</Label>
                                <Input id="reportedBy" {...register('reportedBy')} placeholder="Ej. Juan Pérez (Tutor)" />
                                {errors.reportedBy && <p className="text-sm text-destructive">{errors.reportedBy.message?.toString()}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descripción del Caso</Label>
                                <Textarea id="description" {...register('description')} rows={5} placeholder="Describe la situación, el motivo del reporte, los antecedentes, etc." />
                                {errors.description && <p className="text-sm text-destructive">{errors.description.message?.toString()}</p>}
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="agreements">Acuerdos y Siguientes Pasos</Label>
                                <Textarea id="agreements" {...register('agreements')} rows={5} placeholder="Detalla los compromisos, las acciones a tomar y las fechas de seguimiento."/>
                                {errors.agreements && <p className="text-sm text-destructive">{errors.agreements.message?.toString()}</p>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Controller name="eventDate" control={control} render={({ field }) => (
                                <div className="space-y-2">
                                    <Label>Fecha del Evento</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", {locale: es}) : <span>Seleccionar fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.eventDate && <p className="text-sm text-destructive">{errors.eventDate.message}</p>}
                                </div>
                            )} />
                           <Controller name="caseType" control={control} render={({ field }) => (
                                <div className="space-y-2">
                                <Label>Tipo de Caso</Label>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-1">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="academica" id="academica-dialog" /><Label htmlFor="academica-dialog">Académica</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="conductual" id="conductual-dialog" /><Label htmlFor="conductual-dialog">Conductual</Label></div>
                                </RadioGroup>
                                {errors.caseType && <p className="text-sm text-destructive">{errors.caseType.message}</p>}
                                </div>
                            )} />
                            <div className="flex items-center space-x-2 pt-6">
                                <Controller name="academicCommittee" control={control} render={({ field }) => ( <Checkbox id="academicCommittee-dialog" checked={field.value} onCheckedChange={field.onChange} /> )} />
                                <Label htmlFor="academicCommittee-dialog" className="font-normal"> ¿El caso terminó en comité académico? </Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar Reporte
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
