

"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Subject, type ProfessorContact, type Student, type StudentContact } from '@/types/student';
import { Contact, Search, Copy, Mail, CalendarDays, Edit, Save, XCircle, PlusCircle, User, Printer, Award, ClipboardCopy } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { addOrUpdateProfessorContact } from '@/lib/firebase-services';
import { FileUpload } from './FileUpload';
import { parseProfessorDirectoryExcel } from '@/lib/excelParser';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { Calendar } from '../ui/calendar';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';


interface ProfessorClass {
  subjectName: string;
  group: string;
  days: string[];
  time: string;
  studentCount: number;
}

const getProfessorId = (name: string): string => {
    return name.toLowerCase().replace(/\s+/g, '');
}

function ProfessorSearchPopover({ professorList, onProfessorSelect, selectedProfessorName }: { professorList: string[], onProfessorSelect: (name: string | null) => void, selectedProfessorName: string | null }) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    const filteredProfessors = useMemo(() => {
        if (!searchValue) return professorList;
        const lowercasedFilter = searchValue.toLowerCase();
        return professorList.filter(prof => prof.toLowerCase().includes(lowercasedFilter));
    }, [searchValue, professorList]);

    const handleSelect = (profName: string) => {
        onProfessorSelect(profName);
        setOpen(false);
    };
    
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full md:w-[300px] justify-between">
                   {selectedProfessorName ? <><User className="mr-2 h-4 w-4" />{selectedProfessorName}</> : "Elige un profesor..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Escribe para buscar..." value={searchValue} onValueChange={setSearchValue} />
                    <CommandEmpty>No se encontraron profesores.</CommandEmpty>
                    <CommandGroup>
                        {filteredProfessors.slice(0, 100).map((prof) => (
                            <CommandItem key={prof} onSelect={() => handleSelect(prof)}>
                                {prof}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// JS getDay() -> 0:Dom, 1:Lun, 2:Mar, 3:Mie, 4:Jue, 5:Vie, 6:Sab
const DATE_FNS_DAY_TO_KEY: Record<number, string> = {
    1: 'LUN',
    2: 'MAR',
    3: 'MIER',
    4: 'JUE',
    5: 'VIER',
};


function AthleteNotificationDialog({ students, sports }: { students: Student[], sports: string[] }) {
    const { loadStudentSubjects, professorContacts } = useDashboardFilters();
    const { toast } = useToast();
    const [selectedSport, setSelectedSport] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [reason, setReason] = useState("Competencia Deportiva");
    const [notes, setNotes] = useState("");
    const [teachers, setTeachers] = useState<{name: string, email: string | null}[]>([]);

    const filteredAthletes = useMemo(() => {
        if (selectedSport === 'all') return students;
        return students.filter(s => s.sport === selectedSport);
    }, [students, selectedSport]);


    useEffect(() => {
        const findTeachers = async () => {
            if (!dateRange?.from || filteredAthletes.length === 0) {
                setTeachers([]);
                return;
            }

            const affectedDays = new Set<string>();
            const start = dateRange.from;
            const end = dateRange.to || start;

            let currentDate = start;
            while (currentDate <= end) {
                const dayOfWeek = currentDate.getDay();
                if (DATE_FNS_DAY_TO_KEY[dayOfWeek]) {
                    affectedDays.add(DATE_FNS_DAY_TO_KEY[dayOfWeek]);
                }
                currentDate = new Date(currentDate.valueOf() + 86400000);
            }

            const uniqueTeachers = new Map<string, {name: string, email: string | null}>();
            
            for (const student of filteredAthletes) {
                const studentSubjects = await loadStudentSubjects(student.id);
                const classesOnAffectedDays = studentSubjects.filter(subject =>
                    subject.professorName &&
                    subject.schedule?.days.some(day => affectedDays.has(day))
                );

                classesOnAffectedDays.forEach(subject => {
                    if (!uniqueTeachers.has(subject.professorName!)) {
                        const normalizedId = subject.professorName!.toLowerCase().replace(/\s+/g, '');
                        const email = professorContacts[normalizedId]?.email || null;
                        uniqueTeachers.set(subject.professorName!, { name: subject.professorName!, email });
                    }
                });
            }
            setTeachers(Array.from(uniqueTeachers.values()));
        };

        findTeachers();
    }, [dateRange, filteredAthletes, loadStudentSubjects, professorContacts]);

    const generateMailto = () => {
        if (teachers.length === 0 || !dateRange?.from) {
            toast({ variant: "destructive", title: "Faltan datos", description: "Selecciona un deporte, un rango de fechas y asegúrate de que haya profesores." });
            return;
        }

        let dateText;
        if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
            dateText = `del ${format(dateRange.from, "d 'de' LLLL", { locale: es })} al ${format(dateRange.to, "d 'de' LLLL 'de' yyyy", { locale: es })}`;
        } else {
            dateText = `el día ${format(dateRange.from, "EEEE d 'de' LLLL 'de' yyyy", { locale: es })}`;
        }
        
        const studentNames = filteredAthletes.map(s => s.name).join(', ');
        
        let body = `Estimados profesores,\n\n`;
        body += `Les notifico que los siguientes alumnos se ausentarán ${dateText} por motivo de: ${reason}.\n\n`;
        body += `Alumnos: ${studentNames}\n\n`;
        if (notes) {
            body += `Notas adicionales: ${notes}\n\n`;
        }
        body += `Agradezco de antemano su apoyo y comprensión.\n\nSaludos cordiales,`;

        const recipients = teachers.map(t => t.email).filter(Boolean).join(',');
        const subject = `Notificación de Ausencia por Competencia Deportiva`;
        
        return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Notificar Ausencia de Atletas</DialogTitle>
                <DialogDescription>
                    Genera un correo para notificar a los profesores sobre la ausencia de los atletas seleccionados.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="flex flex-col items-center space-y-4">
                     <div className="w-full space-y-2">
                        <Label htmlFor="sport-select" className="font-semibold">1. Selecciona el Deporte</Label>
                        <Select value={selectedSport} onValueChange={setSelectedSport}>
                            <SelectTrigger id="sport-select">
                                <SelectValue placeholder="Seleccionar deporte..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los deportes</SelectItem>
                                {sports.map(sport => <SelectItem key={sport} value={sport}>{sport}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Label className="font-semibold pt-4">2. Selecciona el rango de fechas</Label>
                    <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={es}
                    />
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">3. Motivo</Label>
                        <RadioGroup id="reason" value={reason} onValueChange={setReason} className="mt-2">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Competencia Deportiva" id="r1" /><Label htmlFor="r1">Competencia Deportiva</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Otro" id="r2" /><Label htmlFor="r2">Otro (especificar en notas)</Label></div>
                        </RadioGroup>
                    </div>
                    <div>
                        <Label htmlFor="notes">4. Notas Adicionales (Opcional)</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. El torneo es en la ciudad de..." />
                    </div>
                    <div>
                        <Label className="font-semibold">5. Profesores a Notificar</Label>
                        <Card className="mt-2 p-3 bg-muted/50 max-h-48 overflow-y-auto">
                            {teachers.length > 0 ? (
                                <ul className="text-sm list-disc list-inside">
                                    {teachers.map(t => (
                                        <li key={t.name}>{t.name} {!t.email && <span className="text-destructive text-xs">(Sin correo)</span>}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">Selecciona un deporte y fecha para ver los profesores.</p>
                            )}
                        </Card>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => {
                            const link = generateMailto();
                            if (link) {
                                navigator.clipboard.writeText(link);
                                toast({ title: "Enlace copiado", description: "Pega el enlace en tu navegador para abrir el correo." });
                            }
                        }}> <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar Enlace</Button>
                        <Button onClick={() => {
                            const link = generateMailto();
                            if (link) window.location.href = link;
                        }}> <Mail className="mr-2 h-4 w-4" /> Abrir en App de Correo</Button>
                    </div>
                </div>
            </div>
        </DialogContent>
    );
}

export function ProfessorSchedulePanel() {
  const { allStudents, filteredStudents, isLoading, selectedValue, professorContacts, setProfessorContacts, athletes } = useDashboardFilters();
  const [selectedProfessorName, setSelectedProfessorName] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');
  const [directoryFile, setDirectoryFile] = useState<File | null>(null);
  const [isProcessingDirectory, setIsProcessingDirectory] = useState(false);

  const { toast } = useToast();

  const handleDirectoryUpload = useCallback(async (file: File | null) => {
    if (!file) {
      setDirectoryFile(null);
      return;
    }
    setDirectoryFile(file);
    setIsProcessingDirectory(true);
    try {
      const contacts = await parseProfessorDirectoryExcel(file);
      if (contacts) {
        setProfessorContacts(prev => ({ ...prev, ...contacts }));
        toast({
          title: "Directorio de Profesores Guardado",
          description: `Se procesaron y guardaron ${Object.keys(contacts).length} contactos en la base de datos.`,
        });
      } else {
        throw new Error("El archivo no tiene el formato esperado o está vacío.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar directorio de profesores",
        description: error.message || "No se pudo procesar el archivo Excel.",
      });
    } finally {
      setIsProcessingDirectory(false);
      setDirectoryFile(null);
    }
  }, [setProfessorContacts, toast]);


  const professorList = useMemo(() => {
    const studentSource = selectedValue ? filteredStudents : allStudents;
    const professors = new Set<string>();
    studentSource.forEach(student => {
        student.subjects?.forEach(subject => {
            if (subject.professorName) {
                professors.add(subject.professorName);
            }
        });
    });
    return Array.from(professors).sort();
  }, [allStudents, filteredStudents, selectedValue]);


  const professorSchedule = useMemo(() => {
    if (!selectedProfessorName || !allStudents) {
      return [];
    }

    const classesMap = new Map<string, ProfessorClass>();

    allStudents.forEach(student => {
      student.subjects?.forEach(subject => {
        if (subject.professorName === selectedProfessorName && subject.schedule) {
          const classKey = `${subject.name}-${subject.group}-${subject.schedule.startTime || 'N/A'}`;
          
          if (classesMap.has(classKey)) {
            const existingClass = classesMap.get(classKey)!;
            existingClass.studentCount++;
          } else {
            classesMap.set(classKey, {
              subjectName: subject.name,
              group: subject.group,
              days: subject.schedule.days || [],
              time: subject.schedule.startTime ? `${subject.schedule.startTime} - ${subject.schedule.endTime}`: 'N-A',
              studentCount: 1,
            });
          }
        }
      });
    });

    return Array.from(classesMap.values());
  }, [selectedProfessorName, allStudents]);

  const selectedProfessorId = selectedProfessorName ? getProfessorId(selectedProfessorName) : null;
  const professorEmail = selectedProfessorId ? professorContacts[selectedProfessorId]?.email : null;

  useEffect(() => {
    if (professorEmail) {
        setEditedEmail(professorEmail);
    } else {
        setEditedEmail('');
    }
  }, [professorEmail]);
  
  const handleCopyEmails = () => {
    let professorsToGetEmailsFrom = professorList;

    if (selectedDay !== 'all') {
        const professorsForDay = new Set<string>();
        allStudents.forEach(student => {
            student.subjects?.forEach(subject => {
                if (subject.professorName && 
                    professorList.includes(subject.professorName) && 
                    subject.schedule?.days.includes(selectedDay)) 
                {
                    professorsForDay.add(subject.professorName);
                }
            });
        });
        professorsToGetEmailsFrom = Array.from(professorsForDay);
    }
    
    const emails = professorsToGetEmailsFrom
      .map(prof => professorContacts[getProfessorId(prof)]?.email)
      .filter(Boolean);

    if (emails.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin correos',
        description: 'No se encontraron correos para los filtros seleccionados.',
      });
      return;
    }

    navigator.clipboard.writeText(emails.join(', ')).then(() => {
      toast({
        title: '¡Correos copiados!',
        description: `Se han copiado ${emails.length} direcciones de correo al portapapeles.`,
      });
    });
  };
  
  const handleSaveEmail = async () => {
    if (!selectedProfessorId || !selectedProfessorName) return;

    const newContact: ProfessorContact = {
        id: selectedProfessorId,
        name: selectedProfessorName,
        email: editedEmail,
    };
    
    try {
        await addOrUpdateProfessorContact(newContact);
        setProfessorContacts(prev => ({ ...prev, [selectedProfessorId]: newContact }));
        toast({ title: 'Éxito', description: 'El correo del profesor ha sido actualizado.' });
        setIsEditing(false);
    } catch(error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el correo.' });
    }
  };

  const athleteStudents = useMemo(() => allStudents.filter(s => s.sport), [allStudents]);
  const sportList = useMemo(() => Array.from(new Set(athleteStudents.map(s => s.sport!))), [athleteStudents]);

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Horarios de Profesores</h1>
        <p className="text-muted-foreground">
          Selecciona un profesor para ver su horario de clases, número de alumnos y gestionar su información de contacto.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Seleccionar Profesor y Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <ProfessorSearchPopover 
            professorList={professorList}
            onProfessorSelect={setSelectedProfessorName}
            selectedProfessorName={selectedProfessorName}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los días</SelectItem>
                    <SelectItem value="LUN">Lunes</SelectItem>
                    <SelectItem value="MAR">Martes</SelectItem>
                    <SelectItem value="MIER">Miércoles</SelectItem>
                    <SelectItem value="JUE">Jueves</SelectItem>
                    <SelectItem value="VIER">Viernes</SelectItem>
                </SelectContent>
            </Select>
            <Button onClick={handleCopyEmails} variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Copiar Correos
            </Button>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={athleteStudents.length === 0}>
                        <Mail className="mr-2 h-4 w-4"/> Notificar Ausencia de Atletas
                    </Button>
                </DialogTrigger>
                <AthleteNotificationDialog students={athleteStudents} sports={sportList} />
            </Dialog>
            <FileUpload
              onFileSelect={handleDirectoryUpload}
              selectedFile={directoryFile}
              isLoading={isProcessingDirectory}
              label="Cargar Directorio de Profes"
              icon={<Contact />}
              variant="secondary"
            />
          </div>
        </CardContent>
      </Card>

      {selectedProfessorName && (
        <Card>
          <CardHeader>
            <CardTitle>Horario de {selectedProfessorName}</CardTitle>
             <div className="flex items-center gap-2 pt-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                   <Input 
                     type="email" 
                     value={editedEmail} 
                     onChange={(e) => setEditedEmail(e.target.value)} 
                     placeholder="correo@ejemplo.com"
                     className="max-w-xs"
                    />
                    <Button size="sm" onClick={handleSaveEmail}><Save className="mr-2 h-4 w-4"/> Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}><XCircle className="mr-2 h-4 w-4"/> Cancelar</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">{professorEmail || 'No disponible'}</span>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setIsEditing(true)}>
                    {professorEmail ? <Edit className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                    {professorEmail ? 'Editar' : 'Añadir Correo'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {professorSchedule.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Materia</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead className="text-right">Alumnos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professorSchedule.map((c, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{c.subjectName}</TableCell>
                      <TableCell>{c.group}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.days.map(day => <Badge key={day} variant="secondary">{day}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>{c.time}</TableCell>
                      <TableCell className="text-right">{c.studentCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No se encontraron clases para este profesor.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
