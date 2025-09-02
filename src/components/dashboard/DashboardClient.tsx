
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
import { CoursePlanner } from './CoursePlanner'; // Importar el nuevo panel
import { DashboardFilters } from './DashboardFilters';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, UploadCloud, CalendarClock, LayoutDashboard, Users, BookMarked } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import type { Student, Change, Subject, UploadHistory, StudentData } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { findLostCases, findObservationCases, findRiskCasesBySubject, findUrgentCases } from '@/lib/dataProcessor';

type FilterType = 'leader' | 'tutor' | 'subject';
export type CaseType = 'lost' | 'urgent' | 'observation';
export type ActiveView = 'dashboard' | 'students' | 'history' | 'planner'; // Añadir nueva vista
export type SubjectRiskFilter = { subjectName: string; riskType: 'absences' | 'missedAssignments' };


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
  subjectRiskFilter: SubjectRiskFilter | null;
  setSubjectRiskFilter: (filter: SubjectRiskFilter | null) => void;
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

const LOCAL_STORAGE_KEYS = {
    STUDENTS: 'academic_sentinel_students',
    HISTORY: 'academic_sentinel_history',
    UPLOADS: 'academic_sentinel_uploads',
};

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
  const [studentHistory, setStudentHistory] = useState<Record<string, Change[]>>({});
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [subjectRiskFilter, setSubjectRiskFilter] = useState<SubjectRiskFilter | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Load data from local storage on initial mount
  useEffect(() => {
    try {
      const storedStudents = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
      if (storedStudents) setAllStudents(JSON.parse(storedStudents));

      const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
      if (storedHistory) setStudentHistory(JSON.parse(storedHistory));

      const storedUploads = localStorage.getItem(LOCAL_STORAGE_KEYS.UPLOADS);
      if (storedUploads) setUploadHistory(JSON.parse(storedUploads));
    } catch (error) {
        console.error("Error loading data from Local Storage", error);
        // If parsing fails, clear the corrupted data
        localStorage.removeItem(LOCAL_STORAGE_KEYS.STUDENTS);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.HISTORY);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.UPLOADS);
    }
    setIsLoading(false);
  }, []);

  // Persist data to local storage whenever it changes
  useEffect(() => {
    try {
        if(allStudents.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(allStudents));
        }
        if(Object.keys(studentHistory).length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(studentHistory));
        }
        if(uploadHistory.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.UPLOADS, JSON.stringify(uploadHistory));
        }
    } catch(error) {
        console.error("Error saving data to Local Storage", error);
        toast({
          variant: 'destructive',
          title: 'Error de guardado',
          description: 'No se pudo guardar la información en el navegador. Es posible que el almacenamiento esté lleno.',
        });
    }
  }, [allStudents, studentHistory, uploadHistory]);


  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedValue(null);
    setCaseType(null); // Reset case type when changing main filter
    setSubjectRiskFilter(null);
  };

  const handleSetActiveView = (view: ActiveView) => {
    setActiveView(view);
    if (view !== 'students') {
      setCaseType(null); // Reset case type when navigating away from the student panel
      setSubjectRiskFilter(null);
    }
     if (view !== 'history') {
        setSelectedStudentId(null);
    }
  }

  const handleSetCaseType = (type: CaseType | null) => {
    setCaseType(type);
    setSubjectRiskFilter(null); // Clear other filters
  };

  const handleSetSubjectRiskFilter = (filter: SubjectRiskFilter | null) => {
    setSubjectRiskFilter(filter);
    setCaseType(null); // Clear other filters
  };

  const processData = (studentData: StudentData) => {
      const currentStudents = [...allStudents];
      const newHistory: Record<string, Change[]> = { ...studentHistory };
      let changesCount = 0;

      const newStudents = Object.values(studentData).map(incomingStudent => {
          const existingStudent = currentStudents.find(s => s.id === incomingStudent.id);
          
          if (existingStudent?.subjects && incomingStudent.subjects) {
              for (const incomingSubject of incomingStudent.subjects) {
                  const existingSubject = existingStudent.subjects.find(s => s.id === incomingSubject.id);
                  if (existingSubject) {
                      const fieldsToCompare: (keyof Subject)[] = ['absences', 'missedAssignments', 'grade', 'finalGrade', 'statusDescription'];
                      fieldsToCompare.forEach(field => {
                          if (existingSubject[field] !== incomingSubject[field]) {
                              if (!newHistory[incomingStudent.id]) newHistory[incomingStudent.id] = [];
                              newHistory[incomingStudent.id].push({
                                  date: new Date().toISOString(),
                                  studentId: incomingStudent.id,
                                  subjectId: incomingSubject.id,
                                  fieldName: field,
                                  oldValue: existingSubject[field],
                                  newValue: incomingSubject[field],
                              });
                              changesCount++;
                          }
                      });
                  }
              }
          }
          
          return {
              ...incomingStudent,
              subjectSummaries: (incomingStudent.subjects || []).map(s => ({
                  id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
                  missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
                  grade: s.grade, finalGrade: s.finalGrade
              })),
          };
      });

      setAllStudents(newStudents);
      setStudentHistory(newHistory);
      return { processed: newStudents.length, changes: changesCount };
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgress(10);
    try {
      const data = await parseExcel(file);
      setProgress(40);
      if (!data || Object.keys(data).length === 0) {
        toast({
          variant: 'destructive',
          title: 'Error de Formato',
          description: 'El archivo Excel no tiene el formato esperado o está vacío.',
        });
        setIsProcessing(false);
        setProgress(0);
        return;
      }
      
      setProgress(60);
      const { processed, changes } = processData(data);
      setProgress(90);

      setUploadHistory(prev => [{ id: Date.now().toString(), fileName: file.name, uploadedAt: new Date().toISOString() }, ...prev].slice(0, 10));

      toast({
        title: 'Éxito',
        description: `Se procesaron ${processed} alumnos y se detectaron ${changes} cambios.`,
      });

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error al procesar',
        description: `Hubo un problema al procesar el archivo. Revisa la consola.`,
      });
      console.error(error);
    } finally {
        setTimeout(() => {
          setIsProcessing(false);
          setProgress(0);
        }, 500);
    }
  };

  const handleDeleteAllData = () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción es irreversible.')) {
      return;
    }
    setIsProcessing(true);
    setProgress(20);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.STUDENTS);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.HISTORY);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.UPLOADS);

      setAllStudents([]);
      setStudentHistory({});
      setUploadHistory([]);
      
      setProgress(100);
      toast({
          title: 'Datos Eliminados',
          description: 'Todos los datos guardados en el navegador han sido borrados.',
      });
    } catch (error) {
       console.error("Error clearing Local Storage", error);
       toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron borrar los datos del almacenamiento local.',
       });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
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

    if (selectedValue) {
      if (filterType === 'leader') students = students.filter(s => s.leader === selectedValue);
      if (filterType === 'tutor') students = students.filter(s => s.tutor === selectedValue);
      if (filterType === 'subject') students = students.filter(s => s.subjectSummaries?.some(sub => sub.name === selectedValue));
    }
    
    if (caseType) {
        if(caseType === 'lost') return findLostCases(students);
        const lostCaseIds = new Set(findLostCases(students).map(s => s.id));
        if (caseType === 'urgent') return findUrgentCases(students, lostCaseIds);
        if (caseType === 'observation') {
             const urgentCaseIds = new Set(findUrgentCases(students, lostCaseIds).map(s => s.id));
             const combinedExclusions = new Set([...lostCaseIds, ...urgentCaseIds]);
             return findObservationCases(students, combinedExclusions);
        }
    }

    if (subjectRiskFilter) {
      return findRiskCasesBySubject(students, subjectRiskFilter.subjectName, subjectRiskFilter.riskType);
    }

    return students;
  }, [allStudents, filterType, selectedValue, caseType, subjectRiskFilter]);
  
  const loadStudentSubjectsWrapper = async (studentId: string): Promise<Subject[]> => {
    const student = allStudents.find(s => s.id === studentId);
    return student?.subjects || [];
  }
  
  const getStudentChangesWrapper = async (studentId: string): Promise<Change[]> => {
     return studentHistory[studentId] || [];
  }

  const contextValue: DashboardContextType = {
    filteredStudents, allStudents,
    isLoading: isLoading || isProcessing,
    hasData: allStudents.length > 0,
    leaders, tutors, subjects,
    filterType, setFilterType: handleSetFilterType,
    selectedValue, setSelectedValue,
    caseType, setCaseType: handleSetCaseType,
    subjectRiskFilter, setSubjectRiskFilter: handleSetSubjectRiskFilter,
    loadStudentSubjects: loadStudentSubjectsWrapper,
    getStudentChanges: getStudentChangesWrapper,
    activeView, setActiveView: handleSetActiveView,
    selectedStudentId, setSelectedStudentId
  };

  const renderActiveView = () => {
    switch (activeView) {
        case 'dashboard': return <Dashboard />;
        case 'students': return <StudentPanel />;
        case 'history': return <StudentHistoryPanel />;
        case 'planner': return <CoursePlanner />;
        default: return <Dashboard />;
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
                  <SidebarMenuButton tooltip="Dashboard" isActive={activeView === 'dashboard'} onClick={() => handleSetActiveView('dashboard')}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Panel de Alumnos" isActive={activeView === 'students'} onClick={() => handleSetActiveView('students')}>
                    <Users />
                    <span>Panel de Alumnos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planificador de Carga" isActive={activeView === 'planner'} onClick={() => handleSetActiveView('planner')}>
                    <BookMarked />
                    <span>Planificador</span>
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
                    <li key={upload.id} className="text-muted-foreground truncate" title={upload.fileName}>
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
                 <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={isLoading || isProcessing}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recargar
                 </Button>
                 <Button variant="destructive" size="sm" onClick={handleDeleteAllData} disabled={isLoading || isProcessing}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Borrar Datos
                </Button>
                <FileUpload onFileUpload={handleFileUpload} isLoading={isProcessing}>
                   <UploadCloud className="mr-2" />
                   Cargar Reporte
                </FileUpload>
            </header>
            {(isProcessing || isLoading) && progress >= 0 && <Progress value={progress} className="w-full h-1" />}
            {renderActiveView()}
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}

    