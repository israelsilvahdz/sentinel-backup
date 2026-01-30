
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
import { ProfessorSchedulePanel } from './ProfessorSchedulePanel';
import { OfertaAcademicaPanel } from './OfertaAcademicaPanel';
import { IrregularStudentsPanel } from './IrregularStudentsPanel';
import { ProjectionsPanel } from './ProjectionsPanel';
import { EarlyDeparturePanel } from './EarlyDeparturePanel';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, UploadCloud, CalendarClock, LayoutDashboard, Users, BookMarked, BookCopy, HelpCircle, ChevronLeft, Map as MapIcon, FileCheck2, FileClock, BarChart3, CalendarDays, Home, FileText, Contact, ClipboardList, Shield, Gavel, BookOpen, TrendingUp, Calendar, TimerOff } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';


import type { Student, Change, Subject, UploadHistory, StudentData, SubjectSummary, BitacoraEntry, StudentContact, TeamTask, SeguimientoEntry, ProfessorContact, OfertaAcademicaItem, Team } from '@/types/student';
import { parseExcel, getHeaderKey } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { findExtraordinaryCases, findIncompleteGradeCases, findLostCases, findObservationCases, findRiskCasesBySubject, findUrgentCases, findSDAbsencesCases, findSDAssignmentsCases, findAtLimitAbsencesCases, findAtLimitAssignmentsCases } from '@/lib/dataProcessor';
import { getBitacoraEntries, getContacts, getTeamTasks, getSeguimientoEntries, getProfessorContacts, bulkAddOrUpdateProfessorContacts, getTeams, bulkAddOrUpdateTeams, getAllStudentChanges } from '@/lib/firebase-services';
import professorContactsData from '@/lib/professor-contacts.json';
import { generateKeyFromData, xorCipher } from '@/lib/utils';


type FilterType = 'leader' | 'tutor' | 'subject' | 'professor' | 'group';
export type CaseType = 'lost' | 'urgent' | 'observation' | 'extraordinary' | 'changes' | 'incompleteGrade' | 'newAbsences' | 'newMissedAssignments' | 'sd-absences' | 'sd-assignments' | 'at-limit-absences' | 'at-limit-assignments';
export type ActiveView = 'dashboard' | 'students' | 'ponderaciones' | 'unclassified' | 'map-planner' | 'change-stats' | 'academic-calendar' | 'bitacora' | 'team-tasks' | 'seguimiento' | 'teams-management' | 'academic-committee' | 'professor-schedule' | 'oferta-academica' | 'irregular-students' | 'projections' | 'early-departure';
export type SubjectRiskFilter = { subjectName: string; riskType: 'absences' | 'missedAssignments' };
export type PlanType = 'semestral' | 'tetramestral';


interface DashboardContextType {
  filteredStudents: Student[];
  allStudents: Student[];
  allStudentsMap: Map<string, Student>;
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  studentHistory: Record<string, Change[]>;
  setStudentHistory: React.Dispatch<React.SetStateAction<Record<string, Change[]>>>;
  latestComparison: Record<string, Change[]>;
  setLatestComparison: React.Dispatch<React.SetStateAction<Record<string, Change[]>>>;
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
  mergeStudentData: (file: File) => Promise<void>;
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
    UPLOADS: 'academic_sentinel_uploads',
    PLAN_TYPE: 'academic_sentinel_plan_type',
    PROFESSOR_CONTACTS_MIGRATED: 'academic_sentinel_prof_contacts_migrated',
    OFERTA_ACADEMICA: 'academic_sentinel_oferta_academica',
};


export function DashboardClient() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentHistory, setStudentHistory] = useState<Record<string, Change[]>>({});
  const [latestComparison, setLatestComparison] = useState<Record<string, Change[]>>({});
  const [studentContacts, setStudentContacts] = useState<Record<string, StudentContact>>({});
  const [professorContacts, setProfessorContacts] = useState<Record<string, ProfessorContact>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [seguimientoEntries, setSeguimientoEntries] = useState<Record<string, (SeguimientoEntry | BitacoraEntry)[]>>({});
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [planType, setPlanType] = useState<PlanType>('tetramestral');
  const [ofertaAcademica, setOfertaAcademica] = useState<OfertaAcademicaItem[]>([]);
  
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
  const [activeView, setActiveView] = useState<ActiveView>('academic-calendar');
  const [contextualStudentIds, setContextualStudentIds] = useState<Set<string> | null>(null);
  
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

  // Load non-sensitive data from local storage on initial mount
  useEffect(() => {
    async function loadInitialData() {
        try {
          // Student data is no longer loaded from here. It will be loaded on file upload.

          const historyFromDb = await getAllStudentChanges();
          setStudentHistory(historyFromDb);
          
          const storedUploads = localStorage.getItem(LOCAL_STORAGE_KEYS.UPLOADS);
          if (storedUploads) setUploadHistory(JSON.parse(storedUploads));
          
          const storedPlanType = localStorage.getItem(LOCAL_STORAGE_KEYS.PLAN_TYPE);
          if (storedPlanType) setPlanType(storedPlanType as PlanType);

          // Contacts and other Firebase data will be fetched.
          const studentContactsFromDb = await getContacts();
          setStudentContacts(studentContactsFromDb);
          
          let profContactsFromDb = await getProfessorContacts();

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
              profContactsFromDb = await getProfessorContacts();
          }
          setProfessorContacts(profContactsFromDb);

          await Promise.all([
            fetchSeguimientoEntries(),
            fetchTeamTasks(),
            fetchTeams(),
          ]);

        } catch (error) {
            console.error("Error loading data from Local Storage or DB", error);
            Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        } finally {
            setIsLoading(false);
        }
    }
    loadInitialData();
  }, [fetchSeguimientoEntries, fetchTeamTasks, fetchTeams]);

  // Persist data to local storage whenever it changes, now with encryption
  useEffect(() => {
    try {
        if(allStudents.length > 0 && dataKey) {
            const encryptedStudents = xorCipher(JSON.stringify(allStudents), dataKey);
            localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, encryptedStudents);
        }
        if(uploadHistory.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.UPLOADS, JSON.stringify(uploadHistory));
        }
        if (ofertaAcademica.length > 0 && dataKey) {
            const encryptedOferta = xorCipher(JSON.stringify(ofertaAcademica), dataKey);
            localStorage.setItem(LOCAL_STORAGE_KEYS.OFERTA_ACADEMICA, encryptedOferta);
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
  }, [allStudents, uploadHistory, planType, ofertaAcademica, dataKey, toast]);


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
            const newKey = await getHeaderKey(currentFile);
            setDataKey(newKey);
            setProgress(20);

            let studentsArray: Student[] = [];
            let ofertaArray: OfertaAcademicaItem[] = [];
            let loadedFromStorage = false;

            const encryptedStudents = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
            if (encryptedStudents) {
                try {
                    const decryptedData = xorCipher(encryptedStudents, newKey);
                    const parsedData = JSON.parse(decryptedData);
                    if (Array.isArray(parsedData) && (parsedData.length === 0 || 'name' in parsedData[0])) {
                        studentsArray = parsedData;
                        loadedFromStorage = true;
                    }
                } catch (e) {
                    console.warn("Could not decrypt student data with the provided file key.");
                }
            }

            const encryptedOferta = localStorage.getItem(LOCAL_STORAGE_KEYS.OFERTA_ACADEMICA);
            if (encryptedOferta) {
                try {
                    const decryptedData = xorCipher(encryptedOferta, newKey);
                    const parsedData = JSON.parse(decryptedData);
                    if (Array.isArray(parsedData)) ofertaArray = parsedData;
                } catch(e) {
                    console.warn("Could not decrypt oferta académica data.");
                }
            }
            
            if (loadedFromStorage) {
                setAllStudents(studentsArray);
                setOfertaAcademica(ofertaArray);
                toast({
                    title: 'Datos Desbloqueados',
                    description: `Se han cargado ${studentsArray.length} alumnos de tus datos guardados.`,
                });
            } else {
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
                
                // Clear potentially stale oferta academica if starting a new "session"
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
            }
            setUploadHistory(prev => [{ id: Date.now().toString(), fileName: currentFile.name, uploadedAt: new Date().toISOString() }, ...prev].slice(0, 10));

        } catch (error) {
           toast({ variant: 'destructive', title: 'Error al procesar', description: `Hubo un problema al procesar el archivo. Revisa la consola.`});
           console.error(error);
        } finally {
            setTimeout(() => { setIsProcessing(false); setProgress(0); setCurrentFile(null); }, 500);
        }
    };
    processFile();
  }, [currentFile, toast]);

    const handleMergeUpload = useCallback(async (file: File) => {
        try {
            const newStudentData = await parseExcel(file);
            if (!newStudentData) {
                toast({ variant: 'destructive', title: 'Error de Formato', description: 'El archivo para fusionar está vacío o tiene un formato incorrecto.' });
                return;
            }

            setAllStudents(prevStudents => {
                const studentMap: Map<string, Student> = new Map(prevStudents.map(s => [s.id, JSON.parse(JSON.stringify(s))]));

                for (const studentId in newStudentData) {
                    const newStudentInfo = newStudentData[studentId];
                    if (studentMap.has(studentId)) {
                        const studentToUpdate = studentMap.get(studentId)!;
                        const existingSubjectIds = new Set(studentToUpdate.subjects?.map((s: Subject) => s.id));
                        newStudentInfo.subjects?.forEach(newSubject => {
                            if (!existingSubjectIds.has(newSubject.id)) {
                                studentToUpdate.subjects?.push(newSubject);
                                studentToUpdate.subjectSummaries?.push({
                                    id: newSubject.id, name: newSubject.name, group: newSubject.group, absences: newSubject.absences, absenceLimit: newSubject.absenceLimit,
                                    missedAssignments: newSubject.missedAssignments, missedAssignmentLimit: newSubject.missedAssignmentLimit, grade: newSubject.grade, finalGrade: newSubject.finalGrade,
                                });
                            }
                        });
                    } else {
                        studentMap.set(studentId, {
                            ...newStudentInfo,
                            subjectSummaries: (newStudentInfo.subjects || []).map(s => ({
                                id: s.id, name: s.name, group: s.group, absences: s.absences, absenceLimit: s.absenceLimit,
                                missedAssignments: s.missedAssignments, missedAssignmentLimit: s.missedAssignmentLimit, grade: s.grade, finalGrade: s.finalGrade,
                            })),
                        });
                    }
                }
                return Array.from(studentMap.values());
            });
            toast({ title: 'Datos Fusionados', description: 'Se han añadido los datos del nuevo reporte.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al fusionar', description: `Hubo un problema al procesar el archivo. Revisa la consola.` });
            console.error(error);
        }
    }, [toast]);

  const handleDeleteAllData = () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción es irreversible.')) return;
    
    setIsProcessing(true);
    setProgress(20);
    try {
      Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      
      setAllStudents([]);
      setStudentHistory({});
      setUploadHistory([]);
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
            return students.filter(s => studentIdsWithNewAbsences.has(s.id));
        }
        if (caseType === 'newMissedAssignments') {
            const studentIdsWithNewNE = new Set<string>();
             Object.entries(latestComparison).forEach(([studentId, changes]) => {
                if (changes.some(c => c.fieldName === 'missedAssignments')) {
                    studentIdsWithNewNE.add(studentId);
                }
            });
            return students.filter(s => studentIdsWithNewNE.has(s.id));
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
  }, [allStudents, filterType, selectedValue, caseType, subjectRiskFilter, latestComparison, groupId, contextualStudentIds]);
  
  const loadStudentSubjectsWrapper = async (studentId: string): Promise<Subject[]> => {
    const student = allStudentsMap.get(studentId);
    return student?.subjects || [];
  }
  
  const getStudentChangesWrapper = async (studentId: string): Promise<Change[]> => {
     return studentHistory[studentId] || [];
  }

  const reportInfo = useMemo(() => {
    if (uploadHistory.length === 0) {
        return null;
    }
    const latestUpload = uploadHistory[0];
    const fileName = latestUpload.fileName;

    const dateMatch = fileName.match(/(\d{2})\.(\d{2})\.(\d{4}|\d{2})/);
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
  }, [uploadHistory, planType]);

  const contextValue: DashboardContextType = {
    filteredStudents, allStudents, allStudentsMap, setAllStudents, studentHistory, setStudentHistory, latestComparison, setLatestComparison, studentContacts, setStudentContacts, professorContacts, setProfessorContacts, teams, fetchTeams, seguimientoEntries, fetchSeguimientoEntries, teamTasks, fetchTeamTasks, setUploadHistory,
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
    mergeStudentData: handleMergeUpload,
  };

  const renderActiveView = () => {
    switch (activeView) {
        case 'dashboard': return <Dashboard />;
        case 'students': return <StudentPanel />;
        case 'change-stats': return <ChangeStats />;
        case 'projections': return <ProjectionsPanel />;
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
        case 'early-departure': return <EarlyDeparturePanel />;
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
                   <SidebarMenuButton tooltip="Proyecciones de Riesgo" isActive={activeView === 'projections'} onClick={() => handleSetActiveView('projections')}>
                    <TrendingUp />
                    <span>Proyecciones de Riesgo</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Panel de Alumnos" isActive={activeView === 'students'} onClick={() => handleSetActiveView('students')}>
                    <Users />
                    <span>Panel de Alumnos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Alumnos con Salida Temprano" isActive={activeView === 'early-departure'} onClick={() => handleSetActiveView('early-departure')}>
                    <TimerOff />
                    <span>Salida Temprano</span>
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
                    {allStudents.length > 0 && reportInfo?.date && (
                        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-1.5">
                                <Calendar size={14} />
                                <span>Reporte del {reportInfo.date}</span>
                            </div>
                            <Badge variant="secondary">{reportInfo.plan}</Badge>
                        </div>
                    )}
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
