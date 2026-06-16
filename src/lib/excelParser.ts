import * as XLSX from 'xlsx';
import type { OfertaAcademicaItem, Student, StudentContact, ProfessorContact, Team, CareerChoiceSurvey } from '@/types/student';
import { bulkAddOrUpdateContacts, bulkAddOrUpdateProfessorContacts, bulkAddOrUpdateTeams } from './firebase-services';
import type { StudentData, Subject } from '@/types/student';
import { generateKeyFromData } from './utils';

// --- Funciones de Normalización ---

function normalizeHeader(header: string): string {
    if (!header) return '';
    return header
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function findColumnIndex(headerMap: Record<string, number>, headers: string[], possibleNames: string[]): number | undefined {
    for (const name of possibleNames) {
        const normalized = normalizeHeader(name);
        if (headerMap[normalized] !== undefined) return headerMap[normalized];
        // Búsqueda parcial si no hay exacta
        const partialIndex = headers.findIndex(h => h.includes(normalized));
        if (partialIndex !== -1) return partialIndex;
    }
    return undefined;
}

function normalizeSubjectName(name: string): string {
    if (!name) return '';
    const cleanedName = name.toLowerCase().trim();
    // Prioridad absoluta a VI para evitar colisión con V
    if (cleanedName.includes('habilidades y valores vi') || cleanedName.includes('toma de decisiones')) return 'Habilidades y valores VI: toma de decisiones';
    if (cleanedName.includes('habilidades y valores v') || cleanedName.includes('lenguaje, emocion')) return 'Habilidades y valores V: lenguaje';
    if (cleanedName.includes('habilidades y valores ii') || cleanedName.includes('ser critico')) return 'Habilidades y valores II: pensamiento crítico';
    if (cleanedName.includes('contemporary world') || cleanedName.includes('mundo contemporaneo')) return 'El mundo contemporáneo';
    if (cleanedName.includes('life science') || cleanedName.includes('ciencias de la vida')) return 'Ciencias de la Vida';
    return name;
}

// --- CONFIGURACIÓN DE COLUMNAS ---

const COL_SYNONYMS = {
    STUDENT_ID: ['MATRICULA', 'ID', 'ALUMNO'],
    STUDENT_NAME: ['NOMBRE DEL ALUMNO', 'NOMBRE ALUMNO', 'NAME'],
    LEADER: ['LIDER'],
    TUTOR: ['TUTOR'],
    IS_GRAD: ['CAG'],
    CRN: ['CRN'],
    SUBJ_KEY: ['CLAVE MATERIA', 'CLAVE'],
    SUBJ_NAME: ['NOMBRE DE LA MATERIA', 'MATERIA', 'SUBJECT'],
    GROUP: ['# GRUPO', 'GRUPO', 'SECTION'],
    STATUS: ['DESCRIPCION ESTATUS', 'ESTATUS'],
    PROFESSOR: ['NOMBRE DEL PROFESOR', 'PROFESOR', 'INSTRUCTOR'],
    ABS_LIM: ['LIMITE DE FALTAS', 'LIMITE FALTAS'],
    ABS: ['FALTAS DEL ALUMNO', 'FALTAS'],
    NE_LIM: ['LIMITE DE NE', 'LIMITE NE'],
    NE: ['NE ALUMNO', 'NE'],
    GRADE: ['PONDERADO', 'CALIFICACION'],
    FINAL_GRADE: ['CALIFICACION FINAL ACTUAL', 'CALIFICACION FINAL', 'FINAL'],
    START_TIME: ['INICIO', 'HORA INICIO', 'START'],
    END_TIME: ['FIN', 'HORA FIN', 'END'],
    DAYS: {
        LUN: ['LUN', 'LUNES', 'L'],
        MAR: ['MAR', 'MARTES', 'M'],
        MIE: ['MIE', 'MIERCOLES', 'MIER', 'X'],
        JUE: ['JUE', 'JUEVES', 'J'],
        VIE: ['VIE', 'VIERNES', 'VIER', 'V']
    }
};

// --- PARSERS PRINCIPALES ---

export async function parseExcel(file: File): Promise<StudentData | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
            if (jsonData.length < 2) return resolve(null);

            const headers = jsonData[0].map((h: any) => normalizeHeader(String(h)));
            const headerMap: Record<string, number> = {};
            headers.forEach((h, i) => headerMap[h] = i);
            const getIdx = (names: string[]) => findColumnIndex(headerMap, headers, names);

            const studentData: StudentData = {};
            for (const row of jsonData.slice(1)) {
                const getVal = (names: string[]) => {
                    const idx = getIdx(names);
                    if (idx === undefined) return '';
                    const v = row[idx];
                    if (v === 0 || v === '0') return '0';
                    return v ? String(v).trim() : '';
                };

                const studentId = getVal(COL_SYNONYMS.STUDENT_ID);
                if (!studentId) continue;

                if (!studentData[studentId]) {
                    studentData[studentId] = {
                        id: studentId, name: getVal(COL_SYNONYMS.STUDENT_NAME),
                        leader: getVal(COL_SYNONYMS.LEADER), tutor: getVal(COL_SYNONYMS.TUTOR),
                        isGraduationCandidate: getVal(COL_SYNONYMS.IS_GRAD).toUpperCase() === 'SI',
                        subjects: []
                    };
                }

                // Detección de días para el horario
                const scheduleDays: string[] = [];
                Object.entries(COL_SYNONYMS.DAYS).forEach(([dayKey, synonyms]) => {
                    const idx = getIdx(synonyms);
                    if (idx !== undefined && String(row[idx]).trim().toUpperCase() === 'SI') scheduleDays.push(dayKey);
                });

                // Actividades A1, A2...
                const activities: Record<string, number | string> = {};
                headers.forEach((h, i) => {
                    if (/^A\d+$/.test(h)) {
                        const v = row[i];
                        if (v === 0 || v === '0') activities[h] = 0;
                        else if (v === '') activities[h] = '';
                        else activities[h] = v;
                    }
                });

                studentData[studentId].subjects?.push({
                    id: getVal(COL_SYNONYMS.CRN), key: getVal(COL_SYNONYMS.SUBJ_KEY),
                    name: normalizeSubjectName(getVal(COL_SYNONYMS.SUBJ_NAME)),
                    group: getVal(COL_SYNONYMS.GROUP), professorName: getVal(COL_SYNONYMS.PROFESSOR),
                    statusDescription: getVal(COL_SYNONYMS.STATUS),
                    absences: parseInt(getVal(COL_SYNONYMS.ABS) || '0', 10),
                    absenceLimit: parseInt(getVal(COL_SYNONYMS.ABS_LIM) || '1', 10),
                    missedAssignments: parseInt(getVal(COL_SYNONYMS.NE) || '0', 10),
                    missedAssignmentLimit: parseInt(getVal(COL_SYNONYMS.NE_LIM) || '1', 10),
                    grade: parseFloat(getVal(COL_SYNONYMS.GRADE) || '0'),
                    finalGrade: (row[getIdx(COL_SYNONYMS.FINAL_GRADE)!] === 0) ? 0 : (parseFloat(getVal(COL_SYNONYMS.FINAL_GRADE)) || null),
                    activities,
                    schedule: { days: scheduleDays, startTime: getVal(COL_SYNONYMS.START_TIME), endTime: getVal(COL_SYNONYMS.END_TIME) }
                });
            }
            resolve(studentData);
        };
        reader.readAsArrayBuffer(file);
    });
}

