

"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Loader2, X, Search, ClipboardCopy, Check, Contact, Printer, Award, Mail } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { StudentCard } from './StudentCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Student, StudentContact, Subject } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileUpload } from './FileUpload';
import { parseDirectoryExcel, parseAthletesExcel } from '@/lib/excelParser';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { curriculum } from '@/lib/curriculum';


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

const onlineFlexSubjects = new Set(
    curriculum.flatMap(term => term.courses.filter(c => c.isFlexible).map(c => c.name))
);
onlineFlexSubjects.add('Ciencias de la Vida');
onlineFlexSubjects.add('El mundo contemporáneo');


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

export function StudentPanel() {
  const { 
    allStudents,
    filteredStudents: initialFilteredStudents, 
    studentContacts,
    setStudentContacts,
    athletes,
    setAthletes,
    hasData, 
    isLoading, 
    caseType, 
    setCaseType, 
    subjectRiskFilter,
    setSubjectRiskFilter,
  } = useDashboardFilters();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [directoryFile, setDirectoryFile] = useState<File | null>(null);
  const [athletesFile, setAthletesFile] = useState<File | null>(null);
  const [isProcessingDirectory, setIsProcessingDirectory] = useState(false);
  const [isProcessingAthletes, setIsProcessingAthletes] = useState(false);

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
      const parsedAthletes = await parseAthletesExcel(file);
      if (parsedAthletes) {
        setAthletes(parsedAthletes);
        // We also need to update the `sport` property on the currently loaded students
        const updatedStudents = allStudents.map(student => ({
            ...student,
            sport: parsedAthletes[student.name] || student.sport,
        }));
        // This is tricky, because useDashboardFilters doesn't expose setAllStudents directly
        // For now, we rely on the fact that the next main report load will pick this up.
        toast({
          title: "Lista de Atletas Actualizada",
          description: `Se procesaron ${Object.keys(parsedAthletes).length} atletas. La lista se aplicará en la próxima carga de reporte diario.`,
        });
      } else {
        throw new Error("El archivo de atletas no tiene el formato esperado o está vacío.");
      }
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
  }, [setAthletes, toast, allStudents]);


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


  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  const caseTypeMap = {
    lost: 'Casos Perdidos',
    urgent: 'Casos Urgentes',
    observation: 'Alumnos en Observación',
    extraordinary: 'Alumnos con derecho a extraordinario',
    changes: 'Alumnos con Cambios Detectados',
    incompleteGrade: 'Alumnos con Calificaciones Incompletas (SC)',
    newAbsences: 'Alumnos con Nuevas Faltas',
    newMissedAssignments: 'Alumnos con Nuevas Tareas No Entregadas',
  };

  const getPanelTitle = () => {
    if (caseType) {
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

          {filteredStudents.length > 0 ? (
            <div className="space-y-4">
                <div className="text-sm text-muted-foreground font-medium">
                  Mostrando {filteredStudents.length} de {initialFilteredStudents.length} alumnos.
                </div>
                {filteredStudents.map(student => (
                  <StudentCard 
                    key={student.id} 
                    student={student} 
                    startOpen={false} 
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
    </div>
  );
}



