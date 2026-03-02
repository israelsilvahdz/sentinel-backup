
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
                const isSpecial = key === 'EXAMEN_INTERMEDIO' || key === 'EXAMEN_FINAL';
                const isActivity = ACTIVITY_REGEX.test(key);
                
                if ((isActivity || isSpecial) && subject.activities[key] !== null && subject.activities[key] !== undefined && String(subject.activities[key]).trim() !== '') {
                    allActivityKeys.add(key);
                }
            });
        });

        const sortedHeaders = Array.from(allActivityKeys).sort((a, b) => {
            if (a === 'EXAMEN_INTERMEDIO') return -1;
            if (b === 'EXAMEN_INTERMEDIO') return 1;
            if (a === 'EXAMEN_FINAL') return 1;
            if (b === 'EXAMEN_FINAL') return -1;
            
            const numA = parseInt(a.substring(1), 10);
            const numB = parseInt(b.substring(1), 10);
            return numA - numB;
        });

        const tableRows = subjects.map(subject => {
            const rowData: Record<string, string | number> = {
                subjectName: subject.name,
                ponderado: (subject.grade || 0).toFixed(2),
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

    const formatHeader = (header: string) => {
        if (header === 'EXAMEN_INTERMEDIO') return 'Interm.';
        if (header === 'EXAMEN_FINAL') return 'Final';
        return header;
    }

    return (
        <div className="w-full overflow-x-auto">
            <Table className="min-w-[600px]">
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[180px] font-semibold sticky left-0 bg-background z-10">Materia</TableHead>
                        {headers.map(header => (
                            <TableHead key={header} className="text-center px-2">{formatHeader(header)}</TableHead>
                        ))}
                        <TableHead className="text-right font-bold pr-4">Pond.</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, index) => (
                        <TableRow key={index} className={cn(index % 2 === 0 ? 'bg-muted/30' : '')}>
                            <TableCell className="font-medium sticky left-0 bg-inherit z-10">{row.subjectName}</TableCell>
                            {headers.map(header => (
                                <TableCell key={header} className="text-center font-mono text-xs px-2">
                                    {String(row[header]).toUpperCase() === 'SC' ? (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 px-1 py-0 text-[10px]">
                                            SC
                                        </Badge>
                                    ) : (
                                        row[header]
                                    )}
                                </TableCell>
                            ))}
                            <TableCell className="text-right font-mono font-bold text-primary pr-4">{row.ponderado}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
