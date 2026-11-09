const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const XLSX = require('xlsx');

function load(relativePath, dependencies = {}) {
  const source = fs.readFileSync(require.resolve(`../${relativePath}`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', compiled)((name) => dependencies[name] || require(name), module.exports, module);
  return module.exports;
}

const { readPrincipalBase } = load('src/lib/principal-base.ts', {
  './weighting-export': { readWeightingWorkbook: () => [] },
  './student-base-fields': { describeGraduationPeriod: () => ({}), institutionalStudentEmail: id => `al${id.slice(1)}@tecmilenio.mx` },
});
const { aggregateAcademics, subjectAveragesFor, careerClassmates } = load('src/lib/academic-aggregates.ts');
const { monitoringInfo } = load('src/lib/local-workspace.ts');

test('professional base loads with mentor and career fields and no parent or professor sheets', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Matrícula', 'Nombre del alumno', 'Mentor', 'Código académico', 'Tipo Plan', 'Descripción de Código académico', 'Celular alumno'],
    ['t00000001', 'Ana', 'Laura', 'LAD', '2026', 'Administración', '8111111111'],
    ['T00000002', 'Luis', '', 'LAD', '2026', 'Administración', '8222222222'],
  ]), 'Alumnos');
  const base = readPrincipalBase(workbook, 'base.xlsx');
  assert.equal(base.audience, 'professional');
  assert.equal(base.students.T00000001.leader, 'Laura');
  assert.equal(base.students.T00000001.academicCodeDescription, 'Administración');
  assert.equal(base.students.T00000002.leader, '');
  assert.equal(base.students.T00000002.tutor, '');
  assert.equal(base.contacts.T00000001.studentPhone, '8111111111');
});

test('career groups distinguish shared class groups within the same subject', () => {
  const subject = group => ({ name: 'Contabilidad', group, grade: 90, finalGrade: null, activities: { A1: 90 }, professorName: 'Eva' });
  const students = [
    { id: 'T1', name: 'Ana', academicCodeDescription: 'Administración', subjects: [subject('101')] },
    { id: 'T2', name: 'Luis', academicCodeDescription: 'Administración', subjects: [subject('101')] },
    { id: 'T3', name: 'Sol', academicCodeDescription: 'Administración', subjects: [subject('202')] },
  ];
  assert.equal(aggregateAcademics(students).byCareer[0].studentCount, 3);
  assert.equal(subjectAveragesFor(students, 'careers', 'Administración')[0].average, 90);
  assert.deepEqual(careerClassmates(students, 'Administración', 'Contabilidad').map(row => [row.group, row.names.length]), [['101', 2], ['202', 1]]);
});

test('monitoring date is optional when the filename has no convention', () => {
  assert.equal(monitoringInfo('monitoreo_profesional.xlsx'), null);
  assert.equal(monitoringInfo('MdeA al 23.09.2630.xlsx').dateKey, '2026-09-23');
});
