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
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarToggle,
} from '@/components/ui/sidebar';
import { FileUpload } from './FileUpload';
import { Dashboard } from './Dashboard';
import { StudentPanel } from './StudentPanel';
import { ChangeStats } from './ChangeStats';
import { PonderacionesDashboard } from './PonderacionesDashboard';
import { UnclassifiedSubjectsPanel } from './UnclassifiedSubjectsPanel';
import { MapPlanner } from './MapPlanner';
import { DashboardFilters } from './DashboardFilters';
import { TeamsManagementPanel } from './TeamsManagementPanel';
import { AcademicCommitteePanel } from './AcademicCommitteePanel';
import { ProfessorSchedulePanel } from './ProfessorSchedulePanel';
import { OfertaAcademicaPanel } from './OfertaAcademicaPanel';
import { IrregularStudentsPanel } from './IrregularStudentsPanel';
import { TeamWorkPanel } from './TeamWorkPanel';
import { ContinuidadPanel } from './ContinuidadPanel';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, LayoutDashboard, Users, BookCopy, HelpCircle, Map as MapIcon, FileClock, BarChart3, Contact, Shield, BookOpen, Calendar, ClipboardList, Download, Smartphone, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';


import type { Student, Change, Subject, StudentData, StudentContact, TeamTask, ProfessorContact, OfertaAcademicaItem, Team, WeightingScheme } from '@/types/student';
import { parseExcel, getHeaderKey } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { findExtraordinaryCases, findIncompleteGradeCases, findLostCases, findObservationCases, findRiskCasesBySubject, findUrgentCases, findSDAbsencesCases, findSDAssignmentsCases, findAtLimitAbsencesCases, findAtLimitAssignmentsCases } from '@/lib/dataProcessor';
import { getContact, getTeamTasks, getProfessorContacts, getTeams, getWeightingSchemes } from '@/lib/firebase-services';
import { xorCipher } from '@/lib/utils';


type FilterType = 'leader' | 'tutor' | 'subject' | 'professor' | 'group';
export type CaseType = 'lost' | 'urgent' | 'observation' | 'extraordinary' | 'changes' | 'incompleteGrade' | 'newAbsences' | 'newMissedAssignments' | 'sd-absences' | 'sd-assignments' | 'at-limit-absences' | 'at-limit-assignments';
export type ActiveView = 'dashboard' | 'students' | 'weighting-schemes' | 'unclassified' | 'map-planner' | 'change-stats' | 'teams-management' | 'academic-committee' | 'professor-schedule' | 'oferta-academica' | 'irregular-students' | 'team-work' | 'continuidad';
export type SubjectRiskFilter = { subjectName: string; riskType: 'absences' | 'missedAssignments' };
export type PlanType = 'semestral' | 'tetramestral';


interface DashboardContextType {
  filteredStudents: Student[];
  allStudents: Student[];
  allStudentsMap: Map<string, Student>;
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  latestComparison: Record<string, Change[]>;
  setLatestComparison: React.Dispatch<React.SetStateAction<Record<string, Change[]>>>;
  studentContacts: Record<string, StudentContact>;
  setStudentContacts: React.Dispatch<React.SetStateAction<Record<string, StudentContact>>>;
  fetchStudentContact: (studentId: string) => Promise<StudentContact | null>;
  professorContacts: Record<string, ProfessorContact>;
  setProfessorContacts: React.Dispatch<React.SetStateAction<Record<string, ProfessorContact>>>;
  teams: Team[];
  fetchTeams: () => Promise<void>;
  teamTasks: TeamTask[];
  fetchTeamTasks: () => Promise<void>;
  weightingSchemes: WeightingScheme[];
  fetchWeightingSchemes: () => Promise<void>;
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
  contextualStudentIds: Set<string> | null;
  setContextualStudentIds: React.Dispatch<React.SetStateAction<Set<string> | null>>;
  loadStudentSubjects: (studentId: string) => Promise<Subject[]>;
  getStudentChanges: (studentId: string) => Promise<Change[]>;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  planType: PlanType;
  ofertaAcademica: OfertaAcademicaItem[];
  setOfertaAcademica: React.Dispatch<React.SetStateAction<OfertaAcademicaItem[]>>;
  toast: (options: any) => void;
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
    PLAN_TYPE: 'academic_sentinel_plan_type',
    OFERTA_ACADEMICA: 'academic_sentinel_oferta_academica',
    CURRENT_FILE_NAME: 'academic_sentinel_current_file_name',
    DATA_KEY: 'academic_sentinel_data_key'
};


