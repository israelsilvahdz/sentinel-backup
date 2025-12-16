

import { type Student, type Subject, type SubjectSummary } from '@/types/student';

export type RiskLevel = 'low' | 'medium' | 'high' | 'at_limit' | 'sd';
export type CaseStatus = 'lost' | 'urgent' | 'observation' | 'ok';

/**
 * Calcula el nivel de riesgo para un valor y su límite.
 * @param value El valor actual (ej. número de faltas).
 * @param limit El límite permitido.
 * @returns El nivel de riesgo ('low', 'medium', 'high', 'at_limit', 'sd') y el porcentaje de riesgo.
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
 * @param subject The subject summary object.
 * @returns True if the student is without right to pass the subject.
 */
export function isWithoutRight(subject: SubjectSummary | Subject): boolean {
  return subject.absences > subject.absenceLimit || subject.missedAssignments > subject.missedAssignmentLimit;
}

/**
 * Calcula el riesgo general de un estudiante basado en sus materias.
 * @param student El objeto del estudiante.
 * @param subjects Un array con las materias (o resúmenes de materias) del estudiante.
 * @returns El nivel de riesgo general y flags para cada nivel.
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
 * @param students Array de estudiantes con sus resúmenes de materias cargados.
 * @returns El conteo de alumnos en riesgo crítico y en observación.
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
            return absenceRisk.level === 'medium' || assignmentRisk.level === 'medium';
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
 * Calificación final entre 50 y 69 y sin "DA" (Deshonestidad Académica).
 */
export function findExtraordinaryCases(students: Student[]): Student[] {
  return students.filter(student => {
    if (!student.subjectSummaries) return false;

    // Primero, verificar que el alumno no tenga ninguna materia con "DA".
    const hasAcademicDishonesty = student.subjects?.some(s => s.finalGradeReason?.toUpperCase() === 'DA');
    if (hasAcademicDishonesty) {
      return false;
    }

    // Luego, verificar si tiene al menos una materia con calificación para extraordinario.
    const isEligible = student.subjectSummaries.some(subject => {
      if (subject.finalGrade === null) return false;
      return subject.finalGrade >= 50 && subject.finalGrade <= 69;
    });

    return isEligible;
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

        if (riskType === 'absences') {
            return relevantSubject.absences > 0;
        } else { // missedAssignments
            return relevantSubject.missedAssignments > 0;
        }
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
