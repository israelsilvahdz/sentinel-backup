
"use client";

import React, { useMemo } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { User, Clock, DoorOpen } from 'lucide-react';
import { curriculum } from '@/lib/curriculum';
import type { Student } from '@/types/student';
import { Badge } from '../ui/badge';

// Helper to convert HH:MM to minutes
const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Subjects that are flexible and don't count towards physical attendance
const onlineFlexSubjects = new Set(
    curriculum.flatMap(term => term.courses.filter(c => c.isFlexible).map(c => c.name))
);
onlineFlexSubjects.add('Ciencias de la Vida');
onlineFlexSubjects.add('El mundo contemporáneo');

interface EarlyLeaver {
    student: Student;
    detail: string;
}

export function EarlyDeparturePanel() {
    const { allStudents } = useDashboardFilters();

    const { studentsSkippingLastBlock, studentsLeavingVeryEarly } = useMemo(() => {
        if (!allStudents || allStudents.length === 0) {
            return { studentsSkippingLastBlock: [], studentsLeavingVeryEarly: [] };
        }

        const lastBlockStartTime = '13:30';
        const earlyLeaveTimeMinutes = timeToMinutes('13:30');
        const DAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'];

        const leavingVeryEarlyMap = new Map<string, { student: Student; days: { day: string; time: string }[] }>();
        const skippingLastBlockMap = new Map<string, { student: Student; days: string[] }>();

        // Get all groups that have a class in the last block, per day
        const groupsWithLastClassByDay: Record<string, Set<string>> = { LUN: new Set(), MAR: new Set(), MIE: new Set(), JUE: new Set(), VIE: new Set() };
        allStudents.forEach(student => {
            student.subjects?.forEach(subject => {
                if (subject.group && !onlineFlexSubjects.has(subject.name) && subject.schedule?.startTime === lastBlockStartTime) {
                    subject.schedule.days.forEach(day => {
                        if (groupsWithLastClassByDay[day]) {
                            groupsWithLastClassByDay[day].add(subject.group!);
                        }
                    });
                }
            });
        });

        allStudents.forEach(student => {
            const lastClassByDay: Record<string, string> = {};
            const studentGroupsByDay: Record<string, Set<string>> = { LUN: new Set(), MAR: new Set(), MIE: new Set(), JUE: new Set(), VIE: new Set() };
            let hasAnyClass = false;

            student.subjects?.forEach(subject => {
                if (!onlineFlexSubjects.has(subject.name) && subject.schedule?.endTime) {
                    hasAnyClass = true;
                    subject.schedule.days.forEach(day => {
                        if (!lastClassByDay[day] || timeToMinutes(subject.schedule!.endTime!) > timeToMinutes(lastClassByDay[day])) {
                            lastClassByDay[day] = subject.schedule!.endTime!;
                        }
                        if (subject.group) {
                        studentGroupsByDay[day].add(subject.group);
                        }
                    });
                }
            });
            
            if (!hasAnyClass) return; // Skip students with no physical classes

            // Condition 2: Leaving before 1:30 PM on any day
            const earlyDays: { day: string; time: string }[] = [];
            DAYS.forEach(day => {
                const lastTime = lastClassByDay[day];
                // Student has a class that day, but it ends early
                if (lastTime && timeToMinutes(lastTime) <= earlyLeaveTimeMinutes) {
                    earlyDays.push({ day, time: lastTime });
                }
            });

            if (earlyDays.length > 0) {
                leavingVeryEarlyMap.set(student.id, { student, days: earlyDays });
            }
            
            // Condition 1: Skipping the last block on any day
            const skippingDays: string[] = [];
            DAYS.forEach(day => {
                const studentGroups = studentGroupsByDay[day];
                const lastClassGroupsForDay = groupsWithLastClassByDay[day];
                const isInLastBlockGroup = [...studentGroups].some(g => lastClassGroupsForDay.has(g));

                if (isInLastBlockGroup) {
                    const hasPersonalLastClass = student.subjects!.some(
                        s => !onlineFlexSubjects.has(s.name) &&
                            s.schedule?.days.includes(day) &&
                            s.schedule?.startTime === lastBlockStartTime
                    );

                    if (!hasPersonalLastClass) {
                        skippingDays.push(day);
                    }
                }
            });

            if (skippingDays.length > 0) {
                skippingLastBlockMap.set(student.id, { student, days: skippingDays });
            }
        });

        const formatEarlyLeaverDetail = (days: { day: string; time: string }[]) => {
            if (days.length === 5) return "Sale temprano todos los días.";
            const details = days.map(d => `${d.day} (${d.time})`).join(', ');
            return `Sale temprano: ${details}`;
        }

        const formatSkippingDetail = (days: string[]) => {
            if (days.length === 5) return "No cursa el último bloque ningún día.";
            return `No cursa el último bloque: ${days.join(', ')}`;
        }
        
        const studentsLeavingVeryEarly = Array.from(leavingVeryEarlyMap.values())
            .map(({ student, days }) => ({ student, detail: formatEarlyLeaverDetail(days) }))
            .sort((a, b) => a.student.name.localeCompare(b.student.name));
            
        const studentsSkippingLastBlock = Array.from(skippingLastBlockMap.values())
            .map(({ student, days }) => ({ student, detail: formatSkippingDetail(days) }))
            .sort((a, b) => a.student.name.localeCompare(b.student.name));


        return { studentsSkippingLastBlock, studentsLeavingVeryEarly };
    }, [allStudents]);

    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Análisis de Salida Temprano</h1>
                <p className="text-muted-foreground">
                    Identifica alumnos que no cursan el último bloque de su grupo o que se retiran antes de las 13:30 en días específicos.
                </p>
            </header>

            <Accordion type="multiple" defaultValue={['skipping-last', 'leaving-early']} className="w-full space-y-6">
                <Card>
                    <AccordionItem value="skipping-last">
                        <CardHeader>
                            <AccordionTrigger>
                                <div className="flex items-center gap-4">
                                     <CardTitle className="text-xl">Alumnos que no cursan el último bloque</CardTitle>
                                     <Badge>{studentsSkippingLastBlock.length} Alumnos</Badge>
                                </div>
                            </AccordionTrigger>
                            <CardDescription>
                                Alumnos cuyo grupo tiene clase en el bloque de 13:30-14:50 en ciertos días, pero ellos no tienen una materia asignada en ese horario.
                            </CardDescription>
                        </CardHeader>
                        <AccordionContent>
                           <CardContent>
                            {studentsSkippingLastBlock.length > 0 ? (
                                <ul className="space-y-2">
                                    {studentsSkippingLastBlock.map(({ student, detail }) => (
                                        <li key={student.id} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50">
                                            <User className="h-5 w-5 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="font-semibold">{student.name}</p>
                                                <p className="text-sm text-muted-foreground">{student.id}</p>
                                            </div>
                                            <p className="text-sm font-mono text-blue-600">{detail}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-muted-foreground py-4">No se encontraron alumnos en esta categoría.</p>
                            )}
                           </CardContent>
                        </AccordionContent>
                    </AccordionItem>
                </Card>

                 <Card>
                    <AccordionItem value="leaving-early">
                         <CardHeader>
                            <AccordionTrigger>
                                <div className="flex items-center gap-4">
                                     <CardTitle className="text-xl">Alumnos que salen antes de las 13:30</CardTitle>
                                     <Badge>{studentsLeavingVeryEarly.length} Alumnos</Badge>
                                </div>
                            </AccordionTrigger>
                            <CardDescription>
                                Alumnos cuya última clase presencial del día termina a las 13:30 o antes en uno o más días de la semana.
                            </CardDescription>
                        </CardHeader>
                        <AccordionContent>
                           <CardContent>
                                {studentsLeavingVeryEarly.length > 0 ? (
                                <ul className="space-y-2">
                                    {studentsLeavingVeryEarly.map(({ student, detail }) => (
                                        <li key={student.id} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50">
                                            <Clock className="h-5 w-5 text-muted-foreground" />
                                            <div className="flex-1">
                                                <p className="font-semibold">{student.name}</p>
                                                <p className="text-sm text-muted-foreground">{student.id}</p>
                                            </div>
                                            <p className="text-sm font-mono text-green-600">{detail}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-muted-foreground py-4">No se encontraron alumnos en esta categoría.</p>
                            )}
                           </CardContent>
                        </AccordionContent>
                    </AccordionItem>
                 </Card>
            </Accordion>
        </div>
    );
}
