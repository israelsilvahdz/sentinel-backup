

import * as XLSX from 'xlsx';
import type { OfertaAcademicaItem, Student, StudentContact, ProfessorContact, Team } from '@/types/student';
import { bulkAddOrUpdateContacts, bulkAddOrUpdateProfessorContacts, bulkAddOrUpdateTeams } from './firebase-services';
import type { StudentData, Subject } from '@/types/student';

// --- NUEVA INTERFAZ PARA OFERTA ACADÉMICA ---

function normalizeHeader(header: string): string {
    return header
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function findColumnIndex(headerMap: Record<string, number>, headers: string[], possibleNames: string[]): number | undefined {
    for (const name of possibleNames) {
        const normalized = normalizeHeader(name);
        // Prioritize exact match
        if (headerMap[normalized] !== undefined) {
            return headerMap[normalized];
        }
    }
    // Fallback to partial match
    for (const name of possibleNames) {
        const normalized = normalizeHeader(name);
        const partialIndex = headers.findIndex(h => h.includes(normalized));
        if (partialIndex !== -1) {
            return partialIndex;
        }
    }
    return undefined;
}


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

function normalizeSubjectName(name: string): string {
    if (!name) return '';
    const cleanedName = name.toLowerCase().replace(/"/g, '').trim();

    if (SUBJECT_NAME_NORMALIZATION_MAP[cleanedName]) {
        return SUBJECT_NAME_NORMALIZATION_MAP[cleanedName];
    }
    
    // Fallback for "Habilidades" with slight variations
    if (cleanedName.startsWith('habilidades y valores v')) {
        return 'Habilidades y valores V: lenguaje';
    }
    if (cleanedName.startsWith('habilidades y valores vi')) {
        return 'Habilidades y valores VI: toma de decisiones';
    }
     if (cleanedName.startsWith('habilidades y valores ii')) {
        return 'Habilidades y valores II: pensamiento crítico';
    }

    if (cleanedName.startsWith('antropología')) {
        return 'Antropología';
    }

    return name;
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
        
        const getColumnIdx = (names: string[]) => findColumnIndex(headerMap, headers, names);

        const requiredCols = {
            studentId: getColumnIdx([COLUMNS.STUDENT_ID]),
            studentName: getColumnIdx([COLUMNS.STUDENT_NAME]),
            subjectCrn: getColumnIdx([COLUMNS.SUBJECT_CRN]),
            subjectName: getColumnIdx([COLUMNS.SUBJECT_NAME]),
        };

        if (Object.values(requiredCols).some(val => val === undefined)) {
            const missing = Object.entries(requiredCols).filter(([,val]) => val === undefined).map(([key]) => key).join(', ');
            console.error(`Error de formato: Faltan columnas requeridas: ${missing}.`);
            resolve(null);
            return;
        }
        
        const studentData: StudentData = {};
        const dataRows = jsonData.slice(1);

        for (const row of dataRows) {
            const getColumnValue = (names: string[]) => {
                const index = getColumnIdx(names);
                return index !== undefined ? String(row[index] || '').trim() : '';
            }
            
            if (!row || row.length === 0 || !getColumnValue([COLUMNS.STUDENT_ID])) {
                continue; 
            }
            
            const rawSubjectName = getColumnValue([COLUMNS.SUBJECT_NAME]);
            const normalizedSubjectName = normalizeSubjectName(rawSubjectName);

            if (normalizedSubjectName === 'IGNORE') {
                continue; // Saltar materias extracurriculares
            }

            const studentId = getColumnValue([COLUMNS.STUDENT_ID]);
            const studentName = getColumnValue([COLUMNS.STUDENT_NAME]);

            if (!studentData[studentId]) {
                studentData[studentId] = {
                    id: studentId,
                    name: studentName,
                    leader: getColumnValue([COLUMNS.LEADER]),
                    tutor: getColumnValue([COLUMNS.TUTOR]),
                    isGraduationCandidate: getColumnValue([COLUMNS.IS_GRADUATION_CANDIDATE]).toLowerCase() === 'si',
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
            const daySynonyms: Record<string, string[]> = {
                'LUN': ['LUN', 'LUNES'],
                'MAR': ['MAR', 'MARTES'],
                'MIE': ['MIE', 'MIERCOLES', 'MIÉRCOLES', 'MIER'],
                'JUE': ['JUE', 'JUEVES'],
                'VIE': ['VIE', 'VIERNES', 'VIER'],
            };

            for (const [dayKey, synonyms] of Object.entries(daySynonyms)) {
                const colIndex = getColumnIdx(synonyms);
                if (colIndex !== undefined && String(row[colIndex]).trim().toUpperCase() === 'SI') {
                    scheduleDays.push(dayKey);
                }
            }


            const subject: Subject = {
                id: getColumnValue([COLUMNS.SUBJECT_CRN]),
                key: getColumnValue([COLUMNS.SUBJECT_KEY]),
                name: normalizedSubjectName, // Usar el nombre normalizado
                group: getColumnValue([COLUMNS.SUBJECT_GROUP]),
                professorName: getColumnValue([COLUMNS.PROFESSOR_NAME]),
                statusDescription: getColumnValue([COLUMNS.SUBJECT_STATUS_DESCRIPTION]),
                absences: parseInt(getColumnValue([COLUMNS.ABSENCES]) || '0', 10),
                absenceLimit: parseInt(getColumnValue([COLUMNS.ABSENCE_LIMIT]) || '1', 10) || 1,
                missedAssignments: parseInt(getColumnValue([COLUMNS.MISSED_ASSIGNMENTS]) || '0', 10),
                missedAssignmentLimit: parseInt(getColumnValue([COLUMNS.MISSED_ASSIGNMENT_LIMIT]) || '1', 10) || 1,
                grade: parseFloat(getColumnValue([COLUMNS.GRADE]) || '0'),
                finalGrade: parseFloat(getColumnValue([COLUMNS.FINAL_GRADE])) || null,
                finalGradeReason: getColumnValue([COLUMNS.FINAL_GRADE_REASON]) || null,
                activities,
                schedule: {
                  days: scheduleDays,
                  startTime: getColumnValue([COLUMNS.START_TIME]),
                  endTime: getColumnValue([COLUMNS.END_TIME])
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


const DIRECTORY_COLUMNS_SYNONYMS = {
  STUDENT_ID: ['Matrícula', 'Número de matrícula', 'ID'],
  STUDENT_NAME: ['Nombre', 'Nombre Completo', 'Contacto: Nombre completo'],
  STUDENT_PHONE: ['Tel alumno', 'Teléfono Alumno'],
  STUDENT_EMAIL: ['Correo alumno', 'Correo Alumno'],
  DAD_NAME: ['Papá', 'Nombre Papá'],
  DAD_PHONE: ['Tel Papá', 'Teléfono Papá'],
  DAD_EMAIL: ['Correo Papá'],
  MOM_NAME: ['Mamá', 'Nombre Mamá'],
  MOM_PHONE: ['Tel Mamá', 'Teléfono Mamá'],
  MOM_EMAIL: ['Correo Mamá'],
  SEDENA: ['SEDENA'],
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
                
                const getColumnIdx = (possibleNames: string[]) => findColumnIndex(headerMap, headers, possibleNames);
                
                const studentIdIndex = getColumnIdx(DIRECTORY_COLUMNS_SYNONYMS.STUDENT_ID);
                const nameIndex = getColumnIdx(DIRECTORY_COLUMNS_SYNONYMS.STUDENT_NAME);

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
                    
                    const getValue = (names: string[]) => {
                       const index = getColumnIdx(names);
                       return index !== undefined ? String(row[index] || '').trim() : '';
                    }

                    contacts[studentId] = {
                        studentId: studentId,
                        name: String(row[nameIndex]).trim(),
                        studentPhone: getValue(DIRECTORY_COLUMNS_SYNONYMS.STUDENT_PHONE),
                        studentEmail: getValue(DIRECTORY_COLUMNS_SYNONYMS.STUDENT_EMAIL),
                        dadName: getValue(DIRECTORY_COLUMNS_SYNONYMS.DAD_NAME),
                        dadPhone: getValue(DIRECTORY_COLUMNS_SYNONYMS.DAD_PHONE),
                        dadEmail: getValue(DIRECTORY_COLUMNS_SYNONYMS.DAD_EMAIL),
                        momName: getValue(DIRECTORY_COLUMNS_SYNONYMS.MOM_NAME),
                        momPhone: getValue(DIRECTORY_COLUMNS_SYNONYMS.MOM_PHONE),
                        momEmail: getValue(DIRECTORY_COLUMNS_SYNONYMS.MOM_EMAIL),
                        sedena: getValue(DIRECTORY_COLUMNS_SYNONYMS.SEDENA),
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
  NAME: ['Nombre del profesor', 'Nombre'],
  EMAIL: ['Correo', 'Email'],
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
                
                const getColumnIdx = (names: string[]) => findColumnIndex(headerMap, headers, names);

                const nameIndex = getColumnIdx(PROFESSOR_DIRECTORY_COLUMNS.NAME);
                const emailIndex = getColumnIdx(PROFESSOR_DIRECTORY_COLUMNS.EMAIL);

                if (nameIndex === -1 || emailIndex === -1) {
                    throw new Error(`Faltan columnas requeridas: '${PROFESSOR_DIRECTORY_COLUMNS.NAME.join(' o ')}' y '${PROFESSOR_DIRECTORY_COLUMNS.EMAIL.join(' o ')}'`);
                }

                const contacts: Record<string, ProfessorContact> = {};
                const dataRows = jsonData.slice(1);

                for (const row of dataRows) {
                    const name = String(row[nameIndex!]).trim();
                    const email = String(row[emailIndex!]).trim();
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

const ATHLETES_COLUMNS = {
  NAME: ['Nombre Completo', 'Nombre'],
  SPORT: ['Deporte'],
};

export async function parseAthletesExcel(file: File, allStudentsMap: Map<string, Student>): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e: ProgressEvent<FileReader>) => {
            try {
                const data = e.target?.result;
                if (!data) return resolve();

                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (jsonData.length < 2) return resolve();

                const headers: string[] = jsonData[0].map((h: any) => normalizeHeader(String(h)));
                const headerMap: Record<string, number> = {};
                headers.forEach((header, index) => {
                    headerMap[header] = index;
                });
                
                const getColumnIdx = (names: string[]) => findColumnIndex(headerMap, headers, names);
                
                const nameIndex = getColumnIdx(ATHLETES_COLUMNS.NAME);
                const sportIndex = getColumnIdx(ATHLETES_COLUMNS.SPORT);

                if (nameIndex === -1 || sportIndex === -1) {
                    throw new Error(`Faltan columnas requeridas: '${ATHLETES_COLUMNS.NAME.join(' o ')}' y '${ATHLETES_COLUMNS.SPORT.join(' o ')}'`);
                }
                
                const studentNameToIdMap = new Map<string, string>();
                allStudentsMap.forEach(student => {
                    studentNameToIdMap.set(student.name.toUpperCase(), student.id);
                });

                const teamsToUpdate: Record<string, Team> = {};
                const dataRows = jsonData.slice(1);

                for (const row of dataRows) {
                    const name = String(row[nameIndex!]).trim();
                    const sport = String(row[sportIndex!]).trim();
                    const studentId = studentNameToIdMap.get(name.toUpperCase());

                    if (name && sport && studentId) {
                         if (!teamsToUpdate[sport]) {
                            teamsToUpdate[sport] = {
                                id: sport, 
                                name: sport,
                                type: 'deportivo',
                                members: []
                            };
                        }
                        teamsToUpdate[sport].members.push({ id: studentId, name });
                    }
                }
                
                if (Object.keys(teamsToUpdate).length > 0) {
                    await bulkAddOrUpdateTeams(Object.values(teamsToUpdate));
                }

                resolve();

            } catch (error) {
                console.error("Error al procesar el archivo de atletas:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}


// --- PARSER PARA OFERTA ACADÉMICA ---

const OFERTA_COLUMNS = {
    CRN: ['CRN'],
    SUBJECT_KEY: ['CLAVE MATERIA', 'Clave'],
    SUBJECT_NAME: ['NOMBRE LARGO MATERIA', 'Materia'],
    PROFESSOR: ['NOMBRE PROFESOR', 'Profesor'],
    GROUP: ['Número grupo', 'Grupo'],
    CAPACITY: ['CAPACIDAD GRUPO', 'Capacidad'],
    ENROLLED: ['NUMERO ALUMNOS INSCRITOS', 'Inscritos'],
    START_TIME: ['HORA INICIO CLASE', 'Inicio'],
    END_TIME: ['HORA FIN CLASE', 'Fin'],
    BUILDING: ['EDIFICIO', 'Edif'],
    ROOM: ['SALON', 'Salon']
};

export async function parseOfertaAcademicaExcel(file: File): Promise<OfertaAcademicaItem[] | null> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const data = e.target?.result;
                if (!data) return resolve(null);

                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (jsonData.length < 2) return resolve(null);

                const headers: string[] = jsonData[0].map((h: any) => normalizeHeader(String(h || '')));
                const headerMap: Record<string, number> = {};
                headers.forEach((header, index) => {
                    if (!headerMap[header]) {
                      headerMap[header] = index;
                    }
                });

                const getColumnIdx = (names: string[]) => findColumnIndex(headerMap, headers, names);

                const oferta: OfertaAcademicaItem[] = [];
                const dataRows = jsonData.slice(1);

                for (const row of dataRows) {
                     const getColumnValue = (names: string[]) => {
                        const index = getColumnIdx(names);
                        return index !== undefined ? String(row[index] || '').trim() : '';
                    }

                    if (!row || row.length === 0 || !getColumnValue(OFERTA_COLUMNS.CRN)) continue;

                    const days: string[] = [];
                    if (getColumnValue(['Lunes', 'LUN']) === 'SI') days.push('LUN');
                    if (getColumnValue(['Martes', 'MAR']) === 'SI') days.push('MAR');
                    if (getColumnValue(['Miércoles', 'MIE', 'MIÉRCOLES', 'MIER']) === 'SI') days.push('MIE');
                    if (getColumnValue(['Jueves', 'JUE']) === 'SI') days.push('JUE');
                    if (getColumnValue(['Viernes', 'VIE', 'VIER']) === 'SI') days.push('VIE');

                    const item: OfertaAcademicaItem = {
                        crn: getColumnValue(OFERTA_COLUMNS.CRN),
                        subjectKey: getColumnValue(OFERTA_COLUMNS.SUBJECT_KEY),
                        subjectName: normalizeSubjectName(getColumnValue(OFERTA_COLUMNS.SUBJECT_NAME)),
                        group: getColumnValue(OFERTA_COLUMNS.GROUP),
                        capacity: parseInt(getColumnValue(OFERTA_COLUMNS.CAPACITY) || '0', 10),
                        enrolled: parseInt(getColumnValue(OFERTA_COLUMNS.ENROLLED) || '0', 10),
                        professor: getColumnValue(OFERTA_COLUMNS.PROFESSOR),
                        days,
                        startTime: getColumnValue(OFERTA_COLUMNS.START_TIME),
                        endTime: getColumnValue(OFERTA_COLUMNS.END_TIME),
                        building: getColumnValue(OFERTA_COLUMNS.BUILDING),
                        room: getColumnValue(OFERTA_COLUMNS.ROOM),
                    };
                    oferta.push(item);
                }
                resolve(oferta);

            } catch (error) {
                console.error("Error al procesar archivo de oferta académica:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}
    
