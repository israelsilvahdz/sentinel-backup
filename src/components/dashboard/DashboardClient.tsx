
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import { readPrincipalBase, mergeMonitoringStudent, type PrincipalBase } from '@/lib/principal-base';
import { localWorkspace, monitoringInfo, todayKey } from '@/lib/local-workspace';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { MoreHorizontal, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
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
import { ScopeSwitcher } from './ScopeSwitcher';
import { WelcomeDashboard } from './WelcomeDashboard';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, LayoutDashboard, Users, BookCopy, HelpCircle, Map as MapIcon, FileClock, BarChart3, Contact, Shield, BookOpen, Calendar, ClipboardList, Download, Smartphone, TrendingUp, Home, Zap, ListChecks, GraduationCap, BookText, FileQuestion, Flag, CloudDownload, Link2, Gavel } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';


import type { Student, Change, Subject, StudentData, StudentContact, TeamTask, ProfessorContact, OfertaAcademicaItem, Team, WeightingScheme, ContinuityStudent, ContinuityCatalog, ActiveView, StudentLifeProfile } from '@/types/student';
import { parseExcel, getHeaderKey } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { findExtraordinaryCases, findIncompleteGradeCases, findLostCases, findObservationCases, findRiskCasesBySubject, findUrgentCases, findSDAbsencesCases, findSDAssignmentsCases, findAtLimitAbsencesCases, findAtLimitAssignmentsCases, findPotentialRiskCases, findPotentialRangeCases, findRequiredScoreRangeCases } from '@/lib/dataProcessor';
import { xorCipher } from '@/lib/utils';


export type FilterType = 'leader' | 'tutor' | 'subject' | 'professor' | 'group' | 'career';
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
  'change-stats',
  'professor-schedule',
  'academic-performance',
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
const ProfessorSchedulePanel = dynamic(() => import('./ProfessorSchedulePanel').then((mod) => mod.ProfessorSchedulePanel), { loading: () => <PanelLoading /> });
const AcademicPerformancePanel = dynamic(() => import('./AcademicPerformancePanel').then((mod) => mod.AcademicPerformancePanel), { loading: () => <PanelLoading /> });

const PERSISTENCE_KEY = "sentinel_v2026_secure";

interface DashboardContextType {
  filteredStudents: Student[];
  scopedStudents: Student[];
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
  setWeightingSchemes: React.Dispatch<React.SetStateAction<WeightingScheme[]>>;
  fetchWeightingSchemes: () => Promise<void>;
  priorityCases: Record<string, { studentId: string, topic: string }>;
  togglePriorityCase: (studentId: string, isPriority: boolean, topic?: string) => Promise<void>;
  isLoading: boolean;
  hasData: boolean;
  leaders: string[];
  careers: string[];
  audience: 'prepa' | 'professional';
  scopeType: 'all' | 'leader' | 'tutor';
  setScopeType: (type: 'all' | 'leader' | 'tutor') => void;
  scopeValue: string | null;
  setScopeValue: (value: string | null) => void;
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
  const [monitorStudents, setAllStudents] = useState<Student[]>([]);
  const [base, setBase] = useState<PrincipalBase | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [baseLoading, setBaseLoading] = useState(false);
  const [storageError, setStorageError] = useState('');
  const allStudents = useMemo(() => monitorStudents.map(student => mergeMonitoringStudent(student, base?.students[student.id.trim().toUpperCase()])), [monitorStudents, base]);
  const audience = base?.audience || (Object.values(base?.students || {}).some(student => student.academicCode || student.academicCodeDescription) ? 'professional' : 'prepa');
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
  const [scopeType, setScopeType] = useState<'all' | 'leader' | 'tutor'>('all');
  const [scopeValue, setScopeValue] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const sidebarHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [subjectRiskFilter, setSubjectRiskFilter] = useState<SubjectRiskFilter | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('welcome');
  const [contextualStudentIds, setContextualStudentIds] = useState<Set<string> | null>(null);
  
  const allStudentsMap = useMemo(() => new Map(allStudents.map(s => [s.id, s])), [allStudents]);

