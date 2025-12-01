
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

// Ponderaciones para el esquema TETRAMESTRAL (basado en áreas)
export const PONDERACIONES_POR_AREA: Record<AreaName, Ponderacion | null> = {
  'Matemáticas': { aai: 5, vcu_aai: 4, aaf: 7, vcu_aaf: 5 },
  'Ciencias': { aai: 3, vcu_aai: 7, aaf: 3, vcu_aaf: 7, vpaf: 13 },
  'Sociales': { aai: 6, vcu_aai: 3, aaf: 6, vcu_aaf: 4, vpaf: 13 },
  'Tecnologías': { aai: 6, vcu_aai: 3, aaf: 6, vcu_aaf: 4, vpaf: 13 },
  'Habilidades': { aai: 6, vcu_aai: 3, aaf: 6, vcu_aaf: 3, vpai: 9, vpaf: 10 },
  'Optativas': { aai: 6, vcu_aai: 3, aaf: 6, vcu_aaf: 3, vpaf: 5, vpaf2: 14 },
  'Unknown': null,
};

// NUEVA ESTRUCTURA: Ponderaciones para el esquema SEMESTRAL (basado en materias específicas)
export const PONDERACIONES_SEMESTRAL_POR_MATERIA: Record<string, number[]> = {
    'Materia y energía I': [3, 3, 3, 3, 3, 11, 3, 3, 3, 3, 3, 12, 3, 3, 3, 3, 3, 12, 20],
    'Ciencias de la Vida': [4, 4, 4, 14, 5, 4, 4, 14, 4, 4, 14, 5, 20],
    'Expresión Literaria': [1, 1, 5, 1, 1, 5, 10, 1, 1, 5, 2, 2, 5, 10, 2, 2, 5, 1, 1, 5, 4, 10, 20],
    'Habilidades y valores IV: plan de vida y carrera': [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 31, 10, 10],
    'Antropología': [4, 5, 3, 5, 10, 3, 5, 3, 5, 10, 3, 5, 4, 5, 10, 20],
    'Matemáticas IV: modelos matemáticos': [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 16],
    'Optativa de lengua adicional al español I': [8, 8, 10, 8, 8, 11, 8, 8, 11, 20],
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
    'Pensamiento Filosófico', 'Pueblo y cultura en el México actual'
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
    'matemáticas i: lenguaje de la ciencia': 'Matemáticas I: lenguaje de la ciencia', // Ensure exact match
    'math ii: pensamiento matemático': 'Matemáticas II: pensamiento matemático',
    'math ii: mathematical thinking': 'Matemáticas II: pensamiento matemático',
    'lengua adicional al español i': 'Optativa de lengua adicional al español I',
    'inglés i': 'Optativa de lengua adicional al español I',
    'francés i': 'Optativa de lengua adicional al español I',
    'alemán i': 'Optativa de lengua adicional al español I',
    'lengua adicional al español ii': 'Optativa de lengua adicional al español II',
    'inglés ii': 'Optativa de lengua adicional al español II',
    'francés ii': 'Optativa de lengua adicional al español II',
    'alemán ii': 'Optativa de lengua adicional al español II',
    'lengua adicional al español iii': 'Optativa de lengua adicional al español III',
    'inglés iii': 'Optativa de lengua adicional al español III',
    'alemán iii': 'Optativa de lengua adicional al español III',
    'francés iii': 'Optativa de lengua adicional al español III',
    'lengua adicional al español iv': 'Optativa de lengua adicional al español IV',
    'inglés iv': 'Optativa de lengua adicional al español IV',
    'alemán iv': 'Optativa de lengua adicional al español IV',
    'francés iv': 'Optativa de lengua adicional al español IV',
    'lengua adicional al español v': 'Optativa de lengua adicional al español V',
    'inglés v': 'Optativa de lengua adicional al español V',
    'alemán v': 'Optativa de lengua adicional al español V',
    'francés v': 'Optativa de lengua adicional al español V',
    'tecnologías de información i': 'Tecnologías de la Información I',
    'information technologies i': 'Tecnologías de la Información I',
    'information technologies': 'Tecnologías de la Información I',
    'tecnologías de información ii': 'Tecnologías de la Información II',
    'information technologies ii': 'Tecnologías de la Información II',
    'habilidades y valores v: lenguaje, emoción y cuerpo': 'Habilidades y valores V: lenguaje',
    'habilidades y valores ii: ser crítico': 'Habilidades y valores II: pensamiento crítico',
    'habilidades v: integración y toma de decisiones': 'Habilidades y valores V: lenguaje',
    'habilidades vi: lenguaje, emoción y cuerpo': 'Habilidades y valores VI: toma de decisiones',
    'lectura y redacción': 'Lectura y Redacción',
    'ciencias de la vida': 'Ciencias de la Vida',
    'life science': 'Ciencias de la Vida',
    'art and culture': 'Arte y cultura',
    'el carbono y sus compuestos': 'El carbono y sus componentes',
    'scientific thought': 'Pensamiento científico',
    'mass and energy i': 'Materia y energía I',
    'mass and energy ii': 'Materia y energía II',
    'ecology and geography': 'Ecología y Geografía',
    'human body care': 'Cuidado del cuerpo humano',
    'contemporary world': 'El mundo contemporáneo',
    'great universal writers': 'Los grandes escritores universales',
    'human being in society': 'El ser humano en sociedad',
    'urban dance': 'IGNORE',
    'soccer': 'IGNORE',
    'tochito': 'IGNORE'
};

