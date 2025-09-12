
"use client";

import React from 'react';
import contactData from '@/lib/student-contacts.json';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Phone, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface StudentContactProps {
    studentId: string;
}

interface StudentContact {
    nombre: string;
    telefono_alumno: string;
    telefono_papa: string;
    telefono_mama: string;
    correo_alumno: string;
    correo_papa: string;
    correo_mama: string;
}

const contactsMap = new Map<string, StudentContact>(
    Object.entries(contactData)
);

function ContactDetail({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    const { toast } = useToast();

    if (!value || value.toLowerCase() === 'no disponible') {
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
    const contact = contactsMap.get(studentId);

    if (!contact) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                No se encontró información de contacto para este alumno.
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Información de Contacto
                    </CardTitle>
                    <CardDescription>{contact.nombre}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <h3 className="font-semibold text-lg mb-2">Alumno</h3>
                    <ContactDetail icon={<Phone size={20} />} label="Teléfono Alumno" value={contact.telefono_alumno} />
                    <ContactDetail icon={<Mail size={20} />} label="Correo Alumno" value={contact.correo_alumno} />
                    
                    <h3 className="font-semibold text-lg mt-6 mb-2">Padres / Tutores</h3>
                    <ContactDetail icon={<Phone size={20} />} label="Teléfono Papá" value={contact.telefono_papa} />
                    <ContactDetail icon={<Mail size={20} />} label="Correo Papá" value={contact.correo_papa} />
                    <ContactDetail icon={<Phone size={20} />} label="Teléfono Mamá" value={contact.telefono_mama} />
                    <ContactDetail icon={<Mail size={20} />} label="Correo Mamá" value={contact.correo_mama} />
                </CardContent>
            </Card>
        </div>
    );
}
