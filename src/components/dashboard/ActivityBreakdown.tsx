
"use client";

import { useMemo } from 'react';
import type { Subject } from '@/types/student';
import { getAreaForMateria, PONDERACIONES_POR_AREA, EXAM_INTERMEDIO_PONDERACION, EXAM_FINAL_PONDERACION, PONDERACIONES_SEMESTRAL_POR_MATERIA } from '@/lib/ponderaciones';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock } from 'lucide-react';

interface ActivityBreakdownProps {
    subject: Subject;
    planType: 'tetramestral' | 'semestral';
}

interface ActivityItem {
    name: string;
    score: number | string;
    weight: number;
    earnedPoints: number;
}

function getActivityList(subject: Subject, planType: 'tetramestral' | 'semestral'): ActivityItem[] {
    const sortedScores = Object.entries(subject.activities)
        .filter(([key]) => /^A\d+$/.test(key))
        .sort(([keyA], [keyB]) => parseInt(keyA.substring(1), 10) - parseInt(keyB.substring(1), 10))
        .map(([, value]) => value);

    const activityItems: ActivityItem[] = [];
    let activityIndex = 0;

    const addActivity = (name: string, weight: number) => {
        const rawScore = sortedScores[activityIndex++] ?? 'SC';
        const score = typeof rawScore === 'string' && (rawScore.toUpperCase() === 'SC' || rawScore.toUpperCase() === 'NE' || rawScore.trim() === '') ? 0 : Number(rawScore);
        const earnedPoints = (score / 100) * weight;
        activityItems.push({ name, score: rawScore, weight, earnedPoints });
    };

    if (planType === 'semestral' && PONDERACIONES_SEMESTRAL_POR_MATERIA[subject.name]) {
        const weights = PONDERACIONES_SEMESTRAL_POR_MATERIA[subject.name];
        weights.forEach((weight, index) => {
            addActivity(`Actividad ${activityIndex + 1}`, weight);
        });
        return activityItems;
    }
    
    const area = getAreaForMateria(subject.name);
    const ponderacion = PONDERACIONES_POR_AREA[area];
    if (!ponderacion) return [];

    for (let i = 1; i <= ponderacion.aai; i++) addActivity(`Actividad ${activityIndex + 1}`, ponderacion.vcu_aai);
    if (ponderacion.vpai) addActivity('Proyecto Pre-Intermedio', ponderacion.vpai);
    addActivity('Examen Intermedio', EXAM_INTERMEDIO_PONDERACION);
    for (let i = 1; i <= ponderacion.aaf; i++) addActivity(`Actividad ${activityIndex + 1}`, ponderacion.vcu_aaf);
    if (ponderacion.vpaf) addActivity('1er Proyecto Pre-Final', ponderacion.vpaf);
    if (ponderacion.vpaf2) addActivity('2do Proyecto Pre-Final', ponderacion.vpaf2);
    addActivity('Examen Final', EXAM_FINAL_PONDERACION);
    
    return activityItems;
}

export function ActivityBreakdown({ subject, planType }: ActivityBreakdownProps) {
    const activityList = useMemo(() => getActivityList(subject, planType), [subject, planType]);
    
    if (activityList.length === 0) {
        return (
            <div className="bg-muted/50 p-4">
                <p className="text-center text-sm text-muted-foreground">
                    No hay desglose de ponderación definido para la materia "{subject.name}".
                </p>
            </div>
        );
    }

    const schemeUsed = (planType === 'semestral' && PONDERACIONES_SEMESTRAL_POR_MATERIA[subject.name]) ? 'Semestral' : 'Tetramestral';
    const totalEarnedPoints = activityList.reduce((acc, item) => acc + item.earnedPoints, 0);

    return (
        <div className="bg-muted/30 p-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg">Desglose de Calificaciones</CardTitle>
                            <CardDescription>
                                Ponderaciones para: {subject.name} (Esquema: {schemeUsed})
                            </CardDescription>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-medium text-muted-foreground">Total Acumulado</p>
                           <p className="text-2xl font-bold text-primary">{totalEarnedPoints.toFixed(2)} / 100</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                        {activityList.map((item, index) => (
                            <div key={index} className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-muted-foreground">{item.name}</span>
                                    <Badge variant="secondary">{item.weight}%</Badge>
                                </div>
                                {typeof item.score === 'string' && (item.score.toUpperCase() === 'SC' || item.score.trim() === '') ? (
                                    <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold p-2 bg-blue-50 rounded-md">
                                        <Clock className="h-4 w-4" />
                                        <span>Sin Cargar</span>
                                    </div>
                                ) : (
                                    <p className="font-mono text-xl font-bold text-primary p-2 bg-primary/5 rounded-md">
                                        {item.earnedPoints.toFixed(1)} / {item.weight.toFixed(1)}
                                    </p>
                                )}
                                 <p className="text-xs text-muted-foreground pl-1">Calificación: {String(item.score).toUpperCase()}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
    