export interface Subject {
  id: string; // CRN o Clave de materia
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

export interface Student {
  id: string; // Matricula
  name: string;
  leader: string;
  tutor: string;
  isGraduationCandidate: boolean;
  subjects?: Subject[]; // Se cargan bajo demanda
}

export type StudentData = Record<string, Student>;

export interface Change {
  date: any; // Firestore Timestamp
  studentId: string;
  subjectId: string; // CRN o Clave de materia
  fieldName: string; // p. ej. 'absences', 'grade', 'activities.A5'
  oldValue: any;
  newValue: any;
}
