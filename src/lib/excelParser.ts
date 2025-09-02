import * as XLSX from 'xlsx';
import type { StudentData, Subject, Student } from '@/types/student';

// Columnas validadas según la lista proporcionada por el usuario.
const COLUMNS = {
  STUDENT_ID: 'Matrícula',
  STUDENT_NAME: 'Nombre del alumno',
  LEADER: 'Líder',
  TUTOR: 'Tutor',
  IS_GRADUATION_CANDIDATE: 'CAG',
  SUBJECT_KEY: 'Clave de materia',
  SUBJECT_CRN: 'CRN',
  SUBJECT_NAME: 'Nombre de la materia',
  SUBJECT_GROUP: '# Grupo',
  SUBJECT_STATUS_DESCRIPTION: 'Descripción estatus',
  PROFESSOR_ID: 'Nómina',
  PROFESSOR_NAME: 'Nombre del profesor',
  ABSENCE_LIMIT: 'Límite de faltas',
  ABSENCES: 'Faltas del alumno',
  MISSED_ASSIGNMENT_LIMIT: 'Límite de NE',
  MISSED_ASSIGNMENTS: 'NE alumno',
  GRADE: 'Ponderado',
  FINAL_GRADE: 'Calificación final actual',
  FINAL_GRADE_REASON: 'Motivo cf',
};

const ACTIVITY_REGEX = /^A\d+$/;

export async function parseExcel(file: File): Promise<StudentData | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        if (!data) {
          console.error("No se pudo leer el archivo.");
          resolve(null);
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir la hoja a JSON, donde cada objeto es una fila.
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Obtiene un array de arrays
            defval: '', // Celda vacía será un string vacío
        });

        if (jsonData.length < 2) {
            console.error("El archivo Excel no tiene suficientes filas (encabezado + datos).");
            resolve(null);
            return;
        }
        
        const headers: string[] = jsonData[0].map((h: any) => String(h).trim());
        const headerMap: Record<string, number> = {};
        headers.forEach((header, index) => {
            headerMap[header] = index;
        });

        const requiredCols = [COLUMNS.STUDENT_ID, COLUMNS.STUDENT_NAME, COLUMNS.SUBJECT_CRN, COLUMNS.SUBJECT_NAME];
        for (const col of requiredCols) {
            if (headerMap[col] === undefined) {
                console.error(`Error de formato: Falta la columna requerida '${col}'.`);
                // Notificar al usuario a través del toast es mejor, pero aquí lo dejamos en consola.
                resolve(null);
                return;
            }
        }
        
        const studentData: StudentData = {};
        const dataRows = jsonData.slice(1);

        for (const row of dataRows) {
            if (!row || row.length === 0 || !row[headerMap[COLUMNS.STUDENT_ID]]) {
                continue; // Ignorar filas vacías o sin matrícula
            }

            const studentId = String(row[headerMap[COLUMNS.STUDENT_ID]]).trim();

            // Crear el alumno si no existe
            if (!studentData[studentId]) {
                studentData[studentId] = {
                    id: studentId,
                    name: String(row[headerMap[COLUMNS.STUDENT_NAME]] || 'N/A').trim(),
                    leader: String(row[headerMap[COLUMNS.LEADER]] || 'N/A').trim(),
                    tutor: String(row[headerMap[COLUMNS.TUTOR]] || 'N/A').trim(),
                    isGraduationCandidate: String(row[headerMap[COLUMNS.IS_GRADUATION_CANDIDATE]] || 'No').trim().toLowerCase() === 'si',
                    subjects: [],
                };
            }

            const activities: Record<string, number | string> = {};
            for (const header in headerMap) {
                if (ACTIVITY_REGEX.test(header)) {
                    activities[header] = row[headerMap[header]];
                }
            }

            const subject: Subject = {
                id: String(row[headerMap[COLUMNS.SUBJECT_CRN]] || 'N/A').trim(),
                key: String(row[headerMap[COLUMNS.SUBJECT_KEY]] || 'N/A').trim(),
                name: String(row[headerMap[COLUMNS.SUBJECT_NAME]] || 'N/A').trim(),
                group: String(row[headerMap[COLUMNS.SUBJECT_GROUP]] || 'N/A').trim(),
                professorName: String(row[headerMap[COLUMNS.PROFESSOR_NAME]] || 'N/A').trim(),
                statusDescription: String(row[headerMap[COLUMNS.SUBJECT_STATUS_DESCRIPTION]] || 'N/A').trim(),
                absences: parseInt(String(row[headerMap[COLUMNS.ABSENCES]] || '0'), 10),
                absenceLimit: parseInt(String(row[headerMap[COLUMNS.ABSENCE_LIMIT]] || '1'), 10) || 1,
                missedAssignments: parseInt(String(row[headerMap[COLUMNS.MISSED_ASSIGNMENTS]] || '0'), 10),
                missedAssignmentLimit: parseInt(String(row[headerMap[COLUMNS.MISSED_ASSIGNMENT_LIMIT]] || '1'), 10) || 1,
                grade: parseFloat(String(row[headerMap[COLUMNS.GRADE]] || '0')),
                finalGrade: parseFloat(String(row[headerMap[COLUMNS.FINAL_GRADE]])) || null,
                finalGradeReason: String(row[headerMap[COLUMNS.FINAL_GRADE_REASON]] || '').trim() || null,
                activities,
            };
            
            studentData[studentId].subjects?.push(subject);
        }
        
        if (Object.keys(studentData).length === 0) {
            console.warn("No se encontraron datos de alumnos válidos en el archivo.");
            resolve(null);
            return;
        }

        resolve(studentData);

      } catch (error) {
        console.error("Error crítico al procesar el archivo Excel:", error);
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