export async function parseDirectoryExcel(file: File): Promise<Record<string, StudentContact> | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
            const headers = json[0].map((h: any) => normalizeHeader(String(h)));
            const headerMap: Record<string, number> = {};
            headers.forEach((h, i) => headerMap[h] = i);
            const contacts: Record<string, StudentContact> = {};
            for (const row of json.slice(1)) {
                const id = String(row[headerMap['MATRICULA']] || row[headerMap['ID']] || '').trim();
                if (!id) continue;
                contacts[id] = {
                    studentId: id, name: String(row[headerMap['NOMBRE']] || ''),
                    studentPhone: String(row[headerMap['TEL ALUMNO']] || ''), studentEmail: String(row[headerMap['CORREO ALUMNO']] || ''),
                    dadName: '', dadPhone: String(row[headerMap['TEL PAPA']] || ''), dadEmail: '',
                    momName: '', momPhone: String(row[headerMap['TEL MAMA']] || ''), momEmail: '',
                    sedena: '', group: '', mentoringId: ''
                };
            }
            await bulkAddOrUpdateContacts(contacts);
            resolve(contacts);
        };
        reader.readAsArrayBuffer(file);
    });
}

export async function parseProfessorDirectoryExcel(file: File): Promise<Record<string, ProfessorContact> | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
            const headers = json[0].map((h: any) => normalizeHeader(String(h)));
            const headerMap: Record<string, number> = {};
            headers.forEach((h, i) => headerMap[h] = i);
            const contacts: Record<string, ProfessorContact> = {};
            const nameIdx = findColumnIndex(headerMap, headers, ['NOMBRE DEL PROFESOR', 'NOMBRE']);
            const emailIdx = findColumnIndex(headerMap, headers, ['CORREO', 'EMAIL']);
            if (nameIdx === undefined || emailIdx === undefined) return resolve(null);
            for (const row of json.slice(1)) {
                const name = String(row[nameIdx] || '').trim();
                const email = String(row[emailIdx] || '').trim();
                if (!name) continue;
                const id = name.toLowerCase().replace(/\s+/g, '');
                contacts[id] = { id, name, email };
            }
            await bulkAddOrUpdateProfessorContacts(contacts);
            resolve(contacts);
        };
        reader.readAsArrayBuffer(file);
    });
}

