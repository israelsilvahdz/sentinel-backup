
"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Loader2, X, Search, ClipboardCopy, Check, Contact, Printer, Award, Mail, Download, Send, AlertTriangle, FileWarning, Eye, Zap, Filter, ListChecks, FileText, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { StudentCard } from './StudentCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Student, StudentContact, Subject, Team, SubjectSummary } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileUpload } from './FileUpload';
import { parseDirectoryExcel, parseAthletesExcel, parseStudentLifeSurveyExcel } from '@/lib/excelParser';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { curriculum } from '@/lib/curriculum';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '../ui/calendar';
import type { DateRange } from 'react-day-picker';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { StudentReportImage } from './StudentReportImage';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';


// JS getDay() -> 0:Dom, 1:Lun, 2:Mar, 3:Mie, 4:Jue, 5:Vie, 6:Sab
const DATE_FNS_DAY_TO_KEY: Record<number, string> = {
    1: 'LUN',
    2: 'MAR',
    3: 'MIER',
    4: 'JUE',
    5: 'VIER',
};

type ProfessorContactMap = Record<string, { name: string; email: string }>;
type AbsenceMode = 'full-day' | 'partial';
type AffectedClass = {
    key: string;
    day: string;
    subjectName: string;
    group: string;
    time: string;
    professorName: string;
    email: string | null;
};

