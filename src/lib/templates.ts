
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export type Step = 'CONVOCATORIA' | 'NOTIFICACION' | 'ACUERDO' | 'RESOLUCION' | 'NOTIFICACION_RESOLUCION';

export const stepKeys: Step[] = ['CONVOCATORIA', 'NOTIFICACION', 'ACUERDO', 'RESOLUCION', 'NOTIFICACION_RESOLUCION'];

export interface CaseData {
  NUMERO_EXPEDIENTE?: string;
  CAMPUS?: string;
  LUGAR?: string;
  FECHA_REPORTE?: Date;
  FECHA_ACTUAL?: Date;
  NOMBRE_REPORTANTE?: string;
  NOMBRE_ALUMNO?: string;
  MATRICULA_ALUMNO?: string;
  SEMESTRE_ALUMNO?: string;
  NOMBRE_TUTOR?: string;
  PARENTESCO_TUTOR?: string;
  DESCRIPCION_HECHOS?: string;
  ARTICULOS_PRESUNTOS?: string;
  PRESIDENTE_COMITE?: string;
  CARGO_PRESIDENTE?: string;
  LISTA_MIEMBROS_COMITE?: string;
  APLICA_MEDIDA_CAUTELAR?: 'si' | 'no';
  TIPO_MEDIDA_CAUTELAR?: string;
  DESCRIPCION_IMPLICACIONES_MEDIDA?: string;
  FECHA_SESION?: Date;
  HORA_SESION?: string;
  FECHA_NOTIFICACION_EFECTIVA?: Date;
  PRUEBAS_ALUMNO?: string;
  FECHA_RESOLUCION?: Date;
  ARTICULOS_CONFIRMADOS?: string;
  TEXTO_SANCION?: string;
}

