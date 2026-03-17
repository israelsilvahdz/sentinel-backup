
import * as XLSX from 'xlsx';
import { curriculum } from './curriculum';

export interface IrregularStudent {
  id: string;
  name: string;
  completedCount: number;
  totalRequired: number;
  progressPercentage: number;
  pendingSubjects: { name: string; term: number }[];
}

const KARDEX_COLUMNS = {
  STUDENT_ID: ['Matrícula', 'Matricula', 'ID', 'Numero de matricula'],
  STUDENT_NAME: ['Nombre', 'Nombre del alumno', 'Nombre completo'],
  SUBJECT_NAME: ['Nombre de materia', 'Nombre de la materia', 'Nombre Materia', 'Materia', 'Nombre de la asignatura', 'Materia Descripcion'],
  GRADE: ['Calificación', 'Calificacion', 'Calif', 'Nota', 'Calificacion Final', 'Estatus', 'Estatus de la materia'],
};

// Mapeo exhaustivo de normalización para asegurar coincidencia entre Kardex (nombres cortos) y curriculum.ts (nombres largos)
const SUBJECT_NORM_MAP: Record<string, string> = {
    // Matemáticas
    'matematicas i': 'Matemáticas I: lenguaje de la ciencia',
    'matematicas ii': 'Matemáticas II: pensamiento matemático',
    'matematicas iii': 'Matemáticas III: regularidad y repetición',
    'matematicas iii periodicidad y repeticion': 'Matemáticas III: regularidad y repetición',
    'matematicas iv': 'Matemáticas IV: modelos matemáticos',
    'calculo diferencial': 'Cálculo Diferencial',
    'calculo integral': 'Cálculo Integral',
    
    // Idiomas (Optativas de lengua)
    'ingles i': 'Optativa de lengua adicional al español I',
    'frances i': 'Optativa de lengua adicional al español I',
    'aleman i': 'Optativa de lengua adicional al español I',
    'lengua adicional al espanol i': 'Optativa de lengua adicional al español I',
    'ingles ii': 'Optativa de lengua adicional al español II',
    'frances ii': 'Optativa de lengua adicional al español II',
    'aleman ii': 'Optativa de lengua adicional al español II',
    'lengua adicional al espanol ii': 'Optativa de lengua adicional al español II',
    'ingles iii': 'Optativa de lengua adicional al español III',
    'frances iii': 'Optativa de lengua adicional al español III',
    'aleman iii': 'Optativa de lengua adicional al español III',
    'lengua adicional al espanol iii': 'Optativa de lengua adicional al español III',
    'ingles iv': 'Optativa de lengua adicional al español IV',
    'frances iv': 'Optativa de lengua adicional al español IV',
    'aleman iv': 'Optativa de lengua adicional al español IV',
    'lengua adicional al espanol iv': 'Optativa de lengua adicional al español IV',
    'ingles v': 'Optativa de lengua adicional al español V',
    'frances v': 'Optativa de lengua adicional al español V',
    'aleman v': 'Optativa de lengua adicional al español V',
    'lengua adicional al espanol v': 'Optativa de lengua adicional al español V',

    // Habilidades y Valores
    'habilidades y valores i': 'Habilidades y valores I: bienestar',
    'habilidades y valores ii': 'Habilidades y valores II: pensamiento crítico',
    'habilidades y valores iii': 'Habilidades y valores III: ser creativo',
    'habilidades y valores iv': 'Habilidades y valores IV: plan de vida y carrera',
    'habilidades y valores v': 'Habilidades y valores V: lenguaje',
    'habilidades y valores vi': 'Habilidades y valores VI: toma de decisiones',

    // Ciencias
    'ecologia y geografia': 'Ecología y Geografía',
    'transformacion de la materia': 'Transformación de la materia',
    'el carbono y sus componentes': 'El carbono y sus componentes',
    'ciencias de la vida': 'Ciencias de la Vida',
    'materia y energia i': 'Materia y energía I',
    'materia y energia ii': 'Materia y energía II',
    'cuidado del cuerpo humano': 'Cuidado del cuerpo humano',

    // Humanidades y Sociales
    'el ser humano en sociedad': 'El ser humano en sociedad',
    'lectura y redaccion': 'Lectura y Redacción',
    'historia de mexico': 'Historia de México',
    'comunicacion integral': 'Comunicación Integral',
    'mexico contemporaneo': 'México Contemporáneo',
    'los grandes escritores universales': 'Los grandes escritores universales',
    'conceptos y dilemas eticos': 'Conceptos y dilemas éticos',
    'antropologia': 'Antropología',
    'el mundo contemporaneo': 'El mundo contemporáneo',
    'mexico en el siglo xxi': 'México en el siglo XXI',
    'pensamiento filosofico': 'Pensamiento Filosófico',
    'pensamiento cientifico': 'Pensamiento científico',
    'arte y cultura': 'Arte y cultura',
    'expresion literaria': 'Expresión Literaria',
    'expresion musical': 'Expresión musical',

    // Tecnología
    'tecnologias de la informacion i': 'Tecnologías de la Información I',
    'tecnologias de la informacion ii': 'Tecnologías de la Información II',
    
    // Optativas
    'optativa de modulo de formación': 'Optativa de módulo de formación',
    'optativa formación': 'Optativa de módulo de formación',
    'formacion': 'Optativa de módulo de formación'
};

