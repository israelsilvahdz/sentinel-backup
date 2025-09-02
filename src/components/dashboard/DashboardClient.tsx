

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
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { FileUpload } from './FileUpload';
import { Dashboard } from './Dashboard';
import { StudentPanel } from './StudentPanel';
import { StudentHistoryPanel } from './StudentHistoryPanel';
import { DashboardFilters } from './DashboardFilters';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, UploadCloud, CalendarClock, LayoutDashboard, Users, History } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import type { Student, Change, Subject, UploadHistory } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { deleteAllData, processAndSaveData, getAllStudents, getStudentSubjects, getStudentHistory, getUploadHistory } from '@/app/actions/firestoreActions';
import { findLostCases, findObservationCases, findUrgentCases } from '@/lib/dataProcessor';

type FilterType = 'leader' | 'tutor' | 'subject';
export type CaseType = 'lost' | 'urgent' | 'observation';
export type ActiveView = 'dashboard' | 'students' | 'history';

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
  caseType: CaseType | null;
  setCaseType: (caseType: CaseType | null) => void;
  loadStudentSubjects: (studentId: string) => Promise<Subject[]>;
  getStudentChanges: (studentId: string) => Promise<Change[]>;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboardFilters() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardProvider');
  }
  return context;
}

function formatDateFromCustomFilename(filename: string): string {
    const match = filename.match(/(\d{2})\.(\d{2})\.(\d{2})(\d{2})/);
    if (!match) return filename; 

    const [, day, month, yearSuffix, periodCode] = match;
    const year = `20${yearSuffix}`;

    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const monthName = monthNames[parseInt(month, 10) - 1] || 'mes desconocido';

    const periodMap: Record<string, string> = {
        '10': 'Tetra Enero',
        '20': 'Tetra Mayo',
        '30': 'Tetra Septiembre',
        '40': 'Semestre Enero',
        '50': 'Semestre Mayo',
        '60': 'Semestre Septiembre',
    };
    const periodName = periodMap[periodCode] || 'Periodo desconocido';

    return `${parseInt(day, 10)} de ${monthName} del ${year} (${periodName})`;
}


export function DashboardClient() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedValue(null);
    setCaseType(null); // Reset case type when changing main filter
  };

  const handleSetActiveView = (view: ActiveView) => {
    setActiveView(view);
    if (view !== 'students') {
      setCaseType(null); // Reset case type when navigating away from the student panel
    }
  }
  
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
      const allSubjects = allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.name) || []);
      return [...new Set(allSubjects.filter(Boolean))];
  }, [allStudents]);


  const filteredStudents = useMemo(() => {
    let students = allStudents;

    // Apply main filter (leader, tutor, subject)
    if (selectedValue) {
      if (filterType === 'leader') {
        students = students.filter(s => s.leader === selectedValue);
      }
      if (filterType === 'tutor') {
        students = students.filter(s => s.tutor === selectedValue);
      }
      if (filterType === 'subject') {
        students = students.filter(s => s.subjectSummaries?.some(sub => sub.name === selectedValue));
      }
    }
    
    // Apply case filter (lost, urgent, observation)
    if (caseType) {
        if(caseType === 'lost') {
            return findLostCases(students);
        }
        const lostCaseIds = new Set(findLostCases(students).map(s => s.id));
        
        if (caseType === 'urgent') {
            return findUrgentCases(students, lostCaseIds);
        }
        
        if (caseType === 'observation') {
             const urgentCaseIds = new Set(findUrgentCases(students, lostCaseIds).map(s => s.id));
             const combinedExclusions = new Set([...lostCaseIds, ...urgentCaseIds]);
             return findObservationCases(students, combinedExclusions);
        }
    }

    return students;
  }, [allStudents, filterType, selectedValue, caseType]);
  
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
    caseType,
    setCaseType,
    loadStudentSubjects: loadStudentSubjectsWrapper,
    getStudentChanges: getStudentChangesWrapper,
    activeView,
    setActiveView: handleSetActiveView,
    selectedStudentId,
    setSelectedStudentId
  };

  const renderActiveView = () => {
    switch (activeView) {
        case 'dashboard':
            return <Dashboard />;
        case 'students':
            return <StudentPanel />;
        case 'history':
             return <StudentHistoryPanel />;
        default:
            return <Dashboard />;
    }
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
             <SidebarTrigger className="ml-auto md:ml-0" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Dashboard" 
                    isActive={activeView === 'dashboard'} 
                    onClick={() => handleSetActiveView('dashboard')}
                  >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Panel de Alumnos" 
                    isActive={activeView === 'students'} 
                    onClick={() => handleSetActiveView('students')}
                  >
                    <Users />
                    <span>Panel de Alumnos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <DashboardFilters />
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2 flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <CalendarClock size={16} /> Historial de Cargas
              </h3>
              {uploadHistory.length > 0 ? (
                <ul className="space-y-1 px-2 text-sm group-data-[collapsible=icon]:hidden">
                  {uploadHistory.map(upload => (
                    <li key={upload.id} className="text-muted-foreground">
                      {formatDateFromCustomFilename(upload.fileName)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">No hay cargas.</p>
              )}
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
                 <SidebarTrigger className="md:hidden" />
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
            {renderActiveView()}
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
