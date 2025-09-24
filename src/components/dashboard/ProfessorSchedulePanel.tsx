
"use client";

import React, { useState, useMemo } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Subject } from '@/types/student';
import { Contact, Search, Copy, Mail, CalendarDays } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import professorContacts from '@/lib/professor-contacts.json';


interface ProfessorClass {
  subjectName: string;
  group: string;
  days: string[];
  time: string;
  studentCount: number;
}

const contactsMap = new Map<string, string>(
  Object.entries(professorContacts).map(([name, email]) => [
    name.toLowerCase().replace(/\s+/g, ''),
    email,
  ])
);

const getProfessorEmail = (name: string): string | null => {
    if (!name) return null;
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    return contactsMap.get(normalizedName) || null;
}


export function ProfessorSchedulePanel() {
  const { allStudents, filteredStudents, isLoading, selectedValue } = useDashboardFilters();
  const [selectedProfessor, setSelectedProfessor] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const { toast } = useToast();

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
    if (!selectedProfessor || !allStudents) {
      return [];
    }

    const classesMap = new Map<string, ProfessorClass>();

    allStudents.forEach(student => {
      student.subjects?.forEach(subject => {
        if (subject.professorName === selectedProfessor && subject.schedule) {
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
  }, [selectedProfessor, allStudents]);
  
  const handleCopyEmails = () => {
    let professorsToGetEmailsFrom = professorList;

    if (selectedDay !== 'all') {
        const professorsForDay = new Set<string>();
        allStudents.forEach(student => {
            student.subjects?.forEach(subject => {
                // Check if this subject is on the selected day and taught by a professor in our current list
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
      .map(prof => getProfessorEmail(prof))
      .filter(Boolean); // Filtra los nulos o vacíos

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


  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Horarios de Profesores</h1>
        <p className="text-muted-foreground">
          Selecciona un profesor para ver su horario de clases y el número de alumnos por grupo. La lista se filtra según el Líder o Tutor seleccionado.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Seleccionar Profesor
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Select onValueChange={setSelectedProfessor} value={selectedProfessor || ''} disabled={isLoading}>
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
          </div>
        </CardContent>
      </Card>

      {selectedProfessor && (
        <Card>
          <CardHeader>
            <CardTitle>Horario de {selectedProfessor}</CardTitle>
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
