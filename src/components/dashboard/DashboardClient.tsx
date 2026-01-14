

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
import { ChangeStats } from './ChangeStats';
import { PonderacionesDashboard } from './PonderacionesDashboard';
import { UnclassifiedSubjectsPanel } from './UnclassifiedSubjectsPanel';
import { MapPlanner } from './MapPlanner';
import { AcademicCalendar } from './AcademicCalendar';
import { DashboardFilters } from './DashboardFilters';
import { BitacoraPanel } from './BitacoraPanel';
import { TeamTasksPanel } from './TeamTasksPanel';
import { SeguimientoPanel } from './SeguimientoPanel';
import { TeamsManagementPanel } from './TeamsManagementPanel';
import { AcademicCommitteePanel } from './AcademicCommitteePanel';
import { IrregularStudentsPanel } from './IrregularStudentsPanel';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, UploadCloud, CalendarClock, LayoutDashboard, Users, BookMarked, BookCopy, HelpCircle, ChevronLeft, Map as MapIcon, FileCheck2, FileClock, BarChart3, CalendarDays, Home, FileText, Contact, ClipboardList, Shield, Gavel, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfessorSchedulePanel } from './ProfessorSchedulePanel';
import { OfertaAcademicaPanel } from './OfertaAcademicaPanel';


import type { Student, Change, Subject, UploadHistory, StudentData, SubjectSummary, BitacoraEntry, StudentContact, TeamTask, SeguimientoEntry, ProfessorContact, OfertaAcademicaItem, Team } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { findExtraordinaryCases, findIncompleteGradeCases, findLostCases, findObservationCases, findRiskCasesBySubject, findUrgentCases, findSDAbsencesCases, findSDAssignmentsCases, findAtLimitAbsencesCases, findAtLimitAssignmentsCases } from '@/lib/dataProcessor';
import { getBitacoraEntries, getContacts, getTeamTasks, getSeguimientoEntries, getProfessorContacts, bulkAddOrUpdateProfessorContacts, getTeams, bulkAddOrUpdateTeams } from '@/lib/firebase-services';
import professorContactsData from '@/lib/professor-contacts.json';


type FilterType = 'leader' | 'tutor' | 'subject' | 'professor' | 'group';
export type CaseType = 'lost' | 'urgent' | 'observation' | 'extraordinary' | 'changes' | 'incompleteGrade' | 'newAbsences' | 'newMissedAssignments' | 'sd-absences' | 'sd-assignments' | 'at-limit-absences' | 'at-limit-assignments';
export type ActiveView = 'dashboard' | 'students' | 'ponderaciones' | 'unclassified' | 'map-planner' | 'change-stats' | 'academic-calendar' | 'bitacora' | 'professor-schedule' | 'team-tasks' | 'seguimiento' | 'teams-management' | 'academic-committee' | 'oferta-academica' | 'irregular-students';
export type SubjectRiskFilter = { subjectName: string; riskType: 'absences' | 'missedAssignments' };
export type PlanType = 'semestral' | 'tetramestral';


interface DashboardContextType {
  filteredStudents: Student[];
  allStudents: Student[];
  allStudentsMap: Map<string, Student>;
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  studentHistory: Record<string, Change[]>;
  setStudentHistory: React.Dispatch<React.SetStateAction<Record<string, Change[]>>>;
  studentContacts: Record<string, StudentContact>;
  setStudentContacts: React.Dispatch<React.SetStateAction<Record<string, StudentContact>>>;
  professorContacts: Record<string, ProfessorContact>;
  setProfessorContacts: React.Dispatch<React.SetStateAction<Record<string, ProfessorContact>>>;
  teams: Team[];
  fetchTeams: () => Promise<void>;
  seguimientoEntries: Record<string, (SeguimientoEntry | BitacoraEntry)[]>;
  fetchSeguimientoEntries: () => Promise<void>;
  teamTasks: TeamTask[];
  fetchTeamTasks: () => Promise<void>;
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
    HISTORY: 'academic_sentinel_history',
    UPLOADS: 'academic_sentinel_uploads',
    PLAN_TYPE: 'academic_sentinel_plan_type',
    PROFESSOR_CONTACTS_MIGRATED: 'academic_sentinel_prof_contacts_migrated',
    OFERTA_ACADEMICA: 'academic_sentinel_oferta_academica',
};


