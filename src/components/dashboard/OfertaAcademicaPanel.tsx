

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { parseOfertaAcademicaExcel } from '@/lib/excelParser';
import { Input } from '../ui/input';
import { Search, Info, Calendar, User, X, AlertTriangle, PlusCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useDashboardFilters } from './DashboardClient';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import type { OfertaAcademicaItem } from '@/types/student';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
    '07:00', '08:00', '09:00', '10:00', '11:00', '11:30', '12:00', '12:30', '13:00', '14:00', '15:00', '16:00', '17:00'
];

interface ScheduleGridItem {
    item: OfertaAcademicaItem;
    rowSpan: number;
}


function isClassInSlot(item: OfertaAcademicaItem, slot: string, day: string): boolean {
    if (!item.days.includes(day) || !item.startTime || !item.endTime) return false;
    const itemStart = parseInt(item.startTime.replace(':', ''), 10);
    const itemEnd = parseInt(item.endTime.replace(':', ''), 10);
    const slotStart = parseInt(slot.replace(':', ''), 10);
    
    const nextSlotIndex = TIME_SLOTS.indexOf(slot) + 1;
    const slotEnd = nextSlotIndex < TIME_SLOTS.length 
        ? parseInt(TIME_SLOTS[nextSlotIndex].replace(':', ''), 10)
        : slotStart + 100; // Asume 1 hora si es el último slot

    // Verifica si hay cualquier superposición
    return itemStart < slotEnd && itemEnd > slotStart;
}

