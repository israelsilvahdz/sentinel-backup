
"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Loader2, X, Search, ClipboardCopy, Check, Contact, Printer, Award, Mail, Download, Send, AlertTriangle, FileWarning, Eye, Zap, Filter, ListChecks } from 'lucide-react';
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
import { StudentGradesReportImage } from './StudentGradesReportImage';
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
        const headers: { key: keyof PrintOptions; label: string }[] = [
            ...(options.includeId ? [{ key: 'includeId', label: 'Matrícula' }] : []),
            ...(options.includeName ? [{ key: 'includeName', label: 'Nombre Completo' }] : []),
            ...(options.includeLeader ? [{ key: 'includeLeader', label: 'Líder' }] : []),
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
            const [isExporting, setIsExporting] = useState(false);

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

            const handleDownload = async () => {
                if (innerRef.current) {
                    setIsExporting(true);
                    try {
                        const dataUrl = await htmlToImage.toPng(innerRef.current, { pixelRatio: 2 });
                        const link = document.createElement('a');
                        link.download = `Reporte_${student.name.replace(/\s+/g, '_')}.png`;
                        link.href = dataUrl;
                        link.click();
                        toast({ title: "Reporte Descargado", description: "La imagen se ha guardado en tu dispositivo." });
                    } catch (err) {
                        toast({ variant: "destructive", title: "Error", description: "No se pudo descargar la imagen." });
                    } finally {
                        setIsExporting(false);
                    }
                }
            };

            return (
                <div>
                     <div className="overflow-x-auto bg-muted/20 p-2 rounded-md">
                        <div ref={innerRef} className="min-w-[800px]">
                            <StudentReportImage student={student} subjects={subjectSummaries} />
                        </div>
                    </div>
                    <DialogFooter className="mt-4 gap-2">
                        <Button variant="outline" onClick={handleDownload} disabled={isExporting} className="rounded-xl font-bold">
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Descargar
                        </Button>
                        <Button onClick={handleCopy} className="rounded-xl font-bold">
                            <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar Imagen
                        </Button>
                    </DialogFooter>
                </div>
            )
        }

        setDialogContent(
            <DialogContent className="max-w-4xl rounded-3xl">
                <DialogHeader>
                    <DialogTitle>Reporte de {student.name}</DialogTitle>
                    <DialogDescription>Copia la imagen o descárgala para enviarla por correo o mensaje.</DialogDescription>
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
        
        const studentArray = Array.from(selectedStudents);
        setDownloadStatus(`Iniciando generación de ${studentArray.length} reportes...`);
        setDownloadProgress(0);

        const { createRoot } = await import('react-dom/client');
        const zip = new JSZip();

        const renderToBlob = async (Component: any): Promise<Blob | null> => {
            const node = document.createElement('div');
            node.style.position = 'fixed';
            node.style.top = '-9999px';
            node.style.left = '0px';
            node.style.width = '800px'; 
            document.body.appendChild(node);
            const root = createRoot(node);
            const ref = React.createRef<HTMLDivElement>();
            
            return new Promise((resolve) => {
                root.render(<Component ref={ref} />);
                setTimeout(async () => {
                    if (ref.current) {
                        try {
                            const blob = await htmlToImage.toBlob(ref.current, { pixelRatio: 1.5 });
                            resolve(blob);
                        } catch (err) {
                            console.error(`Failed to generate image`, err);
                            resolve(null);
                        } finally {
                            root.unmount();
                            if (document.body.contains(node)) {
                                document.body.removeChild(node);
                            }
                        }
                    } else {
                        resolve(null);
                    }
                }, 800); 
            });
        };

        let totalCompleted = 0;
        
        for (const studentId of studentArray) {
            const student = allStudentsMap.get(studentId);
            if (student) {
                setDownloadStatus(`Procesando: ${student.name} (${totalCompleted + 1}/${studentArray.length})`);
                
                const subjects = await loadStudentSubjects(student.id);
                const subjectSummaries = subjects.map(s => ({
                    id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
                    missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
                    grade: s.grade, finalGrade: s.finalGrade, group: s.group,
                }));

                const reportBlob = await renderToBlob(React.forwardRef<HTMLDivElement>((props, ref) => <StudentReportImage ref={ref} student={student} subjects={subjectSummaries} />));
                
                const sanitizedName = student.name.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_');
                if (reportBlob) {
                    zip.file(`${sanitizedName}_reporte.png`, reportBlob);
                }
            }
            totalCompleted++;
            setDownloadProgress((totalCompleted / studentArray.length) * 100);
            
            await new Promise(r => setTimeout(r, 100));
        }

        setDownloadStatus(`Comprimiendo archivo...`);
        const zipContent = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipContent);
        link.download = `Reportes_Sentinel_${format(new Date(), 'yyyyMMdd_HHmm')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Descarga Exitosa",
            description: `Se han generado ${totalCompleted} reportes correctamente.`,
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
                      <AthleteNotificationDialog students={athleteStudents} teams={teams} filterType={filterType} selectedLeader={selectedValue} />
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
                         Descargar ZIP ({selectedStudents.size})
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
                                <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest mt-1">Renderizando motores de imagen de alta resolución...</p>
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
    </div>
  );
}
