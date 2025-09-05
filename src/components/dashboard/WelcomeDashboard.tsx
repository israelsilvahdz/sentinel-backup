
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, CalendarDays, LayoutDashboard } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';

export function WelcomeDashboard() {
    const { setActiveView } = useDashboardFilters();

    const features = [
        {
            title: "Calendario Académico",
            description: "Consulta fechas clave, periodos de inscripción, exámenes y días festivos para planificar el ciclo escolar.",
            icon: <CalendarDays className="h-8 w-8 text-primary" />,
            view: "academic-calendar",
            buttonText: "Ir al Calendario"
        },
        {
            title: "Progreso Estudiantil",
            description: "Monitorea el rendimiento general de los alumnos, identifica casos de riesgo y analiza tendencias por materia.",
            icon: <LayoutDashboard className="h-8 w-8 text-primary" />,
            view: "dashboard",
            buttonText: "Ver Dashboard"
        },
        {
            title: "Análisis de Cambios",
            description: "Compara reportes para detectar nuevas faltas, tareas no entregadas y otros cambios importantes.",
            icon: <BarChart3 className="h-8 w-8 text-primary" />,
            view: "change-stats",
            buttonText: "Analizar Cambios"
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-6">
                        <Image src="https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png" alt="Tecmilenio Logo" width={80} height={80} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                        Bienvenido, Líder de Generación
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Esta herramienta te proporciona una visión integral y en tiempo real del progreso y los riesgos de tus alumnos.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {features.map((feature) => (
                        <Card key={feature.view} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                            <CardHeader className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    {feature.icon}
                                </div>
                                <div>
                                    <CardTitle>{feature.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <CardDescription>{feature.description}</CardDescription>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button onClick={() => setActiveView(feature.view as any)} className="w-full">
                                    {feature.buttonText}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
}
