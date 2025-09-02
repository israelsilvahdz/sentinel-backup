import { type StudentData, type Student, type Subject, type Change } from '@/types/student';

export type RiskLevel = 'low' | 'medium' | 'high';

export function getRisk(value: number, limit: number): { risk: number; level: RiskLevel } {
  if (limit === 0) return { risk: 0, level: 'low' };
  const percentage = value / limit;
  
  let level: RiskLevel;
  if (percentage >= 0.5) { // 50% or more is critical
    level = 'high';
  } else if (percentage > 0) { // Any risk greater than 0 is observation
    level = 'medium';
  } else {
    level = 'low';
  }
  return { risk: percentage, level };
}

export function compareData(current: StudentData, previous: StudentData): Change[] {
  const changes: Change[] = [];
  if (!current || !previous) return [];

  for (const studentId in current) {
    if (previous[studentId]) {
      const currentStudent = current[studentId];
      const previousStudent = previous[studentId];

      currentStudent.subjects.forEach(currentSubject => {
        const previousSubject = previousStudent.subjects.find(s => s.name === currentSubject.name);
        if (previousSubject) {
          if (currentSubject.absences !== previousSubject.absences) {
            changes.push({
              studentId,
              studentName: currentStudent.name,
              type: 'absence',
              subjectName: currentSubject.name,
              oldValue: previousSubject.absences,
              newValue: currentSubject.absences,
            });
          }
          if (currentSubject.missedAssignments !== previousSubject.missedAssignments) {
            changes.push({
              studentId,
              studentName: currentStudent.name,
              type: 'missedAssignment',
              subjectName: currentSubject.name,
              oldValue: previousSubject.missedAssignments,
              newValue: currentSubject.missedAssignments,
            });
          }
          if (currentSubject.grade !== previousSubject.grade) {
            changes.push({
              studentId,
              studentName: currentStudent.name,
              type: 'grade',
              subjectName: currentSubject.name,
              oldValue: previousSubject.grade,
              newValue: currentSubject.grade,
            });
          }
        }
      });
    }
  }
  return changes;
}

export function getStudentOverallRisk(student: Student) {
  let hasHighRisk = false;
  let hasMediumRisk = false;
  
  if (!student?.subjects) return { overallRisk: 'low' as RiskLevel, hasHighRisk: false, hasMediumRisk: false };

  for (const subject of student.subjects) {
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

export function calculateKpis(students: Student[]) {
    let criticalRiskCount = 0;
    let observationCount = 0;

    students.forEach(student => {
        const { hasHighRisk, hasMediumRisk } = getStudentOverallRisk(student);
        if (hasHighRisk) {
            criticalRiskCount++;
        } else if (hasMediumRisk) {
            observationCount++;
        }
    });

    return { criticalRiskCount, observationCount };
}
