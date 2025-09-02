import { type Student, type Subject } from '@/types/student';

export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Calcula el nivel de riesgo para un valor y su límite.
 * @param value El valor actual (ej. número de faltas).
 * @param limit El límite permitido.
 * @returns El nivel de riesgo ('low', 'medium', 'high') y el porcentaje de riesgo.
 */
export function getRisk(value: number, limit: number): { risk: number; level: RiskLevel } {
  if (limit === 0) return { risk: 0, level: 'low' };
  const percentage = value / limit;
  
  let level: RiskLevel;
  if (percentage >= 0.5) { // 50% o más es crítico
    level = 'high';
  } else if (percentage > 0) { // Cualquier riesgo mayor que 0 es observación
    level = 'medium';
  } else {
    level = 'low';
  }
  return { risk: percentage, level };
}

/**
 * Calcula el riesgo general de un estudiante basado en sus materias.
 * @param student El objeto del estudiante.
 * @param subjects Un array con las materias del estudiante.
 * @returns El nivel de riesgo general ('low', 'medium', 'high') y flags para cada nivel.
 */
export function getStudentOverallRisk(student: Student, subjects: Subject[]) {
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
      break; 
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
 * @param students Array de estudiantes con sus materias cargadas.
 * @returns El conteo de alumnos en riesgo crítico y en observación.
 */
export function calculateKpis(students: Student[]) {
    let criticalRiskCount = 0;
    let observationCount = 0;

    students.forEach(student => {
        // Asegurarse que las materias existan antes de procesar
        if (student.subjects && student.subjects.length > 0) {
          const { hasHighRisk, hasMediumRisk } = getStudentOverallRisk(student, student.subjects);
          if (hasHighRisk) {
              criticalRiskCount++;
          } else if (hasMediumRisk) {
              observationCount++;
          }
        }
    });

    return { criticalRiskCount, observationCount };
}
