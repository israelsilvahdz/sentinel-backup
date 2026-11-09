import * as XLSX from 'xlsx';
import type { WeightingScheme } from '@/types/student';

/** Blank rows are optional: a new Materia row, not spacing, starts a block. */
export function readWeightingWorkbook(workbook: XLSX.WorkBook): WeightingScheme[] {
  const sheet = workbook.Sheets.Ponderaciones;
  if (!sheet) throw new Error('Falta la hoja Ponderaciones.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const result: WeightingScheme[] = [];
  let current: WeightingScheme | undefined;
  let header = false;
  let unassigned = false;
  const finish = () => {
    if (!current) return;
    if (!header && !unassigned) throw new Error(`Faltan encabezados en ${current.name}.`);
    if (!unassigned) result.push(current);
  };
  rows.forEach((row, index) => {
    if (row.every(value => String(value ?? '').trim() === '')) return;
    const first = String(row[0] ?? '').trim();
    const second = String(row[1] ?? '').trim();
    if (first === 'Materia') {
      finish();
      if (!second) throw new Error(`Fila ${index + 1}: falta el nombre de la materia.`);
      current = { name: second, subjectNames: second === 'Sin materia asignada' ? [] : [second], activities: [] };
      header = false; unassigned = false;
    } else if (!current) {
      throw new Error(`Fila ${index + 1}: se esperaba Materia.`);
    } else if (!header && first === 'Esquema') {
      current.name = second;
    } else if (!header && first === 'Actividad' && second === 'Etiqueta' && String(row[2]).trim() === 'Weight') {
      header = true;
    } else if (!header && first === 'Sin ponderación asignada') {
      unassigned = true;
    } else {
      const weight = Number(row[2]);
      if (!header || !first || String(row[2] ?? '').trim() === '' || !Number.isFinite(weight) || weight < 0 || weight > 100) {
        throw new Error(`Fila ${index + 1}: actividad o peso inválido (usa un número de 0 a 100).`);
      }
      if (current.activities.some(activity => activity.name === first)) throw new Error(`Fila ${index + 1}: actividad duplicada.`);
      current.activities.push({ name: first, label: second, weight });
    }
  });
  finish();
  if (!result.length) throw new Error('No se encontraron esquemas de ponderación.');
  return result;
}

/** One sheet with a readable block per subject; keep the full loaded catalog. */
export function buildWeightingWorkbook(schemes: WeightingScheme[], monitoredSubjects: string[]) {
  if (!schemes.length) throw new Error('No hay ponderaciones cargadas para respaldar.');
  const workbook = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];
  const assigned = new Set<string>();
  const counts = new Map<string, number>();
  schemes.forEach(scheme => scheme.subjectNames.forEach(name => counts.set(name, (counts.get(name) || 0) + 1)));
  for (const scheme of schemes) {
    for (const subject of scheme.subjectNames.length ? scheme.subjectNames : ['']) {
      if (rows.length) rows.push([]);
      rows.push(['Materia', subject || 'Sin materia asignada']);
      if (!subject || (counts.get(subject) || 0) > 1) rows.push(['Esquema', scheme.name]);
      rows.push(['Actividad', 'Etiqueta', 'Weight']);
      for (const activity of scheme.activities) {
        const match = activity.name.match(/^actividad\s*(\d+)$/i);
        rows.push([match ? 'A' + match[1] : activity.name, activity.label || activity.name, activity.weight]);
      }
      if (subject) assigned.add(subject);
    }
  }
  for (const name of new Set(monitoredSubjects)) {
    if (!assigned.has(name)) rows.push([], ['Materia', name], ['Sin ponderación asignada']);
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 26 }, { wch: 65 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Ponderaciones');
  return workbook;
}
