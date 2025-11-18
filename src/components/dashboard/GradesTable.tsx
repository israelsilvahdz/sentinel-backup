
"use client"

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock } from 'lucide-react';
import { type Subject } from "@/types/student";
import { cn } from '@/lib/utils';

interface GradesTableProps {
    subjects: Subject[];
}

export function GradesTable({ subjects }: GradesTableProps) {
    const ACTIVITY_REGEX = /^A\d+$/;
    
    const { headers, rows } = useMemo(() => {
        if (!subjects || subjects.length === 0) {
            return { headers: [], rows: [] };
        }

        const allActivityKeys = new Set<string>();
        subjects.forEach(subject => {
            Object.keys(subject.activities).forEach(key => {
                 // Solo añade la clave de actividad si tiene un valor (no es null, undefined, o string vacío)
                if (ACTIVITY_REGEX.test(key) && subject.activities[key] !== null && subject.activities[key] !== undefined && String(subject.activities[key]).trim() !== '') {
                    allActivityKeys.add(key);
                }
            });
        });

        const sortedHeaders = Array.from(allActivityKeys).sort((a, b) => {
            const numA = parseInt(a.substring(1), 10);
            const numB = parseInt(b.substring(1), 10);
            return numA - numB;
        });

        const tableRows = subjects.map(subject => {
            const rowData: Record<string, string | number> = {
                subjectName: subject.name,
                ponderado: subject.grade.toFixed(2), // Usar la calificación del reporte
            };
            sortedHeaders.forEach(header => {
                rowData[header] = subject.activities[header] ?? '';
            });
            return rowData;
        });

        return { headers: sortedHeaders, rows: tableRows };

    }, [subjects, ACTIVITY_REGEX]);

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
                        <TableHead className="text-right font-bold">Ponderado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index} className={cn(index % 2 === 0 ? 'bg-muted/30' : '')}>
                            <TableCell className="font-medium">{row.subjectName}</TableCell>
                            {headers.map(header => (
                                <TableCell key={header} className="text-center font-mono">
                                    {String(row[header]).toUpperCase() === 'SC' ? (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                            <Clock className="h-3 w-3 mr-1"/>
                                            SC
                                        </Badge>
                                    ) : (
                                        row[header]
                                    )}
                                </TableCell>
                            ))}
                            <TableCell className="text-right font-mono font-bold text-primary">{row.ponderado}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
