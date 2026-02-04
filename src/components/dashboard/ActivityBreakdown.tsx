
"use client";

import { useMemo } from 'react';
import type { Subject, WeightingScheme } from '@/types/student';
import { getActivityList } from '@/lib/ponderaciones';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock } from 'lucide-react';

interface ActivityBreakdownProps {
    subject: Subject;
    schemes: WeightingScheme[];
}

export function ActivityBreakdown({ subject, schemes }: ActivityBreakdownProps) {
    const activityList = useMemo(() => getActivityList(subject, schemes), [subject, schemes]);
    
    if (activityList.length === 0) {
        return (
            <div className="bg-muted/50 p-4">
                <p className="text-center text-sm text-muted-foreground">
                    No hay un esquema de ponderación definido para la materia "{subject.name}".
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
    
    const schemeUsed = schemes.find(s => s.subjectNames.includes(subject.name));

    return (
        <div className="bg-muted/30 p-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">Desglose de Calificaciones</CardTitle>
                            <CardDescription>
                                Ponderaciones para: {subject.name} (Esquema: {schemeUsed?.name || 'No definido'})
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
