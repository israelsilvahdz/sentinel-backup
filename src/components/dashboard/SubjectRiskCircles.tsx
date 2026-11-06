"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { localWorkspace } from '@/lib/local-workspace';
import { needsFollowUp, riskColor, riskColors, riskPercentage, riskSubjects, type SubjectFollowUp } from '@/lib/subject-risk';
import type { Student, SubjectSummary } from '@/types/student';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';

const noticeDate = (date: number | null) => date === null ? 'Confirmando fecha…' : new Date(date).toLocaleString('es-MX');

const FollowUpContext = createContext<{ items: SubjectFollowUp[]; ready: boolean; error: string; saveNotice: (notice: SubjectFollowUp) => Promise<void> }>({ items: [], ready: false, error: '', saveNotice: async () => {} });
export function SubjectFollowUpProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({ items: [] as SubjectFollowUp[], ready: false, error: '' });
  useEffect(() => { localWorkspace<SubjectFollowUp[]>('notices').then(items => setState({items: items || [], ready: true, error: ''})).catch(()=>setState({items: [], ready: false, error: 'No se pudo leer el seguimiento local.'})); }, []);
  const saveNotice = async (notice: SubjectFollowUp) => {
    const items = [notice, ...state.items];
    await localWorkspace('notices', items);
    setState({items, ready: true, error: ''});
  };
  return <FollowUpContext.Provider value={{...state, saveNotice}}>{children}</FollowUpContext.Provider>;
}

export function SubjectRiskCircles({ student }: { student: Student }) {
  const { items, ready, error, saveNotice } = useContext(FollowUpContext);
  const [selected, setSelected] = useState<SubjectSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const comments = (subject: SubjectSummary) => items.filter(item => item.studentId === student.id && item.subjectId === subject.id && item.group === subject.group);
  const subjects = riskSubjects(student);
  const latestNotice = (subject: SubjectSummary) => comments(subject).find(item => item.kind === 'notice');
  const isNotified = (subject: SubjectSummary) => {
    const notice = latestNotice(subject);
    return !!notice && subject.absences <= notice.absences && subject.missedAssignments <= notice.missedAssignments;
  };

  const detail = (subject: SubjectSummary) => `Faltas: ${subject.absences}/${subject.absenceLimit} (${riskPercentage(subject.absences, subject.absenceLimit)}). NE: ${subject.missedAssignments}/${subject.missedAssignmentLimit} (${riskPercentage(subject.missedAssignments, subject.missedAssignmentLimit)}).`;

  async function save() {
    if (!selected || isNotified(selected) || saving || !ready) return;
    setSaving(true);
    setSaveError('');
    try {
      await saveNotice({ id: crypto.randomUUID(),
        studentId: student.id, subjectId: selected.id, group: selected.group,
        kind: 'notice', createdAt: Date.now(),
        absences: selected.absences, missedAssignments: selected.missedAssignments,
      });
    } catch {
      setSaveError('No se guardó el aviso. Vuelve a marcar el check para intentar de nuevo.');
    } finally { setSaving(false); }
  }

  if (!subjects.length) return <span className="text-xs text-slate-500">Sin materias</span>;
  return <div className="relative z-10 flex w-full flex-wrap items-center gap-1.5 py-1" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <TooltipProvider delayDuration={150}>
      {subjects.map(subject => {
        const latest = latestNotice(subject);
        const pending = ready && needsFollowUp(subject, latest);
        const label = `${subject.name}, grupo ${subject.group}. ${detail(subject)} ${pending ? 'Aviso pendiente.' : ''} ${latest ? `Último aviso: ${noticeDate(latest.createdAt)}.` : ''}`;
        return <Tooltip key={`${subject.id}-${subject.group}`}>
          <TooltipTrigger asChild>
            <button type="button" aria-label={label} onClick={() => { setSelected(subject); setSaveError(''); }} className="relative h-5 w-5 shrink-0 rounded-full border border-white shadow-sm outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(to right, ${riskColors[riskColor(subject.absences, subject.absenceLimit)].color} 50%, ${riskColors[riskColor(subject.missedAssignments, subject.missedAssignmentLimit)].color} 50%)` }} />
              {pending && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-slate-900 text-[8px] font-bold text-white">!</span>}
              {ready && isNotified(subject) && <Check aria-hidden="true" className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-white text-emerald-800" />}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs space-y-1 bg-white text-slate-900 shadow-lg">
            <p className="font-bold">{subject.name} · {subject.group}</p>
            <p>{detail(subject)}</p>
            <p>Izquierda: faltas · Derecha: NE</p>
            {error ? <p>{error}</p> : !ready ? <p>Cargando avisos…</p> : latest ? <p>Último aviso: {noticeDate(latest.createdAt)}</p> : <p>Sin aviso registrado.</p>}
            {pending && <p className="font-bold text-red-700">Aviso pendiente para el riesgo actual.</p>}
            <p className="text-xs">Pulsa para marcar como avisado o consultar las fechas.</p>
          </TooltipContent>
        </Tooltip>;
      })}
    </TooltipProvider>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving) setSelected(null); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Aviso por materia</DialogTitle><DialogDescription>{student.name} · {selected?.name} · Grupo {selected?.group}</DialogDescription></DialogHeader>
        {selected && <>
          <p className="text-sm">{detail(selected)}</p>
          {ready && needsFollowUp(selected, latestNotice(selected)) && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Aviso pendiente. Marca el check después de avisar al alumno o a su familia.</p>}
          <label className="flex items-center gap-3 rounded-lg border p-4 text-sm font-medium">
            <Checkbox checked={isNotified(selected)} disabled={saving || !ready || isNotified(selected)} onCheckedChange={checked => { if (checked === true) void save(); }} />
            {saving ? 'Guardando aviso…' : 'Avisado'}
          </label>
          <p className="text-xs text-slate-600">El check guarda la fecha y hora automáticamente. Registra un aviso realizado; no envía mensajes. Si aumentan las faltas o NE, podrás registrar un nuevo aviso conservando las fechas anteriores.</p>
          {latestNotice(selected) && <p role="status" className="text-sm">Último aviso: {noticeDate(latestNotice(selected)!.createdAt)}</p>}
          {(saveError || error) && <p role="alert" className="text-sm text-red-700">{saveError || error}</p>}
          <div className="space-y-3 border-t pt-3"><h4 className="font-semibold">Historial de avisos</h4>{comments(selected).map(item => <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p>{item.kind === 'notice' ? 'Avisado' : 'Acercamiento anterior'} · {noticeDate(item.createdAt)}</p>{item.text && <p className="whitespace-pre-wrap break-words">{item.text}</p>}<p className="mt-2 text-xs text-slate-600">{item.author && `${item.role || ''}: ${item.author} · `}Faltas: {item.absences} · NE: {item.missedAssignments}</p></div>)}{ready && !comments(selected).length && <p className="text-sm text-slate-500">Sin avisos registrados.</p>}</div>
        </>}
      </DialogContent>
    </Dialog>
  </div>;
}