function normalizeSubjectName(name: string): string {
    if (!name) return '';
    let cleanedName = name.toLowerCase().replace(/"/g, '').trim();

    if (cleanedName.startsWith('habilidades y valores')) {
        const parts = cleanedName.split(':');
        const mainPart = parts[0].trim();
        // Find the matching official name
        if (mainPart === 'habilidades y valores ii') return 'Habilidades y valores II: pensamiento crítico';
        if (mainPart === 'habilidades y valores iv') return 'Habilidades y valores IV: plan de vida y carrera';
        if (mainPart === 'habilidades y valores v') return 'Habilidades y valores V: lenguaje';
        if (mainPart === 'habilidades y valores vi') return 'Habilidades y valores VI: toma de decisiones';

        for (const officialHabilidad of CLASIFICACION_MATERIAS['Habilidades']) {
            if(officialHabilidad.toLowerCase().startsWith(mainPart)){
                return officialHabilidad;
            }
        }
    }
    
    if (cleanedName.startsWith('antropología')) {
        return 'Antropología';
    }
    
    if (SUBJECT_NAME_NORMALIZATION_MAP[cleanedName]) {
        return SUBJECT_NAME_NORMALIZATION_MAP[cleanedName];
    }

    for (const area in CLASIFICACION_MATERIAS) {
        for (const officialName of CLASIFICACION_MATERIAS[area as AreaName]) {
            if (officialName.toLowerCase() === cleanedName) {
                return officialName;
            }
        }
    }
    return name;
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
  const normalizedName = normalizeSubjectName(subject.name);
  const semestralWeights = PONDERACIONES_SEMESTRAL_POR_MATERIA[normalizedName];

  // Ordenar las actividades cronológicamente (A1, A2, A10, etc.)
  const sortedActivities = Object.entries(subject.activities)
    .filter(([key]) => /^A\d+$/.test(key))
    .sort(([keyA], [keyB]) => {
      const numA = parseInt(keyA.substring(1), 10);
      const numB = parseInt(keyB.substring(1), 10);
      return numA - numB;
    })
    .map(([, value]) => {
        if(typeof value === 'string' && (value.toUpperCase() === 'SC' || value.toUpperCase() === 'NE' || value.trim() === '')) {
            return 0;
        }
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    });

  // --- Lógica para Plan Semestral (por materia específica) ---
  if (semestralWeights) {
    let totalScore = 0;
    for (let i = 0; i < semestralWeights.length; i++) {
        const score = sortedActivities[i] ?? 0;
        const weight = semestralWeights[i];
        totalScore += (score / 100) * weight;
    }
    return totalScore;
  }
  
  // --- Lógica para Plan Tetramestral (por área) ---
  const area = getAreaForMateria(normalizedName);
  const ponderacion = PONDERACIONES_POR_AREA[area];

  if (!ponderacion) {
    return NaN; // Retorna NaN si no hay ponderación definida
  }
  
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
