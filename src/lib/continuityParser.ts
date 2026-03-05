import * as XLSX from 'xlsx';
import type { ContinuityStudent, ContinuityCatalog, CareerChoiceSurvey } from '@/types/student';

function normalizeHeader(header: string): string {
  return header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export async function parseContinuidadExcel(file: File): Promise<{ students: ContinuityStudent[], catalog: ContinuityCatalog } | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const studentMap = new Map<string, ContinuityStudent>();
        
        const catalog: ContinuityCatalog = { statuses: [], riskLevels: [], formats: [] };

        // 1. Process Bases (Enero and Agosto)
        const baseSheets = [
          { name: 'Base Enero 26', cycle: 'Enero 26' },
          { name: 'Base Agosto 26', cycle: 'Agosto 26' }
        ];

        baseSheets.forEach(sheetInfo => {
          const ws = workbook.Sheets[sheetInfo.name];
          if (!ws) return;
          const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
          
          json.forEach(row => {
            // Flexible header search for base sheet
            const getVal = (search: string) => {
              const normSearch = normalizeHeader(search);
              const key = Object.keys(row).find(k => normalizeHeader(k).includes(normSearch));
              return key ? row[key] : '';
            };

            const id = String(getVal('Matrícula') || '').trim();
            if (!id) return;

            studentMap.set(id, {
              id,
              name: getVal('Nombre') || '',
              leader: getVal('Líder') || '',
              advisor: getVal('Asesor') || '',
              group: getVal('Grupo') || '',
              status: getVal('Estatus') || '',
              isInscribed: String(getVal('Inscrito')) === '1',
              priority: parseInt(getVal('Prioridad')) || 0,
              average: parseFloat(getVal('Promedio')) || 0,
              scholarship: getVal('Beca') || '',
              lastContactDate: getVal('Fecha último contacto') || '',
              lastContactComment: getVal('Comentario último contacto') || '',
              cycle: sheetInfo.cycle as any,
              interestLevel: '',
              programOfInterest: '',
              competitorUniversity: getVal('Atributos universidad') || '',
              interviewer: '',
              decisionTaken: ''
            });
          });
        });

        // 2. Process General (Vocational)
        const generalWs = workbook.Sheets['General'];
        if (generalWs) {
          const generalJson: any[] = XLSX.utils.sheet_to_json(generalWs, { defval: '' });
          generalJson.forEach(row => {
            const getVal = (search: string) => {
              const normSearch = normalizeHeader(search);
              const key = Object.keys(row).find(k => normalizeHeader(k).includes(normSearch));
              return key ? row[key] : '';
            };

            const id = String(getVal('Matrícula') || '').trim();
            const student = studentMap.get(id);
            if (student) {
              student.interestLevel = getVal('Nivel de riesgo') || getVal('Nivel de interes') || '';
              student.programOfInterest = getVal('Programa de interés') || '';
              if (!student.competitorUniversity) {
                student.competitorUniversity = getVal('Atributos universidad') || '';
              }
              student.interviewer = getVal('Entrevista') || '';
              student.decisionTaken = getVal('¿Ya tomaste alguna decisión sobre qué carrera vas a estudiar y en dónde?') || '';
            }
          });
        }

        // 3. Process Generalidades (Catalog)
        const genWs = workbook.Sheets['Generalidades'];
        if (genWs) {
          const genJson: any[] = XLSX.utils.sheet_to_json(genWs, { header: 1, defval: '' });
          genJson.slice(1).forEach(row => {
            if (row[0]) catalog.statuses.push(String(row[0]));
            if (row[1]) catalog.riskLevels.push(String(row[1]));
            if (row[2]) catalog.formats.push(String(row[2]));
          });
          catalog.statuses = [...new Set(catalog.statuses)];
          catalog.riskLevels = [...new Set(catalog.riskLevels)];
          catalog.formats = [...new Set(catalog.formats)];
        }

        resolve({ 
          students: Array.from(studentMap.values()), 
          catalog 
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

const CAREER_CHOICE_COLUMNS = {
  EMAIL: 'Email',
  TIME: 'Completion time',
  YA_ELIGIO_CARRERA: '¿Ya elegiste carrera?',
  CARRERA_OPCION_1: '¿Cuál de las siguientes carreras elegiste?',
  CARRERA_OPCION_2: '¿Qué carrera has elegido estudiar?',
  CARRERA_OPCION_3: '¿Cuáles carreras estás contemplando?',
  YA_ELIGIO_UNIVERSIDAD: '¿Ya elegiste universidad?',
  UNIVERSIDAD: '¿Cuál universidad?',
  ETAPA: 'En que proceso te encuentras en la universidad'
};

function extractMatriculaFromEmail(email: string): string | null {
  if (!email) return null;
  const match = email.match(/^al([0-9]+)@/i);
  if (match) {
    return `T${match[1]}`;
  }
  return null;
}

export async function parseCareerChoiceSurvey(file: File): Promise<Record<string, CareerChoiceSurvey> | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (json.length === 0) return resolve(null);

        const results: Record<string, CareerChoiceSurvey> = {};

        json.forEach(row => {
          const keys = Object.keys(row);
          const getVal = (exactName: string) => {
            const foundKey = keys.find(k => k.trim() === exactName);
            return foundKey ? row[foundKey] : '';
          };

          const email = String(getVal(CAREER_CHOICE_COLUMNS.EMAIL)).trim();
          const id = extractMatriculaFromEmail(email);
          if (!id) return;

          // Priority logic for career name
          const carrera = getVal(CAREER_CHOICE_COLUMNS.CARRERA_OPCION_1) || 
                          getVal(CAREER_CHOICE_COLUMNS.CARRERA_OPCION_2) || 
                          getVal(CAREER_CHOICE_COLUMNS.CARRERA_OPCION_3);

          results[id] = {
            fechaRespuesta: String(getVal(CAREER_CHOICE_COLUMNS.TIME)),
            yaEligioCarrera: String(getVal(CAREER_CHOICE_COLUMNS.YA_ELIGIO_CARRERA)),
            carreraElegida: String(carrera),
            yaEligioUniversidad: String(getVal(CAREER_CHOICE_COLUMNS.YA_ELIGIO_UNIVERSIDAD)),
            universidadElegida: String(getVal(CAREER_CHOICE_COLUMNS.UNIVERSIDAD)),
            etapaProceso: String(getVal(CAREER_CHOICE_COLUMNS.ETAPA))
          };
        });

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
