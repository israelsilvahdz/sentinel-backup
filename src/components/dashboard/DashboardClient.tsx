

"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
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
  SidebarToggle,
} from '@/components/ui/sidebar';
import { FileUpload } from './FileUpload';
import { Dashboard } from './Dashboard';
import { StudentPanel } from './StudentPanel';
import { StudentHistoryPanel } from './StudentHistoryPanel';
import { ChangeStats } from './ChangeStats';
import { PonderacionesDashboard } from './PonderacionesDashboard';
import { UnclassifiedSubjectsPanel } from './UnclassifiedSubjectsPanel';
import { MapPlanner } from './MapPlanner';
import { AcademicCalendar } from './AcademicCalendar';
import { WelcomeDashboard } from './WelcomeDashboard';
import { DashboardFilters } from './DashboardFilters';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, UploadCloud, CalendarClock, LayoutDashboard, Users, BookMarked, BookCopy, HelpCircle, ChevronLeft, Map, FileCheck2, FileClock, BarChart3, CalendarDays, Home, FileText, Contact } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfessorSchedulePanel } from './ProfessorSchedulePanel';


import type { Student, Change, Subject, UploadHistory, StudentData, SubjectSummary } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { findExtraordinaryCases, findIncompleteGradeCases, findLostCases, findObservationCases, findRiskCasesBySubject, findUrgentCases } from '@/lib/dataProcessor';

type FilterType = 'leader' | 'tutor' | 'subject' | 'professor' | 'group';
export type CaseType = 'lost' | 'urgent' | 'observation' | 'extraordinary' | 'changes' | 'incompleteGrade' | 'newAbsences' | 'newMissedAssignments';
export type ActiveView = 'welcome' | 'dashboard' | 'students' | 'history' | 'ponderaciones' | 'unclassified' | 'map-planner' | 'change-stats' | 'academic-calendar' | 'bitacora' | 'professor-schedule';
export type SubjectRiskFilter = { subjectName: string; riskType: 'absences' | 'missedAssignments' };
export type PlanType = 'semestral' | 'tetramestral';


interface DashboardContextType {
  filteredStudents: Student[];
  allStudents: Student[];
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  studentHistory: Record<string, Change[]>;
  setStudentHistory: React.Dispatch<React.SetStateAction<Record<string, Change[]>>>;
  setUploadHistory: React.Dispatch<React.SetStateAction<UploadHistory[]>>;
  isLoading: boolean;
  hasData: boolean;
  leaders: string[];
  tutors: string[];
  subjects: string[];
  professors: string[];
  groups: string[];
  groupsForSubject: (subjectName: string | null) => string[];
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  selectedValue: string | null;
  setSelectedValue: (value: string | null) => void;
  groupId: string | null;
  setGroupId: (id: string | null) => void;
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
  planType: PlanType;
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
    PLAN_TYPE: 'academic_sentinel_plan_type',
};


