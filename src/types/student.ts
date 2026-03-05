export interface Subject {
  id: string; // CRN
  key: string; // Clave de materia
  name: string;
  group: string;
  professorName: string;
  statusDescription: string;
  absences: number;
  absenceLimit: number;
  missedAssignments: number;
  missedAssignmentLimit: number;
  grade: number;
  finalGrade: number | null;
  finalGradeReason: string | null;
  activities: Record<string, number | string>; // para A1, A2...
  schedule?: {
    days: string[];
    startTime: string;
    endTime: string;
  };
}

// Summary of subjects to be sent with the student list for performance
export interface SubjectSummary {
  id: string; // CRN
  name: string;
  group: string;
  absences: number;
  absenceLimit: number;
  missedAssignments: number;
  missedAssignmentLimit: number;
  grade: number;
  finalGrade: number | null;
}

export interface Student {
  id: string; // Matricula
  name: string;
  leader: string;
  tutor: string;
  isGraduationCandidate: boolean;
  subjects?: Subject[]; // Full subjects, loaded on demand
  subjectSummaries?: SubjectSummary[]; // Summaries for dashboard performance
  sport?: string; // e.g., 'FUTBOL', 'DEBATE'
}

export type StudentData = Record<string, Student>;

export interface Change {
  date: any; // Firestore Timestamp on server, string on client
  studentId: string;
  subjectId: string; // CRN
  fieldName: 'absences' | 'missedAssignments' | 'leader' | 'tutor' | 'group';
  oldValue: any;
  newValue: any;
  changeType: 'increase' | 'decrease';
}

export interface TeamTask {
    id: string;
    createdAt: any; // Firestore Timestamp
    completedAt?: any; // Firestore Timestamp
    studentId: string;
    studentName: string;
    leader: string;
    tutor: string;
    situation: 'faltas' | 'no-entregados' | 'otro';
    subjects: string[]; // Array of subject CRNs
    notes: string;
    status: 'pendiente' | 'completado';
    assignedTo: 'leader' | 'tutor' | 'both';
    completionNotes?: string;
}

export interface StudentContact {
    studentId: string;
    name: string;
    sedena: string;
    group: string;
    studentPhone: string;
    studentEmail: string;
    dadName: string;
    dadPhone: string;
    dadEmail: string;
    momName: string;
    momPhone: string;
    momEmail: string;
    mentoringId: string;
}

export interface ProfessorContact {
    id: string; // Normalized name
    name: string;
    email: string;
}

export interface Team {
    id: string;
    name: string;
    type?: 'deportivo' | 'cultural'; // Nuevo campo para clasificar el equipo
    members: { id: string; name: string }[];
}

export interface OfertaAcademicaItem {
    crn: string;
    subjectKey: string;
    subjectName: string;
    group: string;
    capacity: number;
    enrolled: number;
    professor: string;
    days: string[];
    startTime: string;
    endTime: string;
    building: string;
    room: string;
}

// RIASEC Dimension Scores
export interface RiasecScores {
  realistic: number;
  investigative: number;
  artistic: number;
  social: number;
  enterprising: number;
  conventional: number;
}

export interface RiasecDiagnosis {
  scores: RiasecScores;
  recommendedCareers: string[];
  sourceFile: string; // From Fuente cross-ref
  lastUpdated: any;
}

// NUEVOS TIPOS PARA CONTINUIDAD
export interface ContinuityStudent {
  id: string;
  name: string;
  leader: string;
  advisor: string;
  group: string; // Grupo del alumno
  status: string;
  isInscribed: boolean;
  priority: number;
  average: number;
  scholarship: string;
  lastContactDate: string;
  lastContactComment: string;
  cycle: 'Enero 26' | 'Agosto 26';
  // Vocacional
  interestLevel: string;
  programOfInterest: string;
  competitorUniversity: string;
  interviewer: string;
  decisionTaken: string;
}

export interface ContinuityCatalog {
  statuses: string[];
  riskLevels: string[];
  formats: string[];
}

export interface ContinuityComment {
  id: string;
  text: string;
  author: string;
  createdAt: any;
}

export interface VocationalDiagnosis {
  certaintyLevel: string;
  urgencyLevel: number; // 1-10
  mainObstacle: string;
  universityRanking: string;
  isSecondOption: boolean;
  requiresWorkshop: boolean;
  interestedCareers?: string;
  details?: string;
  lastUpdated: any;
}

export interface ContinuityTrackingInfo {
  chosenUniversity: string;
  chosenCareers: string[];
  processStatus: string;
  resultDate: string;
}

export interface CareerChoiceSurvey {
  fechaRespuesta: string;
  yaEligioCarrera: string;
  carreraElegida: string;
  yaEligioUniversidad: string;
  universidadElegida: string;
  etapaProceso: string;
}

export interface ContinuityLocalStatus {
  isIndeciso: boolean;
  workshopAttended?: boolean;
  alertaFalsaInscripcion?: boolean;
  comments: ContinuityComment[];
  vocationalDiagnosis?: VocationalDiagnosis;
  riasecDiagnosis?: RiasecDiagnosis;
  trackingInfo?: ContinuityTrackingInfo;
  encuestaEleccionReciente?: CareerChoiceSurvey;
}

// --- NUEVOS TIPOS PARA TRABAJO EN EQUIPO ---

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface WorkTaskComment {
  id: string;
  text: string;
  author: string; // Quién hizo el comentario
  createdAt: any;
}

export interface WorkTeam {
  id: string;
  name: string;
  accessCode: string;
  createdAt: any;
}

export interface WorkTask {
  id: string;
  teamId: string;
  parentId?: string; // Tarea de la que depende (Seguimiento)
  parentTitle?: string; // Título de la tarea padre para referencia rápida
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  linkedStudents: { id: string; name: string }[];
  dueDate?: any; // Firestore Timestamp
  createdAt: any;
  completedAt?: any; // Firestore Timestamp
  comments?: WorkTaskComment[];
  order?: number; // Para el orden en la ruta diaria
}

export type CareerType = 'in-campus' | 'external' | 'other-campus';
export interface CareerOption {
  name: string;
  type: CareerType;
}
