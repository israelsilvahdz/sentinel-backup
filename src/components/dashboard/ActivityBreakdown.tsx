
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
    
    const schemeUsed = schemes.find(s => s.subjectNames.includes(subject.name));

    return (
        <div className="bg-muted/30 p-2 sm:p-4">
            <Card className="border-primary/20">
                <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="text-base sm:text-lg">Desglose de Calificaciones</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        {subject.name} ({schemeUsed?.name || 'No definido'})
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                        {activityList.map((item, index) => {
                            const isGraded = typeof item.score === 'string' ? item.score.toUpperCase() !== 'SC' && item.score.trim() !== '' : true;
                            const score = Number(item.score) || 0;
                            const earnedPoints = isGraded ? (score / 100) * item.weight : 0;
                            
                            return (
                                <div key={index} className="bg-background p-3 rounded-lg border shadow-sm space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-1 overflow-hidden">
                                            <span className="font-semibold text-muted-foreground truncate">{item.name}</span>
                                            {item.label && <Badge variant="outline" className="scale-75 origin-left">{item.label}</Badge>}
                                        </div>
                                        <Badge variant="secondary" className="h-5 px-1">{item.weight}%</Badge>
                                    </div>
                                    {isGraded ? (
                                        <p className="font-mono text-lg font-bold text-primary">
                                            {earnedPoints.toFixed(1)} / {item.weight.toFixed(1)}
                                        </p>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold h-[28px]">
                                            <Clock className="h-3 w-3" />
                                            <span>SC</span>
                                        </div>
                                    )}
                                     <p className="text-[10px] text-muted-foreground">Calif: {String(item.score).toUpperCase()}</p>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