  const syncContacts = useCallback(async () => { toast({ title: 'Directorio local', description: 'Usa Cargar archivo base para actualizarlo.' }); }, [toast]);
  const fetchTeams = useCallback(async () => {}, []);
  const fetchTeamTasks = useCallback(async () => {}, []);
  const fetchWeightingSchemes = useCallback(async () => {}, []);
  const togglePriorityCase = async (studentId: string, isPriority: boolean, topic?: string) => {
    setPriorityCases(previous => { const next = {...previous}; if (isPriority) next[studentId] = {studentId, topic: topic || ''}; else delete next[studentId]; return next; });
  };
  const fetchStudentContact = useCallback(async (id: string) => studentContacts[id] || null, [studentContacts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await localWorkspace<any>('workspace');
        if (cancelled) return;
        if (saved?.version === 1) {
          setBase(saved.base || null); setAllStudents(saved.students || []); setCurrentFileName(saved.fileName || null);
          setStudentContacts(saved.contacts || {}); setStudentLifeProfiles(saved.profiles || {}); setProfessorContacts(saved.professors || {});
          setTeams(saved.teams || []); setWeightingSchemes(saved.schemes || []); setPriorityCases(saved.priorityCases || {});
          setLatestComparison(saved.comparison || {});
          setScopeType(saved.scopeType === 'tutor' ? 'tutor' : saved.scopeType === 'leader' ? 'leader' : 'all'); setScopeValue(saved.scopeValue || null);
          const info = monitoringInfo(saved.fileName || ''); if (info) setPlanType(info.plan);
          setEntryOpen(!saved.base || !saved.students?.length || (!!info && info.dateKey !== todayKey()));
        } else {
          // Recover the previous local monitoring without consulting Firebase.
          const key = localStorage.getItem(LOCAL_STORAGE_KEYS.DATA_KEY);
          const data = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
          if (key && data) { setAllStudents(JSON.parse(xorCipher(data, key))); setCurrentFileName(localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_FILE_NAME)); }
          setEntryOpen(true);
        }
      } catch { setStorageError('No se pudieron recuperar los archivos guardados. Puedes cargarlos nuevamente.'); setEntryOpen(true); }
      finally { if (!cancelled) { setHydrated(true); setIsLoading(false); } }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localWorkspace('workspace', { version: 1, base, students: monitorStudents, fileName: currentFileName, contacts: studentContacts, profiles: studentLifeProfiles, professors: professorContacts, teams, schemes: weightingSchemes, priorityCases, comparison: latestComparison, scopeType, scopeValue })
      .then(() => setStorageError('')).catch(() => setStorageError('No se pudo guardar en este navegador. No cierres la página sin conservar tus archivos originales.'));
  }, [hydrated, base, monitorStudents, currentFileName, studentContacts, studentLifeProfiles, professorContacts, teams, weightingSchemes, priorityCases, latestComparison, scopeType, scopeValue]);

  const reportInfo = useMemo(() => monitoringInfo(currentFileName || ''), [currentFileName]);
  const handleBaseUpload = async (file: File | null) => {
    if (!file) return;
    setBaseLoading(true);
    try {
      const parsed = readPrincipalBase(XLSX.read(await file.arrayBuffer(), { type: 'array' }), file.name);
      setBase(parsed); setStudentContacts(parsed.contacts); setStudentLifeProfiles(parsed.profiles); setProfessorContacts(parsed.professors); setTeams(parsed.teams); setWeightingSchemes(parsed.schemes);
      const assigned = Object.values(parsed.students).filter(student => student.leader?.trim()).length;
      toast({ title: 'Base principal cargada', description: `${Object.keys(parsed.students).length} alumnos; ${assigned} con ${parsed.audience === 'professional' ? 'mentor' : 'líder'} asignado. Cruce por matrícula listo.` });
    } catch (error) { toast({ variant: 'destructive', title: 'No se reemplazó la base', description: error instanceof Error ? error.message : 'Revisa el formato del archivo.' }); }
    finally { setBaseLoading(false); }
  };

  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type); setSelectedValue(null); setCaseType(null); setSubjectRiskFilter(null); setGroupId(null); setContextualStudentIds(null);
  };

  const handleSetActiveView = (view: ActiveView) => {
    if (!VALID_VIEWS.includes(view)) return;
    setActiveView(view);
    if (view !== 'students') {
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
            const info = monitoringInfo(currentFile.name);
            const newKey = await getHeaderKey(currentFile);
            setDataKey(newKey); setProgress(20);
            const studentData = await parseExcel(currentFile); setProgress(50);
            if (!studentData || !Object.keys(studentData).length) throw new Error('El archivo no contiene alumnos.');
            const processedStudents = buildProcessedStudents(studentData);
            setAllStudents(processedStudents); setCurrentFileName(currentFile.name);
            if (info) setPlanType(info.plan);
            setProgress(90);
        } catch (error) { toast({ variant: 'destructive', title: 'No se reemplazó el monitoreo', description: error instanceof Error ? error.message : 'No se pudo leer el archivo.' }); } finally {
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
        const incomingInfo = monitoringInfo(mergeFile.name);
        const currentInfo = monitoringInfo(currentFileName || '');
        if (incomingInfo && currentInfo && (incomingInfo.dateKey !== currentInfo.dateKey || incomingInfo.period !== currentInfo.period)) throw new Error('Los monitoreos indican distintas fechas o periodos.');
        const incomingStudentData = await parseExcel(mergeFile);
        if (!incomingStudentData) {
          throw new Error('El reporte adicional no tiene el formato esperado.');
        }

        const incomingStudents = buildProcessedStudents(incomingStudentData);
        setAllStudents(previousStudents => mergeStudentLists(previousStudents, incomingStudents));
        // Keep the validated monitoring date and period.
        toast({
          title: 'Reporte fusionado',
          description: `Se agregaron los datos de ${mergeFile.name} al monitoreo actual.`,
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Error al fusionar',
          description: error instanceof Error ? error.message : 'No se pudo fusionar el segundo reporte.',
        });
      } finally {
        setIsMerging(false);
        setMergeFile(null);
      }
    };

    mergeCurrentData();
  }, [mergeFile, allStudents.length, toast]);

  const leaders = useMemo(() => [...new Set(allStudents.map(s => s.leader).filter(Boolean))].sort(), [allStudents]);
  const careers = useMemo(() => [...new Set(allStudents.map(s => s.academicCodeDescription || s.academicCode || '').filter(Boolean))].sort(), [allStudents]);
  const tutors = useMemo(() => [...new Set(allStudents.map(s => s.tutor).filter(Boolean))].sort(), [allStudents]);
  const subjects = useMemo(() => [...new Set(allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.name) || []).filter(Boolean))].sort(), [allStudents]);
  const professors = useMemo(() => [...new Set(allStudents.flatMap(s => s.subjects?.map(sub => sub.professorName) || []).filter(Boolean))].sort(), [allStudents]);
  const groups = useMemo(() => [...new Set(allStudents.flatMap(s => s.subjectSummaries?.map(sub => sub.group) || []).filter(Boolean))].sort(), [allStudents]);
  const scopedStudents = useMemo(() => scopeType === 'all' || !scopeValue ? allStudents : allStudents.filter(student => (scopeType === 'tutor' ? student.tutor : student.leader) === scopeValue), [allStudents, scopeType, scopeValue]);

  const filteredStudents = useMemo(() => {
    if (contextualStudentIds) return scopedStudents.filter(s => contextualStudentIds.has(s.id));
    let students = scopedStudents;
    if (selectedValue) {
        if (filterType === 'leader') students = students.filter(s => selectedValue === '__unassigned__' ? !s.leader?.trim() : s.leader === selectedValue);
        if (filterType === 'career') students = students.filter(s => (s.academicCodeDescription || s.academicCode) === selectedValue);
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
  }, [scopedStudents, filterType, selectedValue, caseType, subjectRiskFilter, latestComparison, groupId, contextualStudentIds, weightingSchemes, priorityCases]);
  

  const contextValue: DashboardContextType = useMemo(() => ({
    filteredStudents, scopedStudents, allStudents, allStudentsMap, setAllStudents, latestComparison, setLatestComparison, studentContacts, setStudentContacts, studentLifeProfiles, setStudentLifeProfiles, fetchStudentContact, professorContacts, setProfessorContacts, teams, fetchTeams, teamTasks, fetchTeamTasks, weightingSchemes, setWeightingSchemes, fetchWeightingSchemes,
    priorityCases, togglePriorityCase,
    isLoading: isLoading || isProcessing, hasData: allStudents.length > 0,
    leaders, careers, audience, tutors, subjects, professors, groups, groupsForSubject: (sub) => [],
    scopeType, setScopeType: (type) => { setScopeType(type); setScopeValue(null); if (filterType === 'leader' || filterType === 'tutor') setSelectedValue(null); }, scopeValue, setScopeValue: (value) => { setScopeValue(value); if (filterType === 'leader' || filterType === 'tutor') setSelectedValue(null); },
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
    filteredStudents, scopedStudents, allStudents, allStudentsMap, latestComparison, studentContacts, studentLifeProfiles, professorContacts, teams, teamTasks, weightingSchemes, priorityCases, isLoading, isProcessing, leaders, careers, audience, tutors, subjects, professors, groups, scopeType, scopeValue, filterType, selectedValue, groupId, caseType, subjectRiskFilter, contextualStudentIds, activeView, planType, ofertaAcademica, continuityStudents, continuityCatalog, toast, syncContacts
  ]);

  const renderActiveView = () => {
    switch (activeView) {
        case 'welcome': return <WelcomeDashboard />;
        case 'dashboard': return <Dashboard />;
        case 'students': return <StudentPanel />;
        case 'change-stats': return <ChangeStats />;
        case 'weighting-schemes': return <PonderacionesDashboard />;
        case 'unclassified': return <UnclassifiedSubjectsPanel />;
        case 'professor-schedule': return <ProfessorSchedulePanel />;
        case 'academic-performance': return <AcademicPerformancePanel />;
        default: return <WelcomeDashboard />;
    }
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider open={sidebarOpen} onOpenChange={(open) => { setSidebarPinned(open); setSidebarOpen(open); }} style={{ '--sidebar-width': '17.5rem' } as React.CSSProperties}>
        <Sidebar className="border-r border-[#dce6e2] bg-white" onMouseEnter={() => { if (sidebarHoverTimer.current) clearTimeout(sidebarHoverTimer.current); if (!sidebarPinned) sidebarHoverTimer.current = setTimeout(() => setSidebarOpen(true), 160); }} onMouseLeave={() => { if (sidebarHoverTimer.current) clearTimeout(sidebarHoverTimer.current); if (!sidebarPinned) sidebarHoverTimer.current = setTimeout(() => setSidebarOpen(false), 180); }}>
          <SidebarHeader className="h-auto shrink-0 border-b border-[#edf1ee] bg-white">
             <div className="w-full min-w-0 px-4 py-4 group-data-[collapsible=icon]:px-1">
                <img src={audience === 'professional' ? '/tecmilenio-profesional.png' : '/tecmilenio-logo.png'} alt={audience === 'professional' ? 'Tecmilenio Profesional' : 'Prepa Tecmilenio'} width={224} height={72} className="h-auto w-full object-contain group-data-[collapsible=icon]:hidden" />
                {audience === 'professional' ? <span className="relative hidden h-10 w-10 overflow-hidden group-data-[collapsible=icon]:block"><img src="/tecmilenio-profesional.png" alt="Tecmilenio" className="absolute -left-2 -top-3 h-auto max-w-none" style={{ width: 224 }} /></span> : <span className="hidden text-center text-lg font-black text-[#ff8834] group-data-[collapsible=icon]:block">P</span>}
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#00534c] group-data-[collapsible=icon]:hidden">Sentinel · Seguimiento académico</p>
             </div>
          </SidebarHeader>
          <SidebarContent className="px-2 bg-white no-scrollbar">
            <SidebarGroup className="mt-4">
              <SidebarMenu className="gap-1">
                <div className="px-3 mb-2 group-data-[collapsible=icon]:hidden"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exploración</p></div>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Inicio" isActive={activeView === 'welcome'} onClick={() => handleSetActiveView('welcome')} className="min-h-11 h-auto py-2 px-3 text-[#52645f] hover:bg-[#f1f6f3] hover:text-[#00534c] rounded-lg data-[active=true]:bg-[#00534c] data-[active=true]:text-white data-[active=true]:shadow-sm"><Home /><span className="font-medium whitespace-normal leading-snug text-[13px]">Inicio</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Resumen Académico" isActive={activeView === 'dashboard'} onClick={() => handleSetActiveView('dashboard')} className="min-h-11 h-auto py-2 px-3 text-[#52645f] hover:bg-[#f1f6f3] hover:text-[#00534c] rounded-lg data-[active=true]:bg-[#00534c] data-[active=true]:text-white data-[active=true]:shadow-sm"><LayoutDashboard /><span className="font-bold">Resumen Académico</span></SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Análisis de Cambios" isActive={activeView === 'change-stats'} onClick={() => handleSetActiveView('change-stats')} className="min-h-11 h-auto py-2 px-3 text-[#52645f] hover:bg-[#f1f6f3] hover:text-[#00534c] rounded-lg data-[active=true]:bg-[#00534c] data-[active=true]:text-white data-[active=true]:shadow-sm"><BarChart3 /><span className="font-bold">Análisis de Cambios</span></SidebarMenuButton>
                </SidebarMenuItem>
                <div className="px-3 mb-2 mt-6 group-data-[collapsible=icon]:hidden"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operación</p></div>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Panel de Alumnos" isActive={activeView === 'students'} onClick={() => handleSetActiveView('students')} className="min-h-11 h-auto py-2 px-3 text-[#52645f] hover:bg-[#f1f6f3] hover:text-[#00534c] rounded-lg data-[active=true]:bg-[#00534c] data-[active=true]:text-white data-[active=true]:shadow-sm"><Users /><span className="font-bold">Panel de Alumnos</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Desempeño y seguimiento" isActive={activeView === 'academic-performance'} onClick={() => handleSetActiveView('academic-performance')} className="min-h-11 h-auto py-2 px-3 text-[#52645f] hover:bg-[#f1f6f3] hover:text-[#00534c] rounded-lg data-[active=true]:bg-[#00534c] data-[active=true]:text-white data-[active=true]:shadow-sm"><BarChart3 /><span className="font-bold whitespace-normal leading-snug text-[13px]">Desempeño y seguimiento</span></SidebarMenuButton>
                </SidebarMenuItem>
                <div className="px-3 mb-2 mt-6 group-data-[collapsible=icon]:hidden"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planeación y Gestión</p></div>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Horarios de Profesores" isActive={activeView === 'professor-schedule'} onClick={() => handleSetActiveView('professor-schedule')} className="min-h-11 h-auto py-2 px-3 text-[#52645f] hover:bg-[#f1f6f3] hover:text-[#00534c] rounded-lg data-[active=true]:bg-[#00534c] data-[active=true]:text-white data-[active=true]:shadow-sm"><Contact /><span className="font-bold">Horarios de Profesores</span></SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Gestor de Ponderaciones" isActive={activeView === 'weighting-schemes'} onClick={() => handleSetActiveView('weighting-schemes')} className="min-h-11 h-auto py-2 px-3 text-[#52645f] hover:bg-[#f1f6f3] hover:text-[#00534c] rounded-lg data-[active=true]:bg-[#00534c] data-[active=true]:text-white data-[active=true]:shadow-sm"><BookCopy /><span className="font-bold">Gestor de Ponderaciones</span></SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                   <SidebarMenuButton tooltip="Materias sin Clasificar" isActive={activeView === 'unclassified'} onClick={() => handleSetActiveView('unclassified')} className="min-h-11 h-auto py-2 px-3 text-[#52645f] hover:bg-[#f1f6f3] hover:text-[#00534c] rounded-lg data-[active=true]:bg-[#00534c] data-[active=true]:text-white data-[active=true]:shadow-sm"><HelpCircle /><span className="font-bold">Materias sin Clasificar</span></SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-emerald-100 bg-emerald-50/60 p-2 group-data-[collapsible=icon]:p-1">
            <SidebarTrigger title="Contraer o expandir menú" aria-label="Contraer o expandir menú" className="h-10 w-full justify-start gap-2 rounded-xl px-3 text-emerald-900 hover:bg-emerald-100 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" />
            <button type="button" onClick={() => { if (sidebarHoverTimer.current) clearTimeout(sidebarHoverTimer.current); setSidebarPinned(!sidebarPinned); setSidebarOpen(!sidebarPinned); }} className="rounded-lg px-3 pb-1 text-left text-xs font-medium text-emerald-900 hover:text-emerald-700 group-data-[collapsible=icon]:hidden">{sidebarPinned ? 'Soltar menú' : 'Fijar menú abierto'} · Ctrl+B</button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger title="Contraer o expandir menú" aria-label="Contraer o expandir menú" className="rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{{welcome:'Inicio',dashboard:'Resumen académico','change-stats':'Análisis de cambios',students:'Panel de alumnos','academic-performance':'Desempeño y seguimiento','professor-schedule':'Horarios de profesores','weighting-schemes':'Gestor de ponderaciones',unclassified:'Materias sin clasificar'}[activeView]}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>{reportInfo ? reportInfo.date + ' · Periodo ' + reportInfo.period : currentFileName || 'Carga tus archivos para comenzar'}</span>
                      {reportInfo && reportInfo.dateKey !== todayKey() && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800" title="Estás viendo el monitoreo de otro día.">Monitoreo de otro día</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {allStudents.length > 0 && <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="h-9 max-w-48 gap-2 rounded-lg border-emerald-200 bg-emerald-50 px-3 text-emerald-900 shadow-none hover:bg-emerald-100"><Users className="h-4 w-4 shrink-0" /><span className="truncate">{scopeType === 'all' ? 'Vista general' : scopeValue || (audience === 'professional' ? 'Todos los mentores' : scopeType === 'tutor' ? 'Todos los tutores' : 'Todos los líderes')}</span></Button></PopoverTrigger><PopoverContent align="end" className="w-72 rounded-xl p-4"><p className="mb-3 text-sm font-semibold text-emerald-950">Vista de acompañamiento</p><ScopeSwitcher compact /><p className="mt-3 text-xs text-slate-500">Esta selección se aplica al resumen, las carreras y el panel de alumnos.</p></PopoverContent></Popover>}
                  <FileUpload onFileSelect={handleBaseUpload} selectedFile={null} isLoading={baseLoading || !hydrated} label="Cargar archivo base" variant="outline" className="h-9 min-w-0 rounded-lg border-slate-200 px-3 text-xs shadow-none" />
                  <FileUpload onFileSelect={handleFileUpload} selectedFile={currentFile} isLoading={isProcessing || !hydrated} label="Cargar monitoreo" icon={<FileClock className="mr-2 h-4 w-4" />} className="h-9 min-w-0 rounded-lg bg-primary px-3 text-xs text-white shadow-none hover:bg-primary/90" />
                  {activeView !== 'welcome' && allStudents.length > 0 && <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg border-slate-200 shadow-none"><SlidersHorizontal className="h-4 w-4" />Filtros{selectedValue && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}</Button></PopoverTrigger><PopoverContent align="end" className="w-[min(92vw,600px)] rounded-xl p-4"><p className="mb-3 text-sm font-semibold">Filtrar alumnos</p><DashboardFilters /></PopoverContent></Popover>}
                  <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-500" aria-label="Archivos y opciones"><MoreHorizontal className="h-5 w-5" /></Button></PopoverTrigger><PopoverContent align="end" className="w-80 max-w-[90vw] rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-900">Archivos de trabajo</p>
                    <div className="my-4 space-y-3 text-xs"><div><p className="mb-1 flex items-center gap-1.5 font-medium text-slate-500">{base && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}Archivo base</p><p className="break-words text-slate-800">{base?.name || 'Pendiente de cargar'}</p></div><div><p className="mb-1 flex items-center gap-1.5 font-medium text-slate-500">{monitorStudents.length > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}Monitoreo</p><p className="break-words text-slate-800">{currentFileName || 'Pendiente de cargar'}</p></div></div>
                    <div className="space-y-1 border-t pt-3">
                      {allStudents.length > 0 && <FileUpload onFileSelect={handleMergeFileUpload} selectedFile={mergeFile} isLoading={isMerging} label="Combinar monitoreo" variant="ghost" icon={<Link2 className="mr-2 h-4 w-4" />} className="h-9 w-full min-w-0 justify-start px-2 text-xs" />}
                      <Button variant="ghost" className="h-9 w-full justify-start px-2 text-xs" onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" />Recargar página</Button>
                      <Button variant="ghost" className="h-9 w-full justify-start px-2 text-xs text-destructive hover:text-destructive" onClick={async () => { if (!window.confirm('¿Eliminar la base y el monitoreo guardados en este navegador? Los Excel originales no se borran.')) return; await localWorkspace('workspace', {version: 1}); await localWorkspace('notices', []); Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key)); window.location.reload(); }}><Trash2 className="mr-2 h-4 w-4" />Eliminar archivos guardados</Button>
                    </div>
                  </PopoverContent></Popover>
                </div>
              </div>
              {selectedValue && activeView !== 'welcome' && <div className="flex items-center gap-2 border-t border-slate-100 px-6 py-2 text-xs text-slate-600"><SlidersHorizontal className="h-3 w-3" /><span className="min-w-0 truncate">{selectedValue === '__unassigned__' ? 'Sin mentor asignado' : selectedValue}{groupId ? ' · Grupo ' + groupId : ''}</span><Button variant="ghost" className="ml-auto h-6 px-2 text-xs" onClick={()=>{setSelectedValue(null);setGroupId(null);}}>Limpiar filtro</Button></div>}
              {storageError && <p role="alert" className="border-t bg-red-50 px-6 py-2 text-xs text-red-700">{storageError}</p>}
              {audience === 'professional' && base && base.schemaVersion !== 2 && <p role="alert" className="border-t border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-900">Vuelve a cargar el archivo base para actualizar las carreras y asignaciones del monitoreo guardado.</p>}
            </header>
            <div className="flex-1 min-w-0 overflow-x-hidden bg-[#f5f7f4]">{hydrated ? renderActiveView() : <PanelLoading />}</div>
            <Dialog open={entryOpen} onOpenChange={setEntryOpen}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{base && monitorStudents.length ? 'Revisa la fecha de tu monitoreo' : 'Comienza con tus dos archivos'}</DialogTitle><DialogDescription>Carga la base principal y el monitoreo. Se guardan en este navegador para recuperarlos la próxima vez; solo vuelve a cargarlos cuando quieras actualizarlos.</DialogDescription></DialogHeader>
              <div className="space-y-4"><div className="rounded-xl border p-4"><h3 className="font-semibold">1. Archivo base</h3><p className="mb-3 text-sm text-muted-foreground">Alumnos y, si están disponibles, correos de profesores y ponderaciones. Se ignora Listas (2).</p><p className="mb-2 text-xs">{base?.name || 'Sin archivo base'}</p><FileUpload onFileSelect={handleBaseUpload} selectedFile={null} isLoading={baseLoading} label="Cargar archivo base" variant="outline" /></div>
              <div className="rounded-xl border p-4"><h3 className="font-semibold">2. Monitoreo de alumnos</h3><p className="mb-3 text-sm text-muted-foreground">Puede tener cualquier nombre. El cruce con la base se hace por matrícula.</p><p className="mb-2 text-xs">{currentFileName || 'Sin monitoreo'}</p><FileUpload onFileSelect={handleFileUpload} selectedFile={null} isLoading={isProcessing} label="Cargar monitoreo" variant="outline" /></div>
              {monitorStudents.length > 0 && reportInfo && reportInfo.dateKey !== todayKey() && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Estás viendo el monitoreo del {reportInfo.date}, no el de hoy. Puedes continuar o cargar uno actualizado.</p>}
              {monitorStudents.length > 0 && !reportInfo && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">El nombre de este monitoreo no indica una fecha. Puedes usarlo normalmente; verifica la fecha dentro del archivo.</p>}
              {storageError && <p role="alert" className="text-sm text-red-700">{storageError}</p>}
              <Button className="w-full" onClick={()=>setEntryOpen(false)} disabled={!base || !monitorStudents.length}>Continuar con estos archivos</Button></div>
            </DialogContent></Dialog>
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}


