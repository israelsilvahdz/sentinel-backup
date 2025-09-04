
export interface CurriculumCourse {
  name: string;
  prerequisite?: string;
  isPlaceholder?: boolean;
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
      { name: 'Optativa de lengua adicional al español I' },
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
      { name: 'placeholder4', isPlaceholder: true },
      { name: 'Historia de México' },
      { name: 'placeholder5', isPlaceholder: true },
      { name: 'Comunicación Integral', prerequisite: 'Lectura y Redacción' },
      { name: 'Optativa de lengua adicional al español II', prerequisite: 'Optativa de lengua adicional al español I' },
      { name: 'Transformación de la materia', prerequisite: 'Ecología y Geografía' },
      { name: 'Tecnologías de la Información II', prerequisite: 'Tecnologías de la Información I' },
      { name: 'placeholder6', isPlaceholder: true },
      { name: 'Habilidades y valores II: pensamiento crítico' },
    ],
  },
  {
    name: 'Tercer Tetramestre',
    courses: [
      { name: 'Matemáticas III: regularidad y repetición', prerequisite: 'Matemáticas II: pensamiento matemático' },
      { name: 'placeholder7', isPlaceholder: true },
      { name: 'México Contemporáneo' },
      { name: 'placeholder8', isPlaceholder: true },
      { name: 'Los grandes escritores universales', prerequisite: 'Comunicación Integral' },
      { name: 'Optativa de lengua adicional al español III', prerequisite: 'Optativa de lengua adicional al español II' },
      { name: 'El carbono y sus componentes', prerequisite: 'Transformación de la materia' },
      { name: 'placeholder9', isPlaceholder: true },
      { name: 'Conceptos y dilemas éticos' },
      { name: 'Habilidades y valores III: ser creativo' },
    ],
  },
  {
    name: 'Cuarto Tetramestre',
    courses: [
      { name: 'Matemáticas IV: modelos matemáticos', prerequisite: 'Matemáticas III: regularidad y repetición' },
      { name: 'Materia y energía I' },
      { name: 'Antropología', prerequisite: 'El ser humano en sociedad' },
      { name: 'placeholder10', isPlaceholder: true },
      { name: 'Expresión Literaria' },
      { name: 'Optativa de lengua adicional al español IV', prerequisite: 'Optativa de lengua adicional al español III' },
      { name: 'placeholder11', isPlaceholder: true },
      { name: 'Ciencias de la Vida' },
      { name: 'placeholder12', isPlaceholder: true },
      { name: 'Habilidades y valores IV: plan de vida y carrera' },
    ],
  },
  {
    name: 'Quinto Tetramestre',
    courses: [
      { name: 'Cálculo Diferencial', prerequisite: 'Matemáticas IV: modelos matemáticos' },
      { name: 'Materia y energía II', prerequisite: 'Materia y energía I' },
      { name: 'El mundo contemporáneo' },
      { name: 'placeholder14', isPlaceholder: true },
      { name: 'placeholder15', isPlaceholder: true },
      { name: 'Optativa de lengua adicional al español V', prerequisite: 'Optativa de lengua adicional al español IV' },
      { name: 'Expresión musical' },
      { name: 'Cuidado del cuerpo humano', prerequisite: 'Ciencias de la Vida' },
      { name: 'placeholder1', isPlaceholder: true },
      { name: 'Habilidades y valores V: lenguaje' },
    ],
  },
  {
    name: 'Sexto Tetramestre',
    courses: [
      { name: 'Cálculo Integral', prerequisite: 'Cálculo Diferencial' },
      { name: 'placeholder11', isPlaceholder: true },
      { name: 'Arte y cultura', prerequisite: 'El mundo contemporáneo' },
      { name: 'México en el siglo XXI', prerequisite: 'México Contemporáneo' },
      { name: 'Pensamiento científico' },
      { name: 'Optativa de módulo de formación' },
      { name: 'placeholder16', isPlaceholder: true },
      { name: 'placeholder17', isPlaceholder: true },
      { name: 'Pensamiento Filosófico', prerequisite: 'Conceptos y dilemas éticos' },
      { name: 'Habilidades y valores VI: toma de decisiones' },
    ],
  },
];
