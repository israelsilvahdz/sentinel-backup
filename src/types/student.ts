export interface Subject {
  name: string;
  nationalId: string;
  campusId: string;
  professorName: string;
  statusDescription: string;
  absences: number;
  absenceLimit: number;
  missedAssignments: number;
  missedAssignmentLimit: number;
  grade: number;
  finalGrade: number | null;
  finalGradeReason: string | null;
}

export interface Student {
  id: string;
  name: string;
  leader: string;
  tutor: string;
  isGraduationCandidate: boolean;
  subjects: Subject[];
}

export type StudentData = Record<string, Student>;

export interface Change {
  studentId: string;
  studentName: string;
  type: 'absence' | 'missedAssignment' | 'grade';
  subjectName: string;
  oldValue: number;
  newValue: number;
}
