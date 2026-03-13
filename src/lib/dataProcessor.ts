
import { type Student, type Subject, type SubjectSummary, type WeightingScheme } from '@/types/student';
import { getActivityList } from './ponderaciones';

export type RiskLevel = 'low' | 'medium' | 'high' | 'at_limit' | 'sd';
export type CaseStatus = 'lost' | 'urgent' | 'observation' | 'ok';

/**
 * Calcula el nivel de riesgo para un valor y su límite.
 */
export function getRisk(value: number, limit: number): { risk: number; level: RiskLevel } {
  if (limit <= 0) return { risk: value > 0 ? 1 : 0, level: value > 0 ? 'sd' : 'low' };
  
  if (value > limit) {
    return { risk: 1, level: 'sd' };
  }
  if (value === limit) {
    return { risk: 1, level: 'at_limit' };
  }

  const percentage = value / limit;
  
  let level: RiskLevel;
  if (percentage >= 0.8) {
    level = 'high';
  } else if (percentage >= 0.5) {
    level = 'medium';
  } else {
    level = 'low';
  }
  return { risk: percentage, level };
}

/**
 * Checks if a subject is failed due to absences or missed assignments.
 */
export function isWithoutRight(subject: SubjectSummary | Subject): boolean {
  return subject.absences > subject.absenceLimit || subject.missedAssignments > subject.missedAssignmentLimit;
}

/**
 * Calcula el potencial de una materia.
 */
export function calculateSubjectPotential(subject: Subject, schemes: WeightingScheme[]): number {
    const activityList = getActivityList(subject, schemes);
    if (activityList.length === 0) return 100;

    let totalEarnedPoints = 0;
    let maxPossiblePoints = 0;

    activityList.forEach(item => {
        const isGraded = typeof item.score === 'string' ? item.score.toUpperCase() !== 'SC' && item.score.trim() !== '' : true;
        if (isGraded) {
            const score = Number(item.score) || 0;
            totalEarnedPoints += (score / 100) * item.weight;
            maxPossiblePoints += item.weight;
        }
    });

    return 100 - (maxPossiblePoints - totalEarnedPoints);
}

/**
 * Filtra alumnos que tienen al menos una materia con un potencial por debajo de un umbral.
 */
export function findPotentialRiskCases(students: Student[], schemes: WeightingScheme[], threshold: number): Student[] {
    return students.filter(student => {
        if (!student.subjects || student.subjects.length === 0) return false;
        return student.subjects.some(subject => {
            const potential = calculateSubjectPotential(subject, schemes);
            return potential < threshold;
        });
    });
}

/**
 * Calcula el riesgo general de un estudiante basado en sus materias.
 */
export function getStudentOverallRisk(student: Student, subjects: (Subject | SubjectSummary)[]) {
  let hasSD = false;
  let hasAtLimit = false;
  let hasHighRisk = false;
  let hasMediumRisk = false;
  
  if (!subjects || subjects.length === 0) {
    return { overallRisk: 'low' as RiskLevel, hasSD: false, hasAtLimit: false, hasHighRisk: false, hasMediumRisk: false };
  }

  for (const subject of subjects) {
    const absenceRisk = getRisk(subject.absences, subject.absenceLimit);
    const assignmentRisk = getRisk(subject.missedAssignments, subject.missedAssignmentLimit);

    if (absenceRisk.level === 'sd' || assignmentRisk.level === 'sd') hasSD = true;
    if (absenceRisk.level === 'at_limit' || assignmentRisk.level === 'at_limit') hasAtLimit = true;
    if (absenceRisk.level === 'high' || assignmentRisk.level === 'high') hasHighRisk = true;
    if (absenceRisk.level === 'medium' || assignmentRisk.level === 'medium') hasMediumRisk = true;
  }

  const overallRisk: RiskLevel = hasSD ? 'sd' : hasAtLimit ? 'at_limit' : hasHighRisk ? 'high' : hasMediumRisk ? 'medium' : 'low';
  return { overallRisk, hasSD, hasAtLimit, hasHighRisk, hasMediumRisk };
}

/**
 * Calcula los KPIs (Key Performance Indicators) para una lista de estudiantes.
 */
export function calculateKpis(students: Student[]) {
    let criticalRiskCount = 0;
    let observationCount = 0;

    students.forEach(student => {
        if (student.subjectSummaries && student.subjectSummaries.length > 0) {
          const { hasHighRisk, hasMediumRisk } = getStudentOverallRisk(student, student.subjectSummaries);
          if (hasHighRisk) {
              criticalRiskCount++;
          } else if (hasMediumRisk) {
              observationCount++;
          }
        }
    });

    return { criticalRiskCount, observationCount };
}

