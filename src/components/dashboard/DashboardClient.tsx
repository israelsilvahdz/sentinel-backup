

"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarSeparator,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { FileUpload } from './FileUpload';
import { Dashboard } from './Dashboard';
import { DashboardFilters } from './DashboardFilters';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, UploadCloud, CalendarClock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import type { Student, Change, Subject, UploadHistory } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
// Import server actions instead of directly calling firestore
import { deleteAllData, processAndSaveData, getAllStudents, getStudentSubjects, getStudentHistory, getUploadHistory } from '@/app/actions/firestoreActions';

type FilterType = 'leader' | 'tutor' | 'subject';

interface DashboardContextType {
  filteredStudents: Student[];
  allStudents: Student[];
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
  getStudentChanges: (studentId: string) => Promise<Change[]>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboardFilters() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardProvider');
  }
  return context;
}

function formatDateFromFilename(filename: string): string {
    // Extrae la parte del nombre que parece fecha (YYYYMMDD)
    const match = filename.match(/(\d{8})/);
    if (!match) return "Fecha desconocida";

    let dateStr = match[1];
    // Omite los últimos dos dígitos como se pidió
    dateStr = dateStr.substring(0, 6);
    
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Meses en JS son 0-11
    
    try {
        return new Date(year, month, 1).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
        });
    } catch {
        return "Fecha inválida";
    }
}


export function DashboardClient({ initialStudents }: { initialStudents: Student[]}) {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Student[]>(initialStudents);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  
  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedValue(null);
  };
  
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setProgress(30);
    try {
        const [students, history] = await Promise.all([
          getAllStudents(),
          getUploadHistory()
        ]);
        setAllStudents(students);
        setUploadHistory(history);
        setProgress(100);
    } catch(e) {
        console.error(e);
        toast({
            variant: 'destructive',
            title: 'Error de Carga',
            description: 'No se pudieron recargar los datos. Revisa la consola para más detalles.',
        });
    } finally {
        setTimeout(() => {
          setIsLoading(false);
          setProgress(0);
        }, 500);
    }
  }, [toast]);

  // Fetch initial data on component mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);


  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setProgress(10);
    try {
      const data = await parseExcel(file);
      setProgress(40);
      if (!data || Object.keys(data).length === 0) {
        toast({
          variant: 'destructive',
          title: 'Error de Formato',
          description: 'El archivo Excel no tiene el formato esperado, está vacío o no se encontraron alumnos. Revise la consola para más detalles.',
        });
        setIsLoading(false);
        setProgress(0);
        return;
      }
      
      setProgress(60);
      const { processed, changes } = await processAndSaveData(data, file.name);
      setProgress(90);

      toast({
        title: 'Éxito',
        description: `Se procesaron ${processed} alumnos y se detectaron ${changes} cambios.`,
      });

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error al procesar',
        description: `Hubo un problema al guardar los datos. Revisa la consola para más detalles.`,
      });
      console.error(error);
    } finally {
        await refreshData();
    }
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción es irreversible.')) {
      return;
    }
    setIsLoading(true);
    setProgress(20);
    try {
      await deleteAllData();
      setAllStudents([]);
      setUploadHistory([]);
      setProgress(100);
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
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 500);
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
  
  const loadStudentSubjectsWrapper = async (studentId: string): Promise<Subject[]> => {
    try {
      return await getStudentSubjects(studentId);
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las materias del alumno.' });
      return [];
    }
  }
  
  const getStudentChangesWrapper = async (studentId: string): Promise<Change[]> => {
     try {
      return await getStudentHistory(studentId);
    } catch(e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial del alumno.' });
      return [];
    }
  }

  const contextValue: DashboardContextType = {
    filteredStudents,
    allStudents,
    isLoading,
    hasData: allStudents.length > 0,
    leaders,
    tutors,
    subjects,
    filterType,
    setFilterType: handleSetFilterType,
    selectedValue,
    setSelectedValue,
    loadStudentSubjects: loadStudentSubjectsWrapper,
    getStudentChanges: getStudentChangesWrapper
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <h2 className="text-xl font-semibold">Controles</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <DashboardFilters />
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2 flex items-center gap-2">
                <CalendarClock size={16} /> Historial de Cargas
              </h3>
              {uploadHistory.length > 0 ? (
                <ul className="space-y-1 px-2 text-sm">
                  {uploadHistory.map(upload => (
                    <li key={upload.id} className="text-muted-foreground">
                      {formatDateFromFilename(upload.fileName)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 text-sm text-muted-foreground">No hay cargas anteriores.</p>
              )}
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
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
                    Borrar Datos
                </Button>
                <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading}>
                   <UploadCloud className="mr-2" />
                   Cargar Reporte
                </FileUpload>
            </header>
            {isLoading && progress > 0 && <Progress value={progress} className="w-full h-1" />}
            <Dashboard />
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
