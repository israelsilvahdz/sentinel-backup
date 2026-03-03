
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { useToast } from '@/hooks/use-toast';
import { 
  findWorkTeamByName, 
  createWorkTeam, 
  getWorkTasks, 
  addWorkTask, 
  updateWorkTask, 
  deleteWorkTask,
  addWorkTaskComment
} from '@/lib/team-work-services';
import type { WorkTeam, WorkTask, TaskPriority, TaskStatus, WorkTaskComment } from '@/types/student';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, PlusCircle, Trash2, ClipboardList, ShieldCheck, 
  AlertCircle, Filter, Calendar, CheckCircle2, Clock, PlayCircle, LogIn, Sparkles,
  ChevronDown, ChevronUp, MessageSquare, Send, Edit3, User
} from 'lucide-react';
import { StudentSearchPopover } from './BitacoraPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

const PRIORITY_MAP: Record<TaskPriority, { label: string, color: string, weight: number }> = {
  urgent: { label: 'Urgente', color: 'bg-red-600 text-white', weight: 4 },
  high: { label: 'Alta', color: 'bg-orange-500 text-white', weight: 3 },
  medium: { label: 'Media', color: 'bg-yellow-500 text-black', weight: 2 },
  low: { label: 'Baja', color: 'bg-blue-500 text-white', weight: 1 },
};

