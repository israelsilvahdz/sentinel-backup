
"use client";

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { type OfertaAcademicaItem, type ProfessorContact } from '@/types/student';
import { Badge } from '../ui/badge';
import { Clock, User } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PlannerScheduleProps {
  recommendedSubjects: string[];
  oferta: OfertaAcademicaItem[];
  planType: 'semestral' | 'tetramestral';
  professorContacts: Record<string, ProfessorContact>;
}

const DAYS = ['LUN', 'MAR', 'MI', 'JUE', 'VIE'];
const DAY_MAP: Record<string, string> = {
    'LUN': 'Lunes',
    'MAR': 'Martes',
    'MI': 'Miércoles',
    'JUE': 'Jueves',
    'VIE': 'Viernes',
};

const TIME_SLOTS_TETRA = [
    { start: '07:00', end: '08:59' },
    { start: '09:00', end: '10:59' },
    { start: '11:30', end: '13:29' },
    { start: '13:30', end: '14:50' },
];

const TIME_SLOTS_SEMESTRAL = [
    { start: '07:00', end: '07:59' },
    { start: '08:00', end: '08:59' },
    { start: '09:00', end: '09:59' },
    { start: '10:00', end: '10:59' },
    { start: '11:30', end: '12:29' },
    { start: '12:30', end: '13:29' },
];

function isSubjectInSlot(subject: OfertaAcademicaItem, slot: { start: string, end: string }, planType: 'semestral' | 'tetramestral'): boolean {
    if (!subject.startTime) return false;
    if (planType === 'semestral') {
        return subject.startTime === slot.start;
    }
    return subject.startTime === slot.start;
}

export function PlannerSchedule({ recommendedSubjects, oferta, planType }: PlannerScheduleProps) {
    const TIME_SLOTS = planType === 'semestral' ? TIME_SLOTS_SEMESTRAL : TIME_SLOTS_TETRA;

    const scheduledSubjects = useMemo(() => {
        const recommendedSet = new Set(recommendedSubjects);
        return oferta.filter(item => recommendedSet.has(item.subjectName));
    }, [recommendedSubjects, oferta]);

    const scheduleByDayAndSlot = useMemo(() => {
        const grid: Record<string, OfertaAcademicaItem[]> = {};

        DAYS.forEach(day => {
            TIME_SLOTS.forEach(slot => {
                const key = `${day}-${slot.start}`;
                grid[key] = scheduledSubjects.filter(subject =>
                    subject.days.includes(day) && isSubjectInSlot(subject, slot, planType)
                );
            });
        });
        
        return grid;
    }, [scheduledSubjects, TIME_SLOTS, planType]);

    if (recommendedSubjects.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Horario Simulado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-10">
                        Selecciona un período en el mapa para ver el horario recomendado.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <TooltipProvider>
            <Card>
                <CardHeader>
                    <CardTitle>Horario Simulado</CardTitle>
                    <CardDescription>Horario basado en las materias recomendadas y la oferta académica cargada.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-6 gap-px bg-border rounded-lg border overflow-hidden">
                        <div className="p-2 bg-card"></div>
                        {DAYS.map(day => (
                            <div key={day} className="p-2 bg-card text-center font-bold text-primary text-sm">{DAY_MAP[day]}</div>
                        ))}
                        {TIME_SLOTS.map(slot => (
                            <React.Fragment key={slot.start}>
                                <div className="p-2 bg-card border-t border-border flex items-center justify-center">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        <Clock className="h-3 w-3 mr-1.5" />
                                        {slot.start}
                                    </Badge>
                                </div>
                                {DAYS.map(day => {
                                    const classesInSlot = scheduleByDayAndSlot[`${day}-${slot.start}`] || [];
                                    return (
                                        <div key={`${day}-${slot.start}`} className="p-1.5 bg-card border-t border-border min-h-[70px]">
                                            {classesInSlot.map(subject => (
                                                 <Tooltip key={subject.crn}>
                                                    <TooltipTrigger asChild>
                                                        <div className="bg-primary/10 border border-primary/30 rounded-md p-1.5 text-xs shadow-sm mb-1 cursor-default">
                                                            <p className="font-semibold leading-tight truncate text-primary">{subject.subjectName}</p>
                                                            <p className="text-muted-foreground truncate">{subject.professor}</p>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-bold">{subject.subjectName} ({subject.crn})</p>
                                                        <p>Profesor: {subject.professor}</p>
                                                        <p>Horario: {subject.days.join(', ')} de {subject.startTime} a {subject.endTime}</p>
                                                        <p>Lugar: {subject.building} - {subject.room}</p>
                                                        <p>Ocupación: {subject.enrolled} / {subject.capacity}</p>
                                                    </TooltipContent>
                                                 </Tooltip>
                                            ))}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                     </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
