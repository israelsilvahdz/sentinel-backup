
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
import { ScrollArea } from '../ui/scroll-area';
import { useDashboardFilters } from './DashboardClient';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import type { OfertaAcademicaItem } from '@/types/student';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


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
    isClashing: boolean;
}


function isClassInSlot(item: OfertaAcademicaItem, slot: string, day: string): boolean {
    if (!item.days.includes(day) || !item.startTime || !item.endTime) return false;
    const itemStart = parseInt(item.startTime.replace(':', ''), 10);
    const itemEnd = parseInt(item.endTime.replace(':', ''), 10);
    const slotStart = parseInt(slot.replace(':', ''), 10);
    
    // Asumimos que cada slot de tiempo dura hasta el inicio del siguiente
    const nextSlotIndex = TIME_SLOTS.indexOf(slot) + 1;
    const slotEnd = nextSlotIndex < TIME_SLOTS.length 
        ? parseInt(TIME_SLOTS[nextSlotIndex].replace(':', ''), 10)
        : slotStart + 100; // Asume 1 hora si es el último slot

    return itemStart < slotEnd && itemEnd > slotStart;
}

export function OfertaAcademicaPanel() {
    const { toast } = useToast();
    const { ofertaAcademica, setOfertaAcademica } = useDashboardFilters();
    const [ofertaFile, setOfertaFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [scheduleSubjects, setScheduleSubjects] = useState<OfertaAcademicaItem[]>([]);
    
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
    }, [toast, setOfertaAcademica]);
    
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

    const { scheduleGrid, clashes } = useMemo(() => {
        const clashMap = new Map<string, string[]>();
        for (let i = 0; i < scheduleSubjects.length; i++) {
            for (let j = i + 1; j < scheduleSubjects.length; j++) {
                const item1 = scheduleSubjects[i];
                const item2 = scheduleSubjects[j];
                const commonDays = item1.days.some(day => item2.days.includes(day));
                
                if (commonDays && isTimeOverlap(item1, item2)) {
                    if (!clashMap.has(item1.crn)) clashMap.set(item1.crn, []);
                    if (!clashMap.has(item2.crn)) clashMap.set(item2.crn, []);
                    clashMap.get(item1.crn)!.push(item2.crn);
                    clashMap.get(item2.crn)!.push(item1.crn);
                }
            }
        }
        
        const grid: Record<string, (ScheduleGridItem | null)[]> = {};
        DAYS.forEach(day => {
            grid[day] = Array(TIME_SLOTS.length).fill(null);
            const subjectsForDay = scheduleSubjects.filter(s => s.days.includes(day));

            subjectsForDay.forEach(subject => {
                const startIndex = TIME_SLOTS.findIndex(slot => isClassInSlot(subject, slot, day));
                if (startIndex === -1 || grid[day][startIndex] !== null) return;

                let endIndex = startIndex;
                while (endIndex + 1 < TIME_SLOTS.length && isClassInSlot(subject, TIME_SLOTS[endIndex + 1], day)) {
                    endIndex++;
                }
                const rowSpan = endIndex - startIndex + 1;

                grid[day][startIndex] = {
                    item: subject,
                    rowSpan: rowSpan,
                    isClashing: clashMap.has(subject.crn)
                };
                
                for (let i = startIndex + 1; i <= endIndex; i++) {
                    grid[day][i] = { item: subject, rowSpan: 0, isClashing: false }; 
                }
            });
        });
        
        return { scheduleGrid: grid, clashes: clashMap };
    }, [scheduleSubjects]);
    
    function isTimeOverlap(item1: OfertaAcademicaItem, item2: OfertaAcademicaItem): boolean {
        if (!item1.startTime || !item1.endTime || !item2.startTime || !item2.endTime) return false;
        
        const start1 = parseInt(item1.startTime.replace(':', ''), 10);
        const end1 = parseInt(item1.endTime.replace(':', ''), 10);
        const start2 = parseInt(item2.startTime.replace(':', ''), 10);
        const end2 = parseInt(item2.endTime.replace(':', ''), 10);

        return start1 < end2 && start2 < end1;
    }


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
                                <div className="flex items-center gap-4">
                                   <SubjectSearchPopover allSubjects={ofertaAcademica} onSubjectSelect={addSubjectToSchedule} />
                                   <Button onClick={() => document.querySelector<HTMLButtonElement>('[cmdk-input-wrapper] button')?.click()}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Añadir Materia
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {selectedGroup && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Horario Simulado</CardTitle>
                                    <CardDescription>
                                        Las clases con borde rojo intermitente indican un empalme de horario.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                <ScrollArea className="w-full h-[80vh] border rounded-lg">
                                    <div 
                                        className="grid grid-cols-[auto_repeat(5,1fr)]"
                                        style={{ gridTemplateRows: `auto repeat(${TIME_SLOTS.length}, minmax(60px, auto))`}}
                                    >
                                        <div className="p-2 bg-card sticky top-0 z-10 row-start-1"></div>
                                        {DAYS.map((day, i) => (
                                            <div key={day} className="p-2 text-center font-bold bg-card sticky top-0 z-10 border-b border-l row-start-1" style={{gridColumn: i + 2}}>{DAY_MAP[day]}</div>
                                        ))}
                                        
                                        {TIME_SLOTS.map((slot, i) => (
                                            <div key={slot} className="p-2 text-center text-xs font-mono bg-card border-r border-t sticky left-0" style={{ gridRow: i + 2 }}>{slot}</div>
                                        ))}

                                        {DAYS.map((day, dayIndex) => (
                                            <React.Fragment key={day}>
                                                {scheduleGrid[day]?.map((gridItem, slotIndex) => {
                                                    if (!gridItem) {
                                                         return <div key={`${day}-${slotIndex}`} className="p-1 border-t border-l min-h-[60px]" style={{ gridColumn: dayIndex + 2, gridRow: slotIndex + 2 }}></div>;
                                                    }
                                                    if (gridItem.rowSpan === 0) {
                                                        return null;
                                                    }
                                                    
                                                    const { item, rowSpan, isClashing } = gridItem;

                                                    return (
                                                        <div key={item.crn} className="p-1 border-t border-l" style={{ gridColumn: dayIndex + 2, gridRow: `${slotIndex + 2} / span ${rowSpan}` }}>
                                                            <Card className={cn("text-xs p-1.5 shadow-sm relative group h-full flex flex-col justify-center", isClashing && "border-destructive animate-pulse")}>
                                                                {isClashing && <AlertTriangle className="absolute top-1 left-1 h-3 w-3 text-destructive" />}
                                                                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeSubjectFromSchedule(item.crn)}>
                                                                    <X className="h-3 w-3 text-destructive"/>
                                                                </Button>
                                                                <p className="font-bold leading-tight">{item.subjectName}</p>
                                                                <p className="text-muted-foreground">{item.professor}</p>
                                                            </Card>
                                                        </div>
                                                    )
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Listado de Materias en Simulación</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[50vh]">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>CRN</TableHead><TableHead>Profesor</TableHead><TableHead>Horario</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {scheduleSubjects.map(item => (
                                                    <TableRow key={item.crn} className={cn(clashes.has(item.crn) && 'bg-destructive/10')}>
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
                                    </ScrollArea>
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

function SubjectSearchPopover({ allSubjects, onSubjectSelect }: { allSubjects: OfertaAcademicaItem[], onSubjectSelect: (subject: OfertaAcademicaItem) => void }) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredSubjects = useMemo(() => {
    if (!searchValue) return [];
    const lowercasedFilter = searchValue.toLowerCase();
    return allSubjects.filter(subject => 
        subject.subjectName.toLowerCase().includes(lowercasedFilter) || 
        subject.crn.includes(lowercasedFilter)
    ).slice(0, 50); // Limit results for performance
  }, [searchValue, allSubjects]);

  const handleSelect = (subject: OfertaAcademicaItem) => {
    onSubjectSelect(subject);
    setOpen(false);
    setSearchValue('');
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
            <Search className="mr-2 h-4 w-4" />
            Buscar Materia por nombre o CRN...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar por nombre o CRN..." value={searchValue} onValueChange={setSearchValue} />
          <CommandEmpty>No se encontraron materias.</CommandEmpty>
          <CommandGroup>
            {filteredSubjects.map((subject) => (
              <CommandItem key={subject.crn} onSelect={() => handleSelect(subject)}>
                {subject.subjectName} ({subject.crn}) - {subject.professor}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