export function DashboardClient() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [latestComparison, setLatestComparison] = useState<Record<string, Change[]>>({});
  const [studentContacts, setStudentContacts] = useState<Record<string, StudentContact>>({});
  const [professorContacts, setProfessorContacts] = useState<Record<string, ProfessorContact>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [weightingSchemes, setWeightingSchemes] = useState<WeightingScheme[]>([]);
  const [planType, setPlanType] = useState<PlanType>('tetramestral');
  const [ofertaAcademica, setOfertaAcademica] = useState<OfertaAcademicaItem[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [dataKey, setDataKey] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [subjectRiskFilter, setSubjectRiskFilter] = useState<SubjectRiskFilter | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [contextualStudentIds, setContextualStudentIds] = useState<Set<string> | null>(null);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const allStudentsMap = useMemo(() => new Map(allStudents.map(s => [s.id, s])), [allStudents]);

  const fetchTeams = useCallback(async () => {
      try {
          const fetchedTeams = await getTeams();
          setTeams(fetchedTeams);
      } catch (error) {
          console.error("Failed to fetch teams:", error);
      }
  }, []);
  
  const fetchTeamTasks = useCallback(async () => {
    try {
        const tasks = await getTeamTasks();
        setTeamTasks(tasks);
    } catch (error) {
        console.error("Failed to fetch team tasks:", error);
    }
  }, []);

  const fetchWeightingSchemes = useCallback(async () => {
    try {
        const schemes = await getWeightingSchemes();
        setWeightingSchemes(schemes);
    } catch (error) {
        console.error("Failed to fetch weighting schemes:", error);
    }
  }, []);
  
  const fetchStudentContact = useCallback(async (studentId: string): Promise<StudentContact | null> => {
    if (studentContacts[studentId]) {
        return studentContacts[studentId];
    }
    setIsLoading(true);
    try {
        const contact = await getContact(studentId);
        if (contact) {
            setStudentContacts(prev => ({ ...prev, [studentId]: contact }));
            return contact;
        }
        return null;
    } catch (error) {
        console.error("Failed to fetch contact:", error);
        return null;
    } finally {
        setIsLoading(false);
    }
  }, [studentContacts]);


  useEffect(() => {
    // PWA Install Logic
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    async function loadInitialData() {
        setIsLoading(true);
        try {
          const [profContactsFromDb, tasks, fetchedTeams, schemes] = await Promise.all([
            getProfessorContacts(),
            getTeamTasks(),
            getTeams(),
            getWeightingSchemes()
          ]);

          setProfessorContacts(profContactsFromDb);
          setTeams(fetchedTeams);
          setWeightingSchemes(schemes);
          setTeamTasks(tasks);
          
          const storedPlanType = localStorage.getItem(LOCAL_STORAGE_KEYS.PLAN_TYPE);
          if (storedPlanType) setPlanType(storedPlanType as PlanType);

          const storedFileName = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_FILE_NAME);
          if (storedFileName) setCurrentFileName(storedFileName);

          const storedKey = localStorage.getItem(LOCAL_STORAGE_KEYS.DATA_KEY);
          if (storedKey) {
              setDataKey(storedKey);
              const storedStudents = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
              if (storedStudents) {
                  try {
                      const decrypted = xorCipher(storedStudents, storedKey);
                      setAllStudents(JSON.parse(decrypted));
                  } catch (e) {
                      console.error("Fallo al desencriptar alumnos:", e);
                  }
              }
              const storedOferta = localStorage.getItem(LOCAL_STORAGE_KEYS.OFERTA_ACADEMICA);
              if (storedOferta) {
                  try {
                      const decrypted = xorCipher(storedOferta, storedKey);
                      setOfertaAcademica(JSON.parse(decrypted));
                  } catch (e) {
                      console.error("Fallo al desencriptar oferta:", e);
                  }
              }
          }

        } catch (error) {
            console.error("Error loading data from Local Storage or DB", error);
            toast({
                variant: 'destructive',
                title: 'Error de Carga',
                description: 'No se pudieron cargar los datos iniciales. Intenta recargar la página.',
            });
        } finally {
            setIsLoading(false);
        }
    }
    loadInitialData();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
        if(allStudents.length > 0 && dataKey) {
            const encryptedStudents = xorCipher(JSON.stringify(allStudents), dataKey);
            localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, encryptedStudents);
        }
        if (ofertaAcademica.length > 0 && dataKey) {
            const encryptedOferta = xorCipher(JSON.stringify(ofertaAcademica), dataKey);
            localStorage.setItem(LOCAL_STORAGE_KEYS.OFERTA_ACADEMICA, encryptedOferta);
        }
        if (dataKey) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.DATA_KEY, dataKey);
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.PLAN_TYPE, planType);
        if (currentFileName) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_FILE_NAME, currentFileName);
        }

    } catch(error) {
        console.error("Error saving data to Local Storage", error);
    }
  }, [allStudents, planType, ofertaAcademica, dataKey, currentFileName]);


  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedValue(null);
    setCaseType(null);
    setSubjectRiskFilter(null);
    setGroupId(null);
    setContextualStudentIds(null);
  };

  const handleSetActiveView = (view: ActiveView) => {
    setActiveView(view);
    if (view !== 'students') {
      setCaseType(null);
      setSubjectRiskFilter(null);
      setGroupId(null);
      setContextualStudentIds(null);
    }
  }

  const handleSetCaseType = (type: CaseType | null) => {
    setCaseType(type);
    setSubjectRiskFilter(null);
    setGroupId(null);
    setContextualStudentIds(null);
  };

  const handleSetSubjectRiskFilter = (filter: SubjectRiskFilter | null) => {
    setSubjectRiskFilter(filter);
    setCaseType(null);
    setGroupId(null);
    setContextualStudentIds(null);
  };
  
  const handleFileUpload = useCallback((file: File | null) => {
    setAllStudents([]);
    setStudentContacts({}); 
    localStorage.removeItem(LOCAL_STORAGE_KEYS.STUDENTS);
    setCurrentFile(file);
  }, []);

  useEffect(() => {
    const processFile = async () => {
        if (!currentFile) return;

        setIsProcessing(true);
        setProgress(10);
        try {
            const newKey = await getHeaderKey(currentFile);
            setDataKey(newKey);
            setProgress(20);

            const studentData = await parseExcel(currentFile);
            setProgress(50);
            
            if (!studentData) {
                toast({ variant: 'destructive', title: 'Error de Formato', description: 'El archivo Excel no tiene el formato esperado o está vacío.' });
                setIsProcessing(false); setProgress(0); setCurrentFile(null); return;
            }
            
            const processedStudents = Object.values(studentData).map(student => ({
                ...student,
                subjectSummaries: (student.subjects || []).map(s => ({
                  id: s.id, name: s.name, absences: s.absences, absenceLimit: s.absenceLimit,
                  missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit,
                  grade: s.grade, finalGrade: s.finalGrade, group: s.group
                })),
            }));
            
            setAllStudents(processedStudents);
            setCurrentFileName(currentFile.name);
            
            setOfertaAcademica([]); 
            localStorage.removeItem(LOCAL_STORAGE_KEYS.OFERTA_ACADEMICA);

            const numbersInFile = currentFile.name.match(/\d+/g);
            if (numbersInFile && numbersInFile.length > 0) {
                const lastNumberSegment = numbersInFile[numbersInFile.length - 1];
                if (['40', '50', '60'].some(ending => lastNumberSegment.endsWith(ending))) setPlanType('semestral');
                else if (['10', '20', '30'].some(ending => lastNumberSegment.endsWith(ending))) setPlanType('tetramestral');
            } else if (currentFile.name.includes('40') || currentFile.name.includes('50') || currentFile.name.includes('60')) {
                setPlanType('semestral');
            } else {
                setPlanType('tetramestral');
            }

            setProgress(90);
            toast({
                title: 'Éxito',
                description: `Se procesaron ${processedStudents.length} alumnos del reporte.`,
            });

        } catch (error) {
           toast({ variant: 'destructive', title: 'Error al procesar', description: `Hubo un problema al procesar el archivo. Revisa la consola.`});
           console.error(error);
        } finally {
            setTimeout(() => { setIsProcessing(false); setProgress(0); setCurrentFile(null); }, 500);
        }
    };
    processFile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile, toast]);

  const handleDeleteAllData = () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción es irreversible.')) return;
    
    setIsProcessing(true);
    setProgress(20);
    try {
      Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      
      setAllStudents([]);
      setCurrentFileName(null);
      setCurrentFile(null);
      setPlanType('tetramestral');
      setOfertaAcademica([]);
      setDataKey(null);

      toast({ title: 'Datos Locales Eliminados', description: 'Los datos guardados en el navegador han sido borrados. Los datos en la nube permanecen.' });
    } catch (error) {
       console.error("Error clearing Local Storage", error);
       toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron borrar los datos.' });
    } finally {
      setTimeout(() => { setIsProcessing(false); setProgress(0); }, 500);
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  
  const leaders = useMemo(() => [...new Set(allStudents.map(s => s.leader).filter(Boolean))].sort(), [allStudents]);
  const tutors = useMemo(() => [...new Set(allStudents.map(s => s.tutor).filter(Boolean))].sort(), [allStudents]);
  const professors = useMemo(() => {
    const allProfessors = allStudents.flatMap(s => s.subjects?.map(sub => sub.professorName) || []);
    return [...new Set(allProfessors.filter(Boolean))].sort();
  }, [allStudents]);
  
  const subjects = useMemo(() => {
      const allSubjects = allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.name) || []);
      return [...new Set(allSubjects.filter(Boolean))].sort();
  }, [allStudents]);
  
  const groups = useMemo(() => {
    const allGroups = allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.group) || []);
    return [...new Set(allGroups.filter(Boolean))].sort();
  }, [allStudents]);

  const groupsForSubject = useCallback((subjectName: string | null): string[] => {
    if (!subjectName) return [];
    const groupsSet = new Set<string>();
    allStudents.forEach(student => {
        student.subjectSummaries?.forEach(subject => {
            if (subject.name === subjectName && subject.group) {
                groupsSet.add(subject.group);
            }
        });
    });
    return Array.from(groupsSet).sort();
  }, [allStudents]);
  

  const filteredStudents = useMemo(() => {
    if (contextualStudentIds) {
        return allStudents.filter(s => contextualStudentIds.has(s.id));
    }
    
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
        if (caseType === 'changes') {
            const changedStudentIds = new Set(Object.keys(latestComparison));
            return students.filter(s => changedStudentIds.has(s.id));
        }
        if (caseType === 'newAbsences') {
             const studentIdsWithNewAbsences = new Set<string>();
             Object.entries(latestComparison).forEach(([studentId, changes]) => {
                if (changes.some(c => c.fieldName === 'absences')) {
                    studentIdsWithNewAbsences.add(studentId);
                }
            });
            return students.filter(s => studentIdsWithNewAbsences.has(studentId));
        }
        if (caseType === 'newMissedAssignments') {
            const studentIdsWithNewNE = new Set<string>();
             Object.entries(latestComparison).forEach(([studentId, changes]) => {
                if (changes.some(c => c.fieldName === 'missedAssignments')) {
                    studentIdsWithNewNE.add(studentId);
                }
            });
            return students.filter(s => studentIdsWithNewNE.has(studentId));
        }
        if(caseType === 'lost') return findLostCases(students);
        if(caseType === 'extraordinary') return findExtraordinaryCases(students);
        if(caseType === 'incompleteGrade') return findIncompleteGradeCases(students);
        if(caseType === 'sd-absences') return findSDAbsencesCases(students);
        if(caseType === 'sd-assignments') return findSDAssignmentsCases(students);
        if(caseType === 'at-limit-absences') {
            const sdIds = new Set(findSDAbsencesCases(students).map(s => s.id));
            return findAtLimitAbsencesCases(students).filter(s => !sdIds.has(s.id));
        }
        if(caseType === 'at-limit-assignments') {
            const sdIds = new Set(findSDAbsencesCases(students).map(s => s.id));
            return findAtLimitAssignmentsCases(students).filter(s => !sdIds.has(s.id));
        }

        const sdIds = new Set([...findSDAbsencesCases(students), ...findSDAssignmentsCases(students)].map(s => s.id));
        const atLimitIds = new Set([...findAtLimitAbsencesCases(students), ...findAtLimitAssignmentsCases(students)].map(s => s.id));
        const highRiskExclusions = new Set([...sdIds, ...atLimitIds]);
        
        if (caseType === 'urgent') return findUrgentCases(students, highRiskExclusions);

        if (caseType === 'observation') {
             const urgentCaseIds = new Set(findUrgentCases(students, highRiskExclusions).map(s => s.id));
             const combinedExclusions = new Set([...highRiskExclusions, ...urgentCaseIds]);
             return findObservationCases(students, combinedExclusions);
        }
    }

    if (subjectRiskFilter) {
      return findRiskCasesBySubject(students, subjectRiskFilter.subjectName, subjectRiskFilter.riskType);
    }

    return students;
  }, [allStudents, filterType, selectedValue, caseType, subjectRiskFilter, latestComparison, groupId, contextualStudentIds]);
  
  const loadStudentSubjectsWrapper = async (studentId: string): Promise<Subject[]> => {
    const student = allStudentsMap.get(studentId);
    return student?.subjects || [];
  }
  
  const getStudentChangesWrapper = useCallback(async (studentId: string): Promise<Change[]> => {
     return latestComparison[studentId] || [];
  }, [latestComparison]);

  const reportInfo = useMemo(() => {
    if (!currentFileName) {
        return null;
    }

    const dateMatch = currentFileName.match(/(\d{2})\.(\d{2})\.(\d{4}|\d{2})/);
    let displayDate: string | null = null;
    if (dateMatch) {
        const day = dateMatch[1];
        const month = dateMatch[2];
        let year = dateMatch[3];
        if (year.length === 2) {
            year = `20${year}`;
        }
        displayDate = `${day}/${month}/${year}`;
    }

    return {
        date: displayDate,
        plan: planType === 'tetramestral' ? 'Tetramestral' : 'Semestral'
    };
  }, [currentFileName, planType]);

  const contextValue: DashboardContextType = {
    filteredStudents, allStudents, allStudentsMap, setAllStudents, latestComparison, setLatestComparison, studentContacts, setStudentContacts, fetchStudentContact, professorContacts, setProfessorContacts, teams, fetchTeams, teamTasks, fetchTeamTasks, weightingSchemes, fetchWeightingSchemes,
    isLoading: isLoading || isProcessing,
    hasData: allStudents.length > 0,
    leaders, tutors, subjects, professors, groups, groupsForSubject,
    filterType, setFilterType: handleSetFilterType,
    selectedValue, setSelectedValue,
    groupId, setGroupId,
    caseType, setCaseType: handleSetCaseType,
    subjectRiskFilter, setSubjectRiskFilter: handleSetSubjectRiskFilter,
    contextualStudentIds,
    setContextualStudentIds,
    loadStudentSubjects: loadStudentSubjectsWrapper,
    getStudentChanges: getStudentChangesWrapper,
    activeView, setActiveView: handleSetActiveView,
    planType,
    ofertaAcademica, setOfertaAcademica,
    toast,
  };

  const renderActiveView = () => {
    switch (activeView) {
        case 'dashboard': return <Dashboard />;
        case 'students': return <StudentPanel />;
        case 'change-stats': return <ChangeStats />;
        case 'map-planner': return <MapPlanner />;
        case 'weighting-schemes': return <PonderacionesDashboard />;
        case 'unclassified': return <UnclassifiedSubjectsPanel />;
        case 'professor-schedule': return <ProfessorSchedulePanel />;
        case 'teams-management': return <TeamsManagementPanel />;
        case 'academic-committee': return <AcademicCommitteePanel />;
        case 'oferta-academica': return <OfertaAcademicaPanel />;
        case 'irregular-students': return <IrregularStudentsPanel />;
        case 'team-work': return <TeamWorkPanel />;
        case 'continuidad': return <ContinuidadPanel />;
        default: return <Dashboard />;
    }
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider defaultOpen={false}>
        <Sidebar>
          <SidebarHeader>
             <div className="flex items-center gap-2 px-4 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                <Image src="https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png" alt="School Logo" width={26} height={26} className="h-6 w-auto" />
                <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">SENTINEL</span>
             </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {deferredPrompt && (
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Descargar App en Celular" onClick={handleInstallPWA} className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-b mb-2">
                      <Smartphone className="animate-bounce" />
                      <span className="font-bold">Instalar en Celular</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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
                  <SidebarMenuButton tooltip="Ruta Diaria / Equipo" isActive={activeView === 'team-work'} onClick={() => handleSetActiveView('team-work')}>
                    <ClipboardList />
                    <span>Ruta Diaria / Equipo</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Continuidad Vocacional" isActive={activeView === 'continuidad'} onClick={() => handleSetActiveView('continuidad')}>
                    <TrendingUp />
                    <span>Continuidad</span>
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
                   <SidebarMenuButton tooltip="Planificador de Horarios" isActive={activeView === 'oferta-academica'} onClick={() => handleSetActiveView('oferta-academica')}>
                    <BookOpen />
                    <span>Planificador de Horarios</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Equipos Deportivos/Cult" isActive={activeView === 'teams-management'} onClick={() => handleSetActiveView('teams-management')}>
                    <Shield />
                    <span>Equipos Dep/Cult</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planificador por Mapa" isActive={activeView === 'map-planner'} onClick={() => handleSetActiveView('map-planner')}>
                    <MapIcon />
                    <span>Planificador por Mapa</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Gestor de Ponderaciones" isActive={activeView === 'weighting-schemes'} onClick={() => handleSetActiveView('weighting-schemes')}>
                    <BookCopy />
                    <span>Gestor de Ponderaciones</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Materias sin Clasificar" isActive={activeView === 'unclassified'} onClick={() => handleSetActiveView('unclassified')}>
                    <HelpCircle />
                    <span>Materias sin Clasificar</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
           <SidebarToggle />
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 items-center justify-between gap-4 border-b bg-card px-4 lg:px-6 sticky top-0 z-30 py-2">
                 <div className="flex items-center gap-2 md:gap-4 flex-1 overflow-hidden">
                    <SidebarTrigger className="flex shrink-0" />
                    <Image src="https://edukapp.com.mx/Vistas/img/ImgLogo/tecmilenio_Logo.png" alt="Tecmilenio Logo" width={120} height={30} className="h-6 md:h-8 w-auto hidden xs:block" />
                    <div className="hidden md:flex">
                        <DashboardFilters />
                    </div>
                 </div>
                 <div className="flex items-center gap-1 md:gap-2">
                    {allStudents.length > 0 && reportInfo?.date && (
                        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground p-1.5 rounded-md bg-muted/50">
                            <Calendar size={12} />
                            <span>{reportInfo.date}</span>
                            <Badge variant="secondary" className="text-[10px] px-1">{reportInfo.plan[0]}</Badge>
                        </div>
                    )}
                    <FileUpload onFileSelect={handleFileUpload} selectedFile={currentFile} isLoading={isProcessing} variant="outline" size="sm" className="h-8 min-w-0 px-2" label="" icon={<FileClock className="h-4 w-4" />} />
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.location.reload()} disabled={isLoading || isProcessing} title="Recargar">
                        <RefreshCw className="h-4 w-4" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDeleteAllData} disabled={isLoading || isProcessing} title="Borrar Datos">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </header>
            
            <div className="md:hidden w-full px-4 pt-3 border-b bg-card pb-3">
                <DashboardFilters />
            </div>

            {(isProcessing || isLoading) && progress > 0 && <Progress value={progress} className="w-full h-1" />}
            
            <div className="flex-1">
              {renderActiveView()}
            </div>

        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
