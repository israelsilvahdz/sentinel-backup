

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDashboardFilters } from './DashboardClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { getSeguimientoEntries, updateSeguimientoStatus, deleteSeguimientoEntry } from '@/lib/firebase-services';
import type { SeguimientoEntry, StudentContact } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Trash2, Printer, AlertTriangle, FileWarning, HelpCircle, ClipboardList, MessageSquare, Phone, Copy, Check, FileCheck2, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';


function CopyableContactField({ label, value }: { label: string, value: string }) {
    const { toast } = useToast();
    if (!value || value.toLowerCase() === 'no disponible') return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(value).then(() => {
            toast({
                title: 'Copiado!',
                description: `${label} copiado al portapapeles.`
            });
        });
    };

    return (
        <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <div className="flex flex-col">
                    <Badge variant="secondary" className="w-fit">{label}</Badge>
                    <span className="font-mono text-sm">{value}</span>
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" /> Copiar
            </Button>
        </div>
    );
}

function NotifyParentsDialog({ entry, subjectsInCase, contact }: { entry: SeguimientoEntry, subjectsInCase: any[], contact: StudentContact | undefined }) {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const generateMessage = () => {
    let subjectDetails = subjectsInCase.map(s => {
        if (entry.situation === 'faltas') {
            return `${s.name} (${s.absences} de ${s.absenceLimit} faltas)`;
        }
        if (entry.situation === 'no-entregados') {
            return `${s.missedAssignments} de ${s.missedAssignmentLimit} tareas no entregadas en ${s.name}`;
        }
        return s.name;
    }).join(', ');

    let message = `Estimados padres de ${entry.studentName}, les saludamos cordialmente desde Tecmilenio para informarles sobre la siguiente situación académica: `;

    switch (entry.situation) {
        case 'faltas':
            message += `Se ha detectado un número considerable de faltas en las siguientes materias: ${subjectDetails}.`;
            break;
        case 'no-entregados':
            message += `Se ha registrado un número considerable de tareas no entregadas en: ${subjectDetails}.`;
            break;
        case 'otro':
            message += `Se ha registrado un caso de seguimiento con las siguientes notas: "${entry.notes}".`;
            break;
    }

    message += ` Agradecemos su apoyo desde casa para dar seguimiento a este tema. Quedo a su disposición.`;
    return message;
  };
  
  const message = generateMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
        setIsCopied(true);
        toast({ title: '¡Mensaje copiado!', description: 'El mensaje está listo para ser pegado.' });
        setTimeout(() => setIsCopied(false), 2500);
    });
  };

  return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notificar a Padres</DialogTitle>
          <DialogDescription>
            Copia el mensaje y usa los contactos para enviarlo por WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div className="rounded-md border bg-muted/50 p-4 text-sm">
                {message}
            </div>
             <Button onClick={handleCopy} className="w-full">
                {isCopied ? <Check className="mr-2 h-4 w-4"/> : <Copy className="mr-2 h-4 w-4" />}
                {isCopied ? 'Copiado' : 'Copiar Mensaje'}
            </Button>
            {contact ? (
                <div className="space-y-2">
                    <h4 className="font-semibold">Contactos de los Padres</h4>
                    <CopyableContactField label="Teléfono Papá" value={contact.dadPhone} />
                    <CopyableContactField label="Teléfono Mamá" value={contact.momPhone} />
                </div>
            ) : <p className="text-sm text-muted-foreground text-center">No se encontró información de contacto para los padres.</p>}
        </div>
      </DialogContent>
  );
}


