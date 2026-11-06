import * as XLSX from 'xlsx';
import type { RiasecDiagnosis, RiasecScores } from '@/types/student';

function normalizeHeader(header: string): string {
  return header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export async function parseRiasecExcel(file: File, sourceMap: Record<string, string>): Promise<Record<string, RiasecDiagnosis> | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) return resolve(null);

        const results: Record<string, RiasecDiagnosis> = {};

        json.forEach(row => {
          const getVal = (search: string) => {
            const normSearch = normalizeHeader(search);
            const key = Object.keys(row).find(k => normalizeHeader(k).includes(normSearch));
            return key ? row[key] : '';
          };

          const id = String(getVal('Matrícula')).trim();
          if (!id) return;

          const scores: RiasecScores = {
            realistic: parseFloat(getVal('Puntuación Realista')) || 0,
            investigative: parseFloat(getVal('Puntuación Investigador')) || 0,
            artistic: parseFloat(getVal('Puntuación Artístico')) || 0,
            social: parseFloat(getVal('Puntuación Social')) || 0,
            enterprising: parseFloat(getVal('Puntuación Emprendedor')) || 0,
            conventional: parseFloat(getVal('Puntuación Convencional')) || 0,
          };

          const recommendedCareers = [
            getVal('Carrera Recomendada 1'),
            getVal('Carrera Recomendada 2'),
            getVal('Carrera Recomendada 3'),
            getVal('Carrera Recomendada 4'),
            getVal('Carrera Recomendada 5'),
          ].filter(c => c && c.trim() !== '');

          const sourceKey = String(getVal('Fuente')).trim();
          const sourceFile = sourceMap[sourceKey] || `Reporte_${sourceKey}.pdf`;

          results[id] = {
            scores,
            recommendedCareers,
            sourceFile,
            lastUpdated: null
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

export async function parseSourceReferences(file: File): Promise<Record<string, string> | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        const map: Record<string, string> = {};
        json.slice(1).forEach(row => {
          if (row[0] && row[1]) {
            map[String(row[0]).trim()] = String(row[1]).trim();
          }
        });
        resolve(map);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
