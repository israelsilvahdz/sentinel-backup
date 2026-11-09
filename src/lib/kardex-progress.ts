import * as XLSX from 'xlsx';

export type KardexStatus = 'accredited' | 'inProgress' | 'notAccredited' | 'pending' | 'review';

export interface KardexCourse {
  key: string;
  name: string;
  order: number;
  status: KardexStatus;
  grade: string;
  period: string;
  prerequisites: string;
  optative: string;
  attempts: number;
}

export interface KardexStudent {
  id: string;
  name: string;
  plan: string;
  courses: KardexCourse[];
}

const clean = (value: unknown) => String(value ?? '').trim();
const header = (value: unknown) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const priority: Record<KardexStatus, number> = { accredited: 5, inProgress: 4, notAccredited: 3, review: 2, pending: 1 };

export function readKardexWorkbook(workbook: XLSX.WorkBook): KardexStudent[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('El archivo no contiene una hoja de Kárdex.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headers = (rows[0] || []).map(header);
  const column = (name: string) => headers.indexOf(header(name));
  const required = ['Matrícula', 'Nombre', 'Plan de Estudios', 'Clave Materia Oficial', 'Nombre Materia', 'Calificación'];
  if (required.some(name => column(name) < 0)) throw new Error('No se reconocieron las columnas del Kárdex masivo.');
  const value = (row: unknown[], name: string) => clean(row[column(name)]);
  const students = new Map<string, { id: string; name: string; plan: string; courses: Map<string, KardexCourse> }>();

  for (const row of rows.slice(1)) {
    const id = value(row, 'Matrícula').toUpperCase();
    const plan = value(row, 'Plan de Estudios');
    const key = value(row, 'Clave Materia Oficial').toUpperCase();
    if (!id || !key) continue;
    const studentPlanId = `${id}|${plan}`;
    if (!students.has(studentPlanId)) students.set(studentPlanId, { id, name: value(row, 'Nombre'), plan, courses: new Map() });
    const student = students.get(studentPlanId)!;
    // Una clave oficial representa una posición del plan. Puede tener intentos
    // repetidos o una fila histórica y otra todavía vacía.
    const courseId = `${plan}|${key}`;
    const grade = value(row, 'Calificación');
    const numericGrade = grade !== '' && Number.isFinite(Number(grade)) ? Number(grade) : null;
    const status: KardexStatus = numericGrade !== null
      ? numericGrade >= 70 ? 'accredited' : 'notAccredited'
      : grade.toUpperCase() === 'CU' ? 'inProgress' : grade ? 'review' : 'pending';
    const candidate: KardexCourse = {
      key, name: value(row, 'Nombre Materia'), order: Number(value(row, 'Órden')) || 999,
      status, grade, period: value(row, 'Periodo'), prerequisites: value(row, 'Prerrequisitos'),
      optative: value(row, 'Nombre Optativa'), attempts: 1,
    };
    const current = student.courses.get(courseId);
    if (!current) student.courses.set(courseId, candidate);
    else student.courses.set(courseId, {
      ...(priority[candidate.status] > priority[current.status] ? candidate : current),
      attempts: current.attempts + 1,
    });
  }

  return [...students.values()].map(student => ({
    id: student.id, name: student.name, plan: student.plan,
    courses: [...student.courses.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'es')),
  })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function kardexSummary(student: KardexStudent) {
  const count = (status: KardexStatus) => student.courses.filter(course => course.status === status).length;
  const accredited = count('accredited');
  const inProgress = count('inProgress');
  const notAccredited = count('notAccredited');
  const review = count('review');
  const pending = count('pending');
  return { total: student.courses.length, accredited, inProgress, notAccredited, pending, review,
    progress: student.courses.length ? Math.round(accredited / student.courses.length * 100) : 0 };
}
