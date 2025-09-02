

import * as XLSX from 'xlsx';
import type { StudentData, Subject, Student } from '@/types/student';

// Columnas definidas según la propuesta de arquitectura
const COLUMNS = {
  ID: 'Matricula',
  NAME: 'Nombre del alumno',
  LEADER: 'Líder',
  TUTOR: 'Tutor',
  IS_GRADUATION_CANDIDATE: 'CAG',
  SUBJECT_ID: 'CRN',
  SUBJECT_NAME: 'Nombre de la materia',
  SUBJECT_GROUP: 'Grupo',
  SUBJECT_STATUS_DESCRIPTION: 'Descripción del estatus',
  PROFESSOR_ID: 'Nomina',
  PROFESSOR_NAME: 'Nombre del profesor de la materia',
  ABSENCE_LIMIT: 'Límite de faltas',
  ABSENCES: 'Faltas del alumno',
  MISSED_ASSIGNMENT_LIMIT: 'Límite de NE',
  MISSED_ASSIGNMENTS: 'NE alumno',
  GRADE: 'Ponderado',
  FINAL_GRADE: 'Calificación final actual',
  FINAL_GRADE_REASON: 'Motivo cf',
};

// Función para encontrar la columna que contiene un texto específico
const findColumn = (row: any[], text: string): number => {
  if (!row) return -1;
  return row.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().includes(text.toLowerCase()));
};

// Función para limpiar y obtener un valor de una fila
const getValue = (row: any[], index: number, offset: number = 1): string => {
  return row?.[index + offset] ? String(row[index + offset]).trim() : '';
};

export async function parseExcel(file: File): Promise<StudentData | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve(null);
          return;
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 5) {
          console.warn("El archivo Excel no tiene suficientes filas para ser procesado. Debe contener datos del alumno y al menos una materia.");
          resolve(null);
          return;
        }
        
        const studentData: StudentData = {};
        let currentStudent: Student | null = null;
        let subjectHeaders: string[] | null = null;
        const activityRegex = /^A\d+$/;

        // 1. Encontrar datos del alumno primero
        for (const row of rows) {
          if (!Array.isArray(row)) continue;
          const studentIdCol = findColumn(row, COLUMNS.ID);
          if (studentIdCol !== -1) {
            const studentId = getValue(row, studentIdCol);
            if(studentId) {
                const studentNameCol = findColumn(row, COLUMNS.NAME);
                const tutorCol = findColumn(row, COLUMNS.TUTOR);
                const leaderCol = findColumn(row, COLUMNS.LEADER);

                currentStudent = {
                    id: studentId,
                    name: studentNameCol !== -1 ? getValue(row, studentNameCol) : 'N/A',
                    tutor: tutorCol !== -1 ? getValue(row, tutorCol) : 'N/A',
                    leader: leaderCol !== -1 ? getValue(row, leaderCol) : 'N/A',
                    isGraduationCandidate: false, 
                    subjects: [],
                };
                studentData[studentId] = currentStudent;
                break;
            }
          }
        }
        
        if (!currentStudent) {
            console.error("Error de formato: No se pudo encontrar la 'Matricula' del alumno en el archivo Excel.");
            resolve(null);
            return;
        }

        // 2. Encontrar los encabezados de las materias
        let headerRowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row)) continue;
            const subjectIdCol = findColumn(row, COLUMNS.SUBJECT_ID);
            const subjectNameCol = findColumn(row, COLUMNS.SUBJECT_NAME);
            if (subjectIdCol !== -1 && subjectNameCol !== -1) {
                subjectHeaders = row.map(header => String(header || '').trim());
                headerRowIndex = i;
                break;
            }
        }
        
        if (!subjectHeaders || headerRowIndex === -1) {
            console.error("Error de formato: No se pudieron encontrar los encabezados de las materias (columnas 'CRN' y 'Nombre de la materia').");
            resolve(null);
            return;
        }

        const headerMap: Record<string, number> = {};
        subjectHeaders.forEach((header, index) => {
            headerMap[header] = index;
        });
        
        // 3. Leer las filas de las materias, comenzando desde la fila siguiente al encabezado
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!Array.isArray(row) || row.length === 0) continue;

            const subjectId = String(row[headerMap[COLUMNS.SUBJECT_ID]] || '').trim();
            if (!subjectId) continue; // Si no hay CRN, se ignora la fila.
            
            const activities: Record<string, number | string> = {};
            for (const header in headerMap) {
                if (activityRegex.test(header)) {
                    activities[header] = row[headerMap[header]];
                }
            }

            const subject: Subject = {
                id: subjectId,
                name: String(row[headerMap[COLUMNS.SUBJECT_NAME]] || 'N/A'),
                group: String(row[headerMap[COLUMNS.SUBJECT_GROUP]] || 'N/A'),
                professorName: String(row[headerMap[COLUMNS.PROFESSOR_NAME]] || 'N/A'),
                statusDescription: String(row[headerMap[COLUMNS.SUBJECT_STATUS_DESCRIPTION]] || 'N/A'),
                absences: parseInt(String(row[headerMap[COLUMNS.ABSENCES]]), 10) || 0,
                absenceLimit: parseInt(String(row[headerMap[COLUMNS.ABSENCE_LIMIT]]), 10) || 1,
                missedAssignments: parseInt(String(row[headerMap[COLUMNS.MISSED_ASSIGNMENTS]]), 10) || 0,
                missedAssignmentLimit: parseInt(String(row[headerMap[COLUMNS.MISSED_ASSIGNMENT_LIMIT]]), 10) || 1,
                grade: parseFloat(String(row[headerMap[COLUMNS.GRADE]])) || 0,
                finalGrade: parseFloat(String(row[headerMap[COLUMNS.FINAL_GRADE]])) || null,
                finalGradeReason: String(row[headerMap[COLUMNS.FINAL_GRADE_REASON]] || '').trim() || null,
                activities: activities,
            };
            currentStudent.subjects?.push(subject);
        }
        
        resolve(studentData);
      } catch (error) {
        console.error("Error al procesar el archivo Excel:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("Error al leer el archivo:", error);
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}