export async function parseAthletesExcel(file: File, allStudentsMap: Map<string, Student>): Promise<void> {
    return new Promise(async (resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
            const headers = json[0].map((h: any) => normalizeHeader(String(h)));
            const headerMap: Record<string, number> = {};
            headers.forEach((h, i) => headerMap[h] = i);
            const studentNameToIdMap = new Map<string, string>();
            allStudentsMap.forEach(student => { studentNameToIdMap.set(student.name.toUpperCase(), student.id); });
            const teamsToUpdate: Record<string, Team> = {};
            for (const row of json.slice(1)) {
                const name = String(row[headerMap['NOMBRE COMPLETO']] || row[headerMap['NOMBRE']] || '').trim();
                const sport = String(row[headerMap['DEPORTE']] || '').trim();
                const studentId = studentNameToIdMap.get(name.toUpperCase());
                if (name && sport && studentId) {
                    if (!teamsToUpdate[sport]) teamsToUpdate[sport] = { id: sport, name: sport, type: 'deportivo', members: [] };
                    teamsToUpdate[sport].members.push({ id: studentId, name });
                }
            }
            if (Object.keys(teamsToUpdate).length > 0) await bulkAddOrUpdateTeams(Object.values(teamsToUpdate));
            resolve();
        };
        reader.readAsArrayBuffer(file);
    });
}

export async function parseOfertaAcademicaExcel(file: File): Promise<OfertaAcademicaItem[] | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
            if (json.length < 2) return resolve(null);
            const headers = json[0].map((h: any) => normalizeHeader(String(h)));
            const headerMap: Record<string, number> = {};
            headers.forEach((h, i) => headerMap[h] = i);
            const getVal = (row: any[], names: string[]) => {
                const idx = findColumnIndex(headerMap, headers, names);
                return idx !== undefined ? String(row[idx] || '').trim() : '';
            };
            const oferta: OfertaAcademicaItem[] = [];
            for (const row of json.slice(1)) {
                if (!getVal(row, ['CRN'])) continue;
                oferta.push({
                    crn: getVal(row, ['CRN']), subjectKey: getVal(row, ['CLAVE MATERIA', 'CLAVE']),
                    subjectName: normalizeSubjectName(getVal(row, ['NOMBRE LARGO MATERIA', 'MATERIA'])),
                    group: getVal(row, ['NÚMERO GRUPO', 'GRUPO']), professor: getVal(row, ['NOMBRE PROFESOR', 'PROFESOR']),
                    capacity: parseInt(getVal(row, ['CAPACIDAD GRUPO', 'CAPACIDAD']) || '0', 10),
                    enrolled: parseInt(getVal(row, ['NUMERO ALUMNOS INSCRITOS', 'INSCRITOS']) || '0', 10),
                    days: [], startTime: getVal(row, ['INICIO']), endTime: getVal(row, ['FIN']),
                    building: getVal(row, ['EDIFICIO']), room: getVal(row, ['SALON']),
                });
            }
            resolve(oferta);
        };
        reader.readAsArrayBuffer(file);
    });
}

export async function getHeaderKey(file: File): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const headers = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })[0] as string[];
            resolve(generateKeyFromData(headers.join('|')));
        };
        reader.readAsArrayBuffer(file);
    });
}
