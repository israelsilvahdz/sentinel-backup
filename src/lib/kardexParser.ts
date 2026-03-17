
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

interface KardexEntry {
  studentId: string;
  studentName: string;
  subjectName: string;
  grade: string | number | null;
}

const KARDEX_COLUMNS = {
  STUDENT_ID: ['Matrícula', 'Matricula', 'ID'],
  STUDENT_NAME: ['Nombre', 'Nombre del alumno'],
  SUBJECT_NAME: ['Nombre Materia', 'Materia', 'Nombre de la materia'],
  GRADE: ['Calificación', 'Calif', 'Nota'],
};

// Mapeo robusto de normalización para asegurar coincidencia con curriculum.ts
const SUBJECT_NORM_MAP: Record<string, string> = {
    'matematicas iii: periodicidad y repeticion': 'Matemáticas III: regularidad y repetición',
    'matematicas iii: regularidad y repeticion': 'Matemáticas III: regularidad y repetición',
    'matematicas i: lenguaje de la ciencia': 'Matemáticas I: lenguaje de la ciencia',
    'matematicas ii: pensamiento matematico': 'Matemáticas II: pensamiento matemático',
    'antropologia: cultura y consciencia social': 'Antropología',
    'antropologia': 'Antropología',
    'ciencias de la vida': 'Ciencias de la Vida',
    'el mundo contemporaneo': 'El mundo contemporáneo',
    'historia de mexico': 'Historia de México',
    'mexico contemporaneo': 'México Contemporáneo',
    'mexico en el siglo xxi': 'México en el siglo XXI',
    'tecnologias de la informacion i': 'Tecnologías de la Información I',
    'tecnologias de la informacion ii': 'Tecnologías de la Información II',
    'habilidades y valores i: bienestar': 'Habilidades y valores I: bienestar',
    'habilidades y valores ii: pensamiento critico': 'Habilidades y valores II: pensamiento crítico',
    'habilidades y valores iii: ser creativo': 'Habilidades y valores III: ser creativo',
    'habilidades y valores iv: plan de vida y carrera': 'Habilidades y valores IV: plan de vida y carrera',
    'habilidades y valores v: lenguaje': 'Habilidades y valores V: lenguaje',
    'habilidades y valores vi: toma de decisiones': 'Habilidades y valores VI: toma de decisiones',
};

function normalizeSubjectName(name: string): string {
    if (!name) return '';
    const clean = name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s:]/g, '')
        .trim();
    
    return SUBJECT_NORM_MAP[clean] || name;
}

function normalizeHeader(header: string): string {
    return header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

const ALL_REQUIRED_SUBJECTS = curriculum.flatMap((term, idx) => 
    term.courses
        .filter(c => !c.isPlaceholder && !c.isFlexible)
        .map(c => ({ name: c.name, term: idx + 1 }))
);

export async function parseKardexExcel(file: File): Promise<IrregularStudent[] | null> {
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
        
        const headers: string[] = jsonData[0].map((h: any) => normalizeHeader(String(h || '')));
        const colMap: Record<string, number> = {};

        Object.entries(KARDEX_COLUMNS).forEach(([key, synonyms]) => {
            const index = headers.findIndex(h => synonyms.some(s => normalizeHeader(s) === h || h.includes(normalizeHeader(s))));
            if (index !== -1) colMap[key] = index;
        });

        if (colMap.STUDENT_ID === undefined || colMap.SUBJECT_NAME === undefined) {
            throw new Error("No se encontraron las columnas de Matrícula o Materia en el archivo.");
        }

        const studentsData = new Map<string, { name: string, subjects: Set<string> }>();

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const id = String(row[colMap.STUDENT_ID] || '').trim();
            if (!id) continue;

            const name = String(row[colMap.STUDENT_NAME] || id).trim();
            const subject = normalizeSubjectName(String(row[colMap.SUBJECT_NAME] || '').trim());
            const grade = row[colMap.GRADE];

            // Consideramos materia "completada" si tiene calificación aprobatoria o estatus de acreditado
            const isApproved = grade !== null && String(grade).trim() !== '' && 
                             (parseFloat(String(grade)) >= 70 || ['AC', 'CU', '70', '80', '90', '100'].some(v => String(grade).toUpperCase().includes(v)));

            if (isApproved) {
                if (!studentsData.has(id)) studentsData.set(id, { name, subjects: new Set() });
                studentsData.get(id)!.subjects.add(subject);
            }
        }

        const irregularStudents: IrregularStudent[] = [];

        studentsData.forEach((data, id) => {
            const pending: { name: string; term: number }[] = [];
            let completedCount = 0;

            ALL_REQUIRED_SUBJECTS.forEach(req => {
                const isFound = Array.from(data.subjects).some(s => 
                    s.toLowerCase() === req.name.toLowerCase() || 
                    normalizeSubjectName(s) === normalizeSubjectName(req.name)
                );

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
        console.error("Error al procesar Kardex:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