function normalizeProfessorLookupId(name: string): string {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function resolveProfessorEmail(professorName: string, contacts: ProfessorContactMap): string | null {
    const directCandidates = [
        professorName.toLowerCase().replace(/\s+/g, ''),
        normalizeProfessorLookupId(professorName),
    ];

    for (const candidate of directCandidates) {
        const directMatch = contacts[candidate];
        if (directMatch?.email) return directMatch.email;
    }

    const normalizedTarget = normalizeProfessorLookupId(professorName);
    const fallbackMatch = Object.values(contacts).find(contact =>
        normalizeProfessorLookupId(contact.name || '') === normalizedTarget
    );

    return fallbackMatch?.email || null;
}

function getAffectedDaysFromRange(dateRange: DateRange | undefined): Set<string> {
    const affectedDays = new Set<string>();
    if (!dateRange?.from) return affectedDays;

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

    return affectedDays;
}

function isSingleDayRange(dateRange: DateRange | undefined): boolean {
    return !!dateRange?.from && (!dateRange.to || dateRange.from.toDateString() === dateRange.to.toDateString());
}

function normalizeSpreadsheetHeader(header: unknown): string {
    return String(header || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function findStudentIdColumnIndex(headers: unknown[]): number {
    const normalizedHeaders = headers.map(normalizeSpreadsheetHeader);
    const exactMatches = ['MATRICULA', 'ID', 'ALUMNO'];

    for (const candidate of exactMatches) {
        const exactIndex = normalizedHeaders.findIndex(header => header === candidate);
        if (exactIndex !== -1) return exactIndex;
    }

    const partialIndex = normalizedHeaders.findIndex(header =>
        header.includes('MATRICULA') || header.includes('ID') || header.includes('ALUMNO')
    );

    return partialIndex;
}

function findStudentNameColumnIndex(headers: unknown[]): number {
    const normalizedHeaders = headers.map(normalizeSpreadsheetHeader);
    const exactMatches = ['NOMBRE DEL ALUMNO', 'NOMBRE ALUMNO', 'NOMBRE', 'NAME'];

    for (const candidate of exactMatches) {
        const exactIndex = normalizedHeaders.findIndex(header => header === candidate);
        if (exactIndex !== -1) return exactIndex;
    }

    const partialIndex = normalizedHeaders.findIndex(header =>
        header.includes('NOMBRE') || header.includes('NAME')
    );

    return partialIndex;
}


const onlineFlexSubjects = new Set(
    curriculum.flatMap(term => term.courses.filter(c => c.isFlexible).map(c => c.name))
);
onlineFlexSubjects.add('Ciencias de la Vida');
onlineFlexSubjects.add('El mundo contemporáneo');


function AthleteNotificationDialog({ students, teams, filterType, selectedLeader }: { students: Student[], teams: Team[], filterType: string | null, selectedLeader: string | null }) {
    const { loadStudentSubjects, professorContacts } = useDashboardFilters();
    const { toast } = useToast();
    const [selectedSport, setSelectedSport] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [reason, setReason] = useState("Competencia Deportiva");
    const [notes, setNotes] = useState("");
    const [teachers, setTeachers] = useState<{name: string, email: string | null}[]>([]);
    const [affectedClasses, setAffectedClasses] = useState<AffectedClass[]>([]);
    const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([]);
    const [absenceMode, setAbsenceMode] = useState<AbsenceMode>('full-day');
    const [filterByLeader, setFilterByLeader] = useState(false);

    const sportList = useMemo(() => Array.from(new Set(teams.map(team => team.name))), [teams]);

    const filteredAthletes = useMemo(() => {
        let tempAthletes = students;
        if (filterByLeader && selectedLeader) {
            tempAthletes = tempAthletes.filter(s => s.leader === selectedLeader);
        }
        if (selectedSport === 'all') return tempAthletes;
        
        return tempAthletes.filter(s => {
            return teams.some(team => team.name === selectedSport && Array.isArray(team.members) && team.members.some(member => member.id === s.id));
        });
    }, [students, teams, selectedSport, filterByLeader, selectedLeader]);


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

    const generateEmailContent = () => {
        if (teachers.length === 0 || !dateRange?.from) {
            toast({ variant: "destructive", title: "Faltan datos", description: "Selecciona un deporte, un rango de fechas y asegúrate de que haya profesores." });
            return null;
        }
        
        let dateText;
        if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
            dateText = `del ${format(dateRange.from, "d 'de' LLLL", { locale: es })} al ${format(dateRange.to, "d 'de' LLLL 'de' yyyy", { locale: es })}`;
        } else {
            dateText = `el día ${format(dateRange.from, "EEEE, d 'de' LLLL 'de' yyyy", { locale: es })}`;
        }

        const sortedAthletes = [...filteredAthletes].sort((a, b) => a.name.localeCompare(b.name));
        
        const studentsListText = sortedAthletes.map(s => s.name).join(', ');

        const studentsTableRows = sortedAthletes.map(s => {
            const regularGroups = Array.from(
                new Set(
                    s.subjectSummaries
                        ?.filter(sub => sub.group && !sub.group.startsWith('10') && !sub.group.toUpperCase().startsWith('F') && !onlineFlexSubjects.has(sub.name))
                        .map(sub => sub.group) || []
                )
            ).join(', ');
            return `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${s.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${s.id}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${regularGroups}</td>
                </tr>
            `;
        }).join('');

        const studentsTableHtml = `
            <table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Nombre Completo</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Matrícula</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Grupos Regulares</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentsTableRows}
                </tbody>
            </table>
        `;
        
        const recipientsWithEmail = teachers.filter(t => t.email);
        const recipientsWithoutEmail = teachers.filter(t => !t.email);

        const recipients = recipientsWithEmail.map(t => t.email).join(',');
        const subject = `Notificación de Ausencia por ${reason}`;
        
        const mailtoBody = `Estimados profesores,\n\nLes notifico que los siguientes alumnos se ausentarán por motivo de "${reason}" ${dateText}.\n\nAlumnos: ${studentsListText}.\n\n${notes ? `Notas adicionales: ${notes}\n\n` : ''}Si desean una tabla más detallada con matrículas y grupos, pueden reemplazar la lista de alumnos pegando la tabla que se ha copiado al portapapeles.\n\nSaludos cordiales,`;

        return { recipients, subject, bodyHtml: studentsTableHtml, mailtoBody, recipientsWithoutEmail };
    };

    const handleCopyToClipboard = async () => {
        const content = generateEmailContent();
        if (!content) return;

        try {
            const blob = new Blob([content.bodyHtml], { type: 'text/html' });
            const data = [new ClipboardItem({ [blob.type]: blob })];
            await navigator.clipboard.write(data);
            
            toast({ 
                title: "Tabla Copiada", 
                description: "La tabla con los alumnos está en tu portapapeles. Pégala en tu correo para un mejor formato." 
            });

        } catch (err) {
            console.error('Failed to copy HTML table: ', err);
            toast({
                variant: 'destructive',
                title: "Error al Copiar",
                description: "Tu navegador no es compatible para copiar tablas. Usa el botón de abrir correo."
            });
        }
    };
    
    const handleOpenMail = async () => {
        const content = generateEmailContent();
        if (!content) return;
        const { recipients, subject, mailtoBody, recipientsWithoutEmail } = content;

        if (recipientsWithoutEmail.length > 0) {
            const namesToCopy = recipientsWithoutEmail.map(t => t.name).join('\n');
            try {
                await navigator.clipboard.writeText(namesToCopy);
                toast({
                    title: "Nombres Copiados",
                    description: `Se copiaron los nombres de ${recipientsWithoutEmail.length} profesores sin correo para que los busques manualmente.`,
                });
            } catch (err) {
                console.error("Failed to copy names:", err);
                toast({
                    variant: 'destructive',
                    title: "Error al copiar nombres",
                    description: "No se pudieron copiar los nombres de los profesores."
                });
            }
        }
        
        window.open(`mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`, '_blank');
    }


    return (
        <DialogContent className="sm:max-w-3xl rounded-3xl">
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
                            <SelectTrigger id="sport-select" className="rounded-xl">
                                <SelectValue placeholder="Seleccionar deporte..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">Todos los deportes</SelectItem>
                                {sportList.map(sport => <SelectItem key={sport} value={sport}>{sport}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {filterType === 'leader' && selectedLeader && (
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="filter-by-leader" checked={filterByLeader} onCheckedChange={(checked) => setFilterByLeader(!!checked)} />
                                <Label htmlFor="filter-by-leader">Filtrar solo por mi líder seleccionado ({selectedLeader})</Label>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground pt-2">
                            <span className="font-bold text-primary">{filteredAthletes.length}</span> alumno(s) seleccionado(s).
                        </p>
                    </div>
                    <Label className="font-semibold pt-4">2. Selecciona el rango de fechas</Label>
                    <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={es}
                        classNames={{
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
                            day_range_start: "day-range-start rounded-l-xl",
                            day_range_end: "day-range-end rounded-r-xl",
                            day_range_middle: "bg-primary/10 text-primary",
                        }}
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
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. El torneo es en la ciudad de..." className="rounded-xl" />
                    </div>
                    <div>
                        <Label className="font-semibold">5. Profesores a Notificar</Label>
                        <Card className="mt-2 p-3 bg-muted/30 border-none rounded-xl max-h-48 overflow-y-auto">
                            {teachers.length > 0 ? (
                                <ul className="text-sm list-disc list-inside space-y-1">
                                    {teachers.map(t => (
                                        <li key={t.name} className="text-muted-foreground"><span className="text-foreground font-medium">{t.name}</span> {!t.email && <span className="text-destructive text-[10px] font-black uppercase">(Sin correo)</span>}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-4 italic">Selecciona un deporte y fecha para ver los profesores.</p>
                            )}
                        </Card>
                    </div>
                    <DialogFooter className="pt-4 gap-2">
                         <Button variant="outline" onClick={handleCopyToClipboard} className="rounded-xl font-bold">
                            <ClipboardCopy className="mr-2 h-4 w-4" />
                            Copiar Tabla
                        </Button>
                        <Button onClick={handleOpenMail} className="rounded-xl font-bold">
                           <Mail className="mr-2 h-4 w-4" />
                           Abrir Correo
                        </Button>
                    </DialogFooter>
                </div>
            </div>
        </DialogContent>
    );
}

function AthleteNotificationDialogV2({ students, teams, filterType, selectedLeader }: { students: Student[], teams: Team[], filterType: string | null, selectedLeader: string | null }) {
    const { loadStudentSubjects, professorContacts } = useDashboardFilters();
    const { toast } = useToast();
    const [selectedSport, setSelectedSport] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [reason, setReason] = useState("Competencia Deportiva");
    const [notes, setNotes] = useState("");
    const [absenceMode, setAbsenceMode] = useState<AbsenceMode>('full-day');
    const [teachers, setTeachers] = useState<{ name: string; email: string | null }[]>([]);
    const [affectedClasses, setAffectedClasses] = useState<AffectedClass[]>([]);
    const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([]);
    const [filterByLeader, setFilterByLeader] = useState(false);

    const sportList = useMemo(() => Array.from(new Set(teams.map(team => team.name))), [teams]);

    const filteredAthletes = useMemo(() => {
        let tempAthletes = students;
        if (filterByLeader && selectedLeader) {
            tempAthletes = tempAthletes.filter(s => s.leader === selectedLeader);
        }
        if (selectedSport === 'all') return tempAthletes;

        return tempAthletes.filter(s =>
            teams.some(team => team.name === selectedSport && Array.isArray(team.members) && team.members.some(member => member.id === s.id))
        );
    }, [students, teams, selectedSport, filterByLeader, selectedLeader]);

    useEffect(() => {
        const findTeachersAndClasses = async () => {
            if (!dateRange?.from || filteredAthletes.length === 0) {
                setTeachers([]);
                setAffectedClasses([]);
                setSelectedClassKeys([]);
                return;
            }

            const affectedDays = getAffectedDaysFromRange(dateRange);
            const uniqueTeachers = new Map<string, { name: string; email: string | null }>();
            const classesMap = new Map<string, AffectedClass>();

            for (const student of filteredAthletes) {
                const studentSubjects = await loadStudentSubjects(student.id);

                studentSubjects.forEach(subject => {
                    if (!subject.professorName || !subject.schedule?.days?.length) return;

                    const matchingDays = subject.schedule.days.filter(day => affectedDays.has(day));
                    if (matchingDays.length === 0) return;

                    const email = resolveProfessorEmail(subject.professorName, professorContacts as ProfessorContactMap);
                    if (!uniqueTeachers.has(subject.professorName)) {
                        uniqueTeachers.set(subject.professorName, { name: subject.professorName, email });
                    }

                    matchingDays.forEach(day => {
                        const time = subject.schedule?.startTime
                            ? `${subject.schedule.startTime}${subject.schedule.endTime ? ` - ${subject.schedule.endTime}` : ''}`
                            : 'Horario no definido';
                        const classKey = [day, time, subject.name, subject.group, subject.professorName].join('||');

                        if (!classesMap.has(classKey)) {
                            classesMap.set(classKey, {
                                key: classKey,
                                day,
                                subjectName: subject.name,
                                group: subject.group,
                                time,
                                professorName: subject.professorName,
                                email,
                            });
                        }
                    });
                });
            }

            setTeachers(Array.from(uniqueTeachers.values()).sort((a, b) => a.name.localeCompare(b.name)));
            setAffectedClasses(
                Array.from(classesMap.values()).sort((a, b) =>
                    `${a.day}-${a.time}-${a.subjectName}`.localeCompare(`${b.day}-${b.time}-${b.subjectName}`)
                )
            );
            setSelectedClassKeys(previous => previous.filter(key => classesMap.has(key)));
        };

        findTeachersAndClasses();
    }, [dateRange, filteredAthletes, loadStudentSubjects, professorContacts]);

    useEffect(() => {
        if (absenceMode !== 'partial') return;

        if (!isSingleDayRange(dateRange)) {
            setSelectedClassKeys([]);
            return;
        }

        setSelectedClassKeys(previous => {
            if (previous.length > 0) {
                return previous.filter(key => affectedClasses.some(item => item.key === key));
            }
            return affectedClasses.map(item => item.key);
        });
    }, [absenceMode, dateRange, affectedClasses]);

    const selectedPartialClasses = useMemo(
        () => affectedClasses.filter(item => selectedClassKeys.includes(item.key)),
        [affectedClasses, selectedClassKeys]
    );

    const selectedTeachers = useMemo(() => {
        if (absenceMode === 'full-day') return teachers;

        const partialTeachers = new Map<string, { name: string; email: string | null }>();
        selectedPartialClasses.forEach(item => {
            if (!partialTeachers.has(item.professorName)) {
                partialTeachers.set(item.professorName, { name: item.professorName, email: item.email });
            }
        });
        return Array.from(partialTeachers.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [absenceMode, teachers, selectedPartialClasses]);

    const generateEmailContent = () => {
        if (!dateRange?.from || selectedTeachers.length === 0) {
            toast({ variant: "destructive", title: "Faltan datos", description: "Selecciona un deporte, un rango de fechas y asegÃºrate de que haya profesores." });
            return null;
        }

        if (absenceMode === 'partial' && !isSingleDayRange(dateRange)) {
            toast({
                variant: "destructive",
                title: "Ausencia parcializada",
                description: "Para una ausencia parcializada selecciona solo un dÃ­a.",
            });
            return null;
        }

        if (absenceMode === 'partial' && selectedPartialClasses.length === 0) {
            toast({
                variant: "destructive",
                title: "Selecciona clases",
                description: "Marca al menos una clase para la ausencia parcializada.",
            });
            return null;
        }

        let dateText;
        if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
            dateText = `del ${format(dateRange.from, "d 'de' LLLL", { locale: es })} al ${format(dateRange.to, "d 'de' LLLL 'de' yyyy", { locale: es })}`;
        } else {
            dateText = `el dÃ­a ${format(dateRange.from, "EEEE, d 'de' LLLL 'de' yyyy", { locale: es })}`;
        }

        const sortedAthletes = [...filteredAthletes].sort((a, b) => a.name.localeCompare(b.name));
        const studentsListText = sortedAthletes.map(s => s.name).join(', ');
        const classSummaryText = selectedPartialClasses
            .map(item => `${item.day} ${item.time} - ${item.subjectName} (${item.group}) con ${item.professorName}`)
            .join('\n');
        const classSummaryHtml = selectedPartialClasses.length > 0
            ? `
                <div style="margin-top: 16px;">
                    <p style="font-family: sans-serif; font-size: 12px; font-weight: 700; margin-bottom: 8px;">Clases afectadas</p>
                    <ul style="font-family: sans-serif; font-size: 12px; padding-left: 18px; margin: 0;">
                        ${selectedPartialClasses.map(item => `<li>${item.day} ${item.time} - ${item.subjectName} (${item.group}) con ${item.professorName}</li>`).join('')}
                    </ul>
                </div>
            `
            : '';

        const studentsTableRows = sortedAthletes.map(student => {
            const regularGroups = Array.from(
                new Set(
                    student.subjectSummaries
                        ?.filter(sub => sub.group && !sub.group.startsWith('10') && !sub.group.toUpperCase().startsWith('F') && !onlineFlexSubjects.has(sub.name))
                        .map(sub => sub.group) || []
                )
            ).join(', ');

            return `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${student.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${student.id}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${regularGroups}</td>
                </tr>
            `;
        }).join('');

        const studentsTableHtml = `
            <table style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Nombre Completo</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">MatrÃ­cula</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Grupos Regulares</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentsTableRows}
                </tbody>
            </table>
            ${classSummaryHtml}
        `;

        const recipientsWithEmail = selectedTeachers.filter(teacher => teacher.email);
        const recipientsWithoutEmail = selectedTeachers.filter(teacher => !teacher.email);
        const recipients = recipientsWithEmail.map(teacher => teacher.email).join(',');
        const subject = `NotificaciÃ³n de Ausencia ${absenceMode === 'partial' ? 'Parcializada ' : ''}por ${reason}`.replace(/\s+/g, ' ').trim();
        const absenceText = absenceMode === 'partial'
            ? `solo se ausentarÃ¡n de las clases seleccionadas ${dateText}`
            : `se ausentarÃ¡n por motivo de "${reason}" ${dateText}`;
        const mailtoBody = `Estimados profesores,\n\nLes notifico que los siguientes alumnos ${absenceText}.\n\nAlumnos: ${studentsListText}.\n\n${absenceMode === 'partial' ? `Clases afectadas:\n${classSummaryText}\n\n` : ''}${notes ? `Notas adicionales: ${notes}\n\n` : ''}Si desean una tabla mÃ¡s detallada con matrÃ­culas y grupos, pueden reemplazar la lista de alumnos pegando la tabla que se ha copiado al portapapeles.\n\nSaludos cordiales,`;

        return { recipients, subject, bodyHtml: studentsTableHtml, mailtoBody, recipientsWithoutEmail };
    };

    const handleCopyToClipboard = async () => {
        const content = generateEmailContent();
        if (!content) return;

        try {
            const blob = new Blob([content.bodyHtml], { type: 'text/html' });
            const data = [new ClipboardItem({ [blob.type]: blob })];
            await navigator.clipboard.write(data);
            toast({
                title: "Tabla Copiada",
                description: "La tabla con los alumnos estÃ¡ en tu portapapeles. PÃ©gala en tu correo para un mejor formato."
            });
        } catch (err) {
            console.error('Failed to copy HTML table: ', err);
            toast({
                variant: 'destructive',
                title: "Error al Copiar",
                description: "Tu navegador no es compatible para copiar tablas. Usa el botÃ³n de abrir correo."
            });
        }
    };

    const handleOpenMail = async () => {
        const content = generateEmailContent();
        if (!content) return;
        const { recipients, subject, mailtoBody, recipientsWithoutEmail } = content;

        if (recipientsWithoutEmail.length > 0) {
            const namesToCopy = recipientsWithoutEmail.map(teacher => teacher.name).join('\n');
            try {
                await navigator.clipboard.writeText(namesToCopy);
                toast({
                    title: "Nombres Copiados",
                    description: `Se copiaron los nombres de ${recipientsWithoutEmail.length} profesores sin correo para que los busques manualmente.`,
                });
            } catch (err) {
                console.error("Failed to copy names:", err);
                toast({
                    variant: 'destructive',
                    title: "Error al copiar nombres",
                    description: "No se pudieron copiar los nombres de los profesores."
                });
            }
        }

        window.open(`mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`, '_blank');
    };

    return (
        <DialogContent className="sm:max-w-3xl rounded-3xl">
            <DialogHeader>
                <DialogTitle>Notificar Ausencia de Atletas</DialogTitle>
                <DialogDescription>
                    Genera un correo para notificar a los profesores sobre la ausencia de los atletas seleccionados.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-full space-y-2">
                        <Label htmlFor="sport-select-v2" className="font-semibold">1. Selecciona el Deporte</Label>
                        <Select value={selectedSport} onValueChange={setSelectedSport}>
                            <SelectTrigger id="sport-select-v2" className="rounded-xl">
                                <SelectValue placeholder="Seleccionar deporte..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">Todos los deportes</SelectItem>
                                {sportList.map(sport => <SelectItem key={sport} value={sport}>{sport}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {filterType === 'leader' && selectedLeader && (
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="filter-by-leader-v2" checked={filterByLeader} onCheckedChange={(checked) => setFilterByLeader(!!checked)} />
                                <Label htmlFor="filter-by-leader-v2">Filtrar solo por mi lÃ­der seleccionado ({selectedLeader})</Label>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground pt-2">
                            <span className="font-bold text-primary">{filteredAthletes.length}</span> alumno(s) seleccionado(s).
                        </p>
                    </div>
                    <Label className="font-semibold pt-4">2. Selecciona el rango de fechas</Label>
                    <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={es}
                        classNames={{
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
                            day_range_start: "day-range-start rounded-l-xl",
                            day_range_end: "day-range-end rounded-r-xl",
                            day_range_middle: "bg-primary/10 text-primary",
                        }}
                    />
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason-v2">3. Motivo</Label>
                        <RadioGroup id="reason-v2" value={reason} onValueChange={setReason} className="mt-2">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Competencia Deportiva" id="r1-v2" /><Label htmlFor="r1-v2">Competencia Deportiva</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Otro" id="r2-v2" /><Label htmlFor="r2-v2">Otro (especificar en notas)</Label></div>
                        </RadioGroup>
                    </div>
                    <div>
                        <Label className="font-semibold">4. Tipo de Ausencia</Label>
                        <RadioGroup value={absenceMode} onValueChange={(value) => setAbsenceMode(value as AbsenceMode)} className="mt-2">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="full-day" id="full-day-v2" /><Label htmlFor="full-day-v2">DÃ­a completo</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="partial" id="partial-v2" /><Label htmlFor="partial-v2">Ausencia parcializada</Label></div>
                        </RadioGroup>
                        {absenceMode === 'partial' && !isSingleDayRange(dateRange) && (
                            <p className="mt-2 text-xs text-amber-700">La ausencia parcializada funciona con un solo dÃ­a seleccionado.</p>
                        )}
                    </div>
                    {absenceMode === 'partial' && isSingleDayRange(dateRange) && (
                        <div>
                            <Label className="font-semibold">5. Clases afectadas</Label>
                            <Card className="mt-2 p-3 bg-muted/30 border-none rounded-xl max-h-48 overflow-y-auto">
                                {affectedClasses.length > 0 ? (
                                    <div className="space-y-3">
                                        {affectedClasses.map(item => (
                                            <label key={item.key} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/70">
                                                <Checkbox
                                                    checked={selectedClassKeys.includes(item.key)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedClassKeys(previous =>
                                                            checked
                                                                ? [...previous, item.key]
                                                                : previous.filter(key => key !== item.key)
                                                        );
                                                    }}
                                                />
                                                <div className="space-y-1 text-sm">
                                                    <p className="font-semibold text-foreground">{item.day} {item.time}</p>
                                                    <p className="text-muted-foreground">{item.subjectName} ({item.group})</p>
                                                    <p className="text-xs text-muted-foreground">{item.professorName}{item.email ? ` • ${item.email}` : ' • Sin correo'}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4 italic">No se encontraron clases para ese dÃ­a.</p>
                                )}
                            </Card>
                        </div>
                    )}
                    <div>
                        <Label htmlFor="notes-v2">6. Notas Adicionales (Opcional)</Label>
                        <Textarea id="notes-v2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. El torneo es en la ciudad de..." className="rounded-xl" />
                    </div>
                    <div>
                        <Label className="font-semibold">7. Profesores a Notificar</Label>
                        <Card className="mt-2 p-3 bg-muted/30 border-none rounded-xl max-h-48 overflow-y-auto">
                            {selectedTeachers.length > 0 ? (
                                <ul className="text-sm list-disc list-inside space-y-1">
                                    {selectedTeachers.map(teacher => (
                                        <li key={teacher.name} className="text-muted-foreground"><span className="text-foreground font-medium">{teacher.name}</span> {teacher.email ? <span className="text-[11px]">{teacher.email}</span> : <span className="text-destructive text-[10px] font-black uppercase">(Sin correo)</span>}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-4 italic">Selecciona un deporte y fecha para ver los profesores.</p>
                            )}
                        </Card>
                    </div>
                    <DialogFooter className="pt-4 gap-2">
                        <Button variant="outline" onClick={handleCopyToClipboard} className="rounded-xl font-bold">
                            <ClipboardCopy className="mr-2 h-4 w-4" />
                            Copiar Tabla
                        </Button>
                        <Button onClick={handleOpenMail} className="rounded-xl font-bold">
                            <Mail className="mr-2 h-4 w-4" />
                            Abrir Correo
                        </Button>
                    </DialogFooter>
                </div>
            </div>
        </DialogContent>
    );
}

interface PrintOptions {
  includeId: boolean;
  includeName: boolean;
  includeLeader: boolean;
  includeGroups: boolean;
  includeOnlineFlexGroups: boolean;
  includeStudentPhone: boolean;
  includeParentPhones: boolean;
}


function PrintListDialog({ students, contacts }: { students: Student[], contacts: Record<string, StudentContact>}) {
    const [options, setOptions] = useState<PrintOptions>({
        includeId: true,
        includeName: true,
        includeLeader: false,
        includeGroups: true,
        includeOnlineFlexGroups: false,
        includeStudentPhone: false,
        includeParentPhones: false,
    });

    const handlePrint = () => {
        const headers = [
            ...(options.includeId ? [{ key: 'includeId', label: 'Matrícula' }] : []),
            ...(options.includeName ? [{ key: 'includeName', label: 'Nombre Completo' }] : []),
            ...(options.includeLeader ? [{ key: 'includeLeader', label: 'Líder' }] : []),
            ...(options.includeGroups ? [{ key: 'includeGroups', label: 'Grupos Regulares' }] : []),
            ...(options.includeOnlineFlexGroups ? [{ key: 'includeOnlineFlexGroups', label: 'Grupos Online/Flex' }] : []),
            ...(options.includeStudentPhone ? [{ key: 'includeStudentPhone', label: 'Teléfono Alumno' }] : []),
            ...(options.includeParentPhones ? [{ key: 'includeParentPhones', label: 'Teléfonos Padres/Tutores' }] : []),
        ] as Array<{ key: keyof PrintOptions; label: string }>;

        let tableContent = `
            <thead>
                <tr>
                    ${headers.map(h => `<th>${h.label}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${students.map(student => {
                    const studentContact = contacts[student.id] || {};
                    
                    const regularGroups = Array.from(
                        new Set(
                            student.subjectSummaries
                                ?.filter(s => s.group && !s.group.startsWith('10') && !s.group.toUpperCase().startsWith('F') && !onlineFlexSubjects.has(s.name))
                                .map(s => s.group) || []
                        )
                    ).join(', ');

                    const onlineFlexGroups = Array.from(
                        new Set(
                            student.subjectSummaries
                                ?.filter(s => s.group && onlineFlexSubjects.has(s.name))
                                .map(s => `${s.name.substring(0, 5)}... (${s.group})`) || []
                        )
                    ).join(', ');
                    
                    let parentPhones = '';
                    if (options.includeParentPhones) {
                        const phones = [
                            studentContact.dadPhone && `Papá: ${studentContact.dadPhone}`,
                            studentContact.momPhone && `Mamá: ${studentContact.momPhone}`,
                        ].filter(Boolean).join('<br>');
                        parentPhones = phones || 'No disponible';
                    }

                    const rowData = {
                        includeId: student.id,
                        includeName: student.name,
                        includeLeader: student.leader,
                        includeGroups: regularGroups,
                        includeOnlineFlexGroups: onlineFlexGroups,
                        includeStudentPhone: studentContact.studentPhone || 'No disponible',
                        includeParentPhones: parentPhones,
                    };

                    return `
                        <tr>
                            ${headers.map(h => `<td>${rowData[h.key]}</td>`).join('')}
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Lista de Alumnos - ${format(new Date(), 'dd/MM/yyyy')}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 2rem; }
                            h1 { color: #17594A; }
                            table { width: 100%; border-collapse: collapse; font-size: 10px; }
                            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; word-break: break-word; }
                            th { background-color: #f2f2f2; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                            @media print { .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        <button class="no-print" onclick="window.print()">Imprimir</button>
                        <h1>Lista de Alumnos</h1>
                        <p>Generado el ${format(new Date(), "d 'de' LLLL", { locale: es })} - Total: ${students.length} alumnos</p>
                        <table>${tableContent}</table>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
        }
    };


    return (
        <DialogContent className="rounded-3xl">
            <DialogHeader>
                <DialogTitle>Imprimir Lista de Alumnos</DialogTitle>
                <DialogDescription>
                    Selecciona las columnas que deseas incluir en el reporte impreso.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <div className="flex items-center space-x-2">
                    <Checkbox id="print-id" checked={options.includeId} onCheckedChange={(checked) => setOptions(o => ({...o, includeId: !!checked}))} />
                    <Label htmlFor="print-id">Matrícula</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="print-name" checked={options.includeName} onCheckedChange={(checked) => setOptions(o => ({...o, includeName: !!checked}))} />
                    <Label htmlFor="print-name">Nombre Completo</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="print-leader" checked={options.includeLeader} onCheckedChange={(checked) => setOptions(o => ({...o, includeLeader: !!checked}))} />
                    <Label htmlFor="print-leader">Líder</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="print-groups" checked={options.includeGroups} onCheckedChange={(checked) => setOptions(o => ({...o, includeGroups: !!checked}))} />
                    <Label htmlFor="print-groups">Grupos Regulares</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="print-online-flex" checked={options.includeOnlineFlexGroups} onCheckedChange={(checked) => setOptions(o => ({...o, includeOnlineFlexGroups: !!checked}))} />
                    <Label htmlFor="print-online-flex">Grupos Online/Flex</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="print-student-phone" checked={options.includeStudentPhone} onCheckedChange={(checked) => setOptions(o => ({...o, includeStudentPhone: !!checked}))} />
                    <Label htmlFor="print-student-phone">Teléfono Alumno</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="print-parent-phones" checked={options.includeParentPhones} onCheckedChange={(checked) => setOptions(o => ({...o, includeParentPhones: !!checked}))} />
                    <Label htmlFor="print-parent-phones">Teléfonos Padres/Tutores</Label>
                </div>
            </div>
            <div className="flex justify-end">
                <Button onClick={handlePrint} className="rounded-xl font-bold px-6">
                    <Printer className="mr-2 h-4 w-4" />
                    Generar e Imprimir
                </Button>
            </div>
        </DialogContent>
    );
}

interface MailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  loadStudentSubjects: (studentId: string) => Promise<Subject[]>;
}

function MailerDialog({ open, onOpenChange, students, loadStudentSubjects }: MailerDialogProps) {
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { weightingSchemes } = useDashboardFilters(); // Get schemes here
    const { toast } = useToast();
    const [dialogContent, setDialogContent] = useState<React.ReactNode>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            setSelectedStudent(null);
            setIsReportOpen(false);
            setDialogContent(null);
        }
    }, [open]);

    const handleGenerateAndCopy = async (student: Student) => {
        setIsGenerating(true);
        setSelectedStudent(student);

        const subjects = await loadStudentSubjects(student.id);
        
        const ReportComponent = () => {
            const innerRef = useRef<HTMLDivElement>(null);
            const [isExporting, setIsExporting] = useState(false);

            const handleDownloadPdf = async () => {
              if (innerRef.current) {
                setIsExporting(true);
                try {
                  const canvas = await html2canvas(innerRef.current, { scale: 2, useCORS: true, logging: false });
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                  pdf.save(`Reporte_${student.name.replace(/\s+/g, '_')}.pdf`);
                  toast({ title: "PDF Descargado", description: "El reporte se ha guardado en tu dispositivo." });
                } catch (err) {
                  toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
                } finally {
                  setIsExporting(false);
                }
              }
            };

            return (
                <div>
                     <div className="overflow-x-auto bg-muted/20 p-2 rounded-md">
                        <div ref={innerRef} className="min-w-[800px]">
                            <StudentReportImage student={student} subjects={subjects} weightingSchemes={weightingSchemes} />
                        </div>
                    </div>
                    <DialogFooter className="mt-4 gap-2">
                        <Button variant="outline" onClick={handleDownloadPdf} disabled={isExporting} className="rounded-xl font-bold">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Descargar PDF
                        </Button>
                    </DialogFooter>
                </div>
            )
        }

        setDialogContent(
            <DialogContent className="max-w-4xl rounded-3xl">
                <DialogHeader>
                    <DialogTitle>Reporte de {student.name}</DialogTitle>
                    <DialogDescription>Descarga el reporte académico oficial en PDF.</DialogDescription>
                </DialogHeader>
                <ReportComponent />
            </DialogContent>
        );

        setIsGenerating(false);
        setIsReportOpen(true);
    };
    
    return (
        <>
            <Dialog open={open && !isReportOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Generar Reportes</DialogTitle>
                        <DialogDescription className="text-xs uppercase tracking-widest font-bold opacity-60">
                            Previsualización individual
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] -mx-6 px-6">
                        <div className="py-4 space-y-2">
                            {students.map(student => (
                                <div key={student.id} className="flex items-center justify-between gap-4 p-3 hover:bg-muted/30 rounded-xl transition-all border border-transparent hover:border-muted">
                                    <div className="flex flex-col overflow-hidden">
                                        <p className="font-bold text-sm truncate">{student.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Matrícula: {student.id}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-lg h-8 text-xs font-bold shrink-0"
                                        onClick={() => handleGenerateAndCopy(student)}
                                        disabled={isGenerating && selectedStudent?.id === student.id}
                                    >
                                        {isGenerating && selectedStudent?.id === student.id ? (
                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        ) : (
                                            <Eye className="mr-2 h-3 w-3" />
                                        )}
                                        Ver
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isReportOpen} onOpenChange={(open) => {
                if(!open) {
                    setIsReportOpen(false);
                    setDialogContent(null);
                }
            }}>
                {dialogContent}
            </Dialog>
        </>
    );
}

export function StudentPanel() {
  const { 
    allStudents,
    allStudentsMap,
    filteredStudents: initialFilteredStudents, 
    latestComparison,
    contextualStudentIds,
    studentContacts,
    setStudentContacts,
    setStudentLifeProfiles,
    teams,
    hasData, 
    isLoading, 
    caseType, 
    setCaseType, 
    subjectRiskFilter,
    setSubjectRiskFilter,
    selectedValue,
    filterType,
    loadStudentSubjects,
    professorContacts,
    weightingSchemes,
  } = useDashboardFilters();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [directoryFile, setDirectoryFile] = useState<File | null>(null);
  const [athletesFile, setAthletesFile] = useState<File | null>(null);
  const [isProcessingDirectory, setIsProcessingDirectory] = useState(false);
  const [isProcessingAthletes, setIsProcessingAthletes] = useState(false);
  const [isProcessingContactMerge, setIsProcessingContactMerge] = useState(false);
  const [isProcessingLifeSurvey, setIsProcessingLifeSurvey] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isMailerOpen, setIsMailerOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const workerContainerRef = useRef<HTMLDivElement>(null);
  const contactMergeInputRef = useRef<HTMLInputElement>(null);
  const lifeSurveyInputRef = useRef<HTMLInputElement>(null);


  const { toast } = useToast();
  
  const handleDirectoryUpload = useCallback(async (file: File | null) => {
    if (!file) {
      setDirectoryFile(null);
      return;
    }
    setDirectoryFile(file);
    setIsProcessingDirectory(true);
    try {
      const contacts = await parseDirectoryExcel(file);
      if (contacts) {
        setStudentContacts(prev => ({ ...prev, ...contacts }));
        toast({
          title: "Directorio Guardado",
          description: `Se procesaron y guardaron ${Object.keys(contacts).length} contactos en la base de datos.`,
        });
      } else {
        throw new Error("El archivo no tiene el formato esperado o está vacío.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar directorio",
        description: error.message || "No se pudo procesar el archivo Excel.",
      });
    } finally {
      setIsProcessingDirectory(false);
      setDirectoryFile(null);
    }
  }, [setStudentContacts, toast]);
  
  const handleAthletesUpload = useCallback(async (file: File | null) => {
    if (!file) {
      setAthletesFile(null);
      return;
    }
    setAthletesFile(file);
    setIsProcessingAthletes(true);
    try {
        if (allStudentsMap.size === 0) {
            throw new Error("Carga primero el reporte diario de alumnos.");
        }
      await parseAthletesExcel(file, allStudentsMap);
      toast({
          title: "Lista de Atletas Actualizada",
          description: `Se han procesado y guardado los equipos de atletas en la base de datos.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar atletas",
        description: error.message || "No se pudo procesar el archivo Excel.",
      });
    } finally {
      setIsProcessingAthletes(false);
      setAthletesFile(null);
    }
  }, [allStudentsMap, toast]);

  const handleLifeSurveyUpload = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsProcessingLifeSurvey(true);
    try {
      const profiles = await parseStudentLifeSurveyExcel(file);
      if (!profiles) {
        throw new Error('No encontré las columnas de correo, propósito de vida y sociedad en el archivo.');
      }

      setStudentLifeProfiles(prev => ({ ...prev, ...profiles }));
      toast({
        title: 'Perfiles simbólicos cargados',
        description: `Se cruzaron ${Object.keys(profiles).length} respuestas de propósito de vida y sociedad.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar propósito de vida',
        description: error.message || 'No se pudo procesar el archivo del cuestionario.',
      });
    } finally {
      setIsProcessingLifeSurvey(false);
    }
  }, [setStudentLifeProfiles, toast]);

  const athleteStudents = useMemo(() => allStudents.filter(s => teams.some(team => Array.isArray(team.members) && team.members.some(member => member.id === s.id))), [allStudents, teams]);

  const filteredStudents = useMemo(() => {
    let students = initialFilteredStudents;

    if (!searchTerm) {
      return students;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    const searchWords = lowercasedFilter.split(' ').filter(Boolean); // Split search term into words
    const numericFilter = searchTerm.replace(/\D/g, '');

    return students.filter((student: Student) => {
      const studentNameLower = student.name.toLowerCase();
      
      const nameMatch = searchWords.every(word => studentNameLower.includes(word));
      const idMatch = student.id.toLowerCase().includes(lowercasedFilter);
      
      let phoneMatch = false;
      if (numericFilter && studentContacts[student.id]) {
        const contact = studentContacts[student.id];
        const studentPhone = contact.studentPhone?.replace(/\D/g, '') || '';
        const dadPhone = contact.dadPhone?.replace(/\D/g, '') || '';
        const momPhone = contact.momPhone?.replace(/\D/g, '') || '';
        
        phoneMatch = studentPhone.includes(numericFilter) ||
                     dadPhone.includes(numericFilter) ||
                     momPhone.includes(numericFilter);
      }
      
      return nameMatch || idMatch || phoneMatch;
    });
  }, [searchTerm, initialFilteredStudents, studentContacts]);

  const handleCopyDirectory = () => {
    if (filteredStudents.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay alumnos que mostrar',
        description: 'No se puede generar un directorio sin alumnos en la lista.',
      });
      return;
    }

    let generatedText = "### Directorio de Alumnos\n\n";
    
    filteredStudents.forEach(student => {
      const contact = studentContacts[student.id];

      generatedText += "---\n";
      generatedText += `**Nombre:** ${student.name}\n`;
      generatedText += `**Matrícula:** ${student.id}\n`;
      generatedText += `**Teléfono Alumno:** ${contact?.studentPhone || 'No disponible'}\n`;
      generatedText += `**Teléfono Papá:** ${contact?.dadPhone || 'No disponible'}\n`;
      generatedText += `**Teléfono Mamá:** ${contact?.momPhone || 'No disponible'}\n`;
      generatedText += `**Correo Alumno:** ${contact?.studentEmail || 'No disponible'}\n`;
      generatedText += `**Correo Papá:** ${contact?.dadEmail || 'No disponible'}\n`;
      generatedText += `**Correo Mamá:** ${contact?.momEmail || 'No disponible'}\n\n`;
    });
    
    navigator.clipboard.writeText(generatedText.trim()).then(() => {
        setIsCopied(true);
        toast({
            title: "¡Directorio Copiado!",
            description: `Se ha copiado la información de ${filteredStudents.length} alumnos.`,
        });
        setTimeout(() => setIsCopied(false), 2500);
    });
  };

  const handleExportPhoneMergeExcel = () => {
    if (filteredStudents.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay alumnos que exportar',
        description: 'Necesitas tener alumnos visibles en la lista para generar el cruce.',
      });
      return;
    }

    const rows = filteredStudents.map(student => {
      const contact = studentContacts[student.id];
      const regularGroups = Array.from(
        new Set(
          student.subjectSummaries
            ?.filter(sub => sub.group && !sub.group.startsWith('10') && !sub.group.toUpperCase().startsWith('F') && !onlineFlexSubjects.has(sub.name))
            .map(sub => sub.group) || []
        )
      ).join(', ');

      return {
        'Matrícula': student.id,
        'Nombre del Alumno': student.name,
        'Líder': student.leader || '',
        'Tutor': student.tutor || '',
        'Grupos Regulares': regularGroups,
        'Teléfono Alumno': contact?.studentPhone || '',
        'Correo Alumno': contact?.studentEmail || '',
        'Nombre Papá': contact?.dadName || '',
        'Teléfono Papá': contact?.dadPhone || '',
        'Correo Papá': contact?.dadEmail || '',
        'Nombre Mamá': contact?.momName || '',
        'Teléfono Mamá': contact?.momPhone || '',
        'Correo Mamá': contact?.momEmail || '',
        'SEDENA': contact?.sedena || '',
        'Grupo Directorio': contact?.group || '',
        'ID Mentoría': contact?.mentoringId || '',
        'Tiene Datos': contact ? 'Sí' : 'No',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cruce Telefonos');
    XLSX.writeFile(workbook, `Cruce_Telefonos_Sentinel_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

    const rowsWithContacts = rows.filter(row =>
      row['Teléfono Alumno'] || row['Teléfono Papá'] || row['Teléfono Mamá']
    ).length;

    toast({
      title: 'Excel generado',
      description: `Se exportaron ${rows.length} alumnos y ${rowsWithContacts} ya traen teléfonos en el cruce.`,
    });
  };

  const handleContactExcelMigration = useCallback(async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsProcessingContactMerge(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error('El archivo no contiene hojas para procesar.');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, { header: 1, defval: '' });

      if (rows.length === 0) {
        throw new Error('El archivo estÃ¡ vacÃ­o.');
      }

      const headerRow = rows[0];
      const studentIdIndex = findStudentIdColumnIndex(headerRow);
      const studentNameIndex = findStudentNameColumnIndex(headerRow);

      if (studentIdIndex === -1) {
        throw new Error('No encontrÃ© una columna de matrÃ­cula o ID en la primera fila.');
      }

      const contactHeaders = [
        'Telefono Alumno',
        'Correo Alumno',
        'Nombre Papa',
        'Telefono Papa',
        'Correo Papa',
        'Nombre Mama',
        'Telefono Mama',
        'Correo Mama',
        'SEDENA',
        'Grupo Directorio',
        'ID Mentoria',
        'Tiene Datos',
      ];

      const migratedRows = rows.map((row, rowIndex) => {
        const insertAt = studentNameIndex !== -1 ? studentNameIndex + 1 : row.length;

        if (rowIndex === 0) {
          return [
            ...row.slice(0, insertAt),
            ...contactHeaders,
            ...row.slice(insertAt),
          ];
        }

        const normalizedStudentId = String(row[studentIdIndex] || '').trim();
        const contact = studentContacts[normalizedStudentId];
        const contactValues = [
          contact?.studentPhone || '',
          contact?.studentEmail || '',
          contact?.dadName || '',
          contact?.dadPhone || '',
          contact?.dadEmail || '',
          contact?.momName || '',
          contact?.momPhone || '',
          contact?.momEmail || '',
          contact?.sedena || '',
          contact?.group || '',
          contact?.mentoringId || '',
          contact ? 'Si' : 'No',
        ];

        return [
          ...row.slice(0, insertAt),
          ...contactValues,
          ...row.slice(insertAt),
        ];
      });

      workbook.Sheets[firstSheetName] = XLSX.utils.aoa_to_sheet(migratedRows);

      const outputName = file.name.replace(/\.xlsx?$/i, '') + '_con_contactos.xlsx';
      XLSX.writeFile(workbook, outputName);

      const matchedRows = migratedRows.slice(1).filter(row => row[row.length - 1] === 'Si').length;

      toast({
        title: 'Archivo migrado',
        description: `Se devolviÃ³ el mismo Excel con contactos. Coincidieron ${matchedRows} filas con el directorio.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al migrar el Excel',
        description: error.message || 'No se pudo completar el cruce de contactos.',
      });
    } finally {
      setIsProcessingContactMerge(false);
    }
  }, [studentContacts, toast]);

  const handleOpenContactMergePicker = () => {
    if (isProcessingContactMerge) return;
    contactMergeInputRef.current?.click();
  };

  const handleOpenLifeSurveyPicker = () => {
    if (isProcessingLifeSurvey) return;
    lifeSurveyInputRef.current?.click();
  };

  const handleExportIntegratedMonitoring = () => {
    if (allStudents.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No hay monitoreo cargado',
        description: 'Carga al menos un reporte antes de exportar el monitoreo integrado.',
      });
      return;
    }

    const rows = allStudents.flatMap(student => {
      const contact = studentContacts[student.id];
      const subjects = student.subjects || [];

      return subjects.map(subject => ({
        'Matricula': student.id,
        'Nombre del Alumno': student.name,
        'Lider': student.leader || '',
        'Tutor': student.tutor || '',
        'CRN': subject.id,
        'Clave Materia': subject.key,
        'Nombre de la Materia': subject.name,
        'Grupo': subject.group,
        'Profesor': subject.professorName,
        'Estatus': subject.statusDescription,
        'Faltas': subject.absences,
        'Limite Faltas': subject.absenceLimit,
        'NE': subject.missedAssignments,
        'Limite NE': subject.missedAssignmentLimit,
        'Ponderado': subject.grade,
        'Calificacion Final': subject.finalGrade ?? '',
        'Dias': subject.schedule?.days.join(', ') || '',
        'Inicio': subject.schedule?.startTime || '',
        'Fin': subject.schedule?.endTime || '',
        'Telefono Alumno': contact?.studentPhone || '',
        'Correo Alumno': contact?.studentEmail || '',
        'Nombre Papa': contact?.dadName || '',
        'Telefono Papa': contact?.dadPhone || '',
        'Correo Papa': contact?.dadEmail || '',
        'Nombre Mama': contact?.momName || '',
        'Telefono Mama': contact?.momPhone || '',
        'Correo Mama': contact?.momEmail || '',
        'SEDENA': contact?.sedena || '',
        'Grupo Directorio': contact?.group || '',
        'ID Mentoria': contact?.mentoringId || '',
      }));
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoreo Integrado');
    XLSX.writeFile(workbook, `Monitoreo_Integrado_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

    toast({
      title: 'Monitoreo exportado',
      description: `Se generó un Excel integrado con ${rows.length} filas de materias.`,
    });
  };

  const handleSelectionChange = (studentId: string, isSelected: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      const allVisibleIds = new Set(filteredStudents.map(s => s.id));
      setSelectedStudents(allVisibleIds);
    } else {
      setSelectedStudents(new Set());
    }
  };

    const handleDownloadZip = async () => {
        if (selectedStudents.size === 0) return;
        
        const studentArray = Array.from(selectedStudents);
        setDownloadStatus(`Iniciando generación de ${studentArray.length} reportes PDF...`);
        setDownloadProgress(1);

        const { createRoot } = await import('react-dom/client');
        const zip = new JSZip();

        if (!workerContainerRef.current) return;
        const container = workerContainerRef.current;
        const root = createRoot(container);

        let totalCompleted = 0;
        let failedCount = 0;
        
        const CHUNK_SIZE = 1; // Un solo PDF a la vez para máxima estabilidad

        const processStudent = async (studentId: string): Promise<void> => {
            const student = allStudentsMap.get(studentId);
            if (!student) return;

            try {
                const subjects = await loadStudentSubjects(student.id);

                return new Promise((resolve) => {
                    // Renderizar en el contenedor visible pero desplazado
                    root.render(<StudentReportImage student={student} subjects={subjects} weightingSchemes={weightingSchemes} />);
                    
                    // Esperar más tiempo para asegurar que las fuentes e imágenes estén listas
                    setTimeout(async () => {
                        try {
                            const canvas = await html2canvas(container, { 
                                scale: 2, // Mayor calidad
                                useCORS: true,
                                allowTaint: true,
                                scrollX: 0,
                                scrollY: 0,
                                windowWidth: 800,
                                windowHeight: 1100,
                                backgroundColor: '#ffffff'
                            });
                            
                            const imgData = canvas.toDataURL('image/png', 1.0);
                            const pdf = new jsPDF('p', 'mm', 'a4');
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                            
                            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                            
                            const pdfBlob = pdf.output('blob');
                            const sanitizedName = student.name.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_');
                            zip.file(`${sanitizedName}_reporte.pdf`, pdfBlob);

                        } catch (err) {
                            console.error(`Error generating PDF for ${student.name}:`, err);
                            failedCount++;
                        }
                        
                        totalCompleted++;
                        setDownloadStatus(`Procesando PDFs: ${totalCompleted}/${studentArray.length}`);
                        setDownloadProgress((totalCompleted / studentArray.length) * 100);
                        resolve();
                    }, 800); 
                });
            } catch (err) {
                console.error(`Critical failure for ${studentId}:`, err);
                totalCompleted++;
                failedCount++;
            }
        };

        for (let i = 0; i < studentArray.length; i += CHUNK_SIZE) {
            const id = studentArray[i];
            await processStudent(id);
        }

        setDownloadStatus(`Empaquetando ${totalCompleted - failedCount} PDFs...`);
        
        try {
            const zipContent = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipContent);
            link.download = `Reportes_PDF_Sentinel_${format(new Date(), 'yyyyMMdd_HHmm')}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: "Descarga Exitosa",
                description: `Se han generado los PDFs correctamente.`,
            });
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo generar el ZIP." });
        } finally {
            root.unmount();
            setDownloadStatus('');
            setDownloadProgress(0);
            setSelectedStudents(new Set());
        }
    };


  const studentsForMailer = useMemo(() => {
    return Array.from(selectedStudents).map(id => allStudentsMap.get(id)).filter(Boolean) as Student[];
  }, [selectedStudents, allStudentsMap]);
  

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  const caseTypeMap: Partial<Record<import('./DashboardClient').CaseType, string>> = {
    lost: 'Casos Perdidos',
    urgent: 'Casos Críticos',
    observation: 'Alumnos en Observación',
    extraordinary: 'Alumnos con derecho a extraordinario',
    changes: 'Alumnos con Cambios Detectados',
    incompleteGrade: 'Alumnos con Calificaciones Incompletas (SC)',
    newAbsences: 'Alumnos con Nuevas Faltas',
    newMissedAssignments: 'Alumnos con Nuevas Tareas No Entregadas',
    'sd-absences': 'Alumnos Sin Derecho por Faltas',
    'sd-assignments': 'Alumnos Sin Derecho por Tareas (NE)',
    'at-limit-absences': 'Alumnos al Límite por Faltas',
    'at-limit-assignments': 'Alumnos al Límite por Tareas (NE)',
    'low-potential': 'Potencial menor a 70',
    'very-low-potential': 'Potencial menor a 50 (Sin Extra)',
    'pot-70-75': 'Potencial Zona de Alerta (70-75)',
    'pot-76-80': 'Potencial Zona Seguimiento (76-80)',
    'pot-81-85': 'Potencial Zona Estable (81-85)',
    'req-100': 'Esfuerzo Heroico (Requieren promedio de 100)',
    'req-90': 'Esfuerzo Alto (Requieren promedio de 90+)',
    'req-80': 'Esfuerzo Notable (Requieren promedio de 80+)',
    'req-70': 'Esfuerzo Estándar (Requieren promedio de 70+)',
  };

  const getPanelTitle = () => {
    if (caseType && caseTypeMap[caseType]) {
        return <span className="font-bold text-white">{caseTypeMap[caseType]}</span>;
    }
    if (subjectRiskFilter) {
        const riskTypeText = subjectRiskFilter.riskType === 'absences' ? 'Faltas' : 'Tareas (NE)';
        return <span>Alumnos en riesgo por <span className="font-bold text-white">{riskTypeText}</span> en <span className="font-bold text-white">{subjectRiskFilter.subjectName}</span></span>;
    }
    return <span className="text-emerald-50/80">Explora y monitorea los casos individuales de cada alumno.</span>;
  };

  const handleClearFilter = () => {
    setCaseType(null);
    setSubjectRiskFilter(null);
  };
  
  const hasActiveFilter = !!caseType || !!subjectRiskFilter;


  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
       <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-emerald-900 p-8 md:p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-3">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-white/10 shadow-inner">
                  <Zap className="h-3 w-3 text-emerald-300" /> Gestión de Casos 2026
                </div>
                <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
                  Panel de Alumnos
                </h1>
                <p className="text-base mt-1 flex items-center gap-2">
                    {getPanelTitle()}
                    {hasActiveFilter && (
                        <Button variant="secondary" size="sm" onClick={handleClearFilter} className="h-7 px-3 text-[10px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 text-white border-none rounded-full transition-all">
                          <X className="mr-1.5 h-3.5 w-3.5"/> Limpiar filtro
                        </Button>
                    )}
                </p>
            </div>
            <input
              ref={contactMergeInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                handleContactExcelMigration(file);
                event.currentTarget.value = '';
              }}
            />
            <input
              ref={lifeSurveyInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                handleLifeSurveyUpload(file);
                event.currentTarget.value = '';
              }}
            />
             <div className="flex items-center gap-3 flex-wrap bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <FileUpload onFileSelect={handleDirectoryUpload} selectedFile={directoryFile} isLoading={isProcessingDirectory} variant="secondary" size="icon" className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border-none" label="" icon={<Contact className="h-5 w-5" />} />
                            </TooltipTrigger>
                            <TooltipContent className="font-bold">Cargar Directorio</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <FileUpload onFileSelect={handleAthletesUpload} selectedFile={athletesFile} isLoading={isProcessingAthletes} variant="secondary" size="icon" className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border-none" label="" icon={<Award className="h-5 w-5" />} />
                            </TooltipTrigger>
                            <TooltipContent className="font-bold">Cargar Atletas</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                
                <div className="flex items-center gap-2">
                  <Dialog>
                      <DialogTrigger asChild>
                          <Button variant="secondary" disabled={athleteStudents.length === 0} size="sm" className="h-10 rounded-xl font-bold text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border-none px-4">
                              <Mail className="h-4 w-4 text-emerald-300"/> Notificar Ausencia
                          </Button>
                      </DialogTrigger>
                      <AthleteNotificationDialogV2 students={athleteStudents} teams={teams} filterType={filterType} selectedLeader={selectedValue} />
                  </Dialog>
                  <Dialog>
                      <DialogTrigger asChild>
                          <Button variant="secondary" size="sm" className="h-10 rounded-xl font-bold text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border-none px-4">
                              <Printer className="h-4 w-4 text-emerald-300" /> Imprimir Lista
                          </Button>
                      </DialogTrigger>
                      <PrintListDialog students={filteredStudents} contacts={studentContacts} />
                  </Dialog>
                  {hasData && (
                  <TooltipProvider>
                      <Tooltip open={isCopied}>
                          <TooltipTrigger asChild>
                          <Button variant="secondary" onClick={handleCopyDirectory} size="sm" className="h-10 rounded-xl font-bold text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border-none px-4">
                              {isCopied ? <Check className="text-emerald-300 h-4 w-4"/> : <ClipboardCopy className="h-4 w-4 text-emerald-300" />}
                               Copiar Directorio
                          </Button>
                          </TooltipTrigger>
                          <TooltipContent className="font-bold">
                              {isCopied ? '¡Copiado!' : 'Exportar a portapapeles'}
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
                  )}
                  {hasData && (
                    <Button
                      variant="secondary"
                      onClick={handleOpenLifeSurveyPicker}
                      size="sm"
                      disabled={isProcessingLifeSurvey}
                      className="h-10 rounded-xl font-bold text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border-none px-4"
                    >
                      {isProcessingLifeSurvey ? (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-emerald-300" />
                      )}
                      {isProcessingLifeSurvey ? 'Cruzando propósito...' : 'Cargar Propósito de Vida'}
                    </Button>
                  )}
                  {hasData && (
                    <Button
                      variant="secondary"
                      onClick={handleOpenContactMergePicker}
                      size="sm"
                      disabled={isProcessingContactMerge}
                      className="h-10 rounded-xl font-bold text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border-none px-4"
                    >
                      {isProcessingContactMerge ? (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
                      )}
                      {isProcessingContactMerge ? 'Migrando...' : 'Migrar Contactos'}
                    </Button>
                  )}
                  {hasData && (
                    <Button variant="secondary" onClick={handleExportIntegratedMonitoring} size="sm" className="h-10 rounded-xl font-bold text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border-none px-4">
                      <Download className="h-4 w-4 text-emerald-300" />
                      Exportar Integrado
                    </Button>
                  )}
                </div>
            </div>
        </div>
        <div className="absolute right-[-5%] top-[-20%] w-96 h-96 bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute left-[-5%] bottom-[-20%] w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px]" />
      </header>

      {hasData && (
        <section className="space-y-8">
          <div className="relative group/search max-w-2xl mx-auto transform transition-all duration-500 hover:scale-[1.02]">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-primary/30 group-focus-within/search:text-primary transition-colors z-10">
                <Search className="h-6 w-6" />
            </div>
            <Input
                type="text"
                placeholder="Busca por nombre, matrícula o teléfono..."
                className="pl-14 h-16 w-full bg-white border-2 border-primary/5 shadow-2xl shadow-primary/10 rounded-2xl text-xl font-bold transition-all focus:border-primary/20 focus:ring-8 focus:ring-primary/5 placeholder:text-muted-foreground/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
           {filteredStudents.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-primary/10 shadow-lg sticky top-20 z-20 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-3 bg-white px-5 py-2.5 rounded-2xl border shadow-sm transition-all hover:border-primary/20">
                        <Checkbox 
                            id="select-all" 
                            checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            className="h-5 w-5 rounded-md border-primary/30 data-[state=checked]:bg-primary"
                        />
                        <Label htmlFor="select-all" className="font-black text-xs uppercase tracking-widest opacity-70 cursor-pointer">Seleccionar Todos ({selectedStudents.size})</Label>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        size="sm"
                        variant="secondary"
                        className="rounded-xl h-11 px-6 font-bold shadow-md hover:shadow-lg transition-all"
                        onClick={() => setIsMailerOpen(true)}
                        disabled={selectedStudents.size === 0}
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Reportes ({selectedStudents.size})
                    </Button>
                    <Button 
                        size="sm"
                        className="rounded-xl h-11 px-8 font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        onClick={handleDownloadZip}
                        disabled={selectedStudents.size === 0 || downloadProgress > 0}
                    >
                        {downloadProgress > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="md:mr-2 h-4 w-4" />}
                         Descargar ZIP (PDFs)
                    </Button>
                </div>
            </div>
           )}

           {downloadProgress > 0 && (
                <Card className="p-8 border-none bg-primary/10 rounded-3xl animate-in zoom-in-95 duration-500 shadow-xl shadow-primary/5">
                    <div className="space-y-5">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xl font-black text-primary tracking-tight">{downloadStatus}</p>
                                <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest mt-1">Generando documentos vectoriales de alta precisión...</p>
                            </div>
                            <span className="text-3xl font-black tabular-nums text-primary">{Math.round(downloadProgress)}%</span>
                        </div>
                        <Progress value={downloadProgress} className="h-4 bg-white/50 rounded-full border border-primary/10 shadow-inner" />
                        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground italic opacity-70">
                            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                            <AlertTriangle className="h-4 w-4 text-destructive" /> No cierres ni recargues esta ventana hasta finalizar.
                        </div>
                    </div>
                </Card>
           )}

          {filteredStudents.length > 0 ? (
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                  <ListChecks className="h-3 w-3" /> Resultados: {filteredStudents.length} de {initialFilteredStudents.length} alumnos
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {filteredStudents.map(student => {
                      const changesForCard = latestComparison[student.id] || [];
                      return (
                        <StudentCard 
                          key={student.id} 
                          student={student} 
                          teams={teams}
                          changes={changesForCard}
                          startOpen={false} 
                          isSelected={selectedStudents.has(student.id)}
                          onSelectionChange={handleSelectionChange}
                        />
                      );
                    })}
                </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white/30 rounded-3xl border-2 border-dashed border-primary/10 animate-in fade-in duration-1000">
                <Users className="h-20 w-20 text-primary/10 mx-auto mb-6" />
                <h3 className="text-2xl font-black opacity-40">Sin coincidencias</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">No hay alumnos que coincidan con tu búsqueda o los filtros actuales.</p>
            </div>
          )}
        </section>
      )}
      <MailerDialog open={isMailerOpen} onOpenChange={setIsMailerOpen} students={studentsForMailer} loadStudentSubjects={loadStudentSubjects} />
      
      {/* Hidden but ACTIVE container for ZIP worker rendering */}
      <div 
        ref={workerContainerRef} 
        className="fixed top-0 left-0 -z-50 pointer-events-none opacity-100 visible" 
        style={{ width: '800px', transform: 'translateX(-2000px)' }} 
      />
    </div>
  );
}
