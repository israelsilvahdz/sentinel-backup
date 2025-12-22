
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { parseOfertaAcademicaExcel, type OfertaAcademicaItem } from '@/lib/excelParser';
import { Input } from '../ui/input';
import { Search, Info, Calendar, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const DAYS = ['LUN', 'MAR', 'MI', 'JUE', 'VIE'];
const DAY_MAP: Record<string, string> = {
    'LUN': 'Lunes',
    'MAR': 'Martes',
    'MI': 'Miércoles',
    'JUE': 'Jueves',
    'VIE': 'Viernes',
};

const TIME_SLOTS = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '15:00', '16:00', '17:00'
];

function isClassInSlot(item: OfertaAcademicaItem, slot: string, day: string): boolean {
    if (!item.days.includes(day) || !item.startTime || !item.endTime) return false;
    const itemStart = parseInt(item.startTime.replace(':', ''), 10);
    const itemEnd = parseInt(item.endTime.replace(':', ''), 10);
    const slotStart = parseInt(slot.replace(':', ''), 10);
    const slotEnd = slotStart + 59; 
    return itemStart <= slotEnd && itemEnd > slotStart;
}

export function OfertaAcademicaPanel() {
    const { toast } = useToast();
    const [ofertaFile, setOfertaFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ofertaData, setOfertaData] = useState<OfertaAcademicaItem[]>([]);
    const [filter, setFilter] = useState('');

    const handleFileUpload = useCallback(async (file: File | null) => {
        if (!file) {
            setOfertaFile(null);
            return;
        }
        setOfertaFile(file);
        setIsProcessing(true);
        try {
            const data = await parseOfertaAcademicaExcel(file);
            if (data) {
                setOfertaData(data);
                toast({
                    title: "Oferta Académica Cargada",
                    description: `Se procesaron ${data.length} registros de materias.`,
                });
            } else {
                throw new Error("El archivo no tiene el formato esperado o está vacío.");
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error al cargar el archivo",
                description: error.message || "No se pudo procesar el archivo Excel.",
            });
        } finally {
            setIsProcessing(false);
        }
    }, [toast]);
    
    const filteredData = useMemo(() => {
        if (!filter) return ofertaData;
        const lowerFilter = filter.toLowerCase();
        return ofertaData.filter(item => 
            item.subjectName.toLowerCase().includes(lowerFilter) ||
            item.crn.toLowerCase().includes(lowerFilter) ||
            item.professor.toLowerCase().includes(lowerFilter)
        );
    }, [filter, ofertaData]);
    
    const scheduleGrid = useMemo(() => {
        const grid: Record<string, OfertaAcademicaItem[]> = {};
        DAYS.forEach(day => {
            TIME_SLOTS.forEach(slot => {
                const key = `${day}-${slot}`;
                grid[key] = filteredData.filter(item => isClassInSlot(item, slot, day));
            });
        });
        return grid;
    }, [filteredData]);

    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Visualizador de Oferta Académica</h1>
                    <p className="text-muted-foreground">Carga el archivo de oferta académica para ver los horarios y detalles.</p>
                </div>
                <FileUpload
                    onFileSelect={handleFileUpload}
                    selectedFile={ofertaFile}
                    isLoading={isProcessing}
                    label="Cargar Oferta Académica"
                />
            </header>

            {ofertaData.length > 0 && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Horario General</CardTitle>
                            <CardDescription>Vista de calendario con todas las materias filtradas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Filtrar por materia, CRN o profesor..."
                                    className="pl-10"
                                    value={filter}
                                    onChange={e => setFilter(e.target.value)}
                                />
                            </div>
                           <ScrollArea className="w-full h-[70vh] border rounded-lg">
                             <div className="grid grid-cols-[auto_repeat(5,1fr)]">
                                <div className="p-2 bg-card sticky top-0 z-10"></div>
                                {DAYS.map(day => (
                                    <div key={day} className="p-2 text-center font-bold bg-card sticky top-0 z-10 border-b border-l">{DAY_MAP[day]}</div>
                                ))}
                                
                                {TIME_SLOTS.map(slot => (
                                    <React.Fragment key={slot}>
                                        <div className="p-2 text-center text-xs font-mono bg-card border-r border-t sticky left-0">{slot}</div>
                                        {DAYS.map(day => (
                                            <div key={`${day}-${slot}`} className="p-1 border-t border-l min-h-[60px]">
                                                {scheduleGrid[`${day}-${slot}`]?.map(item => (
                                                    <Card key={item.crn} className="text-xs mb-1 p-1.5 shadow-sm">
                                                        <p className="font-bold leading-tight">{item.subjectName}</p>
                                                        <p className="text-muted-foreground">{item.professor}</p>
                                                        <div className="flex justify-between items-center text-[10px] mt-1">
                                                            <span>{item.building} - {item.room}</span>
                                                            <Badge variant="secondary" className="px-1">{item.enrolled}/{item.capacity}</Badge>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        ))}
                                    </React.Fragment>
                                ))}
                             </div>
                           </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Listado de Materias</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[50vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Materia</TableHead>
                                            <TableHead>CRN</TableHead>
                                            <TableHead>Profesor</TableHead>
                                            <TableHead>Horario</TableHead>
                                            <TableHead>Lugar</TableHead>
                                            <TableHead>Ocupación</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredData.map(item => (
                                            <TableRow key={item.crn}>
                                                <TableCell className="font-medium">{item.subjectName}</TableCell>
                                                <TableCell>{item.crn}</TableCell>
                                                <TableCell>{item.professor}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 flex-wrap">
                                                      {item.days.map(d => <Badge key={d} variant="outline">{d}</Badge>)}
                                                    </div>
                                                     <span className="text-xs">{item.startTime}-{item.endTime}</span>
                                                </TableCell>
                                                <TableCell>{item.building} - {item.room}</TableCell>
                                                <TableCell>{item.enrolled}/{item.capacity}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </>
            )}

            {ofertaData.length === 0 && !isProcessing && (
                <Card className="text-center p-12 mt-16">
                    <CardHeader>
                        <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                            <Info className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle>Sin Datos de Oferta Académica</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Carga un archivo Excel con la oferta académica para comenzar a visualizar los horarios.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
