

"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Subject, type ProfessorContact } from '@/types/student';
import { Contact, Search, Copy, Mail, CalendarDays, Edit, Save, XCircle, PlusCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { addOrUpdateProfessorContact } from '@/lib/firebase-services';
import { FileUpload } from './FileUpload';
import { parseProfessorDirectoryExcel } from '@/lib/excelParser';


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

export function ProfessorSchedulePanel() {
  const { allStudents, filteredStudents, isLoading, selectedValue, professorContacts, setProfessorContacts } = useDashboardFilters();
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
          <Select onValueChange={setSelectedProfessorName} value={selectedProfessorName || ''} disabled={isLoading}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder={isLoading ? "Cargando..." : "Elige un profesor..."} />
            </SelectTrigger>
            <SelectContent>
              {professorList.map(prof => (
                <SelectItem key={prof} value={prof}>
                  {prof}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
