
import type { Subject } from "@/types/student";

export type AreaName = 'Matemáticas' | 'Ciencias' | 'Sociales' | 'Tecnologías' | 'Habilidades' | 'Optativas' | 'Unknown';

export interface Ponderacion {
  aai: number; // Actividades Antes del Intermedio
  vcu_aai: number; // Valor Cada Una - AAI
  aaf: number; // Actividades Antes del Final
  vcu_aaf: number; // Valor Cada Una - AAF
  vpai?: number; // Valor Proyecto Antes del Intermedio
  vpaf?: number; // Valor Proyecto Antes del Final
  vpaf2?: number; // Valor Proyecto Antes del Final 2
}

export const EXAM_INTERMEDIO_PONDERACION = 15;
export const EXAM_FINAL_PONDERACION = 30;

export const PONDERACIONES_POR_AREA: Record<AreaName, Ponderacion | null> = {
  'Matemáticas': { aai: 5, vcu_aai: 4, aaf: 7, vcu_aaf: 5 },
  'Ciencias': { aai: 3, vcu_aai: 7, aaf: 3, vcu_aaf: 7, vpaf: 13 },
  'Sociales': { aai: 6, vcu_aai: 3, aaf: 6, vcu_aaf: 4, vpaf: 13 },
  'Tecnologías': { aai: 6, vcu_aai: 3, aaf: 6, vcu_aaf: 4, vpaf: 13 },
  'Habilidades': { aai: 6, vcu_aai: 3, aaf: 6, vcu_aaf: 3, vpai: 9, vpaf: 10 },
  'Optativas': { aai: 6, vcu_aai: 3, aaf: 6, vcu_aaf: 3, vpaf: 5, vpaf2: 14 },
  'Unknown': null,
};

export const CLASIFICACION_MATERIAS: Record<AreaName, string[]> = {
  'Matemáticas': [
    'Matemáticas I: lenguaje de la ciencia', 'Matemáticas II: pensamiento matemático', 
    'Matemáticas III: regularidad y repetición', 'Matemáticas IV: modelos matemáticos', 
    'Cálculo Diferencial', 'Cálculo Integral'
  ],
  'Ciencias': [
    'Ecología y Geografía', 'Transformación de la materia', 'El carbono y sus componentes', 
    'Materia y energía I', 'Materia y energía II', 'Ciencias de la Vida', 
    'Cuidado del cuerpo humano'
  ],
  'Sociales': [
    'El ser humano en sociedad', 'Historia de México', 'México Contemporáneo', 
    'Antropología', 'El mundo contemporáneo', 'Arte y cultura', 
    'México en el siglo XXI', 'Lectura y Redacción', 'Comunicación Integral', 
    'Los grandes escritores universales', 'Expresión Literaria', 'Pensamiento científico',
    'Optativa de lengua adicional al español I', 'Optativa de lengua adicional al español II', 
    'Optativa de lengua adicional al español III', 'Optativa de lengua adicional al español IV', 
    'Optativa de lengua adicional al español V', 'Expresión musical', 'Conceptos y dilemas éticos', 
    'Pensamiento Filosófico'
  ],
  'Tecnologías': [
    'Tecnologías de la Información I', 'Tecnologías de la Información II'
  ],
  'Habilidades': [
    'Habilidades y valores I: bienestar', 'Habilidades y valores II: pensamiento crítico', 
    'Habilidades y valores III: ser creativo', 'Habilidades y valores IV: plan de vida y carrera', 
    'Habilidades y valores V: lenguaje', 'Habilidades y valores VI: toma de decisiones'
  ],
  'Optativas': [
    'Bienestar Integral', 'Negocios exitosos en un mundo cambiante', 'Sistemas de información para la competitividad'
  ],
  'Unknown': [],
};

