

"use client";

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Loader2, X, Search, ClipboardCopy, Check, Contact } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { StudentCard } from './StudentCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Student, StudentContact } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileUpload } from './FileUpload';
import { parseDirectoryExcel } from '@/lib/excelParser';


export function StudentPanel() {
  const { 
    filteredStudents: initialFilteredStudents, 
    bitacoraEntries,
    studentContacts,
    setStudentContacts,
    hasData, 
    isLoading, 
    caseType, 
    setCaseType, 
    setActiveView, 
    setSelectedStudentId,
    subjectRiskFilter,
    setSubjectRiskFilter,
  } = useDashboardFilters();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCopied, setIsCopied] = useState(false);
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
      const contacts = await parseDirectoryExcel(file);
      if (contacts) {
        setStudentContacts(contacts);
        toast({
          title: "Directorio Cargado",
          description: `Se procesaron ${Object.keys(contacts).length} contactos del directorio.`,
        });
      } else {
        throw new Error("El archivo no tiene el formato esperado.");
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


  const filteredStudents = useMemo(() => {
    if (!searchTerm) {
      return initialFilteredStudents;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return initialFilteredStudents.filter((student: Student) => 
      student.name.toLowerCase().includes(lowercasedFilter) ||
      student.id.toLowerCase().includes(lowercasedFilter)
    );
  }, [searchTerm, initialFilteredStudents]);

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
      generatedText += `**Teléfono Alumno:** ${contact ? contact.studentPhone : 'No disponible'}\n`;
      generatedText += `**Teléfono Papá:** ${contact ? contact.dadPhone : 'No disponible'}\n`;
      generatedText += `**Teléfono Mamá:** ${contact ? contact.momPhone : 'No disponible'}\n`;
      generatedText += `**Correo Alumno:** ${contact ? contact.studentEmail : 'No disponible'}\n`;
      generatedText += `**Correo Papá:** ${contact ? contact.dadEmail : 'No disponible'}\n`;
      generatedText += `**Correo Mamá:** ${contact ? contact.momEmail : 'No disponible'}\n\n`;
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

  const handleStudentClick = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveView('history');
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
             <div className="flex items-center gap-2">
                <FileUpload 
                  onFileSelect={handleDirectoryUpload}
                  selectedFile={directoryFile}
                  isLoading={isProcessingDirectory}
                  label="Cargar Directorio"
                  icon={<Contact />}
                  variant="secondary"
                />
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
          <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                  type="text"
                  placeholder="Buscar alumno por nombre o matrícula..."
                  className="pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                    bitacoraEntries={bitacoraEntries}
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

    
