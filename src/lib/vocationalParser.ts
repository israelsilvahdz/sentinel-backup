import * as XLSX from 'xlsx';
import type { VocationalDiagnosis } from '@/types/student';

const QUESTIONS = {
  CERTAINTY: "¿Cómo describirías tu nivel de certeza sobre qué estudiar?",
  URGENCY: "¿Qué tanta necesidad tienes de una sesión de orientación personalizada urgente?",
  OBSTACLE: "¿Cuál consideras que es tu principal obstáculo actual para continuar tus estudios?",
  RANKING: "Ordena las siguientes universidades según tu interés.",
  CARRERAS: "Carreras que me interesan",
  DETALLES: "Detalles"
};

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
            const id = String(row['Matrícula'] || '').trim();
            if (!id) return;

            const ranking = String(row[QUESTIONS.RANKING] || '');
            const firstUni = ranking.split(';')[0]?.trim().toUpperCase() || '';
            const isSecondOption = firstUni !== '' && firstUni !== 'TECMILENIO';

            diagnoses[id] = {
              certaintyLevel: row[QUESTIONS.CERTAINTY] || '',
              urgencyLevel: parseInt(row[QUESTIONS.URGENCY]) || 0,
              mainObstacle: row[QUESTIONS.OBSTACLE] || '',
              universityRanking: ranking,
              isSecondOption,
              requiresWorkshop: false,
              interestedCareers: row[QUESTIONS.CARRERAS] || '',
              details: row[QUESTIONS.DETALLES] || '',
              lastUpdated: null
            };
          });
        }

        // 2. Process "Indecisos" tab
        const indecisosWs = workbook.Sheets['Indecisos'];
        if (indecisosWs) {
          const json: any[] = XLSX.utils.sheet_to_json(indecisosWs, { defval: '' });
          json.forEach(row => {
            const id = String(row['Matrícula'] || '').trim();
            if (!id) return;

            // Rule: If they are in this tab, they are candidates for indecision
            // but if they have only one career, they are no longer indecisive.
            const careersStr = String(row['Carreras'] || '').trim();
            // Split by common separators: comma, slash, semicolon, " y ", " o "
            const careerItems = careersStr.split(/[,\/;]|\sy\s|\so\s/).map(i => i.trim()).filter(Boolean);
            
            if (careerItems.length > 1) {
              indecisosIds.add(id);
            }

            if (diagnoses[id]) {
              // Taller is often marked as TRUE or 1
              diagnoses[id].requiresWorkshop = String(row['Taller']).toUpperCase() === 'TRUE' || String(row['Taller']) === '1';
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