const STATUS_MAP: Record<TaskStatus, { label: string, icon: React.ReactNode, color: string }> = {
  'todo': { label: 'Pendiente', icon: <Clock className="h-4 w-4" />, color: 'text-muted-foreground' },
  'in-progress': { label: 'En Ruta', icon: <PlayCircle className="h-4 w-4" />, color: 'text-primary' },
  'done': { label: 'Completado', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600' },
};

export function TeamWorkPanel() {
  const [currentTeam, setCurrentWorkTeam] = useState<WorkTeam | null>(null);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authCode, setAuthCode] = useState('');
  
  // Dialog States
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  // Task Form State
  const [taskForm, setTaskForm] = useState<{
    title: string, 
    description: string, 
    priority: TaskPriority, 
    linkedStudents: { id: string, name: string }[],
    dueDate: string
  }>({
    title: '',
    description: '',
    priority: 'medium',
    linkedStudents: [],
    dueDate: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    const saved = sessionStorage.getItem('current_work_team');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentWorkTeam(parsed);
        loadTasks(parsed.id);
      } catch (e) {
        sessionStorage.removeItem('current_work_team');
      }
    }
  }, []);

  const loadTasks = async (teamId: string) => {
    setIsLoading(true);
    try {
      const data = await getWorkTasks(teamId);
      setTasks(data);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error al cargar tareas' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authCode) {
      toast({ variant: 'destructive', title: 'Código vacío' });
      return;
    }
    setIsLoading(true);
    try {
      const team = await findWorkTeamByName(authCode);
      if (team) {
        setCurrentWorkTeam(team);
        sessionStorage.setItem('current_work_team', JSON.stringify(team));
        loadTasks(team.id);
        toast({ title: `Bienvenido al equipo ${team.name}` });
      } else {
        toast({ variant: 'destructive', title: 'Código no encontrado' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterTeam = async () => {
    if (!authCode) {
      toast({ variant: 'destructive', title: 'Código vacío' });
      return;
    }
    setIsLoading(true);
    try {
      const existing = await findWorkTeamByName(authCode);
      if (existing) {
        toast({ variant: 'destructive', title: 'Código ocupado' });
      } else {
        const newTeam = await createWorkTeam(authCode, authCode);
        setCurrentWorkTeam(newTeam);
        sessionStorage.setItem('current_work_team', JSON.stringify(newTeam));
        loadTasks(newTeam.id);
        toast({ title: 'Equipo creado con éxito' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskForm.title || !currentTeam) {
      toast({ variant: 'destructive', title: 'El título es obligatorio' });
      return;
    }
    setIsLoading(true);
    try {
      const taskData = {
        teamId: currentTeam.id,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        linkedStudents: taskForm.linkedStudents,
        dueDate: taskForm.dueDate ? Timestamp.fromDate(new Date(taskForm.dueDate)) : null
      };

      if (editingTask) {
        await updateWorkTask(editingTask.id, taskData);
        toast({ title: 'Tarea actualizada' });
      } else {
        await addWorkTask({
          ...taskData,
          status: 'todo',
        });
        toast({ title: 'Tarea creada con éxito' });
      }
      
      setIsTaskDialogOpen(false);
      resetForm();
      await loadTasks(currentTeam.id);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error al guardar tarea' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTaskForm({ title: '', description: '', priority: 'medium', linkedStudents: [], dueDate: '' });
    setEditingTask(null);
  };

  const handleEditTask = (task: WorkTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      linkedStudents: task.linkedStudents,
      dueDate: task.dueDate ? format(task.dueDate.toDate(), 'yyyy-MM-dd') : ''
    });
    setIsTaskDialogOpen(true);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateWorkTask(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar estado' });
    }
  };

  const handleAddComment = async (taskId: string) => {
    const text = newCommentText[taskId];
    if (!text?.trim()) return;

    try {
      await addWorkTaskComment(taskId, text);
      setNewCommentText(prev => ({ ...prev, [taskId]: '' }));
      loadTasks(currentTeam!.id);
      toast({ title: 'Comentario añadido' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al añadir comentario' });
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter(t => (statusFilter === 'all' || t.status === statusFilter))
      .filter(t => (priorityFilter === 'all' || t.priority === priorityFilter))
      .sort((a, b) => {
        const priorityDiff = PRIORITY_MAP[b.priority].weight - PRIORITY_MAP[a.priority].weight;
        if (priorityDiff !== 0) return priorityDiff;
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
  }, [tasks, statusFilter, priorityFilter]);

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-primary">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Ruta de Equipo</CardTitle>
            <CardDescription>Introduce el código de equipo para acceder.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Entrar
                </TabsTrigger>
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Registrar
                </TabsTrigger>
              </TabsList>
              
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <Label className="text-lg">Código del Equipo</Label>
                  <Input 
                    value={authCode} 
                    onChange={e => setAuthCode(e.target.value)} 
                    placeholder="Ej. 12" 
                    className="text-center text-3xl font-bold tracking-[0.5em] h-16"
                    maxLength={10}
                  />
                </div>
              </div>

              <TabsContent value="login" className="pt-4">
                <Button className="w-full h-12 text-lg" onClick={handleLogin} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : <LogIn className="mr-2 h-5 w-5" />}
                  Cargar Tareas
                </Button>
              </TabsContent>

              <TabsContent value="create" className="pt-4">
                <Button variant="secondary" className="w-full h-12 text-lg" onClick={handleRegisterTeam} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                  Crear Equipo
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" /> Ruta Diaria / Equipo
          </h1>
          <div className="text-sm text-muted-foreground flex items-center mt-1">
            <span className="mr-1">Código:</span>
            <Badge variant="outline" className="text-foreground border-primary">{currentTeam.name}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { setIsTaskDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="shadow-md">
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Pendiente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Editar Pendiente' : 'Añadir Nueva Tarea'}</DialogTitle>
                <DialogDescription>Describe el pendiente y vincula a los alumnos si es necesario.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título del Pendiente</Label>
                  <Input 
                    value={taskForm.title} 
                    onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
                    placeholder="Ej. Entrevista con padres de familia"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select value={taskForm.priority} onValueChange={(v: any) => setTaskForm({...taskForm, priority: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgente</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="low">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha límite</Label>
                    <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vincular Alumnos (Opcional)</Label>
                  <StudentSearchPopover onStudentSelect={(s) => {
                    if (!taskForm.linkedStudents.find(ls => ls.id === s.id)) {
                      setTaskForm({...taskForm, linkedStudents: [...taskForm.linkedStudents, s]});
                    }
                  }} />
                  {taskForm.linkedStudents.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 p-2 bg-muted/30 rounded-md">
                      {taskForm.linkedStudents.map(ls => (
                        <Badge key={ls.id} variant="secondary" className="gap-1 pr-1">
                          {ls.name}
                          <button onClick={() => setTaskForm({...taskForm, linkedStudents: taskForm.linkedStudents.filter(s => s.id !== ls.id)})} className="hover:text-destructive p-0.5"><Trash2 className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Descripción / Acuerdos</Label>
                  <Textarea 
                    value={taskForm.description} 
                    onChange={e => setTaskForm({...taskForm, description: e.target.value})} 
                    placeholder="Detalles adicionales..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsTaskDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveTask} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                  {editingTask ? 'Actualizar' : 'Guardar'} Tarea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => {
            sessionStorage.removeItem('current_work_team');
            setCurrentWorkTeam(null);
          }}>
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4 flex-wrap bg-card border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filtros:</span>
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="todo">Solo Pendientes</SelectItem>
            <SelectItem value="in-progress">En Ruta Diaria</SelectItem>
            <SelectItem value="done">Completados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground font-medium">
          {filteredAndSortedTasks.length} tareas encontradas
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando tablero...</p>
          </div>
        ) : filteredAndSortedTasks.length > 0 ? (
          filteredAndSortedTasks.map(task => {
            const isExpanded = expandedTasks.has(task.id);
            const statusInfo = STATUS_MAP[task.status];
            const priorityInfo = PRIORITY_MAP[task.priority];

            return (
              <Card key={task.id} className={cn(
                "hover:shadow-md transition-all duration-200 border-l-[6px] overflow-hidden", 
                task.status === 'done' ? 'opacity-60' : 'opacity-100',
                task.priority === 'urgent' ? 'border-l-red-600' : 
                task.priority === 'high' ? 'border-l-orange-500' :
                task.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
              )}>
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/5 flex items-center justify-between"
                  onClick={() => toggleExpand(task.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox 
                      id={`check-${task.id}`}
                      checked={task.status === 'done'} 
                      onCheckedChange={(checked) => handleStatusChange(task.id, checked ? 'done' : 'todo')} 
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="space-y-1">
                      <h3 className={cn(
                        "text-lg font-bold leading-none", 
                        task.status === 'done' && 'line-through text-muted-foreground'
                      )}>
                        {task.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn("text-[10px] px-1.5 h-5", priorityInfo.color)}>
                          {priorityInfo.label}
                        </Badge>
                        <span className={cn("text-[10px] font-semibold flex items-center gap-1", statusInfo.color)}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        {task.dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format((task.dueDate as any).toDate(), 'dd MMM', { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.linkedStudents.length > 0 && (
                      <div className="hidden sm:flex -space-x-2 mr-4">
                        {task.linkedStudents.slice(0, 3).map(s => (
                          <div key={s.id} className="h-7 w-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary" title={s.name}>
                            {s.name.substring(0, 1)}
                          </div>
                        ))}
                        {task.linkedStudents.length > 3 && (
                          <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            +{task.linkedStudents.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="p-4 pt-0 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-dashed">
                      <div className="md:col-span-2 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">Descripción y Acuerdos</Label>
                          <div className="text-sm bg-muted/20 p-4 rounded-xl border border-dashed text-foreground/80 whitespace-pre-wrap min-h-[80px]">
                            {task.description || "Sin descripción adicional."}
                          </div>
                        </div>

                        {task.linkedStudents.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold">Alumnos Vinculados</Label>
                            <div className="flex flex-wrap gap-2">
                              {task.linkedStudents.map(ls => (
                                <Badge key={ls.id} variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors py-1 pl-2 pr-1 gap-2">
                                  <User className="h-3 w-3" />
                                  {ls.name} <span className="opacity-60 font-mono text-[10px]">({ls.id})</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {task.status === 'todo' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'in-progress'); }}>
                              <PlayCircle className="mr-2 h-4 w-4" /> Iniciar Ruta Diaria
                            </Button>
                          )}
                          {task.status === 'in-progress' && (
                            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'todo'); }}>
                              <Clock className="mr-2 h-4 w-4" /> Regresar a Pendientes
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteWorkTask(task.id).then(() => loadTasks(currentTeam.id)); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Permanente
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4 border-l pl-6 hidden md:block">
                        <Label className="text-xs uppercase text-muted-foreground tracking-wider font-bold flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" /> Comentarios / Bitácora
                        </Label>
                        <ScrollArea className="h-[200px] pr-4">
                          <div className="space-y-3">
                            {task.comments && task.comments.length > 0 ? task.comments.map(c => (
                              <div key={c.id} className="bg-muted/30 p-3 rounded-lg border text-xs">
                                <p className="text-foreground/90">{c.text}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                  {format(c.createdAt.toDate(), 'dd MMM, HH:mm', { locale: es })}
                                </p>
                              </div>
                            )) : (
                              <p className="text-xs text-muted-foreground italic text-center py-10">Sin comentarios aún.</p>
                            )}
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2">
                          <Input 
                            value={newCommentText[task.id] || ''} 
                            onChange={e => setNewCommentText({...newCommentText, [task.id]: e.target.value})}
                            placeholder="Añadir nota..."
                            className="h-8 text-xs"
                            onKeyDown={e => { if(e.key === 'Enter') handleAddComment(task.id); }}
                          />
                          <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleAddComment(task.id)}>
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <div className="text-center py-24 bg-card rounded-2xl border-2 border-dashed shadow-inner">
            <div className="bg-muted/50 p-4 rounded-full w-fit mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">Sin tareas que mostrar</h3>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">Ajusta tus filtros o añade un nuevo pendiente para el equipo.</p>
            <Button variant="outline" className="mt-6" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); }}>
              Ver todos los pendientes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