export function DashboardClient() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentHistory, setStudentHistory] = useState<Record<string, Change[]>>({});
  const [studentContacts, setStudentContacts] = useState<Record<string, StudentContact>>({});
  const [professorContacts, setProfessorContacts] = useState<Record<string, ProfessorContact>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [seguimientoEntries, setSeguimientoEntries] = useState<Record<string, (SeguimientoEntry | BitacoraEntry)[]>>({});
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [planType, setPlanType] = useState<PlanType>('tetramestral');
  const [ofertaAcademica, setOfertaAcademica] = useState<OfertaAcademicaItem[]>([]);
  
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [subjectRiskFilter, setSubjectRiskFilter] = useState<SubjectRiskFilter | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('academic-calendar');
  
  const allStudentsMap = useMemo(() => new Map(allStudents.map(s => [s.id, s])), [allStudents]);

  const fetchTeams = useCallback(async () => {
      try {
          const fetchedTeams = await getTeams();
          setTeams(fetchedTeams);
      } catch (error) {
          console.error("Failed to fetch teams:", error);
          toast({ variant: "destructive", title: "Error de Equipos", description: "No se pudieron cargar los equipos." });
      }
  }, [toast]);
  
  const fetchSeguimientoEntries = useCallback(async () => {
    try {
        const [seguimientos, bitacora] = await Promise.all([
            getSeguimientoEntries(),
            getBitacoraEntries()
        ]);
        
        const combined: Record<string, (SeguimientoEntry | BitacoraEntry)[]> = {};

        // Process seguimientos
        for (const studentId in seguimientos) {
            if (!combined[studentId]) combined[studentId] = [];
            combined[studentId].push(...seguimientos[studentId]);
        }

        // Process and adapt bitacora entries
        bitacora.forEach(entry => {
            if (!combined[entry.studentId]) combined[entry.studentId] = [];
            const adaptedEntry: BitacoraEntry & { attendedBy: string; topic: string; createdAt: any; notes: string; absencesAtFollowUp: number; missedAssignmentsAtFollowUp: number; } = {
                ...entry,
                attendedBy: entry.reportedBy,
                topic: 'Reporte', // Standardized topic for bitacora entries
                createdAt: entry.timestamp, // Use bitacora's own creation timestamp
                notes: entry.description, // Use description as notes for display
                absencesAtFollowUp: entry.absencesAtFollowUp ?? 0,
                missedAssignmentsAtFollowUp: entry.missedAssignmentsAtFollowUp ?? 0,
            };
            combined[entry.studentId].push(adaptedEntry);
        });

        // Sort entries for each student
        for (const studentId in combined) {
            combined[studentId].sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
        }

        setSeguimientoEntries(combined);
    } catch (error) {
        console.error("Failed to fetch seguimiento/bitacora entries:", error);
        toast({ variant: "destructive", title: "Error de Seguimiento", description: "No se pudieron cargar los registros." });
    }
}, [toast]);
  
  const fetchTeamTasks = useCallback(async () => {
    try {
        const entries = await getTeamTasks();
        setTeamTasks(entries);
    } catch (error) {
        console.error("Failed to fetch team tasks:", error);
        toast({ variant: "destructive", title: "Error de Tareas de Equipo", description: "No se pudieron cargar las tareas." });
    }
  }, [toast]);

  // Load data from local storage on initial mount
  useEffect(() => {
    async function loadInitialData() {
        try {
          const storedStudents = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
          if (storedStudents) setAllStudents(JSON.parse(storedStudents));

          const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
          if (storedHistory) setStudentHistory(JSON.parse(storedHistory));
          
          const storedUploads = localStorage.getItem(LOCAL_STORAGE_KEYS.UPLOADS);
          if (storedUploads) setUploadHistory(JSON.parse(storedUploads));
          
          const storedPlanType = localStorage.getItem(LOCAL_STORAGE_KEYS.PLAN_TYPE);
          if (storedPlanType) setPlanType(storedPlanType as PlanType);

          const storedOferta = localStorage.getItem(LOCAL_STORAGE_KEYS.OFERTA_ACADEMICA);
          if (storedOferta) setOfertaAcademica(JSON.parse(storedOferta));

          const studentContactsFromDb = await getContacts();
          setStudentContacts(studentContactsFromDb);
          
          let profContactsFromDb = await getProfessorContacts();

          // One-time migration from JSON to Firestore for professors
          const profMigrationDone = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFESSOR_CONTACTS_MIGRATED);
          if (!profMigrationDone && Object.keys(professorContactsData).length > 0) {
              console.log("Migrating professor contacts from JSON to Firestore...");
              const contactsToMigrate = professorContactsData as Record<string, string>;
              const formattedContacts: Record<string, ProfessorContact> = {};
              for (const name in contactsToMigrate) {
                  const normalizedId = name.toLowerCase().replace(/\s+/g, '');
                  formattedContacts[normalizedId] = { id: normalizedId, name, email: contactsToMigrate[name] };
              }
              await bulkAddOrUpdateProfessorContacts(formattedContacts);
              localStorage.setItem(LOCAL_STORAGE_KEYS.PROFESSOR_CONTACTS_MIGRATED, 'true');
              console.log("Professor contacts migration complete.");
              profContactsFromDb = await getProfessorContacts(); // Re-fetch after migration
          }
          setProfessorContacts(profContactsFromDb);

          await Promise.all([
            fetchSeguimientoEntries(),
            fetchTeamTasks(),
          ]);


        } catch (error) {
            console.error("Error loading data from Local Storage or DB", error);
            localStorage.clear(); // Clear all local storage on critical error
        } finally {
            setIsLoading(false);
        }
    }
    loadInitialData();
  }, [fetchSeguimientoEntries, fetchTeamTasks]);

  useEffect(() => {
    // Fetch teams whenever student data changes (so we can map names to IDs)
    if(allStudents.length > 0) {
        fetchTeams();
    }
  }, [allStudents, fetchTeams]);

  // Persist data to local storage whenever it changes (contacts are now in DB)
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
        if (ofertaAcademica.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.OFERTA_ACADEMICA, JSON.stringify(ofertaAcademica));
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
  }, [allStudents, studentHistory, uploadHistory, planType, ofertaAcademica, toast]);


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
  }, [currentFile, toast, teams]);


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
      // No se borran datos de Firebase intencionadamente
      toast({
          title: 'Datos Locales Eliminados',
          description: 'Los datos guardados en el navegador han sido borrados. Los datos en la nube (bitácora, tareas, equipos, contactos, etc.) permanecen.',
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
        if(caseType === 'sd-absences') return findSDAbsencesCases(students);
        if(caseType === 'sd-assignments') return findSDAssignmentsCases(students);
        if(caseType === 'at-limit-absences') {
            const sdIds = new Set(findSDAbsencesCases(students).map(s => s.id));
            return findAtLimitAbsencesCases(students).filter(s => !sdIds.has(s.id));
        }
        if(caseType === 'at-limit-assignments') {
            const sdIds = new Set(findSDAssignmentsCases(students).map(s => s.id));
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
  }, [allStudents, filterType, selectedValue, caseType, subjectRiskFilter, studentHistory, groupId]);
  
  const loadStudentSubjectsWrapper = async (studentId: string): Promise<Subject[]> => {
    const student = allStudentsMap.get(studentId);
    return student?.subjects || [];
  }
  
  const getStudentChangesWrapper = async (studentId: string): Promise<Change[]> => {
     return studentHistory[studentId] || [];
  }

  const contextValue: DashboardContextType = {
    filteredStudents, allStudents, allStudentsMap, setAllStudents, studentHistory, setStudentHistory, studentContacts, setStudentContacts, professorContacts, setProfessorContacts, teams, fetchTeams, seguimientoEntries, fetchSeguimientoEntries, teamTasks, fetchTeamTasks, setUploadHistory,
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
        case 'ponderaciones': return <PonderacionesDashboard />;
        case 'unclassified': return <UnclassifiedSubjectsPanel />;
        case 'academic-calendar': return <AcademicCalendar />;
        case 'professor-schedule': return <ProfessorSchedulePanel />;
        case 'bitacora': return <BitacoraPanel />;
        case 'team-tasks': return <TeamTasksPanel />;
        case 'seguimiento': return <SeguimientoPanel />;
        case 'teams-management': return <TeamsManagementPanel />;
        case 'academic-committee': return <AcademicCommitteePanel />;
        case 'oferta-academica': return <OfertaAcademicaPanel />;
        case 'irregular-students': return <IrregularStudentsPanel />;
        default: return <SeguimientoPanel />;
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
                   <SidebarMenuButton tooltip="Calendario Académico" isActive={activeView === 'academic-calendar'} onClick={() => handleSetActiveView('academic-calendar')}>
                    <CalendarDays />
                    <span>Calendario Académico</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Tablero de Seguimiento" isActive={activeView === 'seguimiento'} onClick={() => handleSetActiveView('seguimiento')}>
                    <FileText />
                    <span>Tablero de Seguimiento</span>
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
                   <SidebarMenuButton tooltip="Análisis de Irregulares" isActive={activeView === 'irregular-students'} onClick={() => handleSetActiveView('irregular-students')}>
                    <Users />
                    <span>Análisis de Irregulares</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Panel de Alumnos" isActive={activeView === 'students'} onClick={() => handleSetActiveView('students')}>
                    <Users />
                    <span>Panel de Alumnos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Comité Académico" isActive={activeView === 'academic-committee'} onClick={() => handleSetActiveView('academic-committee')}>
                    <Gavel />
                    <span>Comité Académico</span>
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
                   <SidebarMenuButton tooltip="Tareas de Equipo" isActive={activeView === 'team-tasks'} onClick={() => handleSetActiveView('team-tasks')}>
                    <ClipboardList />
                    <span>Tareas de Equipo</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Equipos" isActive={activeView === 'teams-management'} onClick={() => handleSetActiveView('teams-management')}>
                    <Shield />
                    <span>Equipos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planificador por Mapa" isActive={activeView === 'map-planner'} onClick={() => handleSetActiveView('map-planner')}>
                    <MapIcon />
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