const SUBJECT_NAME_NORMALIZATION_MAP: Record<string, string> = {
    'matemáticas iii: periodicidad y repetición': 'Matemáticas III: regularidad y repetición',
    'math iii: regularity and repetition': 'Matemáticas III: regularidad y repetición',
    'matematicas i': 'Matemáticas I: lenguaje de la ciencia',
    'math i': 'Matemáticas I: lenguaje de la ciencia',
    'lengua adicional al español i': 'Optativa de lengua adicional al español I',
    'inglés i': 'Optativa de lengua adicional al español I',
    'lengua adicional al español ii': 'Optativa de lengua adicional al español II',
    'inglés ii': 'Optativa de lengua adicional al español II',
    'lengua adicional al español iii': 'Optativa de lengua adicional al español III',
    'inglés iii': 'Optativa de lengua adicional al español III',
    'alemán iii': 'Optativa de lengua adicional al español III',
    'lengua adicional al español iv': 'Optativa de lengua adicional al español IV',
    'inglés iv': 'Optativa de lengua adicional al español IV',
    'alemán iv': 'Optativa de lengua adicional al español IV',
    'francés iv': 'Optativa de lengua adicional al español IV',
    'lengua adicional al español v': 'Optativa de lengua adicional al español V',
    'inglés v': 'Optativa de lengua adicional al español V',
    'alemán v': 'Optativa de lengua adicional al español V',
    'francés v': 'Optativa de lengua adicional al español V',
    'tecnologías de información ii': 'Tecnologías de la Información II',
    'habilidades y valores v: lenguaje, emoción y cuerpo': 'Habilidades y valores V: lenguaje',
    'lectura y redacción': 'Lectura y Redacción',
    'ciencias de la vida': 'Ciencias de la Vida',
    'urban dance': 'IGNORE',
    'soccer': 'IGNORE',
    'tochito': 'IGNORE'
};

function normalizeSubjectName(name: string): string {
    if (!name) return '';
    const cleanedName = name.toLowerCase().replace(/"/g, '').trim();
    if (SUBJECT_NAME_NORMALIZATION_MAP[cleanedName]) {
        return SUBJECT_NAME_NORMALIZATION_MAP[cleanedName];
    }
    // Handle simple capitalization for names not in the map
    for (const area in CLASIFICACION_MATERIAS) {
        for (const officialName of CLASIFICACION_MATERIAS[area as AreaName]) {
            if (officialName.toLowerCase() === cleanedName) {
                return officialName;
            }
        }
    }
    return name; // Return original if no match
}


// Mapa inverso para búsqueda rápida
const materiaToAreaMap = new Map<string, AreaName>();
Object.entries(CLASIFICACION_MATERIAS).forEach(([area, materias]) => {
  materias.forEach(materia => {
    materiaToAreaMap.set(materia, area as AreaName);
  });
});

export function getAreaForMateria(materiaName: string): AreaName {
  const normalizedName = normalizeSubjectName(materiaName);
  if (normalizedName === 'IGNORE') return 'Unknown';
  return materiaToAreaMap.get(normalizedName) || 'Unknown';
}


// Función para calcular la calificación final de una materia
export function calculateFinalGrade(subject: Subject): number {
  const area = getAreaForMateria(subject.name);
  const ponderacion = PONDERACIONES_POR_AREA[area];

  if (!ponderacion) {
    return NaN; // Retorna NaN si no hay ponderación definida
  }

  // Ordenar las actividades cronológicamente (A1, A2, A10, etc.)
  const sortedActivities = Object.entries(subject.activities)
    .filter(([key]) => /^A\d+$/.test(key))
    .sort(([keyA], [keyB]) => {
      const numA = parseInt(keyA.substring(1), 10);
      const numB = parseInt(keyB.substring(1), 10);
      return numA - numB;
    })
    .map(([, value]) => (typeof value === 'number' ? value : parseFloat(String(value)) || 0));

  let totalScore = 0;
  let activityIndex = 0;

  // 1. Actividades Antes del Intermedio (AAI)
  for (let i = 0; i < ponderacion.aai; i++) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vcu_aai;
  }

  // 2. Proyecto Antes del Intermedio (VPAI)
  if (ponderacion.vpai) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vpai;
  }

  // 3. Examen Intermedio
  const intermedioScore = sortedActivities[activityIndex++] ?? 0;
  totalScore += (intermedioScore / 100) * EXAM_INTERMEDIO_PONDERACION;

  // 4. Actividades Antes del Final (AAF)
  for (let i = 0; i < ponderacion.aaf; i++) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vcu_aaf;
  }

  // 5. Proyecto Antes del Final (VPAF)
  if (ponderacion.vpaf) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vpaf;
  }
  
  // 6. Segundo Proyecto Antes del Final (VPAF2)
  if (ponderacion.vpaf2) {
    const score = sortedActivities[activityIndex++] ?? 0;
    totalScore += (score / 100) * ponderacion.vpaf2;
  }

  // 7. Examen Final
  const finalScore = sortedActivities[activityIndex++] ?? 0;
  totalScore += (finalScore / 100) * EXAM_FINAL_PONDERACION;
  
  return totalScore;
}
