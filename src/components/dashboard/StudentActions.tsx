

"use client";

import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useDashboardFilters } from './DashboardClient';
import { useToast } from '@/hooks/use-toast';
import { addSeguimientoEntry } from '@/lib/firebase-services';
import type { Student, Subject, SeguimientoEntry, BitacoraEntry } from '@/types/student';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
                        {isSubmitting ? 'Guardando...' : 'Añadir a Reporte de Seguimiento'}
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
