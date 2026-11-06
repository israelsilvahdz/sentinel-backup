
import * as XLSX from 'xlsx';
import { curriculum } from './curriculum';

export interface IrregularStudent {
  id: string;
  name: string;
  completedCount: number;
  totalRequired: number;
  progressPercentage: number;
  currentTerm: number;
  isIrregular: boolean;
  pendingSubjects: { name: string; term: number; isTaking: boolean }[];
}

const KARDEX_COLUMNS = {
  STUDENT_ID: ['Matrícula', 'Matricula', 'ID', 'Numero de matricula'],
  STUDENT_NAME: ['Nombre', 'Nombre del alumno', 'Nombre completo'],
  SUBJECT_NAME: ['Nombre de materia', 'Nombre de la materia', 'Nombre Materia', 'Materia', 'Nombre de la asignatura', 'Materia Descripcion'],
  GRADE: ['Calificación', 'Calificacion', 'Calif', 'Nota', 'Calificacion Final', 'Estatus', 'Estatus de la materia'],
  CURRENT_TETRA: ['Tetra', 'Tetramestre Actual', 'Periodo Actual', 'Grado', 'Semestre'],
};

// Mapeo de normalización incluyendo bilingüe y nombres cortos del Kardex
const SUBJECT_NORM_MAP: Record<string, string> = {
    // Matemáticas
    'matematicas i lenguaje de la ciencia': 'Matemáticas I: lenguaje de la ciencia',
    'math i': 'Matemáticas I: lenguaje de la ciencia',
    'matematicas ii pensamiento matematico': 'Matemáticas II: pensamiento matemático',
    'math ii mathematical thinking': 'Matemáticas II: pensamiento matemático',
    'matematicas iii regularidad y repeticion': 'Matemáticas III: regularidad y repetición',
    'math iii regularity and repetition': 'Matemáticas III: regularidad y repetición',
    'matematicas iv modelos matematicos': 'Matemáticas IV: modelos matemáticos',
    'math iv mathematical models': 'Matemáticas IV: modelos matemáticos',
    'calculo diferencial': 'Cálculo Diferencial',
    'calculo integral': 'Cálculo Integral',
    
    // Bilingüe / Humanidades
    'human being in society': 'El ser humano en sociedad',
    'ecology and geography': 'Ecología y Geografía',
    'information technologies': 'Tecnologías de la Información I',
    'information technologies ii': 'Tecnologías de la Información II',
    'great universal writers': 'Los grandes escritores universales',
    'anthropology culture and social conscience': 'Antropología, cultura y conciencia social',
    'mass and energy i': 'Materia y energía I',
    'mass and energy ii': 'Materia y energía II',
    'life science': 'Ciencias de la Vida',
    'contemporary world': 'El mundo contemporáneo',
    'scientific thought': 'Pensamiento científico',
    'art and culture': 'Arte y cultura',
    'human body care': 'Cuidado del cuerpo humano',
    
    // Habilidades
    'habilidades y valores i': 'Habilidades y valores I: bienestar',
    'habilidades y valores ii': 'Habilidades y valores II: pensamiento crítico',
    'habilidades y valores iii': 'Habilidades y valores III: ser creativo',
    'habilidades y valores iv': 'Habilidades y valores IV: plan de vida y carrera',
    'habilidades y valores v': 'Habilidades y valores V: lenguaje, emoción y cuerpo',
    'habilidades y valores vi': 'Habilidades y valores VI: toma de decisiones',

    // Lenguas
    'ingles i': 'Optativa de lengua adicional al español I',
    'ingles ii': 'Optativa de lengua adicional al español II',
    'ingles iii': 'Optativa de lengua adicional al español III',
    'ingles iv': 'Optativa de lengua adicional al español IV',
    'ingles v': 'Optativa de lengua adicional al español V'
};

function normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

function normalizeSubjectName(name: string): string {
    if (!name) return '';
    const clean = normalizeString(name);
    if (SUBJECT_NORM_MAP[clean]) return SUBJECT_NORM_MAP[clean];
    
    for (const term of curriculum) {
        for (const course of term.courses) {
            const courseNorm = normalizeString(course.name);
            if (clean === courseNorm || (clean.length > 8 && courseNorm.includes(clean)) || (courseNorm.length > 8 && clean.includes(courseNorm))) {
                return course.name;
            }
        }
    }
    return name;
}

