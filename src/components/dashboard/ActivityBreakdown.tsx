
"use client";

import { useMemo } from 'react';
import type { Subject } from '@/types/student';
import { getActivityList } from '@/lib/ponderaciones';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock } from 'lucide-react';

interface ActivityBreakdownProps {
    subject: Subject;
    planType: 'tetramestral' | 'semestral';
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

    const { totalEarnedPoints, maxPossiblePoints } = useMemo(() => {
        let earned = 0;
        let possible = 0;

        activityList.forEach(item => {
            const isGraded = typeof item.score === 'string' ? item.score.toUpperCase() !== 'SC' && item.score.trim() !== '' : true;
            
            if (isGraded) {
                const score = Number(item.score) || 0;
                earned += (score / 100) * item.weight;
                possible += item.weight;
            }
        });
        
        return { totalEarnedPoints: earned, maxPossiblePoints: possible };

    }, [activityList]);
    
    const schemeUsed = (planType === 'semestral' && subject.name in PONDERACIONES_SEMESTRAL_POR_MATERIA) ? 'Semestral' : 'Tetramestral';


    return (
        <div className="bg-muted/30 p-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">Desglose de Calificaciones</CardTitle>
                            <CardDescription>
                                Ponderaciones para: {subject.name} (Esquema: {schemeUsed})
                            </CardDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-6 text-right">
                           <div>
                               <p className="text-sm font-medium text-muted-foreground">Puntos Acumulados</p>
                               <p className="text-2xl font-bold text-primary">{totalEarnedPoints.toFixed(2)}</p>
                           </div>
                           <div>
                               <p className="text-sm font-medium text-muted-foreground">Máximo Obtenible (hasta ahora)</p>
                               <p className="text-2xl font-bold">{maxPossiblePoints.toFixed(2)}</p>
                           </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
                        {activityList.map((item, index) => {
                            const isGraded = typeof item.score === 'string' ? item.score.toUpperCase() !== 'SC' && item.score.trim() !== '' : true;
                            const score = Number(item.score) || 0;
                            const earnedPoints = isGraded ? (score / 100) * item.weight : 0;
                            
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-semibold text-muted-foreground">{item.name}</span>
                                        <Badge variant="secondary">{item.weight}%</Badge>
                                    </div>
                                    {isGraded ? (
                                        <p className="font-mono text-xl font-bold text-primary p-2 bg-primary/5 rounded-md">
                                            {earnedPoints.toFixed(1)} / {item.weight.toFixed(1)}
                                        </p>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold p-2 bg-blue-50 rounded-md h-[44px]">
                                            <Clock className="h-4 w-4" />
                                            <span>Sin Cargar</span>
                                        </div>
                                    )}
                                     <p className="text-xs text-muted-foreground pl-1">Calificación: {String(item.score).toUpperCase()}</p>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Need to add this here since it's used in the component
const PONDERACIONES_SEMESTRAL_POR_MATERIA: Record<string, number[]> = {
    'Materia y energía I': [3, 3, 3, 3, 3, 11, 3, 3, 3, 3, 3, 12, 3, 3, 3, 3, 3, 12, 20],
    'Ciencias de la Vida': [4, 4, 4, 14, 5, 4, 4, 14, 4, 4, 14, 5, 20],
    'Expresión Literaria': [1, 1, 5, 1, 1, 5, 10, 1, 1, 5, 2, 2, 5, 10, 2, 2, 5, 1, 1, 5, 4, 10, 20],
    'Habilidades y valores IV: plan de vida y carrera': [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 31, 10, 10],
    'Antropología: cultura y consciencia social': [4, 5, 3, 5, 10, 3, 5, 3, 5, 10, 3, 5, 4, 5, 10, 20],
    'Matemáticas IV: modelos matemáticos': [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 16],
    'Optativa de lengua adicional al español I': [8, 8, 10, 8, 8, 11, 8, 8, 11, 20],
};
    
