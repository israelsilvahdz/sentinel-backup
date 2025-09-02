
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
} from '@/components/ui/sidebar';
import { FileUpload } from './FileUpload';
import { Dashboard } from './Dashboard';
import { DashboardFilters } from './DashboardFilters';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw } from 'lucide-react';

import type { Student, Change, Subject } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { deleteAllData, processAndSaveData, getAllStudents, getStudentSubjects, getStudentHistory } from '@/lib/firestore';

type FilterType = 'leader' | 'tutor' | 'subject';

interface DashboardContextType {
  filteredStudents: Student[];
  allStudents: Student[];
  changes: Change[];
  isLoading: boolean;
  hasData: boolean;
  leaders: string[];
  tutors: string[];
  subjects: string[];
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  selectedValue: string | null;
  setSelectedValue: (value: string | null) => void;
  loadStudentSubjects: (studentId: string) => Promise<Subject[]>;
  getStudentChanges: (studentId: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboardFilters() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardProvider');
  }
  return context;
}


export function DashboardClient({ initialStudents }: { initialStudents: Student[]}) {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Student[]>(initialStudents);
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  
  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedValue(null);
  };
  
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
        const students = await getAllStudents();
        setAllStudents(students);
    } catch(e) {
        console.error(e);
        toast({
            variant: 'destructive',
            title: 'Error de Carga',
            description: 'No se pudieron recargar los datos. Revisa tus permisos de Firestore.',
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  // Fetch initial data on component mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);


  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await parseExcel(file);
      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Error de Formato',
          description: 'El archivo Excel no tiene el formato esperado, está vacío o faltan columnas requeridas.',
        });
        setIsLoading(false);
        return;
      }
      
      const { processed, changes } = await processAndSaveData(data);

      toast({
        title: 'Éxito',
        description: `Se procesaron ${processed} alumnos y se detectaron ${changes} cambios.`,
      });

      await refreshData();

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error al procesar',
        description: `Hubo un problema al guardar los datos. Revisa la consola para más detalles.`,
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción es irreversible.')) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteAllData();
      setAllStudents([]);
      setChanges([]);
      toast({
        title: 'Datos Eliminados',
        description: 'Todos los datos han sido borrados de Firestore.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al Eliminar',
        description: 'No se pudieron borrar los datos. Revisa los permisos de Firestore.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const leaders = useMemo(() => [...new Set(allStudents.map(s => s.leader).filter(Boolean))], [allStudents]);
  const tutors = useMemo(() => [...new Set(allStudents.map(s => s.tutor).filter(Boolean))], [allStudents]);
  
  const subjects = useMemo(() => {
      const allSubjects = allStudents.flatMap(s => s.subjects?.map(sub => sub.name) || []);
      return [...new Set(allSubjects.filter(Boolean))];
  }, [allStudents]);


  const filteredStudents = useMemo(() => {
    if (!selectedValue) return allStudents;
    let students = allStudents;
    if (filterType === 'leader') {
      students = students.filter(s => s.leader === selectedValue);
    }
    if (filterType === 'tutor') {
      students = students.filter(s => s.tutor === selectedValue);
    }
    if (filterType === 'subject') {
      students = students.filter(s => s.subjects?.some(sub => sub.name === selectedValue));
    }
    return students;
  }, [allStudents, filterType, selectedValue]);
  
  const loadStudentSubjects = async (studentId: string): Promise<Subject[]> => {
    try {
      return await getStudentSubjects(studentId);
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las materias del alumno.' });
      return [];
    }
  }
  
  const getStudentChanges = async (studentId: string) => {
     try {
      const studentChanges = await getStudentHistory(studentId);
      setChanges(prev => [...prev.filter(c => c.studentId !== studentId), ...studentChanges]);
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial del alumno.' });
    }
  }

  const contextValue: DashboardContextType = {
    filteredStudents,
    allStudents,
    changes,
    isLoading,
    hasData: allStudents.length > 0,
    leaders,
    tutors,
    subjects,
    filterType,
    setFilterType: handleSetFilterType,
    selectedValue,
    setSelectedValue,
    loadStudentSubjects,
    getStudentChanges
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <h2 className="text-xl font-semibold">Filtros</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <DashboardFilters />
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
                 <SidebarTrigger className="md:hidden"/>
                 <div className="flex-1">
                    <h1 className="font-semibold text-lg">Academic Sentinel</h1>
                 </div>
                 <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recargar
                 </Button>
                 <Button variant="destructive" size="sm" onClick={handleDeleteAllData} disabled={isLoading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Borrar Datos (Test)
                </Button>
                <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
            </header>
            <Dashboard />
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