export async function parseKardexExcel(file: File): Promise<IrregularStudent[] | null> {
  const ALL_REQUIRED_SUBJECTS = curriculum.flatMap((term, idx) => 
    term.courses.map(c => ({ name: c.name, term: idx + 1 }))
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

        if (jsonData.length < 2) return resolve(null);
        
        const headers: string[] = jsonData[0].map((h: any) => normalizeString(String(h || '')));
        const colMap: Record<string, number> = {};

        Object.entries(KARDEX_COLUMNS).forEach(([key, synonyms]) => {
            const index = headers.findIndex(h => synonyms.some(s => normalizeString(s) === h));
            if (index !== -1) colMap[key] = index;
        });

        // Fallbacks inteligentes para columnas comunes si el mapeo falla
        if (colMap.STUDENT_ID === undefined) colMap.STUDENT_ID = 0; 
        if (colMap.STUDENT_NAME === undefined) colMap.STUDENT_NAME = 1; 
        if (colMap.SUBJECT_NAME === undefined) colMap.SUBJECT_NAME = 6; 
        if (colMap.GRADE === undefined) colMap.GRADE = 7; 

        const studentsData = new Map<string, { 
            name: string, 
            approved: Set<string>, 
            taking: Set<string>, 
            currentTerm: number 
        }>();

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const id = String(row[colMap.STUDENT_ID] || '').trim();
            if (!id || id.toLowerCase() === 'matricula') continue;

            const name = String(row[colMap.STUDENT_NAME] || id).trim();
            const subjectRaw = String(row[colMap.SUBJECT_NAME] || '').trim();
            const subjectNormalized = normalizeSubjectName(subjectRaw);
            const grade = row[colMap.GRADE];
            
            // Detección mejorada de tetramestre: si hay columna, buscar el valor máximo para el alumno
            let rowTetra = 1;
            if (colMap.CURRENT_TETRA !== undefined) {
                const val = row[colMap.CURRENT_TETRA];
                if (val) {
                    const parsed = parseInt(String(val).replace(/\D/g, ''));
                    if (!isNaN(parsed)) rowTetra = parsed;
                }
            }

            if (!studentsData.has(id)) {
                studentsData.set(id, { name, approved: new Set(), taking: new Set(), currentTerm: rowTetra });
            }

            const currentStudent = studentsData.get(id)!;
            
            // Actualizar tetramestre si encontramos uno mayor
            if (rowTetra > currentStudent.currentTerm) {
                currentStudent.currentTerm = rowTetra;
            }

            const gradeStr = String(grade || '').toUpperCase();
            
            const isApproved = grade !== null && gradeStr !== '' && 
                             (
                               (!isNaN(parseFloat(gradeStr)) && parseFloat(gradeStr) >= 70) || 
                               ['AC', 'APROBADO', 'ACREDITADO', 'EQUIV'].some(v => gradeStr.includes(v))
                             );
            
            const isCurrentlyTaking = gradeStr === 'CU';

            if (isApproved) {
                currentStudent.approved.add(subjectNormalized);
            } else if (isCurrentlyTaking) {
                currentStudent.taking.add(subjectNormalized);
            }
        }

        const irregularStudents: IrregularStudent[] = [];

        studentsData.forEach((data, id) => {
            const pending: { name: string; term: number; isTaking: boolean }[] = [];
            let completedCount = 0;

            ALL_REQUIRED_SUBJECTS.forEach(req => {
                const isApproved = data.approved.has(req.name);
                const isTaking = data.taking.has(req.name);

                if (isApproved) {
                    completedCount++;
                } else {
                    pending.push({ name: req.name, term: req.term, isTaking });
                }
            });

            const hasPastDebt = pending.some(p => p.term < data.currentTerm && !p.isTaking);
            const isIncompleteCurrent = pending.some(p => p.term === data.currentTerm && !p.isTaking);
            const isIrregular = hasPastDebt || isIncompleteCurrent;

            irregularStudents.push({
                id,
                name: data.name,
                completedCount,
                totalRequired: ALL_REQUIRED_SUBJECTS.length,
                progressPercentage: Math.round((completedCount / ALL_REQUIRED_SUBJECTS.length) * 100),
                currentTerm: data.currentTerm,
                isIrregular,
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
