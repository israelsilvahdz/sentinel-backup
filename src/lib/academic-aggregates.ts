import type { Student, Subject } from '@/types/student';

export interface AcademicAggregate {
  name: string;
  average: number | null;
  gradedCount: number;
  scCount: number;
  studentCount: number;
}

type Accumulator = { name: string; scoreSum: number; gradedCount: number; scCount: number; students: Set<string> };

function comparableName(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').replace(/\s+/g, ' ');
}

function gradedScore(subject: Subject): number | null {
  const activityValues = Object.values(subject.activities || {});
  const hasNumericActivity = activityValues.some(value => value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value)));
  if (!(hasNumericActivity || subject.finalGrade !== null || (Number.isFinite(subject.grade) && subject.grade > 0))) return null;
  return Number.isFinite(subject.grade) && subject.grade >= 0 && subject.grade <= 100 ? subject.grade : null;
}

function addToGroup(groups: Map<string, Accumulator>, label: string, studentId: string, subject: Subject) {
  const key = comparableName(label);
  if (!key) return;
  let row = groups.get(key);
  if (!row) {
    row = { name: label.trim(), scoreSum: 0, gradedCount: 0, scCount: 0, students: new Set() };
    groups.set(key, row);
  }
  row.students.add(studentId);
  const sc = Object.values(subject.activities || {}).filter(value => String(value).trim().toUpperCase() === 'SC').length;
  row.scCount += sc;
  const score = gradedScore(subject);
  if (score !== null) {
    row.scoreSum += score;
    row.gradedCount++;
  }
}

function finish(groups: Map<string, Accumulator>): AcademicAggregate[] {
  return [...groups.values()].map(row => ({
    name: row.name,
    average: row.gradedCount ? row.scoreSum / row.gradedCount : null,
    gradedCount: row.gradedCount,
    scCount: row.scCount,
    studentCount: row.students.size,
  })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function aggregateAcademics(students: Student[]): { byProfessor: AcademicAggregate[]; byGroup: AcademicAggregate[]; byCareer: AcademicAggregate[] } {
  const professors = new Map<string, Accumulator>();
  const groups = new Map<string, Accumulator>();
  const careers = new Map<string, Accumulator>();
  for (const student of students) {
    for (const subject of student.subjects || []) {
      addToGroup(professors, subject.professorName || 'Sin profesor asignado', student.id, subject);
      addToGroup(groups, subject.group || 'Sin grupo', student.id, subject);
      addToGroup(careers, student.academicCodeDescription || student.academicCode || 'Sin carrera', student.id, subject);
    }
  }
  return { byProfessor: finish(professors), byGroup: finish(groups), byCareer: finish(careers) };
}

export function subjectAveragesFor(students: Student[], dimension: 'professors' | 'groups' | 'careers', name: string): AcademicAggregate[] {
  const subjects = new Map<string, Accumulator>();
  const target = comparableName(name);
  for (const student of students) {
    for (const subject of student.subjects || []) {
      const owner = dimension === 'professors' ? subject.professorName || 'Sin profesor asignado' : dimension === 'careers' ? student.academicCodeDescription || student.academicCode || 'Sin carrera' : subject.group || 'Sin grupo';
      if (comparableName(owner) === target) addToGroup(subjects, subject.name || 'Materia sin nombre', student.id, subject);
    }
  }
  return finish(subjects);
}

export function otherGroupsAverage(students: Student[], dimension: 'professors' | 'groups' | 'careers', name: string, subjectName?: string): { average: number; count: number } | null {
  const ownGroups = new Map<string, Set<string>>();
  const target = comparableName(name);
  const selectedSubject = subjectName ? comparableName(subjectName) : null;
  for (const student of students) for (const subject of student.subjects || []) {
    if (!subject.group?.trim()) continue;
    const owner = dimension === 'professors' ? subject.professorName || 'Sin profesor asignado' : dimension === 'careers' ? student.academicCodeDescription || student.academicCode || 'Sin carrera' : subject.group || 'Sin grupo';
    const subjectKey = comparableName(subject.name);
    if (comparableName(owner) !== target || (selectedSubject && subjectKey !== selectedSubject)) continue;
    if (!ownGroups.has(subjectKey)) ownGroups.set(subjectKey, new Set());
    ownGroups.get(subjectKey)!.add(comparableName(subject.group || 'Sin grupo'));
  }
  let sum = 0;
  let count = 0;
  for (const student of students) for (const subject of student.subjects || []) {
    if (!subject.group?.trim()) continue;
    const subjectKey = comparableName(subject.name);
    const groups = ownGroups.get(subjectKey);
    if (!groups || groups.has(comparableName(subject.group || 'Sin grupo'))) continue;
    const score = gradedScore(subject);
    if (score !== null) { sum += score; count++; }
  }
  return count ? { average: sum / count, count } : null;
}

export function careerClassmates(students: Student[], career: string, subjectName: string): { group: string; names: string[] }[] {
  const matches = new Map<string, Set<string>>();
  for (const student of students) {
    if (comparableName(student.academicCodeDescription || student.academicCode || 'Sin carrera') !== comparableName(career)) continue;
    for (const subject of student.subjects || []) {
      if (comparableName(subject.name) !== comparableName(subjectName)) continue;
      const group = subject.group?.trim() || 'Sin grupo';
      if (!matches.has(group)) matches.set(group, new Set());
      matches.get(group)!.add(student.name || student.id);
    }
  }
  return [...matches].map(([group, names]) => ({ group, names: [...names].sort((a, b) => a.localeCompare(b, 'es')) }));
}
