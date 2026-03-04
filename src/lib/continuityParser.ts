import * as XLSX from 'xlsx';
import type { ContinuityStudent, ContinuityCatalog } from '@/types/student';

function normalizeHeader(header: string): string {
  return header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
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
            const id = String(row['Matrícula'] || '').trim();
            if (!id) return;

            studentMap.set(id, {
              id,
              name: row['Nombre'] || '',
              leader: row['Líder'] || '',
              advisor: row['Asesor'] || '',
              status: row['Estatus'] || '',
              isInscribed: String(row['Inscrito']) === '1',
              priority: parseInt(row['Prioridad']) || 0,
              average: parseFloat(row['Promedio']) || 0,
              scholarship: row['Beca'] || '',
              lastContactDate: row['Fecha último contacto'] || '',
              lastContactComment: row['Comentario último contacto'] || '',
              cycle: sheetInfo.cycle as any,
              interestLevel: '',
              programOfInterest: '',
              competitorUniversity: '',
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
            const id = String(row['Matrícula'] || '').trim();
            const student = studentMap.get(id);
            if (student) {
              student.interestLevel = row['Nivel de riesgo'] || row['Nivel de interes'] || '';
              student.programOfInterest = row['Programa de interés'] || '';
              student.competitorUniversity = row['Atributos universidad'] || '';
              student.interviewer = row['Entrevista'] || '';
              student.decisionTaken = row['¿Ya tomaste alguna decisión sobre qué carrera vas a estudiar y en dónde?'] || '';
            }
          });
        }

        // 3. Process Generalidades (Catalog)
        const genWs = workbook.Sheets['Generalidades'];
        if (genWs) {
          const genJson: any[] = XLSX.utils.sheet_to_json(genWs, { header: 1, defval: '' });
          // Assumption: Statuses in col A, Mentoring in col B, Formats in col C
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
