

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
}

export type StudentData = Record<string, Student>;

export interface Change {
  date: any; // Firestore Timestamp on server, string on client
  studentId: string;
  subjectId: string; // CRN
  fieldName: string; // p. ej. 'absences', 'grade', 'activities.A5'
  oldValue: any;
  newValue: any;
}

export interface UploadHistory {
  id: string;
  fileName: string;
  uploadedAt: string; // ISO String
}

export interface BitacoraEntry {
  id?: string; // Asignado por Firestore
  timestamp: any; // Firestore Timestamp of creation
  eventDate: any; // Firestore Timestamp of event
  studentId: string;
  studentName: string;
  reportedBy: string;
  description: string;
  agreements: string;
  caseType: 'academica' | 'conductual';
  academicCommittee: boolean;
}

export interface SeguimientoEntry {
    id: string;
    createdAt: any; // Firestore Timestamp
    studentId: string;
    studentName: string;
    leader: string;
    tutor: string;
    situation: 'faltas' | 'no-entregados' | 'otro';
    subjects: string[]; // Array of subject CRNs
    notes: string;
    status: 'pendiente' | 'completado';
    completedAt?: any; // Firestore Timestamp of completion
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
