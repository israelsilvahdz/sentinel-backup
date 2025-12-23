"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { parseOfertaAcademicaExcel } from '@/lib/excelParser';
import { Input } from '../ui/input';
import { Search, Info, Calendar, User, X, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { useDashboardFilters } from './DashboardClient';
import { StudentSearchPopover } from './BitacoraPanel';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import type { OfertaAcademicaItem, Student } from '@/types/student';


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

function isTimeOverlap(item1: OfertaAcademicaItem, item2: OfertaAcademicaItem): boolean {
    if (!item1.startTime || !item1.endTime || !item2.startTime || !item2.endTime) return false;
    
    const start1 = parseInt(item1.startTime.replace(':', ''), 10);
    const end1 = parseInt(item1.endTime.replace(':', ''), 10);
    const start2 = parseInt(item2.startTime.replace(':', ''), 10);
    const end2 = parseInt(item2.endTime.replace(':', ''), 10);

    // Overlap exists if one interval starts before the other ends, and vice-versa
    return start1 < end2 && start2 < end1;
}


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
    const { ofertaAcademica, setOfertaAcademica, allStudentsMap, loadStudentSubjects } = useDashboardFilters();
    const [ofertaFile, setOfertaFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [scheduleSubjects, setScheduleSubjects] = useState<OfertaAcademicaItem[]>([]);

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
    
    const handleStudentSelect = async (studentInfo: { id: string; name: string }) => {
        const student = allStudentsMap.get(studentInfo.id);
        if (student) {
            setSelectedStudent(student);
            const studentSubjects = await loadStudentSubjects(student.id);
            const studentCRNs = new Set(studentSubjects.map(s => s.id));
            const initialSchedule = ofertaAcademica.filter(item => studentCRNs.has(item.crn));
            setScheduleSubjects(initialSchedule);
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
        const grid: Record<string, OfertaAcademicaItem[]> = {};
        const clashMap = new Map<string, string[]>(); // Map CRN to list of CRNs it clashes with

        DAYS.forEach(day => {
            TIME_SLOTS.forEach(slot => {
                const key = `${day}-${slot}`;
                const itemsInSlot = scheduleSubjects.filter(item => isClassInSlot(item, slot, day));
                grid[key] = itemsInSlot;

                if (itemsInSlot.length > 1) {
                    for (let i = 0; i < itemsInSlot.length; i++) {
                        for (let j = i + 1; j < itemsInSlot.length; j++) {
                           if (itemsInSlot[i].days.some(d => itemsInSlot[j].days.includes(d)) && isTimeOverlap(itemsInSlot[i], itemsInSlot[j])) {
                                const crn1 = itemsInSlot[i].crn;
                                const crn2 = itemsInSlot[j].crn;
                                if (!clashMap.has(crn1)) clashMap.set(crn1, []);
                                if (!clashMap.has(crn2)) clashMap.set(crn2, []);
                                clashMap.get(crn1)!.push(crn2);
                                clashMap.get(crn2)!.push(crn1);
                           }
                        }
                    }
                }
            });
        });
        return { scheduleGrid: grid, clashes: clashMap };
    }, [scheduleSubjects]);


    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Planificador de Horarios</h1>
                    <p className="text-muted-foreground">Carga la oferta, selecciona un alumno y arma su horario para detectar empalmes.</p>
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Paso 1: Selecciona un Alumno</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4 items-center">
                            <StudentSearchPopover onStudentSelect={handleStudentSelect} />
                            {selectedStudent && (
                                 <p className="font-semibold text-primary">
                                    Horario base para: {selectedStudent.name}
                                 </p>
                            )}
                        </CardContent>
                    </Card>

                    {selectedStudent && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Paso 2: Modifica el Horario</CardTitle>
                                    <CardDescription>Añade materias de otros tetramestres o quita las que no se cursarán.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Label>Añadir materia al horario</Label>
                                     <SubjectSearchPopover allSubjects={ofertaAcademica} onSubjectSelect={addSubjectToSchedule} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Horario Simulado</CardTitle>
                                    <CardDescription>
                                        Las clases con borde rojo intermitente indican un empalme de horario.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
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
                                                    <div key={`${day}-${slot}`} className="p-1 border-t border-l min-h-[60px] space-y-1">
                                                        {scheduleGrid[`${day}-${slot}`]?.map(item => {
                                                            const isClashing = clashes.has(item.crn);
                                                            return (
                                                                <Card key={item.crn} className={cn("text-xs p-1.5 shadow-sm relative group", isClashing && "border-destructive animate-pulse")}>
                                                                    {isClashing && <AlertTriangle className="absolute top-1 left-1 h-3 w-3 text-destructive" />}
                                                                    <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeSubjectFromSchedule(item.crn)}>
                                                                        <X className="h-3 w-3 text-destructive"/>
                                                                    </Button>
                                                                    <p className="font-bold leading-tight pl-3">{item.subjectName}</p>
                                                                    <p className="text-muted-foreground">{item.professor}</p>
                                                                </Card>
                                                            )
                                                        })}
                                                    </div>
                                                ))}
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
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full md:w-[400px] justify-between">
          <User className="mr-2 h-4 w-4" /> Buscar materia por nombre o CRN...
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Escribe para buscar..." value={searchValue} onValueChange={setSearchValue} />
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