export function DashboardClient() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentHistory, setStudentHistory] = useState<Record<string, Change[]>>({});
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [planType, setPlanType] = useState<PlanType>('tetramestral');
  
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [subjectRiskFilter, setSubjectRiskFilter] = useState<SubjectRiskFilter | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('welcome');
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
      
      const storedPlanType = localStorage.getItem(LOCAL_STORAGE_KEYS.PLAN_TYPE);
      if (storedPlanType) setPlanType(storedPlanType as PlanType);

    } catch (error) {
        console.error("Error loading data from Local Storage", error);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.STUDENTS);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.HISTORY);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.UPLOADS);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.PLAN_TYPE);
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
        localStorage.setItem(LOCAL_STORAGE_KEYS.PLAN_TYPE, planType);

    } catch(error) {
        console.error("Error saving data to Local Storage", error);
        toast({
          variant: 'destructive',
          title: 'Error de guardado',
          description: 'No se pudo guardar la información en el navegador. Es posible que el almacenamiento esté lleno.',
        });
    }
  }, [allStudents, studentHistory, uploadHistory, planType, toast]);


  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedValue(null);
    setCaseType(null);
    setSubjectRiskFilter(null);
    setGroupId(null);
  };

  const handleSetActiveView = (view: ActiveView) => {
    setActiveView(view);
    if (view !== 'students') {
      setCaseType(null);
      setSubjectRiskFilter(null);
      setGroupId(null);
    }
     if (view !== 'history') {
        setSelectedStudentId(null);
    }
  }

  const handleSetCaseType = (type: CaseType | null) => {
    setCaseType(type);
    setSubjectRiskFilter(null);
    setGroupId(null);
  };

  const handleSetSubjectRiskFilter = (filter: SubjectRiskFilter | null) => {
    setSubjectRiskFilter(filter);
    setCaseType(null);
    setGroupId(null);
  };
  
  const processSingleFile = (studentData: StudentData, fileName: string) => {
    const studentsArray = Object.values(studentData).map(student => ({
        ...student,
        subjectSummaries: (student.subjects || []).map(s => ({
          id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
          missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
          grade: s.grade, finalGrade: s.finalGrade, group: s.group
        })),
    }));
    setAllStudents(studentsArray);
    
    // Determine plan type from filename
    if (fileName.includes('40') || fileName.includes('50') || fileName.includes('60')) {
        setPlanType('semestral');
    } else {
        setPlanType('tetramestral');
    }

    return studentsArray.length;
  };

  const handleFileUpload = useCallback((file: File | null) => {
    if (!file) {
      return;
    }
    setCurrentFile(file);
  }, []);

  useEffect(() => {
    const processFile = async () => {
        if (!currentFile) return;

        setIsProcessing(true);
        setProgress(10);
        try {
            const studentData = await parseExcel(currentFile);
            setProgress(50);
            
            if (!studentData) {
                toast({
                  variant: 'destructive',
                  title: 'Error de Formato',
                  description: 'El archivo Excel no tiene el formato esperado o está vacío.',
                });
                setIsProcessing(false);
                setProgress(0);
                return;
            }

            const processedCount = processSingleFile(studentData, currentFile.name);
            setProgress(90);

            setUploadHistory(prev => [{ 
                id: Date.now().toString(), 
                fileName: currentFile.name, 
                uploadedAt: new Date().toISOString() 
            }, ...prev].slice(0, 10));

            toast({
                title: 'Éxito',
                description: `Se procesaron ${processedCount} alumnos del reporte actual.`,
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
                setCurrentFile(null);
            }, 500);
        }
    };
    processFile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile, toast]);


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
      localStorage.removeItem(LOCAL_STORAGE_KEYS.PLAN_TYPE);

      setAllStudents([]);
      setStudentHistory({});
      setUploadHistory([]);
      setCurrentFile(null);
      setPlanType('tetramestral');
      
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
  const professors = useMemo(() => {
    const allProfessors = allStudents.flatMap(s => s.subjects?.map(sub => sub.professorName) || []);
    return [...new Set(allProfessors.filter(Boolean))];
  }, [allStudents]);
  
  const subjects = useMemo(() => {
      const allSubjects = allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.name) || []);
      return [...new Set(allSubjects.filter(Boolean))];
  }, [allStudents]);
  
  const groups = useMemo(() => {
    const allGroups = allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.group) || []);
    return [...new Set(allGroups.filter(Boolean))].sort();
  }, [allStudents]);

  const groupsForSubject = useCallback((subjectName: string | null): string[] => {
    if (!subjectName) return [];
    const groups = new Set<string>();
    allStudents.forEach(student => {
        student.subjectSummaries?.forEach(subject => {
            if (subject.name === subjectName && subject.group) {
                groups.add(subject.group);
            }
        });
    });
    return Array.from(groups).sort();
  }, [allStudents]);


  const filteredStudents = useMemo(() => {
    let students = allStudents;

    if (selectedValue) {
        if (filterType === 'leader') students = students.filter(s => s.leader === selectedValue);
        if (filterType === 'tutor') students = students.filter(s => s.tutor === selectedValue);
        if (filterType === 'professor') students = students.filter(s => s.subjects?.some(sub => sub.professorName === selectedValue));
        if (filterType === 'group') students = students.filter(s => s.subjectSummaries?.some(sub => sub.group === selectedValue));
        if (filterType === 'subject') {
            students = students.filter(s => s.subjectSummaries?.some(sub => {
                const subjectMatch = sub.name === selectedValue;
                const groupMatch = groupId ? sub.group === groupId : true;
                return subjectMatch && groupMatch;
            }));
        }
    }
    
    if (caseType) {
        const getStudentIdsWithChange = (fieldName: 'absences' | 'missedAssignments') => {
            const studentIds = new Set<string>();
            Object.entries(studentHistory).forEach(([studentId, changes]) => {
                if (changes.some(c => c.fieldName === fieldName)) {
                    studentIds.add(studentId);
                }
            });
            return studentIds;
        }

        if (caseType === 'changes') {
            const changedStudentIds = new Set<string>();
            Object.entries(studentHistory).forEach(([studentId, changes]) => {
                const hasRiskChange = changes.some(c => c.fieldName === 'absences' || c.fieldName === 'missedAssignments');
                if (hasRiskChange) {
                    changedStudentIds.add(studentId);
                }
            });
            return students.filter(s => changedStudentIds.has(s.id));
        }
        if (caseType === 'newAbsences') {
            const studentIds = getStudentIdsWithChange('absences');
            return students.filter(s => studentIds.has(s.id));
        }
        if (caseType === 'newMissedAssignments') {
            const studentIds = getStudentIdsWithChange('missedAssignments');
            return students.filter(s => studentIds.has(s.id));
        }
        if(caseType === 'lost') return findLostCases(students);
        if(caseType === 'extraordinary') return findExtraordinaryCases(students);
        if(caseType === 'incompleteGrade') return findIncompleteGradeCases(students);

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
  }, [allStudents, filterType, selectedValue, caseType, subjectRiskFilter, studentHistory, groupId]);
  
  const loadStudentSubjectsWrapper = async (studentId: string): Promise<Subject[]> => {
    const student = allStudents.find(s => s.id === studentId);
    return student?.subjects || [];
  }
  
  const getStudentChangesWrapper = async (studentId: string): Promise<Change[]> => {
     return studentHistory[studentId] || [];
  }

  const contextValue: DashboardContextType = {
    filteredStudents, allStudents, setAllStudents, studentHistory, setStudentHistory, setUploadHistory,
    isLoading: isLoading || isProcessing,
    hasData: allStudents.length > 0,
    leaders, tutors, subjects, professors, groups, groupsForSubject,
    filterType, setFilterType: handleSetFilterType,
    selectedValue, setSelectedValue,
    groupId, setGroupId,
    caseType, setCaseType: handleSetCaseType,
    subjectRiskFilter, setSubjectRiskFilter: handleSetSubjectRiskFilter,
    loadStudentSubjects: loadStudentSubjectsWrapper,
    getStudentChanges: getStudentChangesWrapper,
    activeView, setActiveView: handleSetActiveView,
    selectedStudentId, setSelectedStudentId,
    planType,
  };

  const renderActiveView = () => {
    switch (activeView) {
        case 'welcome': return <WelcomeDashboard />;
        case 'dashboard': return <Dashboard />;
        case 'students': return <StudentPanel />;
        case 'history': return <StudentHistoryPanel />;
        case 'change-stats': return <ChangeStats />;
        case 'map-planner': return <MapPlanner />;
        case 'ponderaciones': return <PonderacionesDashboard />;
        case 'unclassified': return <UnclassifiedSubjectsPanel />;
        case 'academic-calendar': return <AcademicCalendar />;
        case 'professor-schedule': return <ProfessorSchedulePanel />;
        case 'bitacora': return <WelcomeDashboard />; // Placeholder for now
        default: return <WelcomeDashboard />;
    }
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarHeader>
             <div className="flex items-center gap-2 px-4 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                <Image src="https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png" alt="School Logo" width={26} height={26} className="h-6 w-auto" />
                <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">TECMILENIO</span>
             </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Inicio" isActive={activeView === 'welcome'} onClick={() => handleSetActiveView('welcome')}>
                    <Home />
                    <span>Inicio</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Calendario Académico" isActive={activeView === 'academic-calendar'} onClick={() => handleSetActiveView('academic-calendar')}>
                    <CalendarDays />
                    <span>Calendario Académico</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Progreso Estudiantil" isActive={activeView === 'dashboard'} onClick={() => handleSetActiveView('dashboard')}>
                    <LayoutDashboard />
                    <span>Progreso Estudiantil</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Análisis de Cambios" isActive={activeView === 'change-stats'} onClick={() => handleSetActiveView('change-stats')}>
                    <BarChart3 />
                    <span>Análisis de Cambios</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Panel de Alumnos" isActive={activeView === 'students'} onClick={() => handleSetActiveView('students')}>
                    <Users />
                    <span>Panel de Alumnos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Horarios de Profesores" isActive={activeView === 'professor-schedule'} onClick={() => handleSetActiveView('professor-schedule')}>
                    <Contact />
                    <span>Horarios de Profesores</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planificador por Mapa" isActive={activeView === 'map-planner'} onClick={() => handleSetActiveView('map-planner')}>
                    <Map />
                    <span>Planificador por Mapa</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Guía de Ponderación" isActive={activeView === 'ponderaciones'} onClick={() => handleSetActiveView('ponderaciones')}>
                    <BookCopy />
                    <span>Guía de Ponderación</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Materias sin Clasificar" isActive={activeView === 'unclassified'} onClick={() => handleSetActiveView('unclassified')}>
                    <HelpCircle />
                    <span>Materias sin Clasificar</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Bitácora de Casos" isActive={activeView === 'bitacora'} onClick={() => handleSetActiveView('bitacora')}>
                    <FileText />
                    <span>Bitácora de Casos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
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
                      {upload.fileName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">No hay cargas recientes.</p>
              )}
            </SidebarGroup>
          </SidebarContent>
           <SidebarToggle />
        </Sidebar>
        <SidebarInset>
            <header className="flex h-auto md:h-14 items-center justify-between gap-4 border-b bg-card px-4 lg:px-6 sticky top-0 z-30 flex-wrap py-2">
                 <div className="flex items-center gap-4 flex-1">
                    <Image src="https://edukapp.com.mx/Vistas/img/ImgLogo/tecmilenio_Logo.png" alt="Tecmilenio Logo" width={180} height={40} className="h-8 w-auto" />
                    <div className="hidden md:flex">
                        <DashboardFilters />
                    </div>
                 </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <FileUpload onFileSelect={handleFileUpload} selectedFile={currentFile} isLoading={isProcessing} variant="outline" size="sm" />
                     <Button variant="ghost" size="icon" onClick={() => window.location.reload()} disabled={isLoading || isProcessing} title="Recargar página">
                        <RefreshCw className="h-4 w-4" />
                        <span className="sr-only">Recargar</span>
                     </Button>
                     <Button variant="ghost" size="icon" onClick={handleDeleteAllData} disabled={isLoading || isProcessing} title="Borrar todos los datos">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Borrar Datos</span>
                    </Button>
                </div>
                <div className="md:hidden w-full pt-2">
                    <DashboardFilters />
                </div>
            </header>

            {(isProcessing || isLoading) && progress > 0 && <Progress value={progress} className="w-full h-1" />}
            
            <div className="flex-1">
              {renderActiveView()}
            </div>

        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
