export const NOTIFICATION_TEMPLATES = {
  professorAbsence: {
    subject: 'Aviso de {tipo}: {alumno}',
    body: 'Estimadas y estimados profesores:\n\nLes informo que {alumno} {accion} {fechas}{motivo}.\n\n{clases}{notas}{comprobante}Les agradeceré tomarlo en cuenta para las actividades de esas fechas. Para cualquier aclaración, quedo a sus órdenes.\n\nSaludos cordiales.',
  },
  parentFollowUp: {
    body: 'Hola. Le escribo del área de Mentoría de Prepa Tecmilenio para dar seguimiento académico a {alumno}. {riesgo}¿Podemos conversar?',
  },
  studentFollowUp: {
    body: 'Hola, {nombre}. Te escribo del área de Mentoría para dar seguimiento a tus materias. {riesgo}¿Podemos conversar?',
  },
};

export type NotificationTemplateKey = keyof typeof NOTIFICATION_TEMPLATES;

export function readNotificationTemplate<K extends NotificationTemplateKey>(key: K): typeof NOTIFICATION_TEMPLATES[K] {
  if (typeof window === 'undefined') return NOTIFICATION_TEMPLATES[key];
  try {
    const stored = JSON.parse(localStorage.getItem(`sentinel:template:${key}`) || '{}');
    if (key === 'professorAbsence') {
      if (typeof stored.body === 'string' && !stored.body.includes('{accion}')) stored.body = stored.body.replace('se ausentará', '{accion}');
      if (typeof stored.subject === 'string' && !stored.subject.includes('{tipo}')) stored.subject = stored.subject.replace('ausencia', '{tipo}');
    }
    return { ...NOTIFICATION_TEMPLATES[key], ...stored };
  } catch {
    return NOTIFICATION_TEMPLATES[key];
  }
}

export function saveNotificationTemplate<K extends NotificationTemplateKey>(key: K, template: typeof NOTIFICATION_TEMPLATES[K]) {
  localStorage.setItem(`sentinel:template:${key}`, JSON.stringify(template));
}

export function fillNotificationTemplate(template: string, fields: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/gi, (match, key: string) => fields[key] ?? match);
}

export function describeNotificationTiming(from: Date, to: Date | undefined, lateArrival: boolean, now = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const endDate = to || from;
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (end < today) return { label: 'Fecha pasada', action: lateArrival ? 'llegó tarde' : 'se ausentó' };
  if (start > today) return { label: 'Próximamente', action: lateArrival ? 'llegará tarde' : 'se ausentará' };
  return { label: 'Incluye hoy', action: lateArrival ? 'registra una llegada tarde' : 'registra una ausencia' };
}
