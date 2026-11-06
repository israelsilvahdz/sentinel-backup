import type { Student, SubjectSummary } from '@/types/student';

export type RiskColor = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
export const riskColors: Record<RiskColor, { label: string; color: string }> = {
  green: { label: 'Verde · estable, menos del 50%', color: '#16a34a' },
  yellow: { label: 'Amarillo · observación, 50% a menos del 80%', color: '#facc15' },
  orange: { label: 'Naranja · crítico o al límite, 80% a 100%', color: '#f97316' },
  red: { label: 'Rojo · supera el límite', color: '#dc2626' },
  unknown: { label: 'Gris · sin datos válidos', color: '#94a3b8' },
};

export function riskColor(value: number, limit: number): RiskColor {
  if (!Number.isFinite(value) || !Number.isFinite(limit) || value < 0 || limit < 0) return 'unknown';
  if (value > limit) return 'red';
  if (limit === 0) return 'green';
  if (value === limit) return 'orange';
  if (value / limit >= 0.8) return 'orange';
  return value / limit >= 0.5 ? 'yellow' : 'green';
}

export function riskPercentage(value: number, limit: number): string {
  if (riskColor(value, limit) === 'unknown') return 'sin datos';
  if (limit === 0) return value === 0 ? '0%' : 'límite cero superado';
  return `${Math.round(value / limit * 100)}%`;
}

export function riskSubjects(student: Student): SubjectSummary[] {
  return student.subjectSummaries?.length ? student.subjectSummaries : student.subjects || [];
}

export function matchesRiskFilter(student: Student, color: RiskColor | 'all', metric: 'absences' | 'ne' | 'either' | 'both'): boolean {
  if (color === 'all') return true;
  return riskSubjects(student).some(subject => {
    const absences = riskColor(subject.absences, subject.absenceLimit) === color;
    const ne = riskColor(subject.missedAssignments, subject.missedAssignmentLimit) === color;
    return metric === 'absences' ? absences : metric === 'ne' ? ne : metric === 'both' ? absences && ne : absences || ne;
  });
}

export interface SubjectFollowUp {
  id: string;
  studentId: string;
  subjectId: string;
  group: string;
  kind?: 'notice';
  text?: string;
  author?: string;
  role?: 'Tutor' | 'Líder';
  createdAt: number | null;
  absences: number;
  missedAssignments: number;
}

export function needsFollowUp(subject: SubjectSummary, latest?: SubjectFollowUp): boolean {
  const high = (value: number, limit: number) => ['orange', 'red'].includes(riskColor(value, limit));
  return (high(subject.absences, subject.absenceLimit) && (!latest || subject.absences > latest.absences))
    || (high(subject.missedAssignments, subject.missedAssignmentLimit) && (!latest || subject.missedAssignments > latest.missedAssignments));
}
