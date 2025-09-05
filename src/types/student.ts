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
