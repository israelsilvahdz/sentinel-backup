

import * as XLSX from 'xlsx';
import type { StudentData, Subject, Student, StudentContact, ProfessorContact } from '@/types/student';
import { bulkAddOrUpdateContacts, bulkAddOrUpdateProfessorContacts } from './firebase-services';

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
  START_TIME: 'INICIO',
  END_TIME: 'FIN',
};

// Se usan los encabezados exactos proporcionados por el usuario.
const POSSIBLE_DAY_HEADERS = ['LUN', 'MAR', 'MIER', 'JUE', 'VIER'];

const ACTIVITY_REGEX = /^A\d+$/;

// --- Data Normalization ---
const SUBJECT_NAME_NORMALIZATION_MAP: Record<string, string> = {
    'matemáticas iii: periodicidad y repetición': 'Matemáticas III: regularidad y repetición',
    'math iii: regularity and repetition': 'Matemáticas III: regularidad y repetición',
    'matematicas i': 'Matemáticas I: lenguaje de la ciencia',
    'math i': 'Matemáticas I: lenguaje de la ciencia',
    'matemáticas i: lenguaje de la ciencia': 'Matemáticas I: lenguaje de la ciencia', // Ensure exact match
    'math ii: pensamiento matemático': 'Matemáticas II: pensamiento matemático',
    'math ii: mathematical thinking': 'Matemáticas II: pensamiento matemático',
    'lengua adicional al español i': 'Optativa de lengua adicional al español I',
    'inglés i': 'Optativa de lengua adicional al español I',
    'francés i': 'Optativa de lengua adicional al español I',
    'alemán i': 'Optativa de lengua adicional al español I',
    'lengua adicional al español ii': 'Optativa de lengua adicional al español II',
    'inglés ii': 'Optativa de lengua adicional al español II',
    'francés ii': 'Optativa de lengua adicional al español II',
    'alemán ii': 'Optativa de lengua adicional al español II',
    'lengua adicional al español iii': 'Optativa de lengua adicional al español III',
    'inglés iii': 'Optativa de lengua adicional al español III',
    'alemán iii': 'Optativa de lengua adicional al español III',
    'francés iii': 'Optativa de lengua adicional al español III',
    'lengua adicional al español iv': 'Optativa de lengua adicional al español IV',
    'inglés iv': 'Optativa de lengua adicional al español IV',
    'alemán iv': 'Optativa de lengua adicional al español IV',
    'francés iv': 'Optativa de lengua adicional al español IV',
    'lengua adicional al español v': 'Optativa de lengua adicional al español V',
    'inglés v': 'Optativa de lengua adicional al español V',
    'alemán v': 'Optativa de lengua adicional al español V',
    'francés v': 'Optativa de lengua adicional al español V',
    'tecnologías de información i': 'Tecnologías de la Información I',
    'information technologies i': 'Tecnologías de la Información I',
    'information technologies': 'Tecnologías de la Información I',
    'tecnologías de información ii': 'Tecnologías de la Información II',
    'information technologies ii': 'Tecnologías de la Información II',
    'habilidades y valores v: lenguaje, emoción y cuerpo': 'Habilidades y valores V: lenguaje',
    'habilidades y valores ii: ser crítico': 'Habilidades y valores II: pensamiento crítico',
    'habilidades v: integración y toma de decisiones': 'Habilidades y valores V: lenguaje',
    'habilidades vi: lenguaje, emoción y cuerpo': 'Habilidades y valores VI: toma de decisiones',
    'lectura y redacción': 'Lectura y Redacción',
    'ciencias de la vida': 'Ciencias de la Vida',
    'life science': 'Ciencias de la Vida',
    'art and culture': 'Arte y cultura',
    'el carbono y sus compuestos': 'El carbono y sus componentes',
    'scientific thought': 'Pensamiento científico',
    'mass and energy i': 'Materia y energía I',
    'mass and energy ii': 'Materia y energía II',
    'ecology and geography': 'Ecología y Geografía',
    'human body care': 'Cuidado del cuerpo humano',
    'contemporary world': 'El mundo contemporáneo',
    'great universal writers': 'Los grandes escritores universales',
    'human being in society': 'El ser humano en sociedad',
    'urban dance': 'IGNORE',
    'soccer': 'IGNORE',
    'tochito': 'IGNORE'
};

function normalizeHeader(header: string): string {
    return header
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}