/**
 * Criterio: Alumnos que superaron el límite de faltas y/o NE (Sin Derecho).
 */
export function findLostCases(students: Student[]): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries) return false;
        return student.subjectSummaries.some(subject => 
            subject.absences > subject.absenceLimit || subject.missedAssignments > subject.missedAssignmentLimit
        );
    });
}

/**
 * Criterio: Alumnos que superaron el límite de faltas (Sin Derecho por Faltas).
 */
export function findSDAbsencesCases(students: Student[]): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries) return false;
        return student.subjectSummaries.some(subject => 
            subject.absences > subject.absenceLimit
        );
    });
}

/**
 * Criterio: Alumnos que superaron el límite de NE (Sin Derecho por Tareas).
 */
export function findSDAssignmentsCases(students: Student[]): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries) return false;
        return student.subjectSummaries.some(subject => 
            subject.missedAssignments > subject.missedAssignmentLimit
        );
    });
}

/**
 * Criterio: Alumnos con >= 80% de faltas/NE en alguna materia (y no son casos perdidos o al límite).
 */
export function findUrgentCases(students: Student[], excludedIds: Set<string>): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries || excludedIds.has(student.id)) return false;
        
        return student.subjectSummaries.some(subject => {
            const absenceRisk = getRisk(subject.absences, subject.absenceLimit);
            const assignmentRisk = getRisk(subject.missedAssignments, subject.missedAssignmentLimit);
            return absenceRisk.level === 'high' || assignmentRisk.level === 'high';
        });
    });
}

/**
 * Criterio: Alumnos con >= 50% de faltas/NE en alguna materia (y no son urgentes, perdidos o al límite).
 */
export function findObservationCases(students: Student[], excludedIds: Set<string>): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries || excludedIds.has(student.id)) return false;
        
        return student.subjectSummaries.some(subject => {
            const absenceRisk = getRisk(subject.absences, subject.absenceLimit);
            const assignmentRisk = getRisk(subject.missedAssignments, subject.missedAssignmentLimit);
            return absenceRisk.level === 'medium' || absenceRisk.level === 'medium';
        });
    });
}

/**
 * Criterio: Alumnos que alcanzaron exactamente el 100% del límite de faltas.
 */
export function findAtLimitAbsencesCases(students: Student[]): Student[] {
  return students.filter(student => {
    if (!student.subjectSummaries) return false;
    return student.subjectSummaries.some(subject => getRisk(subject.absences, subject.absenceLimit).level === 'at_limit');
  });
}

/**
 * Criterio: Alumnos que alcanzaron exactamente el 100% del límite de Tareas (NE).
 */
export function findAtLimitAssignmentsCases(students: Student[]): Student[] {
  return students.filter(student => {
    if (!student.subjectSummaries) return false;
    return student.subjectSummaries.some(subject => getRisk(subject.missedAssignments, subject.missedAssignmentLimit).level === 'at_limit');
  });
}

/**
 * Criterio: Alumnos con derecho a examen extraordinario.
 */
export function findExtraordinaryCases(students: Student[]): Student[] {
  return students.filter(student => {
    if (!student.subjectSummaries) return false;
    const hasAcademicDishonesty = student.subjects?.some(s => s.finalGradeReason?.toUpperCase() === 'DA');
    if (hasAcademicDishonesty) return false;

    return student.subjectSummaries.some(subject => {
      if (subject.finalGrade === null) return false;
      return subject.finalGrade >= 50 && subject.finalGrade <= 69;
    });
  });
}

/**
 * Criterio: Alumnos con riesgo > 0% en una materia y categoría específicas.
 */
export function findRiskCasesBySubject(students: Student[], subjectName: string, riskType: 'absences' | 'missedAssignments'): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries) return false;
        const relevantSubject = student.subjectSummaries.find(s => s.name === subjectName);
        if (!relevantSubject) return false;
        return riskType === 'absences' ? relevantSubject.absences > 0 : relevantSubject.missedAssignments > 0;
    });
}

/**
 * Criterio: Alumnos con materias cuya calificacion es "SC" (sin calificar).
 */
export function findIncompleteGradeCases(students: Student[]): Student[] {
    return students.filter(student => {
        if (!student.subjects) return false;
        return student.subjects.some(subject => {
            for (const activityKey in subject.activities) {
                if (String(subject.activities[activityKey]).toUpperCase() === 'SC') {
                    return true;
                }
            }
            return false;
        });
    });
}
