const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const XLSX = require('xlsx');

const source = fs.readFileSync(require.resolve('../src/lib/kardex-progress.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleUnderTest = { exports: {} };
new Function('require', 'exports', 'module', compiled)(require, moduleUnderTest.exports, moduleUnderTest);
const { readKardexWorkbook, kardexSummary, kardexSemester, expectedPlanCourses } = moduleUnderTest.exports;

test('documented plans produce eight semester columns', () => {
  assert.equal(kardexSemester('IMT_S18', 21), 4);
  assert.equal(kardexSemester('IIN_S18', 21), 4);
  assert.equal(kardexSemester('LEM_S18', 21), 3);
  assert.equal(kardexSemester('LAE_S18', 35), 6);
  assert.equal(kardexSemester('LAE_S18', 40), 6);
  assert.equal(kardexSemester('LAE_S18', 41), 7);
  assert.equal(kardexSemester('LAE_S18', 50), 8);
  assert.equal(kardexSemester('LCI_S18', 49), 8);
  assert.equal(kardexSemester('OTHER', 21), null);
  assert.equal(expectedPlanCourses('LAE_S18'), 50);
  assert.equal(expectedPlanCourses('OTHER'), null);
});

test('kardex consolidates a graded row and its duplicate pending row', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Matrícula', 'Nombre', 'Plan de Estudios', 'Periodo', 'Órden', 'Clave Materia Oficial', 'Nombre Materia', 'Calificación', 'Nombre Optativa'],
    ['T1', 'Ana', 'LAE_S18', '2025 Ene - May', '01', 'L001', 'Matemáticas', '90', ''],
    ['T1', 'Ana', 'LAE_S18', '', '01', 'L001', 'Matemáticas', '', ''],
    ['T1', 'Ana', 'LAE_S18', '2026 Ago - Dic', '02', 'L002', 'Taller', 'CU', ''],
    ['T1', 'Ana', 'LAE_S18', '', '03', 'L003', 'Optativa', '', 'Física'],
  ]), 'Kardex');
  const [student] = readKardexWorkbook(workbook);
  assert.equal(student.courses.length, 3);
  assert.equal(student.courses[0].attempts, 2);
  assert.equal(student.courses[0].status, 'accredited');
  assert.equal(student.courses[1].status, 'inProgress');
  assert.equal(student.courses[2].optative, 'Física');
  assert.deepEqual(kardexSummary(student), { total: 3, accredited: 1, inProgress: 1, notAccredited: 0, pending: 1, review: 0, progress: 33 });
});

test('kardex rejects an unrelated workbook', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Alumno', 'Materia'], ['A', 'B']]), 'Otra');
  assert.throws(() => readKardexWorkbook(workbook), /columnas del Kárdex/);
});

test('kardex keeps two plans for one student separate', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Matrícula', 'Nombre', 'Plan de Estudios', 'Clave Materia Oficial', 'Nombre Materia', 'Calificación'],
    ['T1', 'Ana', 'PLAN_A', 'L001', 'Materia', '92'],
    ['T1', 'Ana', 'PLAN_B', 'L001', 'Materia', ''],
  ]), 'Kardex');
  const students = readKardexWorkbook(workbook);
  assert.equal(students.length, 2);
  assert.deepEqual(students.map(kardexSummary).map(value => value.progress).sort(), [0, 100]);
});
