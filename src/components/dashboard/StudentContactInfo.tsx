
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Phone, Mail, Users, Edit, Save, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDashboardFilters } from './DashboardClient';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { StudentContact } from '@/types/student';
import { addOrUpdateContact } from '@/lib/firebase-services';

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
    if (!value || value.toLowerCase() === 'no disponible' || value.trim() === '') return null;
    const handleCopy = () => {
        navigator.clipboard.writeText(value).then(() => {
            toast({ title: '¡Copiado!', description: `${label} copiado al portapapeles.` });
        });
    };
    const isEmail = label.toLowerCase().includes('correo');
    const href = isEmail ? `mailto:${value}` : `tel:${value.replace(/\s/g, '')}`;
    return (
        <div className="flex items-start gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
            <div className="text-muted-foreground pt-1">{icon}</div>
            <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <a href={href} className="text-base font-mono text-foreground break-all hover:underline" target="_blank" rel="noopener noreferrer">{value}</a>
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
        defaultValues: contact || {}
    });

    useEffect(() => {
        if (contact) reset(contact);
    }, [contact, reset]);

    const onSubmit = async (data: ContactFormValues) => {
        if (!student) return;
        const updatedContact: StudentContact = { ...contact, studentId, name: student.name, ...data, sedena: '', group: '', mentoringId: '' };
        try {
            await addOrUpdateContact(updatedContact);
            setStudentContacts(prev => ({ ...prev, [studentId]: updatedContact }));
            toast({ title: 'Contacto Guardado', description: 'La información se ha actualizado.' });
            setIsEditing(false);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error al guardar' });
        }
    };
    
    if (!student) return <p className="p-6 text-center text-muted-foreground">Alumno no encontrado en el reporte actual.</p>;
    
    if (!contact && !isEditing) {
         return (
            <div className="p-10 text-center space-y-4">
                <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                    <Search className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                    <p className="font-bold text-slate-800">Directorio no cargado</p>
                    <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">Carga el Excel del directorio o añade la información manualmente para este alumno.</p>
                </div>
                <Button onClick={() => setIsEditing(true)} className="rounded-xl font-bold">
                    <Users className="mr-2 h-4 w-4" /> Añadir Manualmente
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-slate-50/50 rounded-b-3xl border-t">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-black text-slate-800">Detalles de Contacto</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{student.name}</p>
                </div>
                {isEditing ? (
                        <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="rounded-xl font-bold"> Cancelar </Button>
                        <Button size="sm" onClick={handleSubmit(onSubmit)} className="rounded-xl font-bold"> <Save className="mr-2 h-4 w-4" /> Guardar </Button>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-xl font-bold border-slate-200"> <Edit className="mr-2 h-4 w-4" /> Editar </Button>
                )}
            </div>

            <div className="space-y-4">
                {isEditing ? (
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border shadow-sm">
                        <div className="space-y-4">
                            <h4 className="font-black text-xs uppercase tracking-widest text-primary">Información del Alumno</h4>
                            <div className="space-y-1"><Label>Teléfono</Label><Input {...register('studentPhone')} /></div>
                            <div className="space-y-1"><Label>Correo</Label><Input {...register('studentEmail')} /></div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-black text-xs uppercase tracking-widest text-primary">Información de Padres</h4>
                            <div className="space-y-1"><Label>Papá - Teléfono</Label><Input {...register('dadPhone')} /></div>
                            <div className="space-y-1"><Label>Mamá - Teléfono</Label><Input {...register('momPhone')} /></div>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-none shadow-none bg-white p-4 rounded-2xl">
                            <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-3">Alumno</h4>
                            <ContactDetail icon={<Phone size={18} />} label="WhatsApp" value={contact?.studentPhone} />
                            <ContactDetail icon={<Mail size={18} />} label="Correo" value={contact?.studentEmail} />
                        </Card>
                        <Card className="border-none shadow-none bg-white p-4 rounded-2xl">
                            <h4 className="font-black text-xs uppercase tracking-widest text-primary mb-3">Familia</h4>
                            <ContactDetail icon={<Phone size={18} />} label="Tel. Papá" value={contact?.dadPhone} />
                            <ContactDetail icon={<Phone size={18} />} label="Tel. Mamá" value={contact?.momPhone} />
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
