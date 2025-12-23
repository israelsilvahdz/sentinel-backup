
"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
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

const HOUR_HEIGHT = 60; // 60px por hora
const START_HOUR = 7;
const END_HOUR = 18;

// --- New Schedule Viewer Components ---

interface TimeBlock {
    item: OfertaAcademicaItem;
    top: number;
    height: number;
    width: number;
    left: number;
    isConflict: boolean;
}

const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToPosition = (minutes: number): number => {
    return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
};


function ScheduleVisualizer({ subjects }: { subjects: OfertaAcademicaItem[] }) {
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let i = START_HOUR; i < END_HOUR; i++) {
            slots.push(`${String(i).padStart(2, '0')}:00`);
        }
        return slots;
    }, []);

    const dailyBlocks = useMemo(() => {
        const blocksByDay: Record<string, TimeBlock[]> = {};

        DAYS.forEach(day => {
            const daySubjects = subjects
                .filter(s => s.days.includes(day) && s.startTime && s.endTime)
                .sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!));

            const timeBlocks: TimeBlock[] = [];
            
            daySubjects.forEach(subject => {
                const startMinutes = timeToMinutes(subject.startTime!);
                const endMinutes = timeToMinutes(subject.endTime!);
                const duration = endMinutes - startMinutes;
                
                timeBlocks.push({
                    item: subject,
                    top: minutesToPosition(startMinutes),
                    height: (duration / 60) * HOUR_HEIGHT,
                    width: 100, // Default width, will be adjusted for conflicts
                    left: 0,
                    isConflict: false
                });
            });

            // --- Conflict Detection and Positioning ---
            for (let i = 0; i < timeBlocks.length; i++) {
                let conflicts: number[] = [i];
                for (let j = i + 1; j < timeBlocks.length; j++) {
                    // Check for overlap
                    if (timeBlocks[i].top < (timeBlocks[j].top + timeBlocks[j].height) && (timeBlocks[i].top + timeBlocks[i].height) > timeBlocks[j].top) {
                       conflicts.push(j);
                    }
                }
                
                if (conflicts.length > 1) {
                    const groupWidth = 100 / conflicts.length;
                    conflicts.forEach((blockIndex, conflictIndex) => {
                        timeBlocks[blockIndex].width = groupWidth;
                        timeBlocks[blockIndex].left = conflictIndex * groupWidth;
                        timeBlocks[blockIndex].isConflict = true;
                    });
                }
            }

            blocksByDay[day] = timeBlocks;
        });

        return blocksByDay;
    }, [subjects]);


    return (
        <div className="overflow-x-auto">
            <div className="grid grid-cols-[auto_1fr] min-w-[800px]">
                {/* Time Ruler */}
                <div className="relative">
                    {timeSlots.map((time, index) => (
                        <div key={time} className="h-[60px] text-right pr-2">
                             <span className="text-xs -translate-y-1/2 relative top-0 text-muted-foreground font-mono">{time}</span>
                        </div>
                    ))}
                </div>

                {/* Schedule Grid */}
                <div className="grid grid-cols-5 relative">
                     {/* Background lines */}
                    {timeSlots.map(time => (
                        <div key={`line-${time}`} className="col-span-5 h-[60px] border-t border-muted"></div>
                    ))}
                    {DAYS.map((day, dayIndex) => (
                         <div key={day} className="absolute inset-0 grid grid-cols-5">
                             <div className="relative" style={{ gridColumn: dayIndex + 1 }}>
                                 {dailyBlocks[day]?.map(block => (
                                    <div 
                                        key={block.item.crn}
                                        className={cn(
                                            "absolute rounded-lg p-2 text-white shadow-md transition-all duration-300",
                                            block.isConflict ? 'bg-destructive/80 border-2 border-destructive-foreground' : 'bg-primary/80'
                                        )}
                                        style={{
                                            top: `${block.top}px`,
                                            height: `${block.height}px`,
                                            width: `${block.width}%`,
                                            left: `${block.left}%`,
                                        }}
                                    >
                                        <p className="font-bold text-xs leading-tight">{block.item.subjectName}</p>
                                        <p className="text-xs opacity-80">{block.item.professor}</p>
                                        <p className="text-xs opacity-80 font-mono">{block.item.startTime} - {block.item.endTime}</p>
                                    </div>
                                 ))}
                             </div>
                         </div>
                    ))}
                     <div className="col-span-5 grid grid-cols-5 h-full">
                        {DAYS.map(day => <div key={`border-${day}`} className="border-l border-muted"></div>)}
                    </div>
                </div>
            </div>
            {/* Day Headers */}
            <div className="grid grid-cols-[auto_1fr] min-w-[800px] mt-2">
                <div />
                <div className="grid grid-cols-5">
                    {DAYS.map(day => (
                        <div key={`header-${day}`} className="text-center font-bold text-primary">{DAY_MAP[day]}</div>
                    ))}
                </div>
            </div>
        </div>
    );
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
                                        Los bloques de clase se posicionan y dimensionan según su horario. Los empalmes se muestran uno al lado del otro en rojo.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                   <ScheduleVisualizer subjects={scheduleSubjects} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Listado de Materias en Simulación</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-72">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>CRN</TableHead><TableHead>Profesor</TableHead><TableHead>Horario</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
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
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSubjectFromSchedule(item.crn)}>
                                                                <X className="h-4 w-4 text-destructive" />
                                                            </Button>
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
