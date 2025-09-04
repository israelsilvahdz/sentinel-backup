
export interface CurriculumCourse {
  name: string;
  prerequisite?: string;
}

export interface CurriculumTerm {
  name: string;
  courses: CurriculumCourse[];
}

export const curriculum: CurriculumTerm[] = [
  {
    name: 'Primer Tetramestre',
    courses: [
      { name: 'Matemáticas I: lenguaje de la ciencia' },
      { name: 'El ser humano en sociedad' },
      { name: 'Lectura y Redacción' },
      { name: 'Optativa de lengua adicional al español I' },
      { name: 'Ecología y Geografía' },
      { name: 'Tecnologías de la Información I' },
      { name: 'Habilidades y valores I: bienestar' },
    ],
  },
  {
    name: 'Segundo Tetramestre',
    courses: [
      { name: 'Matemáticas II: pensamiento matemático', prerequisite: 'Matemáticas I: lenguaje de la ciencia' },
      { name: 'Historia de México' },
      { name: 'Comunicación Integral', prerequisite: 'Lectura y Redacción' },
      { name: 'Optativa de lengua adicional al español II', prerequisite: 'Optativa de lengua adicional al español I' },
      { name: 'Transformación de la materia' },
      { name: 'Tecnologías de la Información II', prerequisite: 'Tecnologías de la Información I' },
      { name: 'Habilidades y valores II: pensamiento crítico' },
    ],
  },
  {
    name: 'Tercer Tetramestre',
    courses: [
      { name: 'Matemáticas III: regularidad y repetición', prerequisite: 'Matemáticas II: pensamiento matemático' },
      { name: 'México Contemporáneo', prerequisite: 'Historia de México' },
      { name: 'Los grandes escritores universales', prerequisite: 'Comunicación Integral' },
      { name: 'Optativa de lengua adicional al español III', prerequisite: 'Optativa de lengua adicional al español II' },
      { name: 'El carbono y sus componentes', prerequisite: 'Transformación de la materia' },
      { name: 'Conceptos y dilemas éticos' },
      { name: 'Habilidades y valores III: ser creativo' },
    ],
  },
  {
    name: 'Cuarto Tetramestre',
    courses: [
      { name: 'Matemáticas IV: modelos matemáticos', prerequisite: 'Matemáticas III: regularidad y repetición' },
      { name: 'Materia y energía I', prerequisite: 'Matemáticas II: pensamiento matemático' },
      { name: 'Antropología', prerequisite: 'El ser humano en sociedad' },
      { name: 'Expresión Literaria' },
      { name: 'Optativa de lengua adicional al español IV', prerequisite: 'Optativa de lengua adicional al español III' },
      { name: 'Ciencias de la Vida' },
      { name: 'Habilidades y valores IV: plan de vida y carrera' },
    ],
  },
  {
    name: 'Quinto Tetramestre',
    courses: [
      { name: 'Cálculo Diferencial', prerequisite: 'Matemáticas IV: modelos matemáticos' },
      { name: 'Materia y energía II', prerequisite: 'Materia y energía I' },
      { name: 'El mundo contemporáneo' },
      { name: 'Optativa de lengua adicional al español V', prerequisite: 'Optativa de lengua adicional al español IV' },
      { name: 'Expresión musical' },
      { name: 'Cuidado del cuerpo humano', prerequisite: 'Ciencias de la Vida' },
      { name: 'Habilidades y valores V: lenguaje' },
    ],
  },
  {
    name: 'Sexto Tetramestre',
    courses: [
      { name: 'Cálculo Integral', prerequisite: 'Cálculo Diferencial' },
      { name: 'Arte y cultura', prerequisite: 'El mundo contemporáneo' },
      { name: 'México en el siglo XXI' },
      { name: 'Pueblo y cultura en el México actual' },
      { name: 'Pensamiento científico' },
      { name: 'Habilidades y valores VI: toma de decisiones' },
    ],
  },
];
