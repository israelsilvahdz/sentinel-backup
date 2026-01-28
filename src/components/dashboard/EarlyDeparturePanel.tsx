
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

        // 1. Find all groups that have a class in the last block
        const groupsWithLastClass = new Set<string>();
        allStudents.forEach(student => {
            student.subjects?.forEach(subject => {
                if (
                    subject.group &&
                    !onlineFlexSubjects.has(subject.name) &&
                    subject.schedule?.startTime === lastBlockStartTime
                ) {
                    groupsWithLastClass.add(subject.group);
                }
            });
        });

        const skippingLastBlock: EarlyLeaver[] = [];
        const leavingVeryEarly: EarlyLeaver[] = [];
        const processedIds = new Set<string>(); // To avoid duplicating students in lists

        allStudents.forEach(student => {
            if (!student.subjects || student.subjects.length === 0) return;

            // 2. Find student's latest non-flex class
            let latestEndTime = '00:00';
            student.subjects.forEach(subject => {
                if (!onlineFlexSubjects.has(subject.name) && subject.schedule?.endTime) {
                    if (timeToMinutes(subject.schedule.endTime) > timeToMinutes(latestEndTime)) {
                        latestEndTime = subject.schedule.endTime;
                    }
                }
            });
            
            // Check for Condition 2: Leaving before 1:30 PM
            if (latestEndTime !== '00:00' && timeToMinutes(latestEndTime) <= earlyLeaveTimeMinutes) {
                if (!processedIds.has(student.id)) {
                    leavingVeryEarly.push({ student, detail: `Última clase termina a las ${latestEndTime}` });
                    processedIds.add(student.id);
                }
            }

            // Check for Condition 1: Skipping the last block of their group
            if (!processedIds.has(student.id)) {
                const studentGroups = new Set(
                    student.subjects
                        .filter(s => s.group && !onlineFlexSubjects.has(s.name))
                        .map(s => s.group)
                );

                const isInLastBlockGroup = [...studentGroups].some(g => groupsWithLastClass.has(g));

                if (isInLastBlockGroup) {
                    const hasPersonalLastClass = student.subjects.some(
                        s => !onlineFlexSubjects.has(s.name) && s.schedule?.startTime === lastBlockStartTime
                    );

                    if (!hasPersonalLastClass) {
                        skippingLastBlock.push({ student, detail: `Su grupo tiene clase de 13:30 a 14:50, pero el/ella no.` });
                        processedIds.add(student.id);
                    }
                }
            }
        });

        // Sort lists alphabetically by student name
        leavingVeryEarly.sort((a, b) => a.student.name.localeCompare(b.student.name));
        skippingLastBlock.sort((a, b) => a.student.name.localeCompare(b.student.name));

        return { studentsSkippingLastBlock: skippingLastBlock, studentsLeavingVeryEarly: leavingVeryEarly };
    }, [allStudents]);

    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Análisis de Salida Temprano</h1>
                <p className="text-muted-foreground">
                    Identifica alumnos que no cursan el último bloque de su grupo o que se retiran antes de las 13:30.
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
                                Alumnos cuyo grupo tiene clase en el bloque de 13:30-14:50, pero ellos no tienen una materia asignada en ese horario (excluyendo materias flex).
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
                                Alumnos cuya última clase presencial del día termina a las 13:30 o antes.
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
