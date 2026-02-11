

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

export interface UploadHistory {
  id: string;
  fileName: string;
  uploadedAt: string; // ISO String
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

// Nuevo tipo para el parser del kardex
export interface IrregularStudentInfo {
    id: string;
    name: string;
    currentTerm: number;
    pendingSubjects: { name: string; term: number }[];
}

export interface WeightingScheme {
  id?: string;
  name: string;
  activities: {
    name: string;
    weight: number;
    label?: string;
  }[];
  subjectNames: string[];
}
