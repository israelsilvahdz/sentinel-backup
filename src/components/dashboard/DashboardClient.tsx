
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
import { WelcomeDashboard } from './WelcomeDashboard';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, LayoutDashboard, Users, BookCopy, HelpCircle, Map as MapIcon, FileClock, BarChart3, Contact, Shield, BookOpen, Calendar, ClipboardList, Download, Smartphone, TrendingUp, Home, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';


import type { Student, Change, Subject, StudentData, StudentContact, TeamTask, ProfessorContact, OfertaAcademicaItem, Team, WeightingScheme, ContinuityStudent, ContinuityCatalog } from '@/types/student';
import { parseExcel, getHeaderKey } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { findExtraordinaryCases, findIncompleteGradeCases, findLostCases, findObservationCases, findRiskCasesBySubject, findUrgentCases, findSDAbsencesCases, findSDAssignmentsCases, findAtLimitAbsencesCases, findAtLimitAssignmentsCases } from '@/lib/dataProcessor';
import { getContact, getTeamTasks, getProfessorContacts, getTeams, getWeightingSchemes } from '@/lib/firebase-services';
import { xorCipher } from '@/lib/utils';


type FilterType = 'leader' | 'tutor' | 'subject' | 'professor' | 'group';
export type CaseType = 'lost' | 'urgent' | 'observation' | 'extraordinary' | 'changes' | 'incompleteGrade' | 'newAbsences' | 'newMissedAssignments' | 'sd-absences' | 'sd-assignments' | 'at-limit-absences' | 'at-limit-assignments';
export type ActiveView = 'welcome' | 'dashboard' | 'students' | 'weighting-schemes' | 'unclassified' | 'map-planner' | 'change-stats' | 'teams-management' | 'academic-committee' | 'professor-schedule' | 'oferta-academica' | 'irregular-students' | 'team-work' | 'continuidad';
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
  continuityStudents: ContinuityStudent[];
  setContinuityStudents: React.Dispatch<React.SetStateAction<ContinuityStudent[]>>;
  continuityCatalog: ContinuityCatalog | null;
  setContinuityCatalog: React.Dispatch<React.SetStateAction<ContinuityCatalog | null>>;
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
    DATA_KEY: 'academic_sentinel_data_key',
    CONTINUITY_STUDENTS: 'academic_sentinel_continuity_students',
    CONTINUITY_CATALOG: 'academic_sentinel_continuity_catalog',
    ACTIVE_VIEW: 'academic_sentinel_active_view'
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
  const [continuityStudents, setContinuityStudents] = useState<ContinuityStudent[]>([]);
  const [continuityCatalog, setContinuityCatalog] = useState<ContinuityCatalog | null>(null);
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
  const [activeView, setActiveView] = useState<ActiveView>('welcome');
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

          const storedActiveView = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_VIEW);
          if (storedActiveView) setActiveView(storedActiveView as ActiveView);

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
              const storedContinuity = localStorage.getItem(LOCAL_STORAGE_KEYS.CONTINUITY_STUDENTS);
              if (storedContinuity) {
                  try {
                      const decrypted = xorCipher(storedContinuity, storedKey);
                      setContinuityStudents(JSON.parse(decrypted));
                  } catch (e) {
                      console.error("Fallo al desencriptar continuidad:", e);
                  }
              }
              const storedCatalog = localStorage.getItem(LOCAL_STORAGE_KEYS.CONTINUITY_CATALOG);
              if (storedCatalog) {
                  try {
                      const decrypted = xorCipher(storedCatalog, storedKey);
                      setContinuityCatalog(JSON.parse(decrypted));
                  } catch (e) {
                      console.error("Fallo al desencriptar catálogo:", e);
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
        if (continuityStudents.length > 0 && dataKey) {
            const encryptedContinuity = xorCipher(JSON.stringify(continuityStudents), dataKey);
            localStorage.setItem(LOCAL_STORAGE_KEYS.CONTINUITY_STUDENTS, encryptedContinuity);
        }
        if (continuityCatalog && dataKey) {
            const encryptedCatalog = xorCipher(JSON.stringify(continuityCatalog), dataKey);
            localStorage.setItem(LOCAL_STORAGE_KEYS.CONTINUITY_CATALOG, encryptedCatalog);
        }
        if (dataKey) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.DATA_KEY, dataKey);
        }
        localStorage.setItem(LOCAL_STORAGE_KEYS.PLAN_TYPE, planType);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_VIEW, activeView);
        if (currentFileName) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_FILE_NAME, currentFileName);
        }

    } catch(error) {
        console.error("Error saving data to Local Storage", error);
    }
  }, [allStudents, planType, ofertaAcademica, dataKey, currentFileName, continuityStudents, continuityCatalog, activeView]);


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
    if (view !== 'students' && view !== 'continuidad') {
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
      setContinuityStudents([]);
      setContinuityCatalog(null);
      setDataKey(null);
      setActiveView('welcome');

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

  const contextValue: DashboardContextType = useMemo(() => ({
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
    continuityStudents, setContinuityStudents,
    continuityCatalog, setContinuityCatalog,
    toast,
  }), [
    filteredStudents, allStudents, allStudentsMap, latestComparison, studentContacts, professorContacts, teams, teamTasks, weightingSchemes, isLoading, isProcessing, leaders, tutors, subjects, professors, groups, filterType, selectedValue, groupId, caseType, subjectRiskFilter, contextualStudentIds, activeView, planType, ofertaAcademica, continuityStudents, continuityCatalog, toast, fetchStudentContact, fetchTeams, fetchTeamTasks, fetchWeightingSchemes
  ]);

  const renderActiveView = () => {
    switch (activeView) {
        case 'welcome': return <WelcomeDashboard />;
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
        default: return <WelcomeDashboard />;
    }
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider defaultOpen={false}>
        <Sidebar className="border-none bg-primary shadow-2xl">
          <SidebarHeader className="bg-primary/50 backdrop-blur-md">
             <div className="flex items-center gap-3 px-6 py-6 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:group-hover:justify-start group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:group-hover:px-6 transition-all duration-300">
                <div className="bg-white/20 p-2 rounded-xl border border-white/10 shadow-inner group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:group-hover:p-2 transition-all">
                  <Image src="https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png" alt="School Logo" width={28} height={28} className="h-7 w-auto brightness-0 invert group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:group-hover:h-7" />
                </div>
                <span className="font-black text-xl tracking-[0.15em] text-white group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover:inline whitespace-nowrap">SENTINEL</span>
             </div>
          </SidebarHeader>
          <SidebarContent className="px-3 bg-primary/20 backdrop-blur-sm no-scrollbar">
            <SidebarGroup className="mt-4">
              <SidebarMenu className="gap-2">
                {deferredPrompt && (
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Descargar App" onClick={handleInstallPWA} className="bg-white/10 text-white hover:bg-white/20 transition-all rounded-xl h-12 border border-white/5 mb-4 group-data-[collapsible=icon]:mb-2 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
                      <Smartphone className="animate-pulse" />
                      <span className="font-bold">Instalar App</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                
                <div className="px-3 mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover:block">Exploración</p>
                </div>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Inicio" isActive={activeView === 'welcome'} onClick={() => handleSetActiveView('welcome')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <Home />
                    <span className="font-bold tracking-tight">Inicio</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Resumen Académico" isActive={activeView === 'dashboard'} onClick={() => handleSetActiveView('dashboard')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <LayoutDashboard />
                    <span className="font-bold tracking-tight">Resumen Académico</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Análisis de Cambios" isActive={activeView === 'change-stats'} onClick={() => handleSetActiveView('change-stats')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <BarChart3 />
                    <span className="font-bold tracking-tight">Análisis de Cambios</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <div className="px-3 mb-2 mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover:block">Operación</p>
                </div>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Ruta Diaria / Equipo" isActive={activeView === 'team-work'} onClick={() => handleSetActiveView('team-work')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <ClipboardList />
                    <span className="font-bold tracking-tight">Ruta Diaria / Equipo</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Continuidad Vocacional" isActive={activeView === 'continuidad'} onClick={() => handleSetActiveView('continuidad')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <TrendingUp />
                    <span className="font-bold tracking-tight">Continuidad</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Panel de Alumnos" isActive={activeView === 'students'} onClick={() => handleSetActiveView('students')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data(/collapsible=icon]:mx-auto">
                    <Users />
                    <span className="font-bold tracking-tight">Panel de Alumnos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <div className="px-3 mb-2 mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover:block">Planeación y Gestión</p>
                </div>

                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Horarios de Profesores" isActive={activeView === 'professor-schedule'} onClick={() => handleSetActiveView('professor-schedule')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <Contact />
                    <span className="font-bold tracking-tight">Horarios de Profesores</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planificador de Horarios" isActive={activeView === 'oferta-academica'} onClick={() => handleSetActiveView('oferta-academica')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <BookOpen />
                    <span className="font-bold tracking-tight">Planificador de Horarios</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Equipos Dep/Cult" isActive={activeView === 'teams-management'} onClick={() => handleSetActiveView('teams-management')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <Shield />
                    <span className="font-bold tracking-tight">Equipos Dep/Cult</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planificador por Mapa" isActive={activeView === 'map-planner'} onClick={() => handleSetActiveView('map-planner')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <MapIcon />
                    <span className="font-bold tracking-tight">Planificador por Mapa</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Gestor de Ponderaciones" isActive={activeView === 'weighting-schemes'} onClick={() => handleSetActiveView('weighting-schemes')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <BookCopy />
                    <span className="font-bold tracking-tight">Gestor de Ponderaciones</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Materias sin Clasificar" isActive={activeView === 'unclassified'} onClick={() => handleSetActiveView('unclassified')} className="h-11 px-4 transition-all duration-300 data-[active=true]:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] rounded-xl group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto">
                    <HelpCircle />
                    <span className="font-bold tracking-tight">Materias sin Clasificar</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 items-center justify-between gap-4 border-b bg-white/80 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-30 py-2">
                 <div className="flex items-center gap-2 md:gap-4 flex-1 overflow-hidden">
                    <SidebarTrigger className="flex shrink-0 text-primary" />
                    <Image src="https://edukapp.com.mx/Vistas/img/ImgLogo/tecmilenio_Logo.png" alt="Tecmilenio Logo" width={120} height={30} className="h-6 md:h-8 w-auto hidden xs:block" />
                    <div className="hidden md:flex">
                        {activeView !== 'welcome' && <DashboardFilters />}
                    </div>
                 </div>
                 <div className="flex items-center gap-1 md:gap-2">
                    {allStudents.length > 0 && reportInfo?.date && (
                        <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary p-2 rounded-xl bg-primary/5 border border-primary/10">
                            <Calendar size={12} className="text-primary" />
                            <span>{reportInfo.date}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-primary text-white border-none">{reportInfo.plan[0]}</Badge>
                        </div>
                    )}
                    <FileUpload onFileSelect={handleFileUpload} selectedFile={currentFile} isLoading={isProcessing} variant="outline" size="sm" className="h-9 rounded-xl border-primary/20 text-primary font-bold hover:bg-primary/5" label="" icon={<FileClock className="h-4 w-4" />} />
                     <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 text-primary" onClick={() => window.location.reload()} disabled={isLoading || isProcessing} title="Recargar">
                        <RefreshCw className="h-4 w-4" />
                     </Button>
                     <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/5 text-destructive" onClick={handleDeleteAllData} disabled={isLoading || isProcessing} title="Borrar Datos">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </header>
            
            <div className="md:hidden w-full px-4 pt-3 border-b bg-card pb-3">
                {activeView !== 'welcome' && <DashboardFilters />}
            </div>

            {(isProcessing || isLoading) && progress > 0 && <Progress value={progress} className="w-full h-1" />}
            
            <div className="flex-1 bg-[#F8FAFC]">
              {renderActiveView()}
            </div>

        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
