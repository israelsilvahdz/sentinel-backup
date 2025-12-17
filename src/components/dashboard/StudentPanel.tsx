

"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Loader2, X, Search, ClipboardCopy, Check, Contact, Printer, Award, Mail, Download, Send, AlertTriangle, FileWarning, Eye } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { StudentCard } from './StudentCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Student, StudentContact, Subject, Team, SubjectSummary } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileUpload } from './FileUpload';
import { parseDirectoryExcel, parseAthletesExcel } from '@/lib/excelParser';
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
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { StudentReportImage } from './StudentReportImage';
import { ScrollArea } from '../ui/scroll-area';
import { getStudentOverallRisk, type RiskLevel } from '@/lib/dataProcessor';
import { Progress } from '../ui/progress';


// JS getDay() -> 0:Dom, 1:Lun, 2:Mar, 3:Mie, 4:Jue, 5:Vie, 6:Sab
const DATE_FNS_DAY_TO_KEY: Record<number, string> = {
    1: 'LUN',
    2: 'MAR',
    3: 'MIER',
    4: 'JUE',
    5: 'VIER',
};


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
        
        const mailtoBody = `Estimados profesores,

Les notifico que los siguientes alumnos se ausentarán por motivo de "${reason}" ${dateText}.

Alumnos: ${studentsListText}.

${notes ? `Notas adicionales: ${notes}\n\n` : ''}Si desean una tabla más detallada con matrículas y grupos, pueden reemplazar la lista de alumnos pegando la tabla que se ha copiado al portapapeles.

Saludos cordiales,`;

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
                            <span className="font-bold">{filteredAthletes.length}</span> alumno(s) seleccionado(s).
                        </p>
                    </div>
                    <Label className="font-semibold pt-4">2. Selecciona el rango de fechas</Label>
                    <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={es}
                        classNames={{
                            day_selected: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:bg-destructive/90",
                            day_range_start: "day-range-start",
                            day_range_end: "day-range-end",
                            day_range_middle: "bg-destructive/20 text-accent-foreground",
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
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. El torneo es en la ciudad de..." />
                    </div>
                    <div>
                        <Label className="font-semibold">5. Profesores a Notificar</Label>
                        <Card className="mt-2 p-3 bg-muted/50 max-h-48 overflow-y-auto">
                            {teachers.length > 0 ? (
                                <ul className="text-sm list-disc list-inside">
                                    {teachers.map(t => (
                                        <li key={t.name}>{t.name} {!t.email && <span className="text-destructive text-xs font-semibold">(Sin correo)</span>}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">Selecciona un deporte y fecha para ver los profesores.</p>
                            )}
                        </Card>
                    </div>
                    <DialogFooter className="pt-4">
                         <Button variant="outline" onClick={handleCopyToClipboard}>
                            <ClipboardCopy className="mr-2 h-4 w-4" />
                            Copiar Tabla
                        </Button>
                        <Button onClick={handleOpenMail}>
                           <Mail className="mr-2 h-4 w-4" />
                           Abrir Borrador de Correo
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
  includeTutor: boolean;
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
        includeTutor: false,
        includeGroups: true,
        includeOnlineFlexGroups: false,
        includeStudentPhone: false,
        includeParentPhones: false,
    });

    const handlePrint = () => {
        const headers: { key: keyof PrintOptions; label: string }[] = [
            ...(options.includeId ? [{ key: 'includeId', label: 'Matrícula' }] : []),
            ...(options.includeName ? [{ key: 'includeName', label: 'Nombre Completo' }] : []),
            ...(options.includeLeader ? [{ key: 'includeLeader', label: 'Líder' }] : []),
            ...(options.includeTutor ? [{ key: 'includeTutor', label: 'Tutor' }] : []),
            ...(options.includeGroups ? [{ key: 'includeGroups', label: 'Grupos Regulares' }] : []),
            ...(options.includeOnlineFlexGroups ? [{ key: 'includeOnlineFlexGroups', label: 'Grupos Online/Flex' }] : []),
            ...(options.includeStudentPhone ? [{ key: 'includeStudentPhone', label: 'Teléfono Alumno' }] : []),
            ...(options.includeParentPhones ? [{ key: 'includeParentPhones', label: 'Teléfonos Padres/Tutores' }] : []),
        ];

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
                        includeTutor: student.tutor,
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
                        <p>Generado el ${format(new Date(), "d 'de' LLLL 'de' yyyy", { locale: es })} - Total: ${students.length} alumnos</p>
                        <table>${tableContent}</table>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
        }
    };


    return (
        <DialogContent>
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
                    <Checkbox id="print-tutor" checked={options.includeTutor} onCheckedChange={(checked) => setOptions(o => ({...o, includeTutor: !!checked}))} />
                    <Label htmlFor="print-tutor">Tutor</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="print-groups" checked={options.includeGroups} onCheckedChange={(checked) => setOptions(o => ({...o, includeGroups: !!checked}))} />
                    <Label htmlFor="print-groups">Grupos Regulares</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="print-online-flex" checked={options.includeOnlineFlexGroups} onCheckedChange={(checked) => setOptions(o => ({...o, includeOnlineFlexGroups: !!checked}))} />
                    <Label htmlFor="print-online-flex">Grupos Online y Flex</Label>
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
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Generar e Imprimir
                </Button>
            </div>
        </DialogContent>
    );
}

function MailerDialog({ open, onOpenChange, students, loadStudentSubjects }: { open: boolean, onOpenChange: (open: boolean) => void, students: Student[], loadStudentSubjects: (studentId: string) => Promise<Subject[]> }) {
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
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
        const subjectSummaries = subjects.map(s => ({
            id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
            missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
            grade: s.grade, finalGrade: s.finalGrade, group: s.group,
        }));
        
        const ReportComponent = () => {
            const innerRef = useRef<HTMLDivElement>(null);
            const handleCopy = () => {
                if (innerRef.current) {
                    htmlToImage.toPng(innerRef.current, { pixelRatio: 2 })
                        .then(dataUrl => fetch(dataUrl))
                        .then(res => res.blob())
                        .then(blob => {
                            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                            toast({ title: "Reporte Copiado", description: `El reporte de ${student.name} está en tu portapapeles.` });
                        })
                        .catch(err => {
                             toast({ variant: "destructive", title: "Error al Copiar", description: "No se pudo procesar la imagen para copiar." });
                             console.error(err);
                        });
                }
            };

            return (
                <div>
                     <div ref={innerRef}>
                        <StudentReportImage student={student} subjects={subjectSummaries} />
                    </div>
                    <DialogFooter className="mt-4">
                        <Button onClick={handleCopy}>
                            <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar Imagen
                        </Button>
                    </DialogFooter>
                </div>
            )
        }

        setDialogContent(
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reporte de {student.name}</DialogTitle>
                    <DialogDescription>Copia la imagen y pégala en tu cliente de correo.</DialogDescription>
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generar Reportes Individuales</DialogTitle>
                        <DialogDescription>
                            Selecciona un alumno para generar su reporte visual.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] -mx-6 px-6">
                        <div className="py-4 space-y-2">
                            {students.map(student => (
                                <div key={student.id} className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-sm">{student.name}</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleGenerateAndCopy(student)}
                                        disabled={isGenerating && selectedStudent?.id === student.id}
                                    >
                                        {isGenerating && selectedStudent?.id === student.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Eye className="mr-2 h-4 w-4" />
                                        )}
                                        Generar Reporte
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
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
    studentContacts,
    setStudentContacts,
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
  } = useDashboardFilters();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [directoryFile, setDirectoryFile] = useState<File | null>(null);
  const [athletesFile, setAthletesFile] = useState<File | null>(null);
  const [isProcessingDirectory, setIsProcessingDirectory] = useState(false);
  const [isProcessingAthletes, setIsProcessingAthletes] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isMailerOpen, setIsMailerOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');


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
          title: "Directorio Guardado en la Nube",
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
        
        const CHUNK_SIZE = 50;
        const studentChunks = [];
        const studentArray = Array.from(selectedStudents);

        for (let i = 0; i < studentArray.length; i += CHUNK_SIZE) {
            studentChunks.push(studentArray.slice(i, i + CHUNK_SIZE));
        }

        setDownloadStatus(`Iniciando descarga en ${studentChunks.length} partes...`);
        setDownloadProgress(0);

        const generateImage = async (student: Student): Promise<Blob | null> => {
            const subjects = await loadStudentSubjects(student.id);
            const subjectSummaries = subjects.map(s => ({
                id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
                missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
                grade: s.grade, finalGrade: s.finalGrade, group: s.group,
            }));

            const node = document.createElement('div');
            node.style.position = 'fixed';
            node.style.top = '-9999px';
            node.style.left = '0px';
            document.body.appendChild(node);
            
            const { createRoot } = await import('react-dom/client');
            const root = createRoot(node);
            const ref = React.createRef<HTMLDivElement>();
            
            const ReportComponent = React.forwardRef<HTMLDivElement>((props, fwdRef) => <StudentReportImage ref={fwdRef} student={student} subjects={subjectSummaries} />);
            ReportComponent.displayName = 'ReportComponent';
            
            return new Promise((resolve) => {
                root.render(<ReportComponent ref={ref} />);
                
                setTimeout(async () => {
                    if (ref.current) {
                        try {
                            const blob = await htmlToImage.toBlob(ref.current, { pixelRatio: 1.5 });
                            resolve(blob);
                        } catch (err) {
                            console.error(`Failed to generate image for student ${student.name}`, err);
                            resolve(null);
                        } finally {
                            root.unmount();
                            document.body.removeChild(node);
                        }
                    } else {
                        resolve(null);
                    }
                }, 500); 
            });
        };

        let totalCompleted = 0;
        
        for (let i = 0; i < studentChunks.length; i++) {
            const chunk = studentChunks[i];
            const zip = new JSZip();
            setDownloadStatus(`Generando reportes para el lote ${i + 1} de ${studentChunks.length}...`);

            for (const studentId of chunk) {
                const student = allStudentsMap.get(studentId);
                if (student) {
                    const blob = await generateImage(student);
                    if (blob) {
                        const sanitizedName = student.name.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_');
                        zip.file(`${sanitizedName}_reporte.png`, blob);
                    }
                }
                totalCompleted++;
                setDownloadProgress((totalCompleted / studentArray.length) * 100);
            }

            setDownloadStatus(`Comprimiendo lote ${i + 1}...`);
            const zipContent = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipContent);
            link.download = `reportes_parte_${i + 1}_de_${studentChunks.length}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        toast({
            title: "Descarga Completa",
            description: `Se han descargado los reportes en ${studentChunks.length} archivo(s) ZIP.`,
        });

        setDownloadStatus('');
        setDownloadProgress(0);
        setSelectedStudents(new Set());
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

  const caseTypeMap = {
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
  };

  const getPanelTitle = () => {
    if (caseType && caseTypeMap[caseType]) {
        return <p className="text-muted-foreground">Mostrando: {caseTypeMap[caseType]}</p>;
    }
    if (subjectRiskFilter) {
        const riskTypeText = subjectRiskFilter.riskType === 'absences' ? 'Faltas' : 'Tareas (NE)';
        return <p className="text-muted-foreground">Mostrando: Alumnos en riesgo por <span className="font-semibold text-primary">{riskTypeText}</span> en <span className="font-semibold text-primary">{subjectRiskFilter.subjectName}</span></p>;
    }
    return <p className="text-muted-foreground">Explora y monitorea los casos individuales de cada alumno.</p>;
  };

  const handleClearFilter = () => {
    setCaseType(null);
    setSubjectRiskFilter(null);
  };
  
  const hasActiveFilter = !!caseType || !!subjectRiskFilter;

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
       <header className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Panel de Alumnos</h1>
                <div className="flex items-center gap-2 mt-2">
                    {getPanelTitle()}
                    {hasActiveFilter && (
                        <Button variant="ghost" size="sm" onClick={handleClearFilter}>
                        <X className="mr-2 h-4 w-4"/>
                        Limpiar filtro
                        </Button>
                    )}
                </div>
            </div>
             <div className="flex items-center gap-2 flex-wrap">
                <FileUpload 
                  onFileSelect={handleDirectoryUpload}
                  selectedFile={directoryFile}
                  isLoading={isProcessingDirectory}
                  label="Cargar Directorio"
                  icon={<Contact />}
                  variant="secondary"
                />
                 <FileUpload 
                  onFileSelect={handleAthletesUpload}
                  selectedFile={athletesFile}
                  isLoading={isProcessingAthletes}
                  label="Cargar Atletas"
                  icon={<Award />}
                  variant="secondary"
                />
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" disabled={athleteStudents.length === 0}>
                            <Mail className="mr-2 h-4 w-4"/> Notificar Ausencia de Atletas
                        </Button>
                    </DialogTrigger>
                    <AthleteNotificationDialog students={athleteStudents} teams={teams} filterType={filterType} selectedLeader={selectedValue} />
                </Dialog>
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Lista
                        </Button>
                    </DialogTrigger>
                    <PrintListDialog students={filteredStudents} contacts={studentContacts} />
                </Dialog>
                {hasData && (
                <TooltipProvider>
                    <Tooltip open={isCopied}>
                        <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handleCopyDirectory}>
                            {isCopied ? <Check className="text-primary"/> : <ClipboardCopy />}
                            Copiar Directorio
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isCopied ? '¡Directorio Copiado!' : 'Copiar contactos de los alumnos filtrados'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                )}
            </div>
        </div>
      </header>

      {hasData && (
        <>
          <div className="flex gap-4 items-center mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Buscar alumno por nombre, matrícula o teléfono..."
                    className="pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
          </div>
          
           {filteredStudents.length > 0 && (
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="select-all" 
                            checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                        <Label htmlFor="select-all">Seleccionar Todos ({selectedStudents.size})</Label>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={() => setIsMailerOpen(true)}
                        disabled={selectedStudents.size === 0}
                    >
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar Correo ({selectedStudents.size})
                    </Button>
                    <Button 
                        onClick={handleDownloadZip}
                        disabled={selectedStudents.size === 0 || downloadProgress > 0}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Reportes ({selectedStudents.size})
                    </Button>
                </div>
            </div>
           )}
           {downloadProgress > 0 && (
                <div className="space-y-2">
                    <Progress value={downloadProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground">{downloadStatus}</p>
                </div>
           )}

          {filteredStudents.length > 0 ? (
            <div className="space-y-4">
                <div className="text-sm text-muted-foreground font-medium">
                  Mostrando {filteredStudents.length} de {initialFilteredStudents.length} alumnos.
                </div>
                {filteredStudents.map(student => (
                  <StudentCard 
                    key={student.id} 
                    student={student} 
                    teams={teams}
                    startOpen={false} 
                    isSelected={selectedStudents.has(student.id)}
                    onSelectionChange={handleSelectionChange}
                  />
                ))}
            </div>
          ) : (
            <Card className="text-center p-12">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>No se encontraron alumnos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                      No se encontraron alumnos con los filtros o término de búsqueda seleccionados.
                    </p>
                </CardContent>
            </Card>
          )}
        </>
      )}
      <MailerDialog open={isMailerOpen} onOpenChange={setIsMailerOpen} students={studentsForMailer} loadStudentSubjects={loadStudentSubjects} />
    </div>
  );
}
