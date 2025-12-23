
import * as XLSX from 'xlsx';
import { curriculum, type CurriculumCourse } from './curriculum';

export interface IrregularStudent {
  id: string;
  name: string;
  currentTerm: number;
  pendingSubjects: { name: string; term: number }[];
}

interface KardexEntry {
  studentId: string;
  studentName: string;
  term: number;
  subjectName: string;
  grade: string | number | null;
}

const KARDEX_COLUMNS = {
  STUDENT_ID: 'Matrícula',
  STUDENT_NAME: 'Nombre',
  TERM: 'Periodo',
  SUBJECT_NAME: 'Nombre Materia',
  GRADE: 'Calificación',
};

// Mapa para convertir los números de periodo del kardex (ej. 2413) a un índice de tetramestre (1-6)
// Esto necesita ser ajustado según los valores reales en el archivo Excel
const TERM_CODE_TO_INDEX: Record<string, number> = {
    // Ejemplo: '2313': 1, '2323': 2 ... Esto es una suposición.
    // El usuario deberá proveer los códigos reales.
    // Por ahora, asumiremos que la columna 'Periodo' contiene el número del tetra 1, 2, 3...
};

function normalizeHeader(header: string): string {
    return header
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

// Crea un mapa de todas las materias del plan de estudios para búsqueda rápida.
const curriculumMap = new Map<string, { termIndex: number }>();
curriculum.forEach((term, termIndex) => {
    term.courses.forEach(course => {
        if (!course.isPlaceholder) {
            curriculumMap.set(course.name, { termIndex: termIndex + 1 });
        }
    });
});


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
        const colIndices: Record<string, number> = {};
        Object.entries(KARDEX_COLUMNS).forEach(([key, value]) => {
            const index = headers.indexOf(normalizeHeader(value));
            if (index === -1) {
                // Try finding by parts for flexibility
                const partialMatchIndex = headers.findIndex(h => h.includes(normalizeHeader(value)));
                if(partialMatchIndex !== -1) {
                    colIndices[key] = partialMatchIndex;
                } else {
                     throw new Error(`Columna requerida no encontrada en el Kardex: "${value}"`);
                }
            } else {
                 colIndices[key] = index;
            }
        });

        const kardexEntries: KardexEntry[] = [];
        const dataRows = jsonData.slice(1);

        for (const row of dataRows) {
            if (!row || !row[colIndices.STUDENT_ID]) continue;
            
            // La columna 'Periodo' en el excel del usuario parece ser el número del tetra directamente.
            // Si fuera un código (ej. '2413'), se necesitaría el mapeo TERM_CODE_TO_INDEX
            const termNumber = parseInt(String(row[colIndices.TERM] || '0'), 10);
            if (isNaN(termNumber) || termNumber === 0) continue; // Ignorar si el periodo no es un número válido

            kardexEntries.push({
                studentId: String(row[colIndices.STUDENT_ID]),
                studentName: String(row[colIndices.STUDENT_NAME]),
                term: termNumber,
                subjectName: String(row[colIndices.SUBJECT_NAME]),
                grade: row[colIndices.GRADE],
            });
        }
        
        // Agrupar entradas por alumno
        const studentsData = new Map<string, KardexEntry[]>();
        kardexEntries.forEach(entry => {
            if (!studentsData.has(entry.studentId)) {
                studentsData.set(entry.studentId, []);
            }
            studentsData.get(entry.studentId)!.push(entry);
        });

        const irregularStudents: IrregularStudent[] = [];

        studentsData.forEach((entries, studentId) => {
            const studentName = entries[0].studentName;
            // El tetramestre actual es el más alto que aparece en su kardex
            const currentTerm = Math.max(...entries.map(e => e.term));

            // Construir un Set con todas las materias que tienen CUALQUIER tipo de calificación (incluyendo CU)
            const passedOrCouringSubjects = new Set<string>();
            entries.forEach(entry => {
                const grade = entry.grade;
                // Si la calificación no es nula o vacía, significa que el alumno la cursó o la está cursando.
                if (grade !== null && String(grade).trim() !== '') {
                    passedOrCouringSubjects.add(entry.subjectName);
                }
            });

            const pendingSubjects: { name: string; term: number }[] = [];
            
            // Revisar todos los tetramestres ANTERIORES al actual del alumno
            for (let i = 1; i < currentTerm; i++) {
                const termData = curriculum[i-1]; // El índice del array es `i-1`
                if (termData) {
                    termData.courses.forEach(course => {
                        // Si la materia no es un placeholder, no es flexible, Y NO ESTÁ en la lista de cursadas/aprobadas
                        // entonces es una materia pendiente de un tetra anterior.
                        if (!course.isPlaceholder && !course.isFlexible && !passedOrCouringSubjects.has(course.name)) {
                            pendingSubjects.push({ name: course.name, term: i });
                        }
                    });
                }
            }

            if (pendingSubjects.length > 0) {
                irregularStudents.push({
                    id: studentId,
                    name: studentName,
                    currentTerm: currentTerm,
                    pendingSubjects: pendingSubjects,
                });
            }
        });

        resolve(irregularStudents.sort((a,b) => a.name.localeCompare(b.name)));

      } catch (error) {
        console.error("Error al procesar archivo de kardex:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
