import * as XLSX from 'xlsx';
import type { Student, StudentContact, StudentLifeProfile, Team } from '@/types/student';
import { institutionalStudentEmail } from './student-base-fields';

export function buildStudentBaseWorkbook(students: Student[], contacts: Record<string, StudentContact>, profiles: Record<string, StudentLifeProfile>, teams: Team[]) {
  const byId = new Map(students.map(student => [student.id, student]));
  // Include directory-only students so the monitoring does not trim the master list.
  const ids = new Set([...byId.keys(), ...Object.keys(contacts), ...Object.keys(profiles)]);
  const rows: (string | number)[][] = [[
    'Matrícula', 'Nombre del alumno', 'Líder', 'Tutor',
    'Celular alumno', 'Correo alumno', 'Tel. Tutor', 'SEDENA',
    'Sociedad', 'Propósito de vida',
    'Periodo de graduación', 'Materias pendientes', 'Equipos deportivos', 'Equipos culturales', 'Otros equipos', 'Embajadores',
  ]];
  for (const id of ids) {
    const student = byId.get(id), contact = contacts[id], profile = profiles[id];
    const memberTeams = teams.filter(team => team.members?.some(member => member.id === id));
    rows.push([
      id, contact?.name || student?.name || '', student?.leader || '', student?.tutor || '',
      contact?.studentPhone || '', institutionalStudentEmail(id),
      contact?.tutorPhone || [...new Set([contact?.dadPhone, contact?.momPhone].filter(Boolean))].join(' / '), contact?.sedena || '',
      profile?.society || '', profile?.purpose || '',
      student?.graduationPeriod || '', student?.pendingSubjects || '',
      memberTeams.filter(team => team.type === 'deportivo').map(team => team.name).join(' | '),
      memberTeams.filter(team => team.type === 'cultural').map(team => team.name).join(' | '),
      memberTeams.filter(team => !team.type && !team.id.startsWith('Embajadores:')).map(team => team.name).join(' | '),
      memberTeams.filter(team => team.id.startsWith('Embajadores:')).map(team => team.name).join(' | '),
    ]);
  }
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = rows[0].map((_, index) => ({ wch: index === 1 ? 40 : 25 }));
  sheet['!autofilter'] = { ref: sheet['!ref']! };
  XLSX.utils.book_append_sheet(workbook, sheet, 'Alumnos');
  return workbook;
}
