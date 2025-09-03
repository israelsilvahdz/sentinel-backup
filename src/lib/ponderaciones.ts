
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
    'Los grandes escritores universales', 'Expresión Literaria', 'Pensamiento científico'
  ],
  'Tecnologías': [
    'Tecnologías de la Información I', 'Tecnologías de la Información II'
  ],
  'Habilidades': [
    'Habilidades y valores I: bienestar', 'Habilidades y valores II: pensamiento crítico', 
    'Habilidades y valores III: ser creativo', 'Habilidades y valores IV: plan de vida y carrera', 
    'Habilidades y valores V: lenguaje', 'Habilidades y valores VI: toma de decisiones', 
    'Conceptos y dilemas éticos', 'Pensamiento Filosófico' // 'Pensamiento Filosófico' no estaba en la lista, pero puede ser de Habilidades.
  ],
  'Optativas': [
    'Optativa de lengua adicional al español I', 'Optativa de lengua adicional al español II', 
    'Optativa de lengua adicional al español III', 'Optativa de lengua adicional al español IV', 
    'Optativa de lengua adicional al español V', 'Optativa de módulo de formación', 
    'Expresión musical'
  ],
  'Unknown': [],
};

// Mapa inverso para búsqueda rápida
const materiaToAreaMap = new Map<string, AreaName>();
Object.entries(CLASIFICACION_MATERIAS).forEach(([area, materias]) => {
  materias.forEach(materia => {
    materiaToAreaMap.set(materia, area as AreaName);
  });
});

export function getAreaForMateria(materiaName: string): AreaName {
  return materiaToAreaMap.get(materiaName) || 'Unknown';
}
