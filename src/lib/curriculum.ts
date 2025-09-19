
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
      { name: 'placeholder1', isPlaceholder: true },
      { name: 'El ser humano en sociedad' },
      { name: 'placeholder2', isPlaceholder: true },
      { name: 'Lectura y Redacción' },
      { name: 'Optativa de lengua adicional al español I', isFlexible: true },
      { name: 'Ecología y Geografía' },
      { name: 'Tecnologías de la Información I' },
      { name: 'placeholder3', isPlaceholder: true },
      { name: 'Habilidades y valores I: bienestar' },
    ],
  },
  {
    name: 'Segundo Tetramestre',
    courses: [
      { name: 'Matemáticas II: pensamiento matemático', prerequisite: 'Matemáticas I: lenguaje de la ciencia' },
      { name: 'placeholder1', isPlaceholder: true },
      { name: 'placeholder2', isPlaceholder: true },
      { name: 'Historia de México' },
      { name: 'Comunicación Integral', prerequisite: 'Lectura y Redacción' },
      { name: 'Optativa de lengua adicional al español II', prerequisite: 'Optativa de lengua adicional al español I', isFlexible: true },
      { name: 'Transformación de la materia' },
      { name: 'Tecnologías de la Información II', prerequisite: 'Tecnologías de la Información I' },
      { name: 'placeholder3', isPlaceholder: true },
      { name: 'Habilidades y valores II: pensamiento crítico' },
    ],
  },
  {
    name: 'Tercer Tetramestre',
    courses: [
      { name: 'Matemáticas III: regularidad y repetición', prerequisite: 'Matemáticas II: pensamiento matemático' },
      { name: 'placeholder1', isPlaceholder: true },
      { name: 'placeholder2', isPlaceholder: true },
      { name: 'México Contemporáneo', prerequisite: 'Historia de México' },
      { name: 'Los grandes escritores universales', prerequisite: 'Comunicación Integral' },
      { name: 'Optativa de lengua adicional al español III', prerequisite: 'Optativa de lengua adicional al español II', isFlexible: true },
      { name: 'El carbono y sus componentes', prerequisite: 'Transformación de la materia' },
      { name: 'placeholder3', isPlaceholder: true },
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
      { name: 'placeholder1', isPlaceholder: true },
      { name: 'Expresión Literaria', prerequisite: 'Los grandes escritores universales', isFlexible: true },
      { name: 'Optativa de lengua adicional al español IV', prerequisite: 'Optativa de lengua adicional al español III', isFlexible: true },
      { name: 'placeholder2', isPlaceholder: true },
      { name: 'Ciencias de la Vida' },
      { name: 'placeholder3', isPlaceholder: true },
      { name: 'Habilidades y valores IV: plan de vida y carrera' },
    ],
  },
  {
    name: 'Quinto Tetramestre',
    courses: [
      { name: 'Cálculo Diferencial', prerequisite: 'Matemáticas IV: modelos matemáticos' },
      { name: 'Materia y energía II', prerequisite: 'Materia y energía I' },
      { name: 'El mundo contemporáneo' },
      { name: 'placeholder1', isPlaceholder: true },
      { name: 'placeholder2', isPlaceholder: true },
      { name: 'Optativa de lengua adicional al español V', prerequisite: 'Optativa de lengua adicional al español IV', isFlexible: true },
      { name: 'Expresión musical', isFlexible: true },
      { name: 'Cuidado del cuerpo humano', prerequisite: 'Ciencias de la Vida' },
      { name: 'placeholder3', isPlaceholder: true },
      { name: 'Habilidades y valores V: lenguaje' },
    ],
  },
  {
    name: 'Sexto Tetramestre',
    courses: [
      { name: 'Cálculo Integral', prerequisite: 'Cálculo Diferencial' },
      { name: 'placeholder1', isPlaceholder: true },
      { name: 'Arte y cultura', prerequisite: 'El mundo contemporáneo', isFlexible: true },
      { name: 'México en el siglo XXI', prerequisite: 'México Contemporáneo' },
      { name: 'Pensamiento científico', isFlexible: true },
      { name: 'Optativa de módulo de formación', isFlexible: true },
      { name: 'placeholder2', isPlaceholder: true },
      { name: 'placeholder3', isPlaceholder: true },
      { name: 'Pensamiento Filosófico', prerequisite: 'Conceptos y dilemas éticos' },
      { name: 'Habilidades y valores VI: toma de decisiones' },
    ],
  },
];
