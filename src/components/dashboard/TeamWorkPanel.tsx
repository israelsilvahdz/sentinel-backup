"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, PlusCircle, Trash2, ClipboardList, ShieldCheck, 
  AlertCircle, Filter, Calendar, CheckCircle2, Clock, PlayCircle, LogIn, Sparkles,
  ChevronDown, ChevronUp, MessageSquare, Send, Edit3, User, ArrowUp, ArrowDown, History, GripVertical
} from 'lucide-react';
import { StudentSearchPopover } from './BitacoraPanel';
import { format, isToday } from 'date-fns';
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
  
  // View Control
  const [activeTab, setActiveTab] = useState<'pending' | 'route'>('pending');
  
  // Dialog States
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  
  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Filters
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
        toast({ title: `Acceso concedido al equipo ${team.name}` });
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
        toast({ variant: 'destructive', title: 'Código ya registrado' });
      } else {
        const newTeam = await createWorkTeam(authCode, authCode);
        setCurrentWorkTeam(newTeam);
        sessionStorage.setItem('current_work_team', JSON.stringify(newTeam));
        loadTasks(newTeam.id);
        toast({ title: 'Equipo registrado con éxito' });
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
      let parsedDueDate = null;
      if (taskForm.dueDate) {
        const [year, month, day] = taskForm.dueDate.split('-').map(Number);
        parsedDueDate = Timestamp.fromDate(new Date(year, month - 1, day));
      }

      const taskData = {
        teamId: currentTeam.id,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        linkedStudents: taskForm.linkedStudents,
        dueDate: parsedDueDate
      };

      if (editingTask) {
        await updateWorkTask(editingTask.id, taskData);
        toast({ title: 'Tarea actualizada' });
      } else {
        await addWorkTask({
          ...taskData,
          status: 'todo',
          order: 999
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
      const updates: Partial<WorkTask> = { status: newStatus };
      if (newStatus === 'done') {
        updates.completedAt = Timestamp.now();
      }
      await updateWorkTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      toast({ title: `Estado actualizado: ${STATUS_MAP[newStatus].label}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar estado' });
    }
  };

  // Improved reordering logic for Route
  const routeTasks = useMemo(() => {
    return tasks
      .filter(t => 
        t.status === 'in-progress' || 
        (t.status === 'todo' && t.dueDate && isToday(t.dueDate.toDate()))
      )
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [tasks]);

  const handleMoveInRoute = async (taskId: string, direction: 'up' | 'down') => {
    const currentList = [...routeTasks];
    const idx = currentList.findIndex(t => t.id === taskId);
    if (idx === -1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= currentList.length) return;

    // Swap elements in local array
    const result = Array.from(currentList);
    const [removed] = result.splice(idx, 1);
    result.splice(newIdx, 0, removed);

    // Persist new orders
    try {
      const updates = result.map((task, index) => updateWorkTask(task.id, { order: index }));
      await Promise.all(updates);
      loadTasks(currentTeam!.id);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al reordenar' });
    }
  };

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId === targetId) return;

    const currentList = [...routeTasks];
    const sourceIdx = currentList.findIndex(t => t.id === sourceId);
    const targetIdx = currentList.findIndex(t => t.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const result = Array.from(currentList);
    const [removed] = result.splice(sourceIdx, 1);
    result.splice(targetIdx, 0, removed);

    try {
      const updates = result.map((task, index) => updateWorkTask(task.id, { order: index }));
      await Promise.all(updates);
      loadTasks(currentTeam!.id);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al reordenar' });
    } finally {
      setDraggedTaskId(null);
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

  const pendingTabTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done')
      .filter(t => (priorityFilter === 'all' || t.priority === priorityFilter))
      .sort((a, b) => {
        const priorityDiff = PRIORITY_MAP[b.priority].weight - PRIORITY_MAP[a.priority].weight;
        if (priorityDiff !== 0) return priorityDiff;
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });
  }, [tasks, priorityFilter]);

  const completedTodayTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'done' && t.completedAt && isToday(t.completedAt.toDate()))
      .sort((a, b) => (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0));
  }, [tasks]);

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
            <span className="mr-1">Código de Equipo:</span>
            <Badge variant="outline" className="text-foreground border-primary font-bold">{currentTeam.name}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            sessionStorage.removeItem('current_work_team');
            setCurrentWorkTeam(null);
          }}>
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-12 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="pending" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background shadow-sm">
            <Clock className="h-4 w-4" /> Pendientes
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingTabTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="route" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background shadow-sm">
            <PlayCircle className="h-4 w-4" /> Ruta de Hoy
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">{routeTasks.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6 pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap bg-card border p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Prioridad:</span>
              </div>
              <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setIsTaskDialogOpen(true)} className="shadow-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Pendiente
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pendingTabTasks.length > 0 ? pendingTabTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onEdit={handleEditTask} 
                onStatusChange={handleStatusChange} 
                onToggleExpand={toggleExpand}
                isExpanded={expandedTasks.has(task.id)}
                newComment={newCommentText[task.id] || ''}
                onCommentChange={(text) => setNewCommentText({...newCommentText, [task.id]: text})}
                onAddComment={() => handleAddComment(task.id)}
                onDelete={() => deleteWorkTask(task.id).then(() => loadTasks(currentTeam.id))}
              />
            )) : (
              <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold">Sin pendientes</h3>
                <p className="text-muted-foreground">Todo está al día o completado.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="route" className="pt-6">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" /> Procedimiento del Día
                </h2>
                <span className="text-sm text-muted-foreground font-medium">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </div>
              
              <div className="relative space-y-4 pl-4 border-l-2 border-dashed border-muted-foreground/30">
                {routeTasks.length > 0 ? routeTasks.map((task, index) => (
                  <div 
                    key={task.id} 
                    className="relative"
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, task.id)}
                  >
                    <div className="absolute -left-[25px] top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-sm" />
                    <Card className={cn(
                      "hover:shadow-md transition-all border-l-4 overflow-hidden group cursor-grab active:cursor-grabbing",
                      draggedTaskId === task.id ? "opacity-40" : "opacity-100"
                    )} style={{ borderLeftColor: PRIORITY_MAP[task.priority].color.split(' ')[0].replace('bg-', '') }}>
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-[10px] h-5", PRIORITY_MAP[task.priority].color)}>
                                {PRIORITY_MAP[task.priority].label}
                              </Badge>
                              <h3 className="font-bold">{task.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <Clock className="h-3 w-3" />
                               <span>Estado actual: {STATUS_MAP[task.status].label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex flex-col gap-1 mr-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveInRoute(task.id, 'up')} disabled={index === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveInRoute(task.id, 'down')} disabled={index === routeTasks.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                          {task.status === 'in-progress' && (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => handleStatusChange(task.id, 'todo')}>
                              <Clock className="h-3.5 w-3.5 mr-1" /> Posponer
                            </Button>
                          )}
                          <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange(task.id, 'done')}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Finalizar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )) : (
                  <div className="p-12 text-center bg-muted/20 rounded-xl border-2 border-dashed">
                    <p className="text-muted-foreground italic">No hay tareas asignadas para la ruta de hoy.</p>
                    <Button variant="link" onClick={() => setActiveTab('pending')}>Añadir desde pendientes</Button>
                  </div>
                )}
              </div>
            </div>

            {completedTodayTasks.length > 0 && (
              <div className="space-y-4 pt-8 border-t">
                <h2 className="text-xl font-bold flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" /> Completado Hoy
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {completedTodayTasks.map(task => (
                    <Card key={task.id} className="bg-green-50/50 opacity-80 border-green-100">
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <h3 className="font-semibold text-sm line-through text-muted-foreground">{task.title}</h3>
                            <p className="text-[10px] text-muted-foreground">
                              Finalizado a las {format(task.completedAt.toDate(), "HH:mm")}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleStatusChange(task.id, 'in-progress')}>
                          <History className="h-3 w-3 mr-1" /> Reabrir
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Creation/Edition Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { setIsTaskDialogOpen(open); if (!open) resetForm(); }}>
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
    </div>
  );
}

function TaskCard({ 
  task, onEdit, onStatusChange, onToggleExpand, isExpanded, 
  newComment, onCommentChange, onAddComment, onDelete 
}: { 
  task: WorkTask, 
  onEdit: (t: WorkTask) => void, 
  onStatusChange: (id: string, s: TaskStatus) => void,
  onToggleExpand: (id: string) => void,
  isExpanded: boolean,
  newComment: string,
  onCommentChange: (val: string) => void,
  onAddComment: () => void,
  onDelete: () => void
}) {
  const priorityInfo = PRIORITY_MAP[task.priority];
  const statusInfo = STATUS_MAP[task.status];
  const isDueToday = task.dueDate && isToday(task.dueDate.toDate());

  return (
    <Card className={cn(
      "hover:shadow-md transition-all duration-200 border-l-[6px] overflow-hidden", 
      task.status === 'done' ? 'opacity-60' : 'opacity-100',
      task.priority === 'urgent' ? 'border-l-red-600' : 
      task.priority === 'high' ? 'border-l-orange-500' :
      task.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500',
      isDueToday && task.status === 'todo' && "ring-2 ring-primary/20"
    )}>
      <div 
        className="p-4 cursor-pointer hover:bg-muted/5 flex items-center justify-between"
        onClick={() => onToggleExpand(task.id)}
      >
        <div className="flex items-center gap-4 flex-1">
          <Checkbox 
            id={`check-${task.id}`}
            checked={task.status === 'done'} 
            onCheckedChange={(checked) => onStatusChange(task.id, checked ? 'done' : 'todo')} 
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
                <span className={cn(
                  "text-[10px] font-semibold flex items-center gap-1",
                  isDueToday ? "text-primary font-bold" : "text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format((task.dueDate as any).toDate(), 'dd MMM', { locale: es })}
                  {isDueToday && " (Hoy)"}
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
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
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'in-progress'); }}>
                    <PlayCircle className="mr-2 h-4 w-4" /> Iniciar Ruta Diaria
                  </Button>
                )}
                {task.status === 'in-progress' && (
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'todo'); }}>
                    <Clock className="mr-2 h-4 w-4" /> Regresar a Pendientes
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
                      <AlertDialogDescription>Esta acción es permanente y no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                  value={newComment} 
                  onChange={e => onCommentChange(e.target.value)}
                  placeholder="Añadir nota..."
                  className="h-8 text-xs"
                  onKeyDown={e => { if(e.key === 'Enter') onAddComment(); }}
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={onAddComment}>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
