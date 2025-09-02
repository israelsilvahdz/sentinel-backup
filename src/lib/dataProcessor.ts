
import { type Student, type Subject, type SubjectSummary } from '@/types/student';

export type RiskLevel = 'low' | 'medium' | 'high';
export type CaseStatus = 'lost' | 'urgent' | 'observation' | 'ok';

/**
 * Calcula el nivel de riesgo para un valor y su límite.
 * @param value El valor actual (ej. número de faltas).
 * @param limit El límite permitido.
 * @returns El nivel de riesgo ('low', 'medium', 'high') y el porcentaje de riesgo.
 */
export function getRisk(value: number, limit: number): { risk: number; level: RiskLevel } {
  if (limit <= 0) return { risk: value > 0 ? 1 : 0, level: value > 0 ? 'high' : 'low' };
  const percentage = value / limit;
  
  let level: RiskLevel;
  if (percentage >= 0.8) { // 80% o más es crítico. El limite real es > 100%, pero se marca antes
    level = 'high';
  } else if (percentage >= 0.5) { // 50% o más es observación
    level = 'medium';
  } else {
    level = 'low';
  }
  return { risk: percentage, level };
}

/**
 * Calcula el riesgo general de un estudiante basado en sus materias.
 * @param student El objeto del estudiante.
 * @param subjects Un array con las materias (o resúmenes de materias) del estudiante.
 * @returns El nivel de riesgo general ('low', 'medium', 'high') y flags para cada nivel.
 */
export function getStudentOverallRisk(student: Student, subjects: (Subject | SubjectSummary)[]) {
  let hasHighRisk = false;
  let hasMediumRisk = false;
  
  if (!subjects || subjects.length === 0) {
    return { overallRisk: 'low' as RiskLevel, hasHighRisk: false, hasMediumRisk: false };
  }

  for (const subject of subjects) {
    const absenceRisk = getRisk(subject.absences, subject.absenceLimit);
    const assignmentRisk = getRisk(subject.missedAssignments, subject.missedAssignmentLimit);

    if (absenceRisk.level === 'high' || assignmentRisk.level === 'high') {
      hasHighRisk = true;
    }
    if (absenceRisk.level === 'medium' || assignmentRisk.level === 'medium') {
      hasMediumRisk = true;
    }
  }

  const overallRisk = hasHighRisk ? 'high' : hasMediumRisk ? 'medium' : 'low';
  return { overallRisk, hasHighRisk, hasMediumRisk };
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
 * Criterio: Alumnos que superaron el límite de faltas y/o NE.
 */
export function findLostCases(students: Student[]): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries) return false;
        return student.subjectSummaries.some(subject => 
            subject.absences >= subject.absenceLimit || subject.missedAssignments >= subject.missedAssignmentLimit
        );
    });
}

/**
 * Criterio: Alumnos con >= 50% de faltas/NE en alguna materia (y no son casos perdidos).
 */
export function findUrgentCases(students: Student[], lostCaseIds: Set<string>): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries || lostCaseIds.has(student.id)) return false;
        
        return student.subjectSummaries.some(subject => {
            const absencePercentage = subject.absenceLimit > 0 ? (subject.absences / subject.absenceLimit) : 0;
            const assignmentPercentage = subject.missedAssignmentLimit > 0 ? (subject.missedAssignments / subject.missedAssignmentLimit) : 0;
            return absencePercentage >= 0.5 || assignmentPercentage >= 0.5;
        });
    });
}

/**
 * Criterio: Alumnos con > 20% de faltas/NE en alguna materia (y no son urgentes ni perdidos).
 */
export function findObservationCases(students: Student[], excludedIds: Set<string>): Student[] {
    return students.filter(student => {
        if (!student.subjectSummaries || excludedIds.has(student.id)) return false;
        
        return student.subjectSummaries.some(subject => {
            const absencePercentage = subject.absenceLimit > 0 ? (subject.absences / subject.absenceLimit) : 0;
            const assignmentPercentage = subject.missedAssignmentLimit > 0 ? (subject.missedAssignments / subject.missedAssignmentLimit) : 0;
            return absencePercentage > 0.2 || assignmentPercentage > 0.2;
        });
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
