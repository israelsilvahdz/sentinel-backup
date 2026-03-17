
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
  SUBJECT_NAME: ['Nombre Materia', 'Materia', 'Nombre de la asignatura', 'Materia Descripcion'],
  GRADE: ['Calificación', 'Calif', 'Nota', 'Calificacion Final', 'Estatus', 'Estatus de la materia'],
};

// Mapeo exhaustivo de normalización para asegurar coincidencia con curriculum.ts
const SUBJECT_NORM_MAP: Record<string, string> = {
    'matematicas i': 'Matemáticas I: lenguaje de la ciencia',
    'matematicas i lenguaje de la ciencia': 'Matemáticas I: lenguaje de la ciencia',
    'matematicas ii': 'Matemáticas II: pensamiento matemático',
    'matematicas ii pensamiento matematico': 'Matemáticas II: pensamiento matemático',
    'matematicas iii': 'Matemáticas III: regularidad y repetición',
    'matematicas iii regularidad y repeticion': 'Matemáticas III: regularidad y repetición',
    'matematicas iii periodicidad y repeticion': 'Matemáticas III: regularidad y repetición',
    'matematicas iv': 'Matemáticas IV: modelos matemáticos',
    'matematicas iv modelos matematicos': 'Matemáticas IV: modelos matemáticos',
    'el ser humano en sociedad': 'El ser humano en sociedad',
    'lectura y redaccion': 'Lectura y Redacción',
    'ecologia y geografia': 'Ecología y Geografía',
    'tecnologias de la informacion i': 'Tecnologías de la Información I',
    'habilidades y valores i': 'Habilidades y valores I: bienestar',
    'habilidades y valores i bienestar': 'Habilidades y valores I: bienestar',
    'historia de mexico': 'Historia de México',
    'comunicacion integral': 'Comunicación Integral',
    'transformacion de la materia': 'Transformación de la materia',
    'tecnologias de la informacion ii': 'Tecnologías de la Información II',
    'habilidades y valores ii': 'Habilidades y valores II: pensamiento crítico',
    'habilidades y valores ii pensamiento critico': 'Habilidades y valores II: pensamiento crítico',
    'mexico contemporaneo': 'México Contemporáneo',
    'los grandes escritores universales': 'Los grandes escritores universales',
    'el carbono y sus componentes': 'El carbono y sus componentes',
    'conceptos y dilemas eticos': 'Conceptos y dilemas éticos',
    'habilidades y valores iii': 'Habilidades y valores III: ser creativo',
    'habilidades y valores iii ser creativo': 'Habilidades y valores III: ser creativo',
    'antropologia': 'Antropología',
    'ciencias de la vida': 'Ciencias de la Vida',
    'habilidades y valores iv': 'Habilidades y valores IV: plan de vida y carrera',
    'habilidades y valores iv plan de vida y carrera': 'Habilidades y valores IV: plan de vida y carrera',
    'calculo diferencial': 'Cálculo Diferencial',
    'materia y energia i': 'Materia y energía I',
    'materia y energia ii': 'Materia y energía II',
    'el mundo contemporaneo': 'El mundo contemporáneo',
    'cuidado del cuerpo humano': 'Cuidado del cuerpo humano',
    'habilidades y valores v': 'Habilidades y valores V: lenguaje',
    'habilidades y valores v lenguaje': 'Habilidades y valores V: lenguaje',
    'calculo integral': 'Cálculo Integral',
    'mexico en el siglo xxi': 'México en el siglo XXI',
    'pensamiento filosofico': 'Pensamiento Filosófico',
    'habilidades y valores vi': 'Habilidades y valores VI: toma de decisiones',
    'habilidades y valores vi toma de decisiones': 'Habilidades y valores VI: toma de decisiones',
};

function normalizeString(str: string): string {
    return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

function normalizeSubjectName(name: string): string {
    if (!name) return '';
    const clean = normalizeString(name);
    return SUBJECT_NORM_MAP[clean] || name;
}

function normalizeHeader(header: string): string {
    return normalizeString(header || '');
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
            const subjectRaw = String(row[colMap.SUBJECT_NAME] || '').trim();
            const subjectNormalized = normalizeSubjectName(subjectRaw);
            const grade = row[colMap.GRADE];

            // Lógica de aprobación flexible: números >= 70 o palabras clave de éxito
            const gradeStr = String(grade || '').toUpperCase();
            const isApproved = grade !== null && gradeStr !== '' && 
                             (
                               (!isNaN(parseFloat(gradeStr)) && parseFloat(gradeStr) >= 70) || 
                               ['AC', 'CU', 'APROBADO', 'ACREDITADO', 'APROBADA'].some(v => gradeStr.includes(v))
                             );

            if (isApproved) {
                if (!studentsData.has(id)) studentsData.set(id, { name, subjects: new Set() });
                studentsData.get(id)!.subjects.add(subjectNormalized);
            }
        }

        const irregularStudents: IrregularStudent[] = [];

        studentsData.forEach((data, id) => {
            const pending: { name: string; term: number }[] = [];
            let completedCount = 0;

            ALL_REQUIRED_SUBJECTS.forEach(req => {
                const reqNormalized = normalizeString(req.name);
                
                // Comprobación robusta: coincidencia exacta normalizada o mapeada
                const isFound = Array.from(data.subjects).some(s => {
                    const sNorm = normalizeString(s);
                    return sNorm === reqNormalized || 
                           normalizeString(normalizeSubjectName(s)) === reqNormalized ||
                           (sNorm.length > 5 && reqNormalized.includes(sNorm)) ||
                           (reqNormalized.length > 5 && sNorm.includes(reqNormalized));
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
        console.error("Error al procesar Kardex:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
