
"use client";

import { useMemo } from 'react';
import type { Subject } from '@/types/student';
import { getAreaForMateria, PONDERACIONES_POR_AREA, EXAM_INTERMEDIO_PONDERACION, EXAM_FINAL_PONDERACION, type Ponderacion } from '@/lib/ponderaciones';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock } from 'lucide-react';

interface ActivityBreakdownProps {
    subject: Subject;
}

interface ActivityItem {
    name: string;
    score: number | string;
    weight: number;
}

function getActivityList(subject: Subject): ActivityItem[] {
    const area = getAreaForMateria(subject.name);
    const ponderacion = PONDERACIONES_POR_AREA[area];
    if (!ponderacion) return [];

    const sortedActivities = Object.entries(subject.activities)
        .filter(([key]) => /^A\d+$/.test(key))
        .sort(([keyA], [keyB]) => {
            const numA = parseInt(keyA.substring(1), 10);
            const numB = parseInt(keyB.substring(1), 10);
            return numA - numB;
        })
        .map(([, value]) => value);

    const activityItems: ActivityItem[] = [];
    let activityIndex = 0;

    const addActivity = (name: string, weight: number) => {
        const score = sortedActivities[activityIndex++] ?? 'SC';
        activityItems.push({ name, score, weight });
    };

    for (let i = 1; i <= ponderacion.aai; i++) {
        addActivity(`Actividad ${activityIndex + 1}`, ponderacion.vcu_aai);
    }

    if (ponderacion.vpai) {
        addActivity('Proyecto Pre-Intermedio', ponderacion.vpai);
    }

    addActivity('Examen Intermedio', EXAM_INTERMEDIO_PONDERACION);

    for (let i = 1; i <= ponderacion.aaf; i++) {
        addActivity(`Actividad ${activityIndex + 1}`, ponderacion.vcu_aaf);
    }

    if (ponderacion.vpaf) {
        addActivity('1er Proyecto Pre-Final', ponderacion.vpaf);
    }

    if (ponderacion.vpaf2) {
        addActivity('2do Proyecto Pre-Final', ponderacion.vpaf2);
    }

    addActivity('Examen Final', EXAM_FINAL_PONDERACION);
    
    return activityItems;
}

export function ActivityBreakdown({ subject }: ActivityBreakdownProps) {
    const activityList = useMemo(() => getActivityList(subject), [subject]);
    const area = getAreaForMateria(subject.name);

    if (activityList.length === 0) {
        return (
            <div className="bg-muted/50 p-4">
                <p className="text-center text-sm text-muted-foreground">
                    No hay desglose de ponderación definido para el área "{area}".
                </p>
            </div>
        );
    }

    return (
        <div className="bg-muted/30 p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Desglose de Calificaciones</CardTitle>
                    <CardDescription>
                        Calificaciones y ponderaciones para: {subject.name} (Área: {area})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                        {activityList.map((item, index) => (
                            <div key={index} className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-muted-foreground">{item.name}</span>
                                    <Badge variant="secondary">{item.weight}%</Badge>
                                </div>
                                {typeof item.score === 'string' && item.score.toUpperCase() === 'SC' ? (
                                    <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold p-2 bg-blue-50 rounded-md">
                                        <Clock className="h-4 w-4" />
                                        <span>Sin Cargar</span>
                                    </div>
                                ) : (
                                    <p className="font-mono text-xl font-bold text-primary p-2 bg-primary/5 rounded-md">
                                        {Number(item.score).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
    