
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
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
import { DashboardFilters } from './DashboardFilters';
import { WelcomeDashboard } from './WelcomeDashboard';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, LayoutDashboard, Users, BookCopy, HelpCircle, Map as MapIcon, FileClock, BarChart3, Contact, Shield, BookOpen, Calendar, ClipboardList, Download, Smartphone, TrendingUp, Home, Zap, ListChecks, GraduationCap, BookText, FileQuestion, Flag, CloudDownload, Link2, Gavel } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';


import type { Student, Change, Subject, StudentData, StudentContact, TeamTask, ProfessorContact, OfertaAcademicaItem, Team, WeightingScheme, ContinuityStudent, ContinuityCatalog, ActiveView, StudentLifeProfile } from '@/types/student';
import { parseExcel, getHeaderKey } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { findExtraordinaryCases, findIncompleteGradeCases, findLostCases, findObservationCases, findRiskCasesBySubject, findUrgentCases, findSDAbsencesCases, findSDAssignmentsCases, findAtLimitAbsencesCases, findAtLimitAssignmentsCases, findPotentialRiskCases, findPotentialRangeCases, findRequiredScoreRangeCases } from '@/lib/dataProcessor';
import { getContact, getContacts, getTeamTasks, getProfessorContacts, getTeams, getWeightingSchemes, getPriorityCases, setPriorityCase, getStudentLifeProfiles } from '@/lib/firebase-services';
import { xorCipher } from '@/lib/utils';


export type FilterType = 'leader' | 'tutor' | 'subject' | 'professor' | 'group';
export type CaseType = 'lost' | 'urgent' | 'observation' | 'extraordinary' | 'changes' | 'incompleteGrade' | 'newAbsences' | 'newMissedAssignments' | 'sd-absences' | 'sd-assignments' | 'at-limit-absences' | 'at-limit-assignments' | 'low-potential' | 'very-low-potential' | 'pot-70-75' | 'pot-76-80' | 'pot-81-85' | 'req-100' | 'req-90' | 'req-80' | 'req-70' | 'priority';
export type SubjectRiskFilter = { subjectName: string; riskType: 'absences' | 'missedAssignments' };
export type PlanType = 'semestral' | 'tetramestral';
export type { ActiveView } from '@/types/student';

const VALID_VIEWS: ActiveView[] = [
  'welcome',
  'dashboard',
  'students',
  'weighting-schemes',
  'unclassified',
  'map-planner',
  'change-stats',
  'teams-management',
  'academic-committee',
  'professor-schedule',
  'oferta-academica',
  'irregular-students',
  'team-work',
  'continuidad',
  'subject-planning',
  'subject-tracking',
  'exam-candidates',
];

function PanelLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-5 py-4 text-sm font-semibold text-primary shadow-sm">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Cargando módulo...</span>
      </div>
    </div>
  );
}

const Dashboard = dynamic(() => import('./Dashboard').then((mod) => mod.Dashboard), { loading: () => <PanelLoading /> });
const StudentPanel = dynamic(() => import('./StudentPanel').then((mod) => mod.StudentPanel), { loading: () => <PanelLoading /> });
const ChangeStats = dynamic(() => import('./ChangeStats').then((mod) => mod.ChangeStats), { loading: () => <PanelLoading /> });
const PonderacionesDashboard = dynamic(() => import('./PonderacionesDashboard').then((mod) => mod.PonderacionesDashboard), { loading: () => <PanelLoading /> });
const UnclassifiedSubjectsPanel = dynamic(() => import('./UnclassifiedSubjectsPanel').then((mod) => mod.UnclassifiedSubjectsPanel), { loading: () => <PanelLoading /> });
const MapPlanner = dynamic(() => import('./MapPlanner').then((mod) => mod.MapPlanner), { loading: () => <PanelLoading /> });
const TeamsManagementPanel = dynamic(() => import('./TeamsManagementPanel').then((mod) => mod.TeamsManagementPanel), { loading: () => <PanelLoading /> });
const AcademicCommitteePanel = dynamic(() => import('./AcademicCommitteePanelV3').then((mod) => mod.AcademicCommitteePanel), { loading: () => <PanelLoading /> });
const ProfessorSchedulePanel = dynamic(() => import('./ProfessorSchedulePanel').then((mod) => mod.ProfessorSchedulePanel), { loading: () => <PanelLoading /> });
const OfertaAcademicaPanel = dynamic(() => import('./OfertaAcademicaPanel').then((mod) => mod.OfertaAcademicaPanel), { loading: () => <PanelLoading /> });
const IrregularStudentsPanel = dynamic(() => import('./IrregularStudentsPanel').then((mod) => mod.IrregularStudentsPanel), { loading: () => <PanelLoading /> });
const TeamWorkPanel = dynamic(() => import('./TeamWorkPanel').then((mod) => mod.TeamWorkPanel), { loading: () => <PanelLoading /> });
const ContinuidadPanel = dynamic(() => import('./ContinuidadPanel').then((mod) => mod.ContinuidadPanel), { loading: () => <PanelLoading /> });
const SubjectPlanningPanel = dynamic(() => import('./SubjectPlanningPanel').then((mod) => mod.SubjectPlanningPanel), { loading: () => <PanelLoading /> });
const SubjectTrackingPanel = dynamic(() => import('./SubjectTrackingPanel').then((mod) => mod.SubjectTrackingPanel), { loading: () => <PanelLoading /> });
const ExamCandidatesPanel = dynamic(() => import('./ExamCandidatesPanel').then((mod) => mod.ExamCandidatesPanel), { loading: () => <PanelLoading /> });

const PERSISTENCE_KEY = "sentinel_v2026_secure";

interface DashboardContextType {
  filteredStudents: Student[];
  allStudents: Student[];
  allStudentsMap: Map<string, Student>;
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  latestComparison: Record<string, Change[]>;
  setLatestComparison: React.Dispatch<React.SetStateAction<Record<string, Change[]>>>;
  studentContacts: Record<string, StudentContact>;
  setStudentContacts: React.Dispatch<React.SetStateAction<Record<string, StudentContact>>>;
  studentLifeProfiles: Record<string, StudentLifeProfile>;
  setStudentLifeProfiles: React.Dispatch<React.SetStateAction<Record<string, StudentLifeProfile>>>;
  fetchStudentContact: (studentId: string) => Promise<StudentContact | null>;
  professorContacts: Record<string, ProfessorContact>;
  setProfessorContacts: React.Dispatch<React.SetStateAction<Record<string, ProfessorContact>>>;
  teams: Team[];
  fetchTeams: () => Promise<void>;
  teamTasks: TeamTask[];
  fetchTeamTasks: () => Promise<void>;
  weightingSchemes: WeightingScheme[];
  fetchWeightingSchemes: () => Promise<void>;
  priorityCases: Record<string, { studentId: string, topic: string }>;
  togglePriorityCase: (studentId: string, isPriority: boolean, topic?: string) => Promise<void>;
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
  syncContacts: () => Promise<void>; 
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboardFilters() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboardFilters must be used within a DashboardProvider');
  return context;
}

const LOCAL_STORAGE_KEYS = {
    STUDENTS: 'academic_sentinel_students',
    CONTACTS: 'academic_sentinel_contacts', 
    STUDENT_LIFE_PROFILES: 'academic_sentinel_life_profiles',
    PLAN_TYPE: 'academic_sentinel_plan_type',
    OFERTA_ACADEMICA: 'academic_sentinel_oferta_academica',
    CURRENT_FILE_NAME: 'academic_sentinel_current_file_name',
    DATA_KEY: 'academic_sentinel_data_key',
    CONTINUITY_STUDENTS: 'academic_sentinel_continuity_students',
    CONTINUITY_CATALOG: 'academic_sentinel_continuity_catalog',
    ACTIVE_VIEW: 'academic_sentinel_active_view'
};

function buildProcessedStudents(studentData: StudentData): Student[] {
  return Object.values(studentData).map(student => ({
    ...student,
    subjectSummaries: (student.subjects || []).map(s => ({
      id: s.id,
      name: s.name,
      absences: s.absences,
      absenceLimit: s.absenceLimit,
      missedAssignments: s.missedAssignments,
      missedAssignmentLimit: s.missedAssignmentLimit,
      grade: s.grade,
      finalGrade: s.finalGrade,
      group: s.group,
    })),
  }));
}

function mergeStudentLists(baseStudents: Student[], incomingStudents: Student[]): Student[] {
  const merged = new Map<string, Student>();

  const addOrMergeStudent = (student: Student) => {
    const existing = merged.get(student.id);
    if (!existing) {
      merged.set(student.id, {
        ...student,
        subjects: [...(student.subjects || [])],
        subjectSummaries: [...(student.subjectSummaries || [])],
      });
      return;
    }

    const mergedSubjectsMap = new Map<string, Subject>();
    [...(existing.subjects || []), ...(student.subjects || [])].forEach(subject => {
      const subjectKey = `${subject.id}|${subject.group}|${subject.name}|${subject.professorName}|${subject.schedule?.startTime || ''}`;
      if (!mergedSubjectsMap.has(subjectKey)) {
        mergedSubjectsMap.set(subjectKey, subject);
      }
    });

    const mergedSubjects = Array.from(mergedSubjectsMap.values());

    merged.set(student.id, {
      ...existing,
      name: existing.name || student.name,
      leader: existing.leader || student.leader,
      tutor: existing.tutor || student.tutor,
      isGraduationCandidate: existing.isGraduationCandidate || student.isGraduationCandidate,
      subjects: mergedSubjects,
      subjectSummaries: mergedSubjects.map(s => ({
        id: s.id,
        name: s.name,
        absences: s.absences,
        absenceLimit: s.absenceLimit,
        missedAssignments: s.missedAssignments,
        missedAssignmentLimit: s.missedAssignmentLimit,
        grade: s.grade,
        finalGrade: s.finalGrade,
        group: s.group,
      })),
    });
  };

  baseStudents.forEach(addOrMergeStudent);
  incomingStudents.forEach(addOrMergeStudent);

  return Array.from(merged.values());
}


export function DashboardClient() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [latestComparison, setLatestComparison] = useState<Record<string, Change[]>>({});
  const [studentContacts, setStudentContacts] = useState<Record<string, StudentContact>>({});
  const [studentLifeProfiles, setStudentLifeProfiles] = useState<Record<string, StudentLifeProfile>>({});
  const [professorContacts, setProfessorContacts] = useState<Record<string, ProfessorContact>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamTasks, setTeamTasks] = useState<TeamTask[]>([]);
  const [weightingSchemes, setWeightingSchemes] = useState<WeightingScheme[]>([]);
  const [priorityCases, setPriorityCases] = useState<Record<string, { studentId: string, topic: string }>>({});
  const [planType, setPlanType] = useState<PlanType>('tetramestral');
  const [ofertaAcademica, setOfertaAcademica] = useState<OfertaAcademicaItem[]>([]);
  const [continuityStudents, setContinuityStudents] = useState<ContinuityStudent[]>([]);
  const [continuityCatalog, setContinuityCatalog] = useState<ContinuityCatalog | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [mergeFile, setMergeFile] = useState<File | null>(null);
  const [dataKey, setDataKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [subjectRiskFilter, setSubjectRiskFilter] = useState<SubjectRiskFilter | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('welcome');
  const [contextualStudentIds, setContextualStudentIds] = useState<Set<string> | null>(null);
  
  const allStudentsMap = useMemo(() => new Map(allStudents.map(s => [s.id, s])), [allStudents]);

  const syncContacts = useCallback(async () => {
    setIsLoading(true);
    try {
        const allContacts = await getContacts();
        setStudentContacts(allContacts);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CONTACTS, xorCipher(JSON.stringify(allContacts), PERSISTENCE_KEY));
        toast({ title: "Directorio Actualizado", description: "Se han descargado los números de la base de datos." });
    } catch (e) { toast({ variant: "destructive", title: "Error al sincronizar" }); } finally { setIsLoading(false); }
  }, [toast]);

  const fetchTeams = useCallback(async () => {
      try { const fetchedTeams = await getTeams(); setTeams(fetchedTeams); } catch (error) { console.error(error); }
  }, []);
  
  const fetchTeamTasks = useCallback(async () => {
    try { const tasks = await getTeamTasks(); setTeamTasks(tasks); } catch (error) { console.error(error); }
  }, []);

  const fetchWeightingSchemes = useCallback(async () => {
    try { const schemes = await getWeightingSchemes(); setWeightingSchemes(schemes); } catch (error) { console.error(error); }
  }, []);

  const togglePriorityCase = async (studentId: string, isPriority: boolean, topic?: string) => {
    try {
        await setPriorityCase(studentId, isPriority, topic);
        const updatedCases = await getPriorityCases();
        setPriorityCases(updatedCases);
        toast({ title: isPriority ? "Alumno marcado" : "Marcado eliminado" });
    } catch (error) { toast({ variant: "destructive", title: "Error" }); }
  };
  
  const fetchStudentContact = useCallback(async (studentId: string): Promise<StudentContact | null> => {
    if (studentContacts[studentId]) return studentContacts[studentId];
    setIsLoading(true);
    try {
        const contact = await getContact(studentId);
        if (contact) { setStudentContacts(prev => ({ ...prev, [studentId]: contact })); return contact; }
        return null;
    } catch (error) { return null; } finally { setIsLoading(false); }
  }, [studentContacts]);


  useEffect(() => {
    async function loadInitialData() {
        setIsLoading(true);
        try {
          const [profContactsFromDb, tasks, fetchedTeams, schemes, pCases] = await Promise.all([
            getProfessorContacts(), getTeamTasks(), getTeams(), getWeightingSchemes(), getPriorityCases()
          ]);
          setProfessorContacts(profContactsFromDb); 
          setTeams(fetchedTeams); 
          setWeightingSchemes(schemes); 
          setTeamTasks(tasks); 
          setPriorityCases(pCases);
          
          const storedPlanType = localStorage.getItem(LOCAL_STORAGE_KEYS.PLAN_TYPE);
          if (storedPlanType) setPlanType(storedPlanType as PlanType);
          const storedFileName = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_FILE_NAME);
          if (storedFileName) setCurrentFileName(storedFileName);
          const storedActiveView = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_VIEW);
          if (storedActiveView && VALID_VIEWS.includes(storedActiveView as ActiveView)) {
            setActiveView(storedActiveView as ActiveView);
          }
          
          // CARGAR CONTACTOS (Prioridad: localStorage con clave estática)
          const cachedContacts = localStorage.getItem(LOCAL_STORAGE_KEYS.CONTACTS);
          if (cachedContacts) {
              try { 
                  const decrypted = xorCipher(cachedContacts, PERSISTENCE_KEY);
                  setStudentContacts(JSON.parse(decrypted)); 
              } catch (e) { 
                  console.warn("Fallo al desencriptar contactos, limpiando caché...");
                  localStorage.removeItem(LOCAL_STORAGE_KEYS.CONTACTS);
                  const allContacts = await getContacts();
                  setStudentContacts(allContacts);
                  localStorage.setItem(LOCAL_STORAGE_KEYS.CONTACTS, xorCipher(JSON.stringify(allContacts), PERSISTENCE_KEY));
              }
          } else {
              const allContacts = await getContacts();
              setStudentContacts(allContacts);
              localStorage.setItem(LOCAL_STORAGE_KEYS.CONTACTS, xorCipher(JSON.stringify(allContacts), PERSISTENCE_KEY));
          }

          const cachedLifeProfiles = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENT_LIFE_PROFILES);
          if (cachedLifeProfiles) {
              try {
                  const decrypted = xorCipher(cachedLifeProfiles, PERSISTENCE_KEY);
                  setStudentLifeProfiles(JSON.parse(decrypted));
              } catch (e) {
                  localStorage.removeItem(LOCAL_STORAGE_KEYS.STUDENT_LIFE_PROFILES);
                  const allProfiles = await getStudentLifeProfiles();
                  setStudentLifeProfiles(allProfiles);
                  localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENT_LIFE_PROFILES, xorCipher(JSON.stringify(allProfiles), PERSISTENCE_KEY));
              }
          } else {
              const allProfiles = await getStudentLifeProfiles();
              setStudentLifeProfiles(allProfiles);
              localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENT_LIFE_PROFILES, xorCipher(JSON.stringify(allProfiles), PERSISTENCE_KEY));
          }

          const storedKey = localStorage.getItem(LOCAL_STORAGE_KEYS.DATA_KEY);
          if (storedKey) {
              setDataKey(storedKey);
              const storedStudents = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
              if (storedStudents) { 
                  try { setAllStudents(JSON.parse(xorCipher(storedStudents, storedKey))); } catch (e) { 
                      console.warn("Fallo al desencriptar alumnos.");
                      localStorage.removeItem(LOCAL_STORAGE_KEYS.STUDENTS);
                  } 
              }
          }
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    try {
        if(allStudents.length > 0 && dataKey) localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, xorCipher(JSON.stringify(allStudents), dataKey));
        if (Object.keys(studentContacts).length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.CONTACTS, xorCipher(JSON.stringify(studentContacts), PERSISTENCE_KEY));
        }
        if (Object.keys(studentLifeProfiles).length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENT_LIFE_PROFILES, xorCipher(JSON.stringify(studentLifeProfiles), PERSISTENCE_KEY));
        }
        if (dataKey) localStorage.setItem(LOCAL_STORAGE_KEYS.DATA_KEY, dataKey);
        localStorage.setItem(LOCAL_STORAGE_KEYS.PLAN_TYPE, planType);
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_VIEW, activeView);
        if (currentFileName) localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_FILE_NAME, currentFileName);
    } catch(error) { console.error(error); }
  }, [allStudents, studentContacts, studentLifeProfiles, planType, dataKey, currentFileName, activeView]);

  const reportInfo = useMemo(() => {
    if (!currentFileName) return null;
    const dateMatch = currentFileName.match(/(\d{2})\.(\d{2})\.(\d{4}|\d{2})/);
    let displayDate: string | null = null;
    if (dateMatch) {
        const day = dateMatch[1];
        const month = dateMatch[2];
        let year = dateMatch[3];
        if (year.length === 2) year = `20${year}`;
        displayDate = `${day}/${month}/${year}`;
    }
    return { date: displayDate, plan: planType === 'tetramestral' ? 'Tetramestral' : 'Semestral' };
  }, [currentFileName, planType]);

  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type); setSelectedValue(null); setCaseType(null); setSubjectRiskFilter(null); setGroupId(null); setContextualStudentIds(null);
  };

  const handleSetActiveView = (view: ActiveView) => {
    setActiveView(view);
    if (view !== 'students' && view !== 'continuidad' && view !== 'subject-tracking') {
      setCaseType(null); setSubjectRiskFilter(null); setGroupId(null); setContextualStudentIds(null);
    }
  }

  const handleSetCaseType = (type: CaseType | null) => {
    setCaseType(type); setSubjectRiskFilter(null); setGroupId(null); setContextualStudentIds(null);
  };

  const handleSetSubjectRiskFilter = (filter: SubjectRiskFilter | null) => {
    setSubjectRiskFilter(filter); setCaseType(null); setGroupId(null); setContextualStudentIds(null);
  };
  
  const handleFileUpload = useCallback((file: File | null) => {
    setAllStudents([]); 
    localStorage.removeItem(LOCAL_STORAGE_KEYS.STUDENTS);
    setCurrentFile(file);
  }, []);

  const handleMergeFileUpload = useCallback((file: File | null) => {
    if (!file) {
      setMergeFile(null);
      return;
    }
    setMergeFile(file);
  }, []);

  useEffect(() => {
    const processFile = async () => {
        if (!currentFile) return;
        setIsProcessing(true); setProgress(10);
        try {
            const newKey = await getHeaderKey(currentFile);
            setDataKey(newKey); setProgress(20);
            const studentData = await parseExcel(currentFile); setProgress(50);
            if (!studentData) { setIsProcessing(false); setProgress(0); return; }
            const processedStudents = buildProcessedStudents(studentData);
            setAllStudents(processedStudents); setCurrentFileName(currentFile.name);
            if (currentFile.name.match(/40|50|60/)) setPlanType('semestral');
            else setPlanType('tetramestral');
            setProgress(90);
        } catch (error) { console.error(error); } finally {
            setTimeout(() => { setIsProcessing(false); setProgress(0); setCurrentFile(null); }, 500);
        }
    };
    processFile();
  }, [currentFile]);

  useEffect(() => {
    const mergeCurrentData = async () => {
      if (!mergeFile) return;
      if (allStudents.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Carga primero un reporte base',
          description: 'Primero abre uno de los dos monitoreos y luego fusiona el segundo.',
        });
        setMergeFile(null);
        return;
      }

      setIsMerging(true);
      try {
        const incomingStudentData = await parseExcel(mergeFile);
        if (!incomingStudentData) {
          throw new Error('El reporte adicional no tiene el formato esperado.');
        }

        const incomingStudents = buildProcessedStudents(incomingStudentData);
        setAllStudents(previousStudents => mergeStudentLists(previousStudents, incomingStudents));
        setCurrentFileName(prev => prev ? `${prev} + ${mergeFile.name}` : mergeFile.name);
        toast({
          title: 'Reporte fusionado',
          description: `Se agregaron los datos de ${mergeFile.name} al monitoreo actual.`,
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error al fusionar',
          description: 'No se pudo fusionar el segundo reporte.',
        });
      } finally {
        setIsMerging(false);
        setMergeFile(null);
      }
    };

    mergeCurrentData();
  }, [mergeFile, allStudents.length, toast]);

  const leaders = useMemo(() => [...new Set(allStudents.map(s => s.leader).filter(Boolean))].sort(), [allStudents]);
  const tutors = useMemo(() => [...new Set(allStudents.map(s => s.tutor).filter(Boolean))].sort(), [allStudents]);
  const subjects = useMemo(() => [...new Set(allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.name) || []).filter(Boolean))].sort(), [allStudents]);
  const professors = useMemo(() => [...new Set(allStudents.flatMap(s => s.subjects?.map(sub => sub.professorName) || []).filter(Boolean))].sort(), [allStudents]);
  const groups = useMemo(() => [...new Set(allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.group) || []).filter(Boolean))].sort(), [allStudents]);

  const filteredStudents = useMemo(() => {
    if (contextualStudentIds) return allStudents.filter(s => contextualStudentIds.has(s.id));
    let students = allStudents;
    if (selectedValue) {
        if (filterType === 'leader') students = students.filter(s => s.leader === selectedValue);
        if (filterType === 'tutor') students = students.filter(s => s.tutor === selectedValue);
        if (filterType === 'professor') students = students.filter(s => s.subjects?.some(sub => sub.professorName === selectedValue));
        if (filterType === 'group') students = students.filter(s => s.subjectSummaries?.some(sub => sub.group === selectedValue));
        if (filterType === 'subject') students = students.filter(s => s.subjectSummaries?.some(sub => sub.name === selectedValue && (groupId ? sub.group === groupId : true)));
    }
    if (caseType) {
        if (caseType === 'priority') return students.filter(s => !!priorityCases[s.id]);
        if (caseType === 'changes') return students.filter(s => !!latestComparison[s.id]);
        if (caseType === 'newAbsences') {
          return students.filter(student =>
            (latestComparison[student.id] || []).some(change =>
              change.fieldName === 'absences' && change.changeType === 'increase'
            )
          );
        }
        if (caseType === 'newMissedAssignments') {
          return students.filter(student =>
            (latestComparison[student.id] || []).some(change =>
              change.fieldName === 'missedAssignments' && change.changeType === 'increase'
            )
          );
        }
        if(caseType === 'lost') return findLostCases(students);
        if(caseType === 'urgent') return findUrgentCases(students, new Set(findLostCases(students).map(s => s.id)));
        if(caseType === 'observation') {
          const excludedIds = new Set([
            ...findLostCases(students).map(s => s.id),
            ...findUrgentCases(students, new Set(findLostCases(students).map(s => s.id))).map(s => s.id),
          ]);
          return findObservationCases(students, excludedIds);
        }
        if(caseType === 'extraordinary') return findExtraordinaryCases(students);
        if(caseType === 'incompleteGrade') return findIncompleteGradeCases(students);
        if(caseType === 'sd-absences') return findSDAbsencesCases(students);
        if(caseType === 'sd-assignments') return findSDAssignmentsCases(students);
        if(caseType === 'at-limit-absences') return findAtLimitAbsencesCases(students);
        if(caseType === 'at-limit-assignments') return findAtLimitAssignmentsCases(students);
        if(caseType === 'low-potential') return findPotentialRiskCases(students, weightingSchemes, 70);
        if(caseType === 'very-low-potential') return findPotentialRiskCases(students, weightingSchemes, 50);
        if(caseType === 'pot-70-75') return findPotentialRangeCases(students, weightingSchemes, 70, 75);
        if(caseType === 'pot-76-80') return findPotentialRangeCases(students, weightingSchemes, 76, 80);
        if(caseType === 'pot-81-85') return findPotentialRangeCases(students, weightingSchemes, 81, 85);
        if(caseType === 'req-100') return findRequiredScoreRangeCases(students, weightingSchemes, 100, Infinity);
        if(caseType === 'req-90') return findRequiredScoreRangeCases(students, weightingSchemes, 90, 99.9999);
        if(caseType === 'req-80') return findRequiredScoreRangeCases(students, weightingSchemes, 80, 89.9999);
        if(caseType === 'req-70') return findRequiredScoreRangeCases(students, weightingSchemes, 70, 79.9999);
    }
    if (subjectRiskFilter) return findRiskCasesBySubject(students, subjectRiskFilter.subjectName, subjectRiskFilter.riskType);
    return students;
  }, [allStudents, filterType, selectedValue, caseType, subjectRiskFilter, latestComparison, groupId, contextualStudentIds, weightingSchemes, priorityCases]);
  

  const contextValue: DashboardContextType = useMemo(() => ({
    filteredStudents, allStudents, allStudentsMap, setAllStudents, latestComparison, setLatestComparison, studentContacts, setStudentContacts, studentLifeProfiles, setStudentLifeProfiles, fetchStudentContact, professorContacts, setProfessorContacts, teams, fetchTeams, teamTasks, fetchTeamTasks, weightingSchemes, fetchWeightingSchemes,
    priorityCases, togglePriorityCase,
    isLoading: isLoading || isProcessing, hasData: allStudents.length > 0,
    leaders, tutors, subjects, professors, groups, groupsForSubject: (sub) => [],
    filterType, setFilterType: handleSetFilterType,
    selectedValue, setSelectedValue,
    groupId, setGroupId,
    caseType, setCaseType: handleSetCaseType,
    subjectRiskFilter, setSubjectRiskFilter: handleSetSubjectRiskFilter,
    contextualStudentIds, setContextualStudentIds,
    loadStudentSubjects: async (id) => allStudentsMap.get(id)?.subjects || [],
    getStudentChanges: async (id) => latestComparison[id] || [],
    activeView, setActiveView: handleSetActiveView,
    planType, ofertaAcademica, setOfertaAcademica,
    continuityStudents, setContinuityStudents,
    continuityCatalog, setContinuityCatalog, toast, syncContacts
  }), [
    filteredStudents, allStudents, allStudentsMap, latestComparison, studentContacts, studentLifeProfiles, professorContacts, teams, teamTasks, weightingSchemes, priorityCases, isLoading, isProcessing, leaders, tutors, subjects, professors, groups, filterType, selectedValue, groupId, caseType, subjectRiskFilter, contextualStudentIds, activeView, planType, ofertaAcademica, continuityStudents, continuityCatalog, toast, syncContacts
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
        case 'subject-planning': return <SubjectPlanningPanel />;
        case 'subject-tracking': return <SubjectTrackingPanel />;
        case 'exam-candidates': return <ExamCandidatesPanel />;
        default: return <WelcomeDashboard />;
    }
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider defaultOpen={true}>
        <Sidebar className="border-none bg-primary shadow-2xl">
          <SidebarHeader className="bg-primary/50 backdrop-blur-md">
             <div className="flex min-w-0 items-center gap-3 px-4 py-6 transition-all duration-300 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
                <div className="bg-white/20 p-2 rounded-xl border border-white/10 shadow-inner">
                  <Image src="https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png" alt="Logo" width={28} height={28} className="size-7 object-contain brightness-0 invert" />
                </div>
                <span className="truncate font-black text-xl tracking-[0.15em] text-white group-data-[collapsible=icon]:hidden">SENTINEL</span>
             </div>
          </SidebarHeader>
          <SidebarContent className="px-3 bg-primary/20 backdrop-blur-sm no-scrollbar">
            <SidebarGroup className="mt-4">
              <SidebarMenu className="gap-2">
                <div className="px-3 mb-2 group-data-[collapsible=icon]:hidden"><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Exploración</p></div>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Inicio" isActive={activeView === 'welcome'} onClick={() => handleSetActiveView('welcome')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><Home /><span className="font-bold">Inicio</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Resumen Académico" isActive={activeView === 'dashboard'} onClick={() => handleSetActiveView('dashboard')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><LayoutDashboard /><span className="font-bold">Resumen Académico</span></SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Análisis de Cambios" isActive={activeView === 'change-stats'} onClick={() => handleSetActiveView('change-stats')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><BarChart3 /><span className="font-bold">Análisis de Cambios</span></SidebarMenuButton>
                </SidebarMenuItem>
                <div className="px-3 mb-2 mt-6 group-data-[collapsible=icon]:hidden"><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Operación</p></div>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Ruta Diaria / Equipo" isActive={activeView === 'team-work'} onClick={() => handleSetActiveView('team-work')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><ClipboardList /><span className="font-bold">Ruta Diaria / Equipo</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Continuidad Vocacional" isActive={activeView === 'continuidad'} onClick={() => handleSetActiveView('continuidad')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><TrendingUp /><span className="font-bold">Continuidad</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Panel de Alumnos" isActive={activeView === 'students'} onClick={() => handleSetActiveView('students')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><Users /><span className="font-bold">Panel de Alumnos</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Comites" isActive={activeView === 'academic-committee'} onClick={() => handleSetActiveView('academic-committee')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><Gavel /><span className="font-bold">Comites</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Seguimiento por Materia" isActive={activeView === 'subject-tracking'} onClick={() => handleSetActiveView('subject-tracking')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><BookText /><span className="font-bold">Seguimiento por Materia</span></SidebarMenuButton>
                </SidebarMenuItem>
                <div className="px-3 mb-2 mt-6 group-data-[collapsible=icon]:hidden"><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Planeación y Gestión</p></div>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planeación de Oferta" isActive={activeView === 'subject-planning'} onClick={() => handleSetActiveView('subject-planning')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><ListChecks /><span className="font-bold">Planeación de Oferta</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Analizador de Egreso" isActive={activeView === 'irregular-students'} onClick={() => handleSetActiveView('irregular-students')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><GraduationCap /><span className="font-bold">Analizador de Egreso</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Horarios de Profesores" isActive={activeView === 'professor-schedule'} onClick={() => handleSetActiveView('professor-schedule')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><Contact /><span className="font-bold">Horarios de Profesores</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planificador de Horarios" isActive={activeView === 'oferta-academica'} onClick={() => handleSetActiveView('oferta-academica')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><BookOpen /><span className="font-bold">Planificador de Horarios</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Equipos Dep/Cult" isActive={activeView === 'teams-management'} onClick={() => handleSetActiveView('teams-management')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><Shield /><span className="font-bold">Equipos Dep/Cult</span></SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Planificador por Mapa" isActive={activeView === 'map-planner'} onClick={() => handleSetActiveView('map-planner')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><MapIcon /><span className="font-bold">Planificador por Mapa</span></SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Gestor de Ponderaciones" isActive={activeView === 'weighting-schemes'} onClick={() => handleSetActiveView('weighting-schemes')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><BookCopy /><span className="font-bold">Gestor de Ponderaciones</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Materias sin Clasificar" isActive={activeView === 'unclassified'} onClick={() => handleSetActiveView('unclassified')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><HelpCircle /><span className="font-bold">Materias sin Clasificar</span></SidebarMenuButton>
                </SidebarMenuItem>
                <div className="px-3 mb-2 mt-6 group-data-[collapsible=icon]:hidden"><p className="text-[10px] font-black uppercase tracking-widest text-white/40">Procesos Especiales</p></div>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Analizador de Cierre" isActive={activeView === 'exam-candidates'} onClick={() => handleSetActiveView('exam-candidates')} className="h-11 px-4 text-white hover:bg-white/10 rounded-xl"><FileQuestion /><span className="font-bold">Analizador de Cierre</span></SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b bg-white/80 px-3 py-2 backdrop-blur-md sm:px-4 lg:flex-nowrap lg:px-6">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3 lg:flex-nowrap lg:gap-4">
                    <SidebarTrigger className="text-primary" />
                    <div className="min-w-0 flex-1">
                      {activeView !== 'welcome' && <DashboardFilters />}
                    </div>
                    {allStudents.length > 0 && reportInfo?.date && (
                        <div className="hidden shrink-0 sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary p-2 rounded-xl bg-primary/5 border border-primary/10">
                            <Calendar size={12} />
                            <span>{reportInfo.date}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-primary text-white border-none">{reportInfo.plan[0]}</Badge>
                        </div>
                    )}
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                    <Button variant="ghost" size="icon" onClick={syncContacts} title="Sincronizar Directorio de la Nube" className="text-primary hover:bg-primary/5">
                        <CloudDownload className="h-4 w-4" />
                    </Button>
                    <FileUpload onFileSelect={handleFileUpload} selectedFile={currentFile} isLoading={isProcessing} variant="outline" size="sm" className="h-9 rounded-xl border-primary/20" label="" icon={<FileClock className="h-4 w-4" />} />
                    {allStudents.length > 0 && (
                      <FileUpload onFileSelect={handleMergeFileUpload} selectedFile={mergeFile} isLoading={isMerging} variant="outline" size="sm" className="h-9 rounded-xl border-primary/20" label="" icon={<Link2 className="h-4 w-4" />} />
                    )}
                    <Button variant="ghost" size="icon" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { localStorage.clear(); window.location.reload(); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
            </header>
            <div className="flex-1 min-w-0 overflow-x-hidden bg-[#F8FAFC]">{renderActiveView()}</div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
