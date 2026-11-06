import { type StudentData, type Subject } from '@/types/student';

// NOTE: This file is no longer used, but is kept for reference.
// The new parser is located in `src/lib/excelParser.ts`.

const COLUMNS = {
  ID: 'Matrícula',
  NAME: 'Nombre del alumno',
  SUBJECT_NAME: 'Nombre de la materia',
  ABSENCE_LIMIT: 'Límite de faltas',
  ABSENCES: 'Faltas del alumno',
  MISSED_ASSIGNMENT_LIMIT: 'Límite de NE',
  MISSED_ASSIGNMENTS: 'NE alumno',
  GRADE: 'Ponderado',
};

export function parseCsv(csvText: string): StudentData | null {
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    const header = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1);

    const studentData: StudentData = {};

    const colIndices: Record<string, number> = {};
    const requiredCols = Object.values(COLUMNS);
    
    for(const colName of requiredCols) {
        const index = header.indexOf(colName);
        if(index === -1) {
            throw new Error(`Missing required column: ${colName}`);
        }
        colIndices[colName] = index;
    }


    rows.forEach(rowText => {
      if (!rowText.trim()) return;
      const row = rowText.split(',').map(r => r.trim());

      const studentId = row[colIndices[COLUMNS.ID]];
      const studentName = row[colIndices[COLUMNS.NAME]];

      if (!studentId || !studentName) return;

      if (!studentData[studentId]) {
        studentData[studentId] = {
          id: studentId,
          name: studentName,
          leader: '',
          tutor: '',
          isGraduationCandidate: false,
          subjects: [],
        };
      }
      
      const subject: Subject = {
        id: `${studentId}-${row[colIndices[COLUMNS.SUBJECT_NAME]] || ''}`,
        key: row[colIndices[COLUMNS.SUBJECT_NAME]] || '',
        name: row[colIndices[COLUMNS.SUBJECT_NAME]],
        group: '',
        professorName: '',
        statusDescription: '',
        absences: parseInt(row[colIndices[COLUMNS.ABSENCES]], 10) || 0,
        absenceLimit: parseInt(row[colIndices[COLUMNS.ABSENCE_LIMIT]], 10) || 1, // Avoid division by zero
        missedAssignments: parseInt(row[colIndices[COLUMNS.MISSED_ASSIGNMENTS]], 10) || 0,
        missedAssignmentLimit: parseInt(row[colIndices[COLUMNS.MISSED_ASSIGNMENT_LIMIT]], 10) || 1, // Avoid division by zero
        grade: parseFloat(row[colIndices[COLUMNS.GRADE]]) || 0,
        finalGrade: null,
        finalGradeReason: null,
        activities: {},
      };

      studentData[studentId].subjects?.push(subject);
    });

    return studentData;
  } catch (error) {
    console.error("CSV Parsing Error:", error);
    return null;
  }
}
