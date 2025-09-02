
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
        
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length < 2) {
          resolve(null);
          return;
        }

        const header = rows[0].map(h => String(h).trim());
        const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: header, range: 1 });

        if (json.length === 0) {
          resolve(null);
          return;
        }
        
        const studentData: StudentData = {};
        const activityRegex = /^A\d+$/;

        json.forEach(row => {
          const studentId = String(row[COLUMNS.ID]);
          const studentName = String(row[COLUMNS.NAME] || 'N/A').trim();
          
          if (!studentId || studentId === 'undefined') return;

          if (!studentData[studentId]) {
            studentData[studentId] = {
              id: studentId,
              name: studentName,
              leader: String(row[COLUMNS.LEADER] || 'N/A').trim(),
              tutor: String(row[COLUMNS.TUTOR] || 'N/A').trim(),
              isGraduationCandidate: String(row[COLUMNS.IS_GRADUATION_CANDIDATE]).toLowerCase() === 'sí',
              subjects: [],
            };
          }
          
          const activities: Record<string, number | string> = {};
          for(const key in row) {
              if(activityRegex.test(key)) {
                  activities[key] = row[key];
              }
          }
          
          const subject: Subject = {
            id: String(row[COLUMNS.SUBJECT_ID]),
            name: String(row[COLUMNS.SUBJECT_NAME] || 'N/A').trim(),
            group: String(row[COLUMNS.SUBJECT_GROUP] || 'N/A').trim(),
            professorName: String(row[COLUMNS.PROFESSOR_NAME] || 'N/A').trim(),
            statusDescription: String(row[COLUMNS.SUBJECT_STATUS_DESCRIPTION] || 'N/A').trim(),
            absences: parseInt(String(row[COLUMNS.ABSENCES]), 10) || 0,
            absenceLimit: parseInt(String(row[COLUMNS.ABSENCE_LIMIT]), 10) || 1,
            missedAssignments: parseInt(String(row[COLUMNS.MISSED_ASSIGNMENTS]), 10) || 0,
            missedAssignmentLimit: parseInt(String(row[COLUMNS.MISSED_ASSIGNMENT_LIMIT]), 10) || 1,
            grade: parseFloat(String(row[COLUMNS.GRADE])) || 0,
            finalGrade: parseFloat(String(row[COLUMNS.FINAL_GRADE])) || null,
            finalGradeReason: String(row[COLUMNS.FINAL_GRADE_REASON] || '').trim() || null,
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
