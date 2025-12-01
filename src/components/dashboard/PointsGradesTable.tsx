
"use client"

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from 'lucide-react';
import { type Subject } from "@/types/student";
import { cn } from '@/lib/utils';
import { getActivityList } from '@/lib/ponderaciones';

interface PointsGradesTableProps {
    subjects: Subject[];
    planType: 'tetramestral' | 'semestral';
}

export function PointsGradesTable({ subjects, planType }: PointsGradesTableProps) {
    const { headers, rows } = useMemo(() => {
        if (!subjects || subjects.length === 0) {
            return { headers: [], rows: [] };
        }

        const allActivityNames = new Set<string>();
        const subjectActivityLists = subjects.map(subject => getActivityList(subject, planType));
        
        subjectActivityLists.forEach(activityList => {
            activityList.forEach(activity => {
                allActivityNames.add(activity.name);
            });
        });

        const sortedHeaders = Array.from(allActivityNames).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10);
            const numB = parseInt(b.replace(/\D/g, ''), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return a.localeCompare(b);
        });

        const tableRows = subjects.map((subject, index) => {
            const activityList = subjectActivityLists[index];
            const activitiesMap = new Map(activityList.map(act => [act.name, act]));
            
            const rowData: Record<string, string | { earned: number, weight: number } | 'SC' | 'NE'> = { subjectName: subject.name };
            
            sortedHeaders.forEach(header => {
                const activity = activitiesMap.get(header);
                if (activity) {
                     if (typeof activity.score === 'string' && activity.score.toUpperCase() === 'SC') {
                        rowData[header] = 'SC';
                     } else if (typeof activity.score === 'string' && activity.score.toUpperCase() === 'NE') {
                        rowData[header] = 'NE';
                     } else {
                        const score = typeof activity.score === 'string' && activity.score.trim() === '' ? 0 : Number(activity.score);
                        const earnedPoints = (score / 100) * activity.weight;
                        rowData[header] = { earned: earnedPoints, weight: activity.weight };
                     }
                } else {
                    rowData[header] = '-';
                }
            });
            return rowData;
        });

        return { headers: sortedHeaders, rows: tableRows };

    }, [subjects, planType]);

    if (rows.length === 0) {
        return <p className="p-4 text-center text-muted-foreground">No hay datos de calificaciones para mostrar.</p>
    }

    return (
        <div className="p-1">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[200px] font-semibold">Materia</TableHead>
                        {headers.map(header => (
                            <TableHead key={header} className="text-center">{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index} className={cn(index % 2 === 0 ? 'bg-muted/30' : '')}>
                            <TableCell className="font-medium">{row.subjectName}</TableCell>
                            {headers.map(header => (
                                <TableCell key={header} className="text-center font-mono align-middle">
                                    {row[header] === 'SC' ? (
                                         <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                            <Clock className="h-3 w-3 mr-1"/>
                                            SC
                                        </Badge>
                                    ) : row[header] === 'NE' ? (
                                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                                            <AlertCircle className="h-3 w-3 mr-1"/>
                                            NE
                                        </Badge>
                                    ) : row[header] === '-' ? (
                                        '-'
                                    ) : (
                                        <span>
                                            {(row[header] as {earned: number}).earned.toFixed(1)} / {(row[header] as {weight: number}).weight.toFixed(1)}
                                        </span>
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
