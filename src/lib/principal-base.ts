import * as XLSX from 'xlsx';
import type { Student, StudentContact, StudentLifeProfile, ProfessorContact, Team, WeightingScheme } from '@/types/student';
import { readWeightingWorkbook } from './weighting-export';
import { describeGraduationPeriod, institutionalStudentEmail } from './student-base-fields';

export interface PrincipalBase {
  name: string;
  audience?: 'prepa' | 'professional';
  students: Record<string, Partial<Student>>;
  contacts: Record<string, StudentContact>;
  profiles: Record<string, StudentLifeProfile>;
  professors: Record<string, ProfessorContact>;
  teams: Team[];
  schemes: WeightingScheme[];
}
const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
export function readPrincipalBase(workbook: XLSX.WorkBook, name: string): PrincipalBase {
  const names = workbook.SheetNames.filter(name => normalize(name) !== 'listas (2)');
  if (!names.length) throw new Error('La base requiere una hoja de alumnos.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[names[0]], { header: 1, defval: '', raw: false });
  const headers = rows[0]?.map(normalize) || [];
  for (const required of ['matricula', 'nombre del alumno']) if (!headers.includes(required)) throw new Error(`Falta la columna ${required} en la primera hoja.`);
  const audience = ['mentor', 'codigo academico', 'tipo plan', 'descripcion de codigo academico'].some(header => headers.includes(header)) ? 'professional' : 'prepa';
  const base: PrincipalBase = { name, audience, students: {}, contacts: {}, profiles: {}, professors: {}, teams: [], schemes: [] };
  for (const [index, row] of rows.slice(1).entries()) {
    if (row.every(cell => String(cell).trim() === '')) continue;
    const get = (header: string) => String(row[headers.indexOf(normalize(header))] ?? '').trim();
    const id = get('Matrícula').toUpperCase();
    if (!id) throw new Error(`Fila ${index + 2}: falta la matrícula.`);
    if (base.students[id]) throw new Error(`Fila ${index + 2}: matrícula duplicada. Revisa la base.`);
    const graduationPeriod = get('Periodo de graduación');
    if (graduationPeriod && graduationPeriod !== '0' && !describeGraduationPeriod(graduationPeriod)) throw new Error(`Fila ${index + 2}: periodo de graduación inválido. Ejemplo: 2630 o 2630*.`);
    base.students[id] = { id, name: get('Nombre del alumno'), leader: audience === 'professional' ? get('Mentor') : get('Líder'), tutor: audience === 'professional' ? '' : get('Tutor'), graduationPeriod, pendingSubjects: get('Materias pendientes'), academicCode: get('Código académico'), planType: get('Tipo Plan'), academicCodeDescription: get('Descripción de Código académico') };
    base.contacts[id] = { studentId: id, name: get('Nombre del alumno'), studentPhone: get('Celular alumno'), studentEmail: institutionalStudentEmail(id), tutorPhone: get('Tel. Tutor'), dadName: get('Nombre papá'), dadPhone: get('Cel papá'), dadEmail: get('Correo papá'), momName: get('Nombre mamá'), momPhone: get('Cel mamá'), momEmail: get('Correo mamá'), sedena: get('SEDENA'), group: '', mentoringId: '' };
    base.profiles[id] = { studentId: id, email: institutionalStudentEmail(id), society: get('Sociedad'), purpose: get('Propósito de vida') };
    for (const column of ['Equipos deportivos', 'Equipos culturales', 'Otros equipos', 'Embajadores']) {
      for (const teamName of get(column).split('|').map(value => value.trim()).filter(Boolean)) {
        const teamId = `${column}:${teamName}`;
        let team = base.teams.find(team => team.id === teamId);
        if (!team) { team = { id: teamId, name: teamName, type: column === 'Equipos deportivos' ? 'deportivo' : column === 'Equipos culturales' ? 'cultural' : undefined, members: [] }; base.teams.push(team); }
        team.members.push({ id, name: get('Nombre del alumno') });
      }
    }
  }
  if (!Object.keys(base.students).length) throw new Error('La base no contiene alumnos.');
  const supplemental = names.slice(1);
  const weightingName = supplemental.find(sheetName => normalize(sheetName) === 'ponderaciones') || supplemental.find(sheetName => {
    const firstRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: '' });
    return firstRows.some(row => normalize(row[0]) === 'materia');
  });
  const professorName = supplemental.find(sheetName => sheetName !== weightingName);
  const professors = professorName ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[professorName], { defval: '' }) : [];
  for (const row of professors) {
    const get = (header: string) => String(Object.entries(row).find(([key]) => normalize(key) === normalize(header))?.[1] ?? '').trim();
    const professorName = get('Nombre Docente');
    if (!professorName) continue;
    const id = professorName.toLowerCase().replace(/\s+/g, '');
    base.professors[id] = { id, name: professorName, email: get('Correo') };
  }
  if (weightingName) base.schemes = readWeightingWorkbook({ ...workbook, Sheets: { ...workbook.Sheets, Ponderaciones: workbook.Sheets[weightingName] } }).map((scheme, index) => ({ ...scheme, id: `base-${index + 1}` }));
  return base;
}
