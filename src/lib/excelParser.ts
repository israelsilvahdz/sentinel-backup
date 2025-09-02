import * as XLSX from 'xlsx';
import { type StudentData, type Subject } from '@/types/student';

const COLUMNS = {
  ID: 'Matrícula',
  NAME: 'Nombre del alumno',
  LEADER: 'Lider',
  TUTOR: 'Tutor',
  SUBJECT_NAME: 'Nombre de la materia',
  ABSENCE_LIMIT: 'Límite de faltas',
  ABSENCES: 'Faltas del alumno',
  MISSED_ASSIGNMENT_LIMIT: 'Límite de NE',
  MISSED_ASSIGNMENTS: 'NE alumno',
  GRADE: 'Ponderado',
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
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (json.length === 0) {
          resolve(null);
          return;
        }
        
        const studentData: StudentData = {};

        // Use a sample row to check for required columns
        const firstRow = json[0];
        const requiredCols = Object.values(COLUMNS);
        for(const colName of requiredCols) {
            if(!(colName in firstRow)) {
                // Allow missing leader/tutor for now
                if (colName !== COLUMNS.LEADER && colName !== COLUMNS.TUTOR) {
                    throw new Error(`Missing required column: ${colName}`);
                }
            }
        }

        json.forEach(row => {
          const studentId = String(row[COLUMNS.ID]);
          const studentName = row[COLUMNS.NAME];
          const leader = row[COLUMNS.LEADER] || 'N/A';
          const tutor = row[COLUMNS.TUTOR] || 'N/A';


          if (!studentId || !studentName) return;

          if (!studentData[studentId]) {
            studentData[studentId] = {
              id: studentId,
              name: studentName,
              leader,
              tutor,
              subjects: [],
            };
          }
          
          const subject: Subject = {
            name: row[COLUMNS.SUBJECT_NAME],
            absences: parseInt(String(row[COLUMNS.ABSENCES]), 10) || 0,
            absenceLimit: parseInt(String(row[COLUMNS.ABSENCE_LIMIT]), 10) || 1, // Avoid division by zero
            missedAssignments: parseInt(String(row[COLUMNS.MISSED_ASSIGNMENTS]), 10) || 0,
            missedAssignmentLimit: parseInt(String(row[COLUMNS.MISSED_ASSIGNMENT_LIMIT]), 10) || 1, // Avoid division by zero
            grade: parseFloat(String(row[COLUMNS.GRADE])) || 0,
          };

          studentData[studentId].subjects.push(subject);
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