export function SeguimientoPanel() {
  const { allStudentsMap, studentContacts, selectedValue, filterType } = useDashboardFilters();
  const [entries, setEntries] = useState<SeguimientoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completingTask, setCompletingTask] = useState<SeguimientoEntry | null>(null);
  const { toast } = useToast();

  const { register: registerCompletion, handleSubmit: handleSubmitCompletion, reset: resetCompletion } = useForm<{ completionNotes: string }>();

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedEntries = await getSeguimientoEntries();
      setEntries(fetchedEntries);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los casos de seguimiento.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

 const filteredEntries = useMemo(() => {
    let baseEntries = entries;
    
    if (!showCompleted) {
        baseEntries = baseEntries.filter(entry => entry.status === 'pendiente');
    }

    if (!selectedValue) return baseEntries;
    
    if (filterType === 'leader') {
      return baseEntries.filter(entry => entry.leader === selectedValue);
    }
    if (filterType === 'tutor') {
        return baseEntries.filter(entry => entry.tutor === selectedValue);
    }
    
    return baseEntries;
  }, [entries, selectedValue, filterType, showCompleted]);

  const pendingCount = useMemo(() => filteredEntries.filter(e => e.status === 'pendiente').length, [filteredEntries]);
  
  const handleOpenCompletionDialog = (entry: SeguimientoEntry) => {
    if (entry.status === 'completado') {
        // Si ya está completado, lo volvemos a poner pendiente
        updateSeguimientoStatus(entry.id, 'pendiente').then(() => {
            setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'pendiente', completedAt: undefined, completionNotes: undefined } : e));
            toast({ title: 'Tarea reabierta' });
        }).catch(err => {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reabrir la tarea.'});
        });
    } else {
        setCompletingTask(entry);
    }
  };


  const onCompleteSubmit = async (data: { completionNotes: string }) => {
    if (!completingTask) return;

    try {
      await updateSeguimientoStatus(completingTask.id, 'completado', data.completionNotes);
      setEntries(prev => prev.map(e => e.id === completingTask.id ? { 
          ...e, 
          status: 'completado', 
          completionNotes: data.completionNotes,
          completedAt: new Date() // Simula el timestamp para la UI
      } : e));
      toast({ title: 'Tarea completada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado del caso.' });
    } finally {
      setCompletingTask(null);
      resetCompletion();
    }
  };


  const handleDelete = async (id: string) => {
    try {
      await deleteSeguimientoEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      toast({ title: 'Caso eliminado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el caso.' });
    }
  };

    const SITUATION_MAP: Record<SeguimientoEntry['situation'], { icon: React.ReactNode, text: string }> = {
    'faltas': { icon: <FileWarning className="h-4 w-4 text-yellow-600" />, text: 'Faltas' },
    'no-entregados': { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, text: 'Tareas No Entregadas' },
    'otro': { icon: <HelpCircle className="h-4 w-4 text-blue-600" />, text: 'Otro' },
  };

  const handleGenerateReport = () => {
    const entriesToPrint = filteredEntries.filter(e => e.status === 'pendiente');

    if (entriesToPrint.length === 0) {
      toast({
        title: "No hay casos pendientes para imprimir",
        description: "No hay casos de seguimiento marcados como 'pendientes' en la vista actual.",
      });
      return;
    }

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      const studentData = (id: string) => allStudentsMap.get(id);

      const content = `
        <html>
          <head>
            <title>Reporte de Seguimiento - ${format(new Date(), 'dd/MM/yyyy')}</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                line-height: 1.5;
                color: #27272a; 
                margin: 0.5in;
                font-size: 9px;
              }
              @page {
                size: letter;
                margin: 0.5in;
              }
              @media print {
                .no-print { display: none; }
                body { font-size: 8px; }
              }
              h1 { 
                color: #17594A; 
                border-bottom: 2px solid #17594A; 
                padding-bottom: 8px; 
                margin-bottom: 1rem; 
                font-size: 1.5em; 
              }
              .print-button { 
                position: fixed; 
                top: 1rem; 
                right: 1rem; 
                padding: 8px 12px; 
                background: #17594A; 
                color: white; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
              }
               .report-entry {
                margin-bottom: 0.75rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid #e2e8f0;
                page-break-inside: avoid;
              }
              .student-header { font-weight: bold; }
              .details-section { margin-top: 2px; }
              .materias-list, .notes-text {
                  white-space: pre-wrap;
                  line-height: 1.3;
              }
              .materia-item {
                  display: block;
                  margin-bottom: 1px;
              }
              strong { font-weight: bold; }
            </style>
          </head>
          <body>
            <button class="print-button no-print" onclick="window.print()">Imprimir Reporte</button>
            <h1>Reporte de Seguimiento - ${selectedValue ? `${filterType}: ${selectedValue} - ` : ''}${format(new Date(), "d 'de' LLLL, yyyy", { locale: es })}</h1>
            <p>Total de casos pendientes: ${entriesToPrint.length}</p>
            
            <div id="report-content">
              ${entriesToPrint.map(entry => {
                const student = studentData(entry.studentId);
                const subjectsInCase = entry.subjects.map(subjectId => student?.subjects?.find(s => s.id === subjectId)).filter(Boolean);
                const situationText = SITUATION_MAP[entry.situation].text || entry.situation;

                let materiasHtml = '';
                if (subjectsInCase.length > 0) {
                    const subjectItems = subjectsInCase.map(s => {
                        const schedule = s?.schedule;
                        const scheduleInfo = schedule && schedule.days.length > 0
                            ? ` - [${schedule.days.join(', ')}, ${schedule.startTime}-${schedule.endTime}]`
                            : '';
                        
                        let detail = '';
                        if (entry.situation === 'faltas') {
                            detail = `(${s!.absences} de ${s!.absenceLimit} Faltas)`;
                        } else if (entry.situation === 'no-entregados') {
                            detail = `(${s!.missedAssignments} de ${s!.missedAssignmentLimit} Tareas NE)`;
                        }

                        return `<span class="materia-item">${s!.name} (Gpo: ${s!.group}) ${detail}${scheduleInfo}</span>`;
                    }).join('');
                    materiasHtml = `<div class="details-section"><strong>Materias:</strong><div class="materias-list">${subjectItems}</div></div>`;
                }

                let notasHtml = '';
                if (entry.notes) {
                    notasHtml = `<div class="details-section"><strong>Notas:</strong> <span class="notes-text">${entry.notes}</span></div>`;
                }

                return `
                  <div class="report-entry">
                      <p class="student-header">
                        ${entry.studentName} (${entry.studentId}) - <strong>Situación:</strong> ${situationText}
                      </p>
                      ${materiasHtml}
                      ${notasHtml}
                  </div>
                `;
              }).join('')}
            </div>
          </body>
        </html>
      `;
      reportWindow.document.write(content);
      reportWindow.document.close();
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Reporte de Seguimiento</h1>
            <p className="text-muted-foreground">Casos de alumnos que requieren atención y seguimiento especial.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="show-completed" checked={showCompleted} onCheckedChange={setShowCompleted} />
              <Label htmlFor="show-completed">Mostrar completados</Label>
            </div>
            <Button onClick={handleGenerateReport}>
                <Printer className="mr-2 h-4 w-4" />
                Generar Reporte ({pendingCount})
            </Button>
        </div>
      </header>

      <div className="space-y-4">
        {filteredEntries.length > 0 ? filteredEntries.map(entry => {
          const student = allStudentsMap.get(entry.studentId);
          const studentContact = studentContacts[entry.studentId];
          const subjectsInCase = entry.subjects.map(subjectId => 
            student?.subjects?.find(s => s.id === subjectId)
          ).filter(Boolean);

          return (
            <Card key={entry.id} className={entry.status === 'completado' ? 'bg-muted/30' : ''}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Checkbox
                        checked={entry.status === 'completado'}
                        onCheckedChange={() => handleOpenCompletionDialog(entry)}
                        className="mr-2"
                     />
                    <span className={entry.status === 'completado' ? 'line-through text-muted-foreground' : ''}>
                        {entry.studentName}
                    </span>
                    <Badge variant="secondary">{entry.studentId}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Agregado el: {format(entry.createdAt.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600"><MessageSquare className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <NotifyParentsDialog entry={entry} subjectsInCase={subjectsInCase} contact={studentContact} />
                     </Dialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción es permanente y eliminará el caso de seguimiento.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                 <div className="flex items-center gap-2 font-semibold">
                    {SITUATION_MAP[entry.situation].icon}
                    <span>Situación: {SITUATION_MAP[entry.situation].text}</span>
                 </div>
                 {subjectsInCase.length > 0 && (
                    <div>
                        <h4 className="font-medium text-sm">Materias involucradas:</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {subjectsInCase.map(s => <Badge key={s!.id} variant="outline">{s!.name}</Badge>)}
                        </div>
                    </div>
                 )}
                 {entry.notes && (
                    <div>
                        <h4 className="font-medium text-sm">Notas:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-gray-50 p-2 rounded-md">{entry.notes}</p>
                    </div>
                 )}
                 {entry.status === 'completado' && (
                    <div className="border-t pt-3 mt-3">
                        <h4 className="font-medium text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary"/>Notas de Cierre:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">{entry.completionNotes || 'Sin notas.'}</p>
                        <p className="text-xs text-muted-foreground mt-1 pl-6">Completado el: {entry.completedAt ? format(entry.completedAt.toDate(), "d 'de' LLLL, yyyy 'a las' HH:mm", { locale: es }) : 'N/A'}</p>
                    </div>
                 )}
              </CardContent>
            </Card>
          );
        }) : (
            <Card className="text-center p-12">
                <CardHeader>
                    <div className="mx-auto bg-secondary p-3 rounded-full w-fit">
                        <ClipboardList className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>No hay casos de seguimiento</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                      {showCompleted ? "No se encontraron casos de seguimiento con los filtros actuales." : "No hay casos pendientes. ¡Buen trabajo! Activa el interruptor para ver los casos completados."}
                    </p>
                </CardContent>
            </Card>
        )}
      </div>
      
      {/* Diálogo para completar tarea */}
      <Dialog open={!!completingTask} onOpenChange={(open) => !open && setCompletingTask(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Completar Tarea de Seguimiento</DialogTitle>
                <DialogDescription>Añade una nota de cierre para documentar las acciones tomadas.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitCompletion(onCompleteSubmit)}>
                <div className="py-4 space-y-2">
                    <Label htmlFor="completionNotes">Notas de Cierre (Opcional)</Label>
                    <Textarea id="completionNotes" {...registerCompletion('completionNotes')} placeholder="Ej. Se contactó a los padres, el alumno se comprometió a..." />
                </div>
                <DialogFooter>
                     <Button type="button" variant="ghost" onClick={() => setCompletingTask(null)}>Cancelar</Button>
                     <Button type="submit">Marcar como Completada</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
