import * as XLSX from 'xlsx';
import { type StudentData, type Subject } from '@/types/student';

const COLUMNS = {
  ID: 'Matricula',
  NAME: 'Nombre del alumno',
  LEADER: 'Líder',
  TUTOR: 'Tutor',
  IS_GRADUATION_CANDIDATE: 'Candidato a graduar (CAG)',
  SUBJECT_NATIONAL_ID: 'Numero de la materia Nacional',
  SUBJECT_CAMPUS_ID: 'numero de la materia del campus',
  SUBJECT_NAME: 'Nombre de la materia',
  SUBJECT_GROUP: 'Grupo',
  SUBJECT_STATUS_DESCRIPTION: 'Descripción del estatus',
  PROFESSOR_ID: 'Nomina',
  PROFESSOR_NAME: 'Nombre del profesor de la materia',
  ABSENCE_LIMIT: 'Limite de faltas de la materia',
  ABSENCES: 'faltas del alumno en la materia',
  MISSED_ASSIGNMENT_LIMIT: 'Limite de No entregados (NE) de la materia',
  MISSED_ASSIGNMENTS: 'Cantidad de No Entregados (NE) del alumno en la materia',
  GRADE: 'ponderado',
  FINAL_GRADE: 'calificacion final',
  FINAL_GRADE_REASON: 'motivo de la calificación final'
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
        
        const firstRow = json[0];
        const requiredCols = [
            COLUMNS.ID, 
            COLUMNS.NAME, 
            COLUMNS.SUBJECT_NAME,
            COLUMNS.ABSENCE_LIMIT,
            COLUMNS.ABSENCES,
            COLUMNS.MISSED_ASSIGNMENT_LIMIT,
            COLUMNS.MISSED_ASSIGNMENTS,
            COLUMNS.GRADE
        ];

        for(const colName of requiredCols) {
            if(!(colName in firstRow)) {
                throw new Error(`Missing required column: ${colName}`);
            }
        }

        json.forEach(row => {
          const studentId = String(row[COLUMNS.ID]);
          const studentName = row[COLUMNS.NAME];
          const leader = row[COLUMNS.LEADER] || 'N/A';
          const tutor = row[COLUMNS.TUTOR] || 'N/A';
          const isGraduationCandidate = row[COLUMNS.IS_GRADUATION_CANDIDATE] === 'Sí';

          if (!studentId || !studentName) return;

          if (!studentData[studentId]) {
            studentData[studentId] = {
              id: studentId,
              name: studentName,
              leader,
              tutor,
              isGraduationCandidate,
              subjects: [],
            };
          }
          
          const subject: Subject = {
            name: `${row[COLUMNS.SUBJECT_NAME]} (${row[COLUMNS.SUBJECT_GROUP]})`,
            nationalId: String(row[COLUMNS.SUBJECT_NATIONAL_ID]),
            campusId: String(row[COLUMNS.SUBJECT_CAMPUS_ID]),
            professorName: row[COLUMNS.PROFESSOR_NAME],
            statusDescription: row[COLUMNS.SUBJECT_STATUS_DESCRIPTION],
            absences: parseInt(String(row[COLUMNS.ABSENCES]), 10) || 0,
            absenceLimit: parseInt(String(row[COLUMNS.ABSENCE_LIMIT]), 10) || 1,
            missedAssignments: parseInt(String(row[COLUMNS.MISSED_ASSIGNMENTS]), 10) || 0,
            missedAssignmentLimit: parseInt(String(row[COLUMNS.MISSED_ASSIGNMENT_LIMIT]), 10) || 1,
            grade: parseFloat(String(row[COLUMNS.GRADE])) || 0,
            finalGrade: parseFloat(String(row[COLUMNS.FINAL_GRADE])) || null,
            finalGradeReason: row[COLUMNS.FINAL_GRADE_REASON] || null,
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