const templatesContent: Record<Step, { title: string, template: (data: CaseData) => string }> = {
  CONVOCATORIA: {
    title: "1. Convocatoria",
    template: (data) => `CONVOCATORIA A INTEGRACIÓN DE COMITÉ DISCIPLINARIO

En ${data.LUGAR || '{{LUGAR}}'} a ${format(data.FECHA_ACTUAL || new Date(), "d 'de' LLLL 'de' yyyy", { locale: es })}

${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}, ${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'}, con fundamento en el artículo 151, 152, 153, 154 y 157 del Reglamento General de Alumnos de Universidad Tecmilenio (“Reglamento”), convoca a integrar un Comité Disciplinario, en virtud de haber recibido un reporte en el cual se presume que la conducta de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} con matricula ${data.MATRICULA_ALUMNO || '{{MATRICULA_ALUMNO}}'} constituye una falta de disciplina.

Los hechos que dan pie al comité es un reporte emitido por ${data.NOMBRE_REPORTANTE || '{{NOMBRE_REPORTANTE}}'} y del cual se adjunta copia, donde se presume que ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} incurrió en las faltas de disciplina enmarcadas en los artículos ${data.ARTICULOS_PRESUNTOS || '{{ARTICULOS_PRESUNTOS}}'} del Reglamento.

Considerando que el Comité Disciplinario es la instancia competente para resolver cualquier asunto donde se presuma que la conducta de un estudiante constituye una falta de disciplina prevista en el Reglamento, se convoca a la integración del Comité Disciplinario por:
${data.LISTA_MIEMBROS_COMITE || '{{LISTA_MIEMBROS_COMITE}}'}

Se acuerda notificar a ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} con matrícula ${data.MATRICULA_ALUMNO || '{{MATRICULA_ALUMNO}}'} conforme al artículo 153 del Reglamento y generar el expediente correspondiente, al cual le corresponde el número ${data.NUMERO_EXPEDIENTE || '{{NUMERO_EXPEDIENTE}}'} para integrarse en el expediente académico de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'}.

Por lo expuesto, firma como encargado de presidir el comité:

__________________________
${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}
${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'}
Como Presidente del Comité`
  },
  NOTIFICACION: {
    title: "2. Notificación",
    template: (data) => {
      if (data.APLICA_MEDIDA_CAUTELAR === 'si') {
        return `NOTIFICACIÓN DEL COMITÉ DISCIPLINARIO

En ${data.LUGAR || '{{LUGAR}}'} a ${format(data.FECHA_ACTUAL || new Date(), "d 'de' LLLL 'de' yyyy", { locale: es })}

Sr (a) ${data.NOMBRE_TUTOR || '{{NOMBRE_TUTOR}}'}
${data.PARENTESCO_TUTOR || '{{PARENTESCO_TUTOR}}'} de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'}

${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}, ${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'}, con fundamento en el artículo 153 del Reglamento Escolar de Preparatoria de Universidad Tecmilenio (“Reglamento”) se le notifica a usted a través del presente escrito, sobre la integración de un Comité Disciplinario derivado de reporte en donde se presume que la conducta de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} con matricula ${data.MATRICULA_ALUMNO || '{{MATRICULA_ALUMNO}}'} constituye una falta de disciplina prevista en el Reglamento.

El motivo que da lugar a la integración del Comité es un reporte de fecha ${data.FECHA_REPORTE ? format(data.FECHA_REPORTE, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_REPORTE}}'}, en el cual expresa que ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'}, presuntamente incurrió en ${data.DESCRIPCION_HECHOS || '{{DESCRIPCION_HECHOS}}'}.

Lo anterior se considera como una falta de disciplina en los artículos ${data.ARTICULOS_PRESUNTOS || '{{ARTICULOS_PRESUNTOS}}'} del Reglamento por lo que se le informa de la integración del Comité Disciplinario, el cual atenderá y dará solución al asunto antes mencionado, lo anterior, no sin antes informarle de su derecho de presentar pruebas o todo aquello que a su derecho o de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} convenga con el objetivo de probar su dicho dentro del plazo de 3 días hábiles contados a partir del día siguiente que le es notificado la presente vía electrónica.

Para garantizar la integridad de los involucrados y/o para evitar que se obstaculice el procedimiento del Comité Disciplinario, con fundamento en el artículo 126 y 127 del “Reglamento” se aplica la medida cautelar ${data.TIPO_MEDIDA_CAUTELAR || '{{TIPO_MEDIDA_CAUTELAR}}'} la cual implica ${data.DESCRIPCION_IMPLICACIONES_MEDIDA || '{{DESCRIPCION_IMPLICACIONES_MEDIDA}}'} y que se mantendrá vigente hasta la notificación de la resolución del Comité Disciplinario.

_________________________
${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}
${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'}
Como Presidente del Comité`;
      }
      return `NOTIFICACIÓN DEL COMITÉ DISCIPLINARIO

En ${data.LUGAR || '{{LUGAR}}'} a ${format(data.FECHA_ACTUAL || new Date(), "d 'de' LLLL 'de' yyyy", { locale: es })}

Sr (a) ${data.NOMBRE_TUTOR || '{{NOMBRE_TUTOR}}'}
Padre de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'}

${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}, ${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'}, con fundamento en el artículo 153 del Reglamento Escolar de Preparatoria de Universidad Tecmilenio (“Reglamento”) se le notifica a usted a través del presente escrito, sobre la integración de un Comité Disciplinario derivado de reporte en donde se presume que la conducta de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} con matricula ${data.MATRICULA_ALUMNO || '{{MATRICULA_ALUMNO}}'} constituye una falta de disciplina prevista en el Reglamento.

El motivo que da lugar a la integración del Comité es un reporte con fecha ${data.FECHA_REPORTE ? format(data.FECHA_REPORTE, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_REPORTE}}'}, en el cual expresa que ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'}, presuntamente incurrió en ${data.DESCRIPCION_HECHOS || '{{DESCRIPCION_HECHOS}}'}.

Lo anterior se considera como una falta de disciplina en los artículos ${data.ARTICULOS_PRESUNTOS || '{{ARTICULOS_PRESUNTOS}}'} del Reglamento por lo que se le informa de la integración del Comité Disciplinario, el cual atenderá y dará solución al asunto antes mencionado, lo anterior, no sin antes informarle de su derecho de presentar pruebas o todo aquello que a su derecho o de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} convenga con el objetivo de probar su dicho dentro del plazo de 3 días hábiles contados a partir del día siguiente que le es notificado la presente vía electrónica.

_________________________
${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}
${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'}
Como Presidente del Comité`;
    }
  },
  ACUERDO: {
    title: "3. Acuerdo",
    template: (data) => `ACUERDO DE INTEGRACIÓN DE COMITÉ DISCIPLINARIO

En ${data.LUGAR || '{{LUGAR}}'}
EXPEDIENTE N° ${data.NUMERO_EXPEDIENTE || '{{NUMERO_EXPEDIENTE}}'}

Siendo el día ${data.FECHA_SESION ? format(data.FECHA_SESION, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_SESION}}'} a las ${data.HORA_SESION || '{{HORA_SESION}}'} horas en la Dirección de Preparatoria de Universidad Tecmilenio Campus ${data.CAMPUS || '{{CAMPUS}}'}, queda abierto el expediente para llevar a cabo el Comité Disciplinario en relación al reporte recibido en fecha ${data.FECHA_REPORTE ? format(data.FECHA_REPORTE, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_REPORTE}}'}, donde se menciona que la conducta de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'}, con matrícula ${data.MATRICULA_ALUMNO || '{{MATRICULA_ALUMNO}}'} estudiante de ${data.SEMESTRE_ALUMNO || '{{SEMESTRE_ALUMNO}}'} de Preparatoria de UNIVERSIDAD TECMILENIO, se presume como una falta de disciplina...

Por lo anterior se notificó al alumno (a) ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} y surtió efectos la misma en fecha ${data.FECHA_NOTIFICACION_EFECTIVA ? format(data.FECHA_NOTIFICACION_EFECTIVA, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_NOTIFICACION_EFECTIVA}}'}.

El comité está integrado por:
${data.LISTA_MIEMBROS_COMITE || '{{LISTA_MIEMBROS_COMITE}}'}

DE LOS HECHOS QUE DAN LUGAR A ESTE COMITÉ;
En fecha ${data.FECHA_REPORTE ? format(data.FECHA_REPORTE, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_REPORTE}}'}, se recibió un reporte por parte de ${data.NOMBRE_REPORTANTE || '{{NOMBRE_REPORTANTE}}'}, en el cual se indica lo siguiente:
${data.DESCRIPCION_HECHOS || '{{DESCRIPCION_HECHOS}}'}

PRUEBAS QUE PRESENTA:
${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} presentó las siguientes pruebas y/o escrito dentro de los 3 días hábiles siguientes a la notificación.
${data.PRUEBAS_ALUMNO || '{{PRUEBAS_ALUMNO}}'}`
  },
  RESOLUCION: {
    title: "4. Resolución",
    template: (data) => `RESOLUCIÓN DE COMITÉ DISCIPLINARIO

EXPEDIENTE N° ${data.NUMERO_EXPEDIENTE || '{{NUMERO_EXPEDIENTE}}'}
En ${data.LUGAR || '{{LUGAR}}'}
A ${data.FECHA_RESOLUCION ? format(data.FECHA_RESOLUCION, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_RESOLUCION}}'}

Por escrito de fecha ${data.FECHA_REPORTE ? format(data.FECHA_REPORTE, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_REPORTE}}'} los miembros de este Comité Disciplinario fueron convocados por ${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}, ${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'}... para resolver respecto de la conducta de ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} con matrícula ${data.MATRICULA_ALUMNO || '{{MATRICULA_ALUMNO}}'}...

PRIMERO: Que el hecho que da pie al presente comité fue un reporte entregado el día ${data.FECHA_REPORTE ? format(data.FECHA_REPORTE, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_REPORTE}}'}.
SEGUNDO: Que en dicho reporte se detallan las siguientes circunstancias:
${data.DESCRIPCION_HECHOS || '{{DESCRIPCION_HECHOS}}'}
TERCERO: Que ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} presentó las siguientes pruebas y/o escrito...
${data.PRUEBAS_ALUMNO || '{{PRUEBAS_ALUMNO}}'}

Por lo que respetando los plazos y derechos conferidos a ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'}... el Comité Disciplinario ha determinado que los hechos anteriormente mencionados dan lugar a lo dispuesto por el (los) artículo (s) ${data.ARTICULOS_CONFIRMADOS || '{{ARTICULOS_CONFIRMADOS}}'} previsto(s) en El Reglamento.

// (Aquí va el texto fijo de los artículos del reglamento)

Por lo anterior y en base al material probatorio presentado a este Comité disciplinario... se resuelve en conjunto lo siguiente:
PRIMERO.– Se comprueba y acredita que ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} con matrícula ${data.MATRICULA_ALUMNO || '{{MATRICULA_ALUMNO}}'} sí incurrió en las faltas de disciplina mencionadas en el Artículo (s) ${data.ARTICULOS_CONFIRMADOS || '{{ARTICULOS_CONFIRMADOS}}'} de El Reglamento, por lo que se le sanciona con ${data.TEXTO_SANCION || '{{TEXTO_SANCION}}'}.
SEGUNDO: Se señala como encargado para notificar esta resolución por escrito a ${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} para su debido conocimiento a ${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}, ${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'} como presidente del Comité.

___________________________
${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}
${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'}`
  },
  NOTIFICACION_RESOLUCION: {
    title: "5. Notificación Resolución",
    template: (data) => `NOTIFICACIÓN DE RESOLUCIÓN

EXPEDIENTE N° ${data.NUMERO_EXPEDIENTE || '{{NUMERO_EXPEDIENTE}}'}
En ${data.LUGAR || '{{LUGAR}}'} a ${data.FECHA_RESOLUCION ? format(data.FECHA_RESOLUCION, "d 'de' LLLL 'de' yyyy", { locale: es }) : '{{FECHA_RESOLUCION}}'}

Sr (a) ${data.NOMBRE_TUTOR || '{{NOMBRE_TUTOR}}'}, ${data.PARENTESCO_TUTOR || '{{PARENTESCO_TUTOR}}'} de
${data.NOMBRE_ALUMNO || '{{NOMBRE_ALUMNO}}'} con matrícula ${data.MATRICULA_ALUMNO || '{{MATRICULA_ALUMNO}}'}

Se procede a notificarle de manera electrónica la resolución del Comité Disciplinario que se adjunta al presente correo electrónico.

___________________________
${data.PRESIDENTE_COMITE || '{{PRESIDENTE_COMITE}}'}
${data.CARGO_PRESIDENTE || '{{CARGO_PRESIDENTE}}'} de Campus ${data.CAMPUS || '{{CAMPUS}}'}`
  }
};

export const templates = templatesContent;

export function generateDocument(step: Step, data: CaseData): string {
    const populatedData = { ...data, FECHA_ACTUAL: new Date() };
    const templateFn = templates[step].template;
    return templateFn(populatedData);
}
