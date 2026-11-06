/** Academic period definitions supplied by the institution's user. */
export const graduationPeriods = {
  '10': { plan: 'Tetramestral', months: 'Enero - Abril' },
  '20': { plan: 'Tetramestral', months: 'Mayo - Julio' },
  '30': { plan: 'Tetramestral', months: 'Septiembre - Diciembre' },
  '40': { plan: 'Semestral', months: 'Enero - Mayo' },
  '50': { plan: 'Semestral', months: 'Verano: Junio - Julio' },
  '60': { plan: 'Semestral', months: 'Agosto - Diciembre' },
} as const;

export function describeGraduationPeriod(value: string) {
  const raw = value.trim();
  if (!/^\d{4}\*?$/.test(raw)) return null;
  const atRiskOfPeriodChange = raw.endsWith('*');
  const code = raw.slice(0, 4);
  const period = graduationPeriods[code.slice(2) as keyof typeof graduationPeriods];
  return period ? { code, raw, atRiskOfPeriodChange, year: 2000 + Number(code.slice(0, 2)), ...period } : null;
}

export function institutionalStudentEmail(studentId: string) {
  const id = studentId.trim();
  return id.length > 1 ? `al${id.slice(1)}@tecmilenio.mx` : '';
}
