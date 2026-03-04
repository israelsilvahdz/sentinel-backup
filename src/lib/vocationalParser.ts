import * as XLSX from 'xlsx';
import type { VocationalDiagnosis } from '@/types/student';

// Keywords to match headers flexibly
const KEYWORDS = {
  CERTAINTY: "certeza",
  URGENCY: "urgencia",
  OBSTACLE: "obstaculo",
  RANKING: "ordena las siguientes universidades",
  CARRERAS: "carreras que me interesan",
  DETALLES: "detalles",
  MATRICULA: "matricula"
};

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export interface VocationalUploadResult {
  diagnoses: Record<string, VocationalDiagnosis>;
  indecisosIds: Set<string>;
}

export async function parseVocationalExcel(file: File): Promise<VocationalUploadResult | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const diagnoses: Record<string, VocationalDiagnosis> = {};
        const indecisosIds = new Set<string>();

        // 1. Process "Respuestas" tab
        const respWs = workbook.Sheets['Respuestas'];
        if (respWs) {
          const json: any[] = XLSX.utils.sheet_to_json(respWs, { defval: '' });
          json.forEach(row => {
            const keys = Object.keys(row);
            const getVal = (keyword: string) => {
              const foundKey = keys.find(k => normalize(k).includes(keyword));
              return foundKey ? row[foundKey] : '';
            };

            const id = String(getVal(KEYWORDS.MATRICULA) || '').trim();
            if (!id) return;

            const ranking = String(getVal(KEYWORDS.RANKING) || '');
            // Split by comma or semicolon and clean up
            const firstUni = ranking.split(/[;,]/)[0]?.trim().toUpperCase() || '';
            const isSecondOption = firstUni !== '' && !firstUni.includes('TECMILENIO');

            diagnoses[id] = {
              certaintyLevel: getVal(KEYWORDS.CERTAINTY) || '',
              urgencyLevel: parseInt(getVal(KEYWORDS.URGENCY)) || 0,
              mainObstacle: getVal(KEYWORDS.OBSTACLE) || '',
              universityRanking: ranking,
              isSecondOption,
              requiresWorkshop: false,
              interestedCareers: getVal(KEYWORDS.CARRERAS) || '',
              details: getVal(KEYWORDS.DETALLES) || '',
              lastUpdated: null
            };
          });
        }

        // 2. Process "Indecisos" tab
        const indecisosWs = workbook.Sheets['Indecisos'];
        if (indecisosWs) {
          const json: any[] = XLSX.utils.sheet_to_json(indecisosWs, { defval: '' });
          json.forEach(row => {
            const keys = Object.keys(row);
            const getVal = (keyword: string) => {
              const foundKey = keys.find(k => normalize(k).includes(keyword));
              return foundKey ? row[foundKey] : '';
            };

            const id = String(getVal(KEYWORDS.MATRICULA) || '').trim();
            if (!id) return;

            const careersStr = String(getVal('carreras') || '').trim();
            const careerItems = careersStr.split(/[,\/;]|\sy\s|\so\s/).map(i => i.trim()).filter(Boolean);
            
            if (careerItems.length > 1) {
              indecisosIds.add(id);
            }

            if (diagnoses[id]) {
              const tallerVal = String(getVal('taller'));
              diagnoses[id].requiresWorkshop = tallerVal.toUpperCase() === 'TRUE' || tallerVal === '1' || tallerVal.toUpperCase() === 'SI';
            }
          });
        }

        resolve({ diagnoses, indecisosIds });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