export function OfertaAcademicaPanel() {
    const { ofertaAcademica, setOfertaAcademica } = useDashboardFilters();
    const { toast } = useToast();
    const [ofertaFile, setOfertaFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [scheduleSubjects, setScheduleSubjects] = useState<OfertaAcademicaItem[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const availableGroups = useMemo(() => {
        const groups = new Set(ofertaAcademica.map(item => item.group));
        return Array.from(groups).filter(group => group && group.trim() !== '').sort();
    }, [ofertaAcademica]);


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
                setOfertaAcademica(data);
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
    }, [setOfertaAcademica, toast]);
    
    const handleGroupSelect = (group: string | null) => {
        setSelectedGroup(group);
        if (group) {
            const groupSubjects = ofertaAcademica.filter(item => item.group === group);
            setScheduleSubjects(groupSubjects);
        } else {
            setScheduleSubjects([]);
        }
    };
    
    const addSubjectToSchedule = (subject: OfertaAcademicaItem) => {
        if (scheduleSubjects.some(s => s.crn === subject.crn)) {
            toast({ variant: 'destructive', title: 'Materia ya añadida' });
            return;
        }
        setScheduleSubjects(prev => [...prev, subject]);
    };

    const removeSubjectFromSchedule = (crnToRemove: string) => {
        setScheduleSubjects(prev => prev.filter(s => s.crn !== crnToRemove));
    }

    const { scheduleGrid, visibleTimeSlots, clashes } = useMemo(() => {
        const occupiedSlots = new Set<string>();
        scheduleSubjects.forEach(subject => {
            TIME_SLOTS.forEach(slot => {
                if (subject.days.some(day => isClassInSlot(subject, slot, day))) {
                    occupiedSlots.add(slot);
                }
            });
        });

        const visibleSlots = TIME_SLOTS
            .filter(slot => occupiedSlots.has(slot))
            .sort((a, b) => parseInt(a.replace(':', '')) - parseInt(b.replace(':', '')));

        const clashMap = new Map<string, boolean>();
        const grid: Record<string, ScheduleGridItem[]> = {};

        // Inicializar el grid solo con los slots visibles
        if(visibleSlots.length > 0) {
            scheduleSubjects.forEach(subject => {
                subject.days.forEach(day => {
                    const keyPrefix = `${day}-`;
                    let startSlotIndex = -1;

                    for (let i = 0; i < visibleSlots.length; i++) {
                        if (isClassInSlot(subject, visibleSlots[i], day)) {
                            if (startSlotIndex === -1) {
                                startSlotIndex = i;
                            }
                        }
                    }

                    if (startSlotIndex !== -1) {
                        let endSlotIndex = startSlotIndex;
                        while(endSlotIndex + 1 < visibleSlots.length && isClassInSlot(subject, visibleSlots[endSlotIndex + 1], day)) {
                            endSlotIndex++;
                        }
                        const rowSpan = endSlotIndex - startSlotIndex + 1;
                        const key = `${keyPrefix}${visibleSlots[startSlotIndex]}`;
                        if (!grid[key]) {
                            grid[key] = [];
                        }
                        
                        grid[key].forEach(existing => clashMap.set(existing.item.crn, true));
                        if(grid[key].length > 0) {
                             clashMap.set(subject.crn, true);
                        }

                        grid[key].push({ item: subject, rowSpan });
                    }
                });
            });
        }
        
        return { scheduleGrid: grid, visibleTimeSlots: visibleSlots, clashes: clashMap };
    }, [scheduleSubjects]);
    
    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Planificador de Horarios</h1>
                    <p className="text-muted-foreground">Carga la oferta, selecciona un grupo y arma el horario para detectar empalmes.</p>
                </div>
                <FileUpload
                    onFileSelect={handleFileUpload}
                    selectedFile={ofertaFile}
                    isLoading={isProcessing}
                    label="Cargar Oferta Académica"
                />
            </header>

            {ofertaAcademica.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Paso 1: Selecciona un Grupo Base</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select onValueChange={handleGroupSelect} value={selectedGroup || undefined}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona un grupo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableGroups.map(group => (
                                            <SelectItem key={group} value={group}>{group}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Paso 2: Edita el Horario</CardTitle>
                                <CardDescription>Añade o quita materias para simular el horario de un alumno.</CardDescription>
                            </CardHeader>
                             <CardContent>
                                 <Label>Añadir materia al horario</Label>
                                 <div className="flex items-center gap-4">
                                   <SubjectSearchPopover allSubjects={ofertaAcademica} onSubjectSelect={addSubjectToSchedule} isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
                                    <Button onClick={() => setIsSearchOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Añadir Materia
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {(selectedGroup || scheduleSubjects.length > 0) && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Horario Simulado</CardTitle>
                                    <CardDescription>
                                        Las clases con borde rojo intermitente indican un empalme de horario.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="w-full overflow-x-auto">
                                        <div 
                                            className="grid bg-muted/30 rounded-lg p-2 gap-px"
                                            style={{ 
                                                gridTemplateColumns: 'auto repeat(5, minmax(140px, 1fr))',
                                                gridAutoRows: 'minmax(60px, auto)'
                                            }}
                                        >
                                            <div className="p-2 sticky top-0 left-0 z-10 row-start-1 bg-muted/30"></div>
                                            {DAYS.map((day, i) => (
                                                <div key={day} className="p-2 text-center font-bold text-primary sticky top-0 z-10 row-start-1 bg-muted/30" style={{gridColumn: i + 2}}>{DAY_MAP[day]}</div>
                                            ))}
                                            
                                            {visibleTimeSlots.map((slot, i) => (
                                                <React.Fragment key={slot}>
                                                    <div className="p-2 text-center sticky left-0 z-10 bg-muted/30 flex items-center justify-center" style={{ gridRow: i + 2 }}>
                                                        <Badge variant="outline" className="font-mono text-xs bg-card">{slot}</Badge>
                                                    </div>

                                                     {DAYS.map((day, dayIndex) => {
                                                        const itemsInSlot = scheduleGrid[`${day}-${slot}`] || [];
                                                        const isSlotOccupiedBySpan = i > 0 && 
                                                            Object.values(scheduleGrid).flat().some(gridItem => 
                                                                gridItem.item.days.includes(day) && 
                                                                isClassInSlot(gridItem.item, visibleTimeSlots[i-1], day) &&
                                                                !isClassInSlot(gridItem.item, slot, day) && // Doesn't start here
                                                                (visibleTimeSlots.findIndex(s => isClassInSlot(gridItem.item, s, day)) + gridItem.rowSpan > i)
                                                            );
                                                            
                                                        if (isSlotOccupiedBySpan) return null;

                                                        return (
                                                            <div 
                                                                key={`${day}-${slot}`} 
                                                                className="relative min-h-[60px] bg-card flex z-0" 
                                                                style={{ gridColumn: dayIndex + 2, gridRow: `${i + 2} / span ${itemsInSlot[0]?.rowSpan || 1}` }}
                                                            >
                                                                {itemsInSlot.map((gridItem, itemIndex) => {
                                                                    const lastAddedIndex = scheduleSubjects.length - 1;
                                                                    const currentItemIndex = scheduleSubjects.findIndex(subj => subj.crn === gridItem.item.crn);
                                                                    const isLatestAdded = currentItemIndex === lastAddedIndex;

                                                                    return (
                                                                        <div 
                                                                            key={gridItem.item.crn} 
                                                                            className="p-1 w-full"
                                                                            style={{ flex: `1 1 ${100 / itemsInSlot.length}%` }}
                                                                        >
                                                                            <Card className={cn(
                                                                                "h-full flex flex-col justify-center text-center text-xs p-1.5 shadow-sm relative group bg-card hover:shadow-lg transition-shadow", 
                                                                                clashes.has(gridItem.item.crn) && isLatestAdded && "border-destructive animate-pulse border-2 shadow-destructive/20"
                                                                            )}>
                                                                                {clashes.has(gridItem.item.crn) && <AlertTriangle className="absolute top-1 left-1 h-3 w-3 text-destructive" />}
                                                                                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeSubjectFromSchedule(gridItem.item.crn)}>
                                                                                    <X className="h-3 w-3 text-destructive"/>
                                                                                </Button>
                                                                                <p className="font-bold leading-tight text-primary whitespace-normal">{gridItem.item.subjectName}</p>
                                                                                <p className="text-muted-foreground whitespace-normal">{gridItem.item.professor}</p>
                                                                            </Card>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Listado de Materias en Simulación</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>CRN</TableHead><TableHead>Profesor</TableHead><TableHead>Horario</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {scheduleSubjects.map(item => (
                                                <TableRow key={item.crn}>
                                                    <TableCell className="font-medium">{item.subjectName}</TableCell>
                                                    <TableCell>{item.crn}</TableCell>
                                                    <TableCell>{item.professor}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 flex-wrap">{item.days.map(d => <Badge key={d} variant="outline">{d}</Badge>)}</div>
                                                        <span className="text-xs">{item.startTime}-{item.endTime}</span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </>
            )}

            {ofertaAcademica.length === 0 && !isProcessing && (
                <Card className="text-center p-12 mt-16">
                    <CardHeader>
                        <div className="mx-auto bg-secondary p-3 rounded-full w-fit"><Info className="h-8 w-8 text-primary" /></div>
                        <CardTitle>Sin Datos de Oferta Académica</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-muted-foreground">Carga un archivo Excel con la oferta académica para comenzar a planificar.</p></CardContent>
                </Card>
            )}
        </div>
    );
}

function SubjectSearchPopover({ allSubjects, onSubjectSelect, isOpen, onOpenChange }: { allSubjects: OfertaAcademicaItem[], onSubjectSelect: (subject: OfertaAcademicaItem) => void, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const [searchValue, setSearchValue] = useState("");

  const filteredSubjects = useMemo(() => {
    if (!searchValue) return [];
    const lowercasedFilter = searchValue.toLowerCase();
    return allSubjects.filter(subject => 
        subject.subjectName.toLowerCase().includes(lowercasedFilter) || 
        subject.crn.includes(lowercasedFilter)
    ).slice(0, 50);
  }, [searchValue, allSubjects]);

  const handleSelect = (subject: OfertaAcademicaItem) => {
    onSubjectSelect(subject);
    onOpenChange(false);
    setSearchValue('');
  };
  
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start" onClick={(e) => { e.preventDefault(); }}>
            <Search className="mr-2 h-4 w-4" />
            Buscar Materia por nombre o CRN...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar por nombre o CRN..." value={searchValue} onValueChange={setSearchValue} />
          <CommandEmpty>No se encontraron materias.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-72">
                {filteredSubjects.map((subject) => (
                <CommandItem key={subject.crn} onSelect={() => handleSelect(subject)}>
                    {subject.subjectName} ({subject.crn}) - {subject.professor}
                </CommandItem>
                ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

    

    