function normalizeString(str: string): string {
    return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
        .replace(/[^a-z0-9\s]/g, '') // Eliminar puntuación
        .trim();
}

function normalizeSubjectName(name: string): string {
    if (!name) return '';
    const clean = normalizeString(name);
    // Intentar encontrar el nombre largo oficial
    return SUBJECT_NORM_MAP[clean] || name;
}

function normalizeHeader(header: string): string {
    return normalizeString(header || '');
}

export async function parseKardexExcel(file: File): Promise<IrregularStudent[] | null> {
  const ALL_REQUIRED_SUBJECTS = curriculum.flatMap((term, idx) => 
    term.courses
        .filter(c => !c.isPlaceholder) // No longer filters flexible, only placeholders
        .map(c => ({ name: c.name, term: idx + 1 }))
  );

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        if (!data) return resolve(null);

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (jsonData.length < 2) {
            console.error("El archivo no tiene suficientes filas.");
            return resolve(null);
        }
        
        const headers: string[] = jsonData[0].map((h: any) => normalizeHeader(String(h || '')));
        const colMap: Record<string, number> = {};

        Object.entries(KARDEX_COLUMNS).forEach(([key, synonyms]) => {
            const index = headers.findIndex(h => synonyms.some(s => normalizeHeader(s) === h));
            if (index !== -1) {
                colMap[key] = index;
            } else {
                const partialIndex = headers.findIndex(h => synonyms.some(s => h.includes(normalizeHeader(s))));
                if (partialIndex !== -1) colMap[key] = partialIndex;
            }
        });

        // Default Column Mapping (A, B, G, H)
        if (colMap.STUDENT_ID === undefined) colMap.STUDENT_ID = 0; 
        if (colMap.STUDENT_NAME === undefined) colMap.STUDENT_NAME = 1; 
        if (colMap.SUBJECT_NAME === undefined) colMap.SUBJECT_NAME = 6; 
        if (colMap.GRADE === undefined) colMap.GRADE = 7; 

        const studentsData = new Map<string, { name: string, subjects: Set<string> }>();

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const id = String(row[colMap.STUDENT_ID] || '').trim();
            if (!id || id.toLowerCase() === 'matricula') continue;

            const name = String(row[colMap.STUDENT_NAME] || id).trim();
            const subjectRaw = String(row[colMap.SUBJECT_NAME] || '').trim();
            const subjectNormalized = normalizeSubjectName(subjectRaw);
            const grade = row[colMap.GRADE];

            const gradeStr = String(grade || '').toUpperCase();
            const isApproved = grade !== null && gradeStr !== '' && 
                             (
                               (!isNaN(parseFloat(gradeStr)) && parseFloat(gradeStr) >= 70) || 
                               ['AC', 'CU', 'APROBADO', 'ACREDITADO', 'APROBADA', 'EQUIV'].some(v => gradeStr.includes(v))
                             );

            if (isApproved) {
                if (!studentsData.has(id)) {
                    studentsData.set(id, { name, subjects: new Set() });
                }
                studentsData.get(id)!.subjects.add(normalizeString(subjectNormalized));
            }
        }

        const irregularStudents: IrregularStudent[] = [];

        studentsData.forEach((data, id) => {
            const pending: { name: string; term: number }[] = [];
            let completedCount = 0;

            ALL_REQUIRED_SUBJECTS.forEach(req => {
                const reqNormalized = normalizeString(req.name);
                
                const isFound = Array.from(data.subjects).some(s => {
                    return s === reqNormalized || 
                           normalizeString(normalizeSubjectName(s)) === reqNormalized ||
                           (s.length > 8 && reqNormalized.includes(s)) ||
                           (reqNormalized.length > 8 && s.includes(reqNormalized));
                });

                if (isFound) {
                    completedCount++;
                } else {
                    pending.push(req);
                }
            });

            const total = ALL_REQUIRED_SUBJECTS.length;
            irregularStudents.push({
                id,
                name: data.name,
                completedCount,
                totalRequired: total,
                progressPercentage: Math.round((completedCount / total) * 100),
                pendingSubjects: pending
            });
        });

        resolve(irregularStudents.sort((a,b) => b.pendingSubjects.length - a.pendingSubjects.length));

      } catch (error) {
        console.error("Error crítico al procesar Kardex:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
