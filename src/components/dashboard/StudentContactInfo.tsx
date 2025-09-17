

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Phone, Mail, Users, Edit, Save, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDashboardFilters } from './DashboardClient';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { StudentContact } from '@/types/student';

interface StudentContactProps {
    studentId: string;
}

const contactSchema = z.object({
    studentPhone: z.string().optional(),
    studentEmail: z.string().email({ message: "Correo de alumno inválido." }).optional().or(z.literal('')),
    dadName: z.string().optional(),
    dadPhone: z.string().optional(),
    dadEmail: z.string().email({ message: "Correo de papá inválido." }).optional().or(z.literal('')),
    momName: z.string().optional(),
    momPhone: z.string().optional(),
    momEmail: z.string().email({ message: "Correo de mamá inválido." }).optional().or(z.literal('')),
});

type ContactFormValues = z.infer<typeof contactSchema>;

function ContactDetail({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    const { toast } = useToast();

    if (!value || value.toLowerCase() === 'no disponible' || value.trim() === '') {
        return null;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(value).then(() => {
            toast({
                title: '¡Copiado!',
                description: `${label} copiado al portapapeles.`,
            });
        });
    };
    
    const isEmail = label.toLowerCase().includes('correo');
    const href = isEmail ? `mailto:${value}` : `tel:${value.replace(/\s/g, '')}`;

    return (
        <div className="flex items-start gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
            <div className="text-muted-foreground pt-1">{icon}</div>
            <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <a href={href} className="text-base font-mono text-foreground break-all hover:underline" target="_blank" rel="noopener noreferrer">
                    {value}
                </a>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy}>Copiar</Button>
        </div>
    );
}

export function StudentContactInfo({ studentId }: StudentContactProps) {
    const { studentContacts, setStudentContacts, allStudentsMap } = useDashboardFilters();
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();
    
    const contact = studentContacts[studentId];
    const student = allStudentsMap.get(studentId);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            studentPhone: '', studentEmail: '',
            dadName: '', dadPhone: '', dadEmail: '',
            momName: '', momPhone: '', momEmail: '',
        }
    });

    useEffect(() => {
        if (contact) {
            reset(contact);
        }
    }, [contact, reset]);

    const onSubmit = (data: ContactFormValues) => {
        const newContact: StudentContact = {
            studentId: studentId,
            name: student?.name || '',
            ...contact, // preserve existing fields like sedena, group, etc.
            ...data,
        };

        setStudentContacts(prev => ({
            ...prev,
            [studentId]: newContact
        }));

        toast({
            title: 'Contacto Guardado',
            description: 'La información de contacto ha sido actualizada.',
        });
        setIsEditing(false);
    };

    if (!student) {
        return <p>Alumno no encontrado.</p>;
    }
    
    if (!contact && !isEditing) {
         return (
            <div className="p-6 text-center">
                <p className="text-muted-foreground mb-4">No se encontró información de contacto para este alumno.</p>
                <Button onClick={() => setIsEditing(true)}>
                    <Users className="mr-2 h-4 w-4" />
                    Añadir Información de Contacto
                </Button>
            </div>
        );
    }


    return (
        <div className="p-4 md:p-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <CardTitle className="flex items-center gap-2">
                            <Users className="h-6 w-6" />
                            Información de Contacto
                        </CardTitle>
                        {isEditing ? (
                             <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); reset(contact); }}> <XCircle className="mr-2 h-4 w-4" /> Cancelar </Button>
                                <Button size="sm" onClick={handleSubmit(onSubmit)}> <Save className="mr-2 h-4 w-4" /> Guardar Cambios </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}> <Edit className="mr-2 h-4 w-4" /> Editar Contacto </Button>
                        )}
                    </div>
                    <CardDescription>{student.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isEditing ? (
                        <form className="space-y-4">
                             <div>
                                <h3 className="font-semibold text-lg mb-2">Alumno</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="studentPhone">Teléfono Alumno</Label>
                                        <Input id="studentPhone" {...register('studentPhone')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="studentEmail">Correo Alumno</Label>
                                        <Input id="studentEmail" {...register('studentEmail')} />
                                        {errors.studentEmail && <p className="text-xs text-destructive mt-1">{errors.studentEmail.message}</p>}
                                    </div>
                                </div>
                            </div>
                             <div>
                                <h3 className="font-semibold text-lg mt-4 mb-2">Padres / Tutores</h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <Label htmlFor="dadPhone">Teléfono Papá</Label>
                                        <Input id="dadPhone" {...register('dadPhone')} />
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="dadEmail">Correo Papá</Label>
                                        <Input id="dadEmail" {...register('dadEmail')} />
                                         {errors.dadEmail && <p className="text-xs text-destructive mt-1">{errors.dadEmail.message}</p>}
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="momPhone">Teléfono Mamá</Label>
                                        <Input id="momPhone" {...register('momPhone')} />
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="momEmail">Correo Mamá</Label>
                                        <Input id="momEmail" {...register('momEmail')} />
                                         {errors.momEmail && <p className="text-xs text-destructive mt-1">{errors.momEmail.message}</p>}
                                    </div>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <>
                            <h3 className="font-semibold text-lg mb-2">Alumno</h3>
                            <ContactDetail icon={<Phone size={20} />} label="Teléfono Alumno" value={contact.studentPhone} />
                            <ContactDetail icon={<Mail size={20} />} label="Correo Alumno" value={contact.studentEmail} />
                            
                            <h3 className="font-semibold text-lg mt-6 mb-2">Padres / Tutores</h3>
                            <ContactDetail icon={<Phone size={20} />} label="Teléfono Papá" value={contact.dadPhone} />
                            <ContactDetail icon={<Mail size={20} />} label="Correo Papá" value={contact.dadEmail} />
                            <ContactDetail icon={<Phone size={20} />} label="Teléfono Mamá" value={contact.momPhone} />
                            <ContactDetail icon={<Mail size={20} />} label="Correo Mamá" value={contact.momEmail} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