function normalizeSubjectName(name: string): string {
    if (!name) return '';
    let cleanedName = name.toLowerCase().replace(/"/g, '').trim();
    
    if (cleanedName.startsWith('habilidades y valores')) {
        const parts = cleanedName.split(':');
        const mainPart = parts[0].trim();
        // Specific normalizations for Habilidades
        if (mainPart === 'habilidades y valores ii') return 'Habilidades y valores II: pensamiento crítico';
        if (mainPart === 'habilidades y valores v') return 'Habilidades y valores V: lenguaje';
        if (mainPart === 'habilidades y valores vi') return 'Habilidades y valores VI: toma de decisiones';
    }
    
    if (cleanedName.startsWith('antropología')) {
        return 'Antropología';
    }

    return SUBJECT_NAME_NORMALIZATION_MAP[cleanedName] || name;
}


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
        
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, 
            defval: '', 
        });

        if (jsonData.length < 2) {
            console.error("El archivo Excel no tiene suficientes filas (encabezado + datos).");
            resolve(null);
            return;
        }
        
        const headers: string[] = jsonData[0].map((h: any) => normalizeHeader(String(h)));
        const headerMap: Record<string, number> = {};
        headers.forEach((header, index) => {
            headerMap[header] = index;
        });
        
        const dayHeadersInFile = headers.filter(h => POSSIBLE_DAY_HEADERS.includes(h));

        const requiredCols = [COLUMNS.STUDENT_ID, COLUMNS.STUDENT_NAME, COLUMNS.SUBJECT_CRN, COLUMNS.SUBJECT_NAME];
        for (const col of requiredCols) {
            const normalizedCol = normalizeHeader(col);
            const mappedKey = Object.keys(headerMap).find(key => key === normalizedCol);
            if (!mappedKey) {
                console.error(`Error de formato: Falta la columna requerida '${col}'.`);
                resolve(null);
                return;
            }
        }
        
        const studentData: StudentData = {};
        const dataRows = jsonData.slice(1);

        for (const row of dataRows) {
            const getColumnValue = (columnName: string) => {
                const upperColName = normalizeHeader(columnName);
                const index = headerMap[upperColName];
                return index !== undefined ? String(row[index] || '').trim() : '';
            }
            
            if (!row || row.length === 0 || !getColumnValue(COLUMNS.STUDENT_ID)) {
                continue; 
            }
            
            const rawSubjectName = getColumnValue(COLUMNS.SUBJECT_NAME);
            const normalizedSubjectName = normalizeSubjectName(rawSubjectName);

            if (normalizedSubjectName === 'IGNORE') {
                continue; // Saltar materias extracurriculares
            }

            const studentId = getColumnValue(COLUMNS.STUDENT_ID);

            if (!studentData[studentId]) {
                studentData[studentId] = {
                    id: studentId,
                    name: getColumnValue(COLUMNS.STUDENT_NAME),
                    leader: getColumnValue(COLUMNS.LEADER),
                    tutor: getColumnValue(COLUMNS.TUTOR),
                    isGraduationCandidate: getColumnValue(COLUMNS.IS_GRADUATION_CANDIDATE).toLowerCase() === 'si',
                    subjects: [],
                };
            }

            const activities: Record<string, number | string> = {};
            for (const header in headerMap) {
                if (ACTIVITY_REGEX.test(header)) {
                    activities[header] = row[headerMap[header]];
                }
            }

            const scheduleDays: string[] = [];
            for (const dayHeader of dayHeadersInFile) {
                const colIndex = headerMap[dayHeader];
                if (colIndex !== undefined && String(row[colIndex]).trim().toUpperCase() === 'SI') {
                    // Guarda el día tal como está en la lista `dayHeadersInFile` sin normalizar
                    scheduleDays.push(dayHeader);
                }
            }

            const subject: Subject = {
                id: getColumnValue(COLUMNS.SUBJECT_CRN),
                key: getColumnValue(COLUMNS.SUBJECT_KEY),
                name: normalizedSubjectName, // Usar el nombre normalizado
                group: getColumnValue(COLUMNS.SUBJECT_GROUP),
                professorName: getColumnValue(COLUMNS.PROFESSOR_NAME),
                statusDescription: getColumnValue(COLUMNS.SUBJECT_STATUS_DESCRIPTION),
                absences: parseInt(getColumnValue(COLUMNS.ABSENCES) || '0', 10),
                absenceLimit: parseInt(getColumnValue(COLUMNS.ABSENCE_LIMIT) || '1', 10) || 1,
                missedAssignments: parseInt(getColumnValue(COLUMNS.MISSED_ASSIGNMENTS) || '0', 10),
                missedAssignmentLimit: parseInt(getColumnValue(COLUMNS.MISSED_ASSIGNMENT_LIMIT) || '1', 10) || 1,
                grade: parseFloat(getColumnValue(COLUMNS.GRADE) || '0'),
                finalGrade: parseFloat(getColumnValue(COLUMNS.FINAL_GRADE)) || null,
                finalGradeReason: getColumnValue(COLUMNS.FINAL_GRADE_REASON) || null,
                activities,
                schedule: {
                  days: scheduleDays,
                  startTime: getColumnValue(COLUMNS.START_TIME),
                  endTime: getColumnValue(COLUMNS.END_TIME)
                }
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


const DIRECTORY_COLUMNS = {
  MATRICULA: 'Matrícula',
  NOMBRE: 'Nombre',
  REGULARES: 'regulares',
  PAPA: 'Papá',
  MAMA: 'Mamá',
  TEL_ALUMNO: 'Tel alumno',
  TEL_PAPA: 'Tel Papá',
  TEL_MAMA: 'Tel Mamá',
  CORREO_ALUMNO: 'Correo alumno',
  CORREO_PAPA: 'Correo Papá',
  CORREO_MAMA: 'Correo Mamá',
  CUMPLEANOS: 'Cumpleaños',
  MODALIDAD: 'Modalidad',
  IDIOMA: 'IDIOMA',
  CONTACTO: 'Contacto',
  SEDENA: 'SEDENA',
  BECA: 'BECA',
  CONFIRMACION_ASISTENCIA: 'Confirmacion asistencia taller',
};


export async function parseDirectoryExcel(file: File): Promise<Record<string, StudentContact> | null> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e: ProgressEvent<FileReader>) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    return resolve(null);
                }

                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (jsonData.length < 2) {
                    return resolve(null);
                }

                const headers: string[] = jsonData[0].map((h: any) => normalizeHeader(String(h)));
                const headerMap: Record<string, number> = {};
                headers.forEach((header, index) => {
                    headerMap[header] = index;
                });
                
                const getColumnIndex = (possibleNames: string[]): number | undefined => {
                    for(const name of possibleNames) {
                        const normalizedName = normalizeHeader(name);
                        const idx = headerMap[normalizedName];
                        if (idx !== undefined) return idx;
                    }
                    return undefined;
                }

                const studentIdIndex = getColumnIndex([DIRECTORY_COLUMNS.MATRICULA, 'Número de matrícula']);
                const nameIndex = getColumnIndex([DIRECTORY_COLUMNS.NOMBRE, 'Contacto: Nombre completo']);

                if (studentIdIndex === undefined || nameIndex === undefined) {
                    throw new Error(`Faltan columnas requeridas en el directorio: 'Matrícula' y 'Nombre'`);
                }

                const contacts: Record<string, StudentContact> = {};
                const dataRows = jsonData.slice(1);

                for (const row of dataRows) {
                    const studentId = String(row[studentIdIndex]).trim();
                    if (!studentId) {
                        continue;
                    }
                    
                    const getValue = (key: keyof typeof DIRECTORY_COLUMNS, oldKey?: string) => {
                       const index = getColumnIndex(oldKey ? [DIRECTORY_COLUMNS[key], oldKey] : [DIRECTORY_COLUMNS[key]]);
                       return index !== undefined ? String(row[index] || '').trim() : '';
                    }

                    contacts[studentId] = {
                        studentId: studentId,
                        name: String(row[nameIndex]).trim(),
                        studentPhone: getValue('TEL_ALUMNO'),
                        studentEmail: getValue('CORREO_ALUMNO'),
                        dadName: getValue('PAPA', 'Nombre Papá'),
                        dadPhone: getValue('TEL_PAPA', 'Teléfono Papá'),
                        dadEmail: getValue('CORREO_PAPA'),
                        momName: getValue('MAMA', 'Nombre Mamá'),
                        momPhone: getValue('TEL_MAMA', 'Teléfono Mamá'),
                        momEmail: getValue('CORREO_MAMA'),
                        sedena: getValue('SEDENA'),
                        // --- campos que no se guardan pero se parsean por retrocompatibilidad ---
                        group: '', 
                        mentoringId: ''
                    };
                }
                
                // Guardar en Firebase en lugar de devolver
                await bulkAddOrUpdateContacts(contacts);
                resolve(contacts);

            } catch (error) {
                console.error("Error al procesar el archivo de directorio:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}


const PROFESSOR_DIRECTORY_COLUMNS = {
  NAME: 'Nombre del profesor',
  EMAIL: 'Correo',
};

export async function parseProfessorDirectoryExcel(file: File): Promise<Record<string, ProfessorContact> | null> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e: ProgressEvent<FileReader>) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    return resolve(null);
                }

                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (jsonData.length < 2) {
                    return resolve(null);
                }

                const headers: string[] = jsonData[0].map((h: any) => normalizeHeader(String(h)));
                const headerMap: Record<string, number> = {};
                headers.forEach((header, index) => {
                    headerMap[header] = index;
                });

                const nameIndex = headers.indexOf(normalizeHeader(PROFESSOR_DIRECTORY_COLUMNS.NAME));
                const emailIndex = headers.indexOf(normalizeHeader(PROFESSOR_DIRECTORY_COLUMNS.EMAIL));

                if (nameIndex === -1 || emailIndex === -1) {
                    throw new Error(`Faltan columnas requeridas: '${PROFESSOR_DIRECTORY_COLUMNS.NAME}' y '${PROFESSOR_DIRECTORY_COLUMNS.EMAIL}'`);
                }

                const contacts: Record<string, ProfessorContact> = {};
                const dataRows = jsonData.slice(1);

                for (const row of dataRows) {
                    const name = String(row[nameIndex]).trim();
                    const email = String(row[emailIndex]).trim();
                    if (!name || !email) {
                        continue;
                    }

                    const id = name.toLowerCase().replace(/\s+/g, '');
                    contacts[id] = {
                        id,
                        name,
                        email,
                    };
                }
                
                await bulkAddOrUpdateProfessorContacts(contacts);
                resolve(contacts);

            } catch (error) {
                console.error("Error al procesar el directorio de profesores:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}
