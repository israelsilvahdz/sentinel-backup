
export interface CurriculumCourse {
  name: string;
  prerequisite?: string;
  isPlaceholder?: boolean;
  isFlexible?: boolean;
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
      { name: 'Ecología y Geografía' },
      { name: 'Tecnologías de la Información I' },
      { name: 'Habilidades y valores I: bienestar' },
      { name: 'Optativa de lengua adicional al español I' },
    ],
  },
  {
    name: 'Segundo Tetramestre',
    courses: [
      { name: 'Matemáticas II: pensamiento matemático', prerequisite: 'Matemáticas I: lenguaje de la ciencia' },
      { name: 'Historia de México' },
      { name: 'Comunicación Integral', prerequisite: 'Lectura y Redacción' },
      { name: 'Transformación de la materia' },
      { name: 'Tecnologías de la Información II', prerequisite: 'Tecnologías de la Información I' },
      { name: 'Habilidades y valores II: pensamiento crítico' },
      { name: 'Optativa de lengua adicional al español II' },
    ],
  },
  {
    name: 'Tercer Tetramestre',
    courses: [
      { name: 'Matemáticas III: regularidad y repetición', prerequisite: 'Matemáticas II: pensamiento matemático' },
      { name: 'México Contemporáneo' },
      { name: 'Los grandes escritores universales' },
      { name: 'El carbono y sus componentes' },
      { name: 'Conceptos y dilemas éticos' },
      { name: 'Habilidades y valores III: ser creativo' },
      { name: 'Optativa de lengua adicional al español III' },
    ],
  },
  {
    name: 'Cuarto Tetramestre',
    courses: [
      { name: 'Matemáticas IV: modelos matemáticos', prerequisite: 'Matemáticas III: regularidad y repetición' },
      { name: 'Antropología, cultura y conciencia social' },
      { name: 'Expresión Literaria' },
      { name: 'Materia y energía I' },
      { name: 'Ciencias de la Vida' },
      { name: 'Habilidades y valores IV: plan de vida y carrera' },
      { name: 'Optativa de lengua adicional al español IV' },
    ],
  },
  {
    name: 'Quinto Tetramestre',
    courses: [
      { name: 'Cálculo Diferencial', prerequisite: 'Matemáticas IV: modelos matemáticos' },
      { name: 'Expresión musical' },
      { name: 'El mundo contemporáneo' },
      { name: 'Optativa módulo de formación I' },
      { name: 'Materia y energía II', prerequisite: 'Materia y energía I' },
      { name: 'Cuidado del cuerpo humano', prerequisite: 'Ciencias de la Vida' },
      { name: 'Habilidades y valores V: lenguaje, emoción y cuerpo' },
    ],
  },
  {
    name: 'Sexto Tetramestre',
    courses: [
      { name: 'Cálculo Integral', prerequisite: 'Cálculo Diferencial' },
      { name: 'Pensamiento científico' },
      { name: 'Arte y cultura' },
      { name: 'Optativa módulo de formación II' },
      { name: 'Optativa módulo de formación III' },
      { name: 'México en el siglo XXI' },
      { name: 'Habilidades y valores VI: toma de decisiones' },
    ],
  },
];
