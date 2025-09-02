
import * as XLSX from 'xlsx';
import { type StudentData, type Subject } from '@/types/student';

// Columnas definidas según la propuesta de arquitectura
const COLUMNS = {
  ID: 'Matricula',
  NAME: 'Nombre del alumno',
  LEADER: 'Líder',
  TUTOR: 'Tutor',
  IS_GRADUATION_CANDIDATE: 'CAG',
  SUBJECT_ID: 'CRN', // Usaremos CRN como el ID único de la materia
  SUBJECT_NAME: 'Nombre de la materia',
  SUBJECT_GROUP: 'Grupo',
  SUBJECT_STATUS_DESCRIPTION: 'Descripción del estatus',
  PROFESSOR_ID: 'Nomina',
  PROFESSOR_NAME: 'Nombre del profesor de la materia',
  ABSENCE_LIMIT: 'Límite de faltas',
  ABSENCES: 'Faltas del alumno',
  MISSED_ASSIGNMENT_LIMIT: 'Límite de NE',
  MISSED_ASSIGNMENTS: 'NE alumno',
  GRADE: 'Ponderado',
  FINAL_GRADE: 'Calificación final actual',
  FINAL_GRADE_REASON: 'Motivo cf'
};

export async function parseExcel(file: File): Promise<StudentData | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve(null);
          return;
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          resolve(null);
          return;
        }
        
        const studentData: StudentData = {};
        const activityRegex = /^A\d+$/;

        json.forEach(row => {
          // Limpia los nombres de las columnas de la fila actual
          const cleanedRow: {[key: string]: any} = {};
          for (const key in row) {
              cleanedRow[key.trim()] = row[key];
          }

          const studentId = String(cleanedRow[COLUMNS.ID]);
          const studentName = String(cleanedRow[COLUMNS.NAME] || 'N/A').trim();
          
          if (!studentId || studentId === 'undefined') return;

          if (!studentData[studentId]) {
            studentData[studentId] = {
              id: studentId,
              name: studentName,
              leader: String(cleanedRow[COLUMNS.LEADER] || 'N/A').trim(),
              tutor: String(cleanedRow[COLUMNS.TUTOR] || 'N/A').trim(),
              isGraduationCandidate: String(cleanedRow[COLUMNS.IS_GRADUATION_CANDIDATE]).toLowerCase() === 'sí',
              subjects: [],
            };
          }
          
          const activities: Record<string, number | string> = {};
          for(const key in cleanedRow) {
              if(activityRegex.test(key)) {
                  activities[key] = cleanedRow[key];
              }
          }
          
          const subject: Subject = {
            id: String(cleanedRow[COLUMNS.SUBJECT_ID]),
            name: String(cleanedRow[COLUMNS.SUBJECT_NAME] || 'N/A').trim(),
            group: String(cleanedRow[COLUMNS.SUBJECT_GROUP] || 'N/A').trim(),
            professorName: String(cleanedRow[COLUMNS.PROFESSOR_NAME] || 'N/A').trim(),
            statusDescription: String(cleanedRow[COLUMNS.SUBJECT_STATUS_DESCRIPTION] || 'N/A').trim(),
            absences: parseInt(String(cleanedRow[COLUMNS.ABSENCES]), 10) || 0,
            absenceLimit: parseInt(String(cleanedRow[COLUMNS.ABSENCE_LIMIT]), 10) || 1,
            missedAssignments: parseInt(String(cleanedRow[COLUMNS.MISSED_ASSIGNMENTS]), 10) || 0,
            missedAssignmentLimit: parseInt(String(cleanedRow[COLUMNS.MISSED_ASSIGNMENT_LIMIT]), 10) || 1,
            grade: parseFloat(String(cleanedRow[COLUMNS.GRADE])) || 0,
            finalGrade: parseFloat(String(cleanedRow[COLUMNS.FINAL_GRADE])) || null,
            finalGradeReason: String(cleanedRow[COLUMNS.FINAL_GRADE_REASON] || '').trim() || null,
            activities: activities
          };

          studentData[studentId].subjects?.push(subject);
        });

        resolve(studentData);
      } catch (error) {
        console.error("Excel Parsing Error:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("File Reading Error:", error);
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}
