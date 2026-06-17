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
  addWorkTaskComment,
  bulkUpdateTaskOrders
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
  ChevronDown, ChevronUp, MessageSquare, Send, Edit3, User, ArrowUp, ArrowDown, History, GripVertical, UserCog, ListFilter,
  Link2, Zap, Briefcase, Search, X, GraduationCap, Power, PowerOff
} from 'lucide-react';
import { StudentSearchPopover } from './BitacoraPanel';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';

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
  const { leaders, tutors, setActiveView, setContextualStudentIds } = useDashboardFilters();
  const [currentTeam, setCurrentWorkTeam] = useState<WorkTeam | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authCode, setAuthCode] = useState('');
  
  // View Control
  const [activeTab, setActiveTab] = useState<'pending' | 'cases' | 'route'>('pending');
  
  // Dialog States
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  
  // Search
  const [studentSearch, setStudentSearch] = useState('');

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  // Task Form State
  const [taskForm, setTaskForm] = useState<{
    title: string, 
    description: string, 
    priority: TaskPriority, 
    linkedStudents: { id: string, name: string }[],
    dueDate: string,
    isCase: boolean,
    parentId?: string,
    parentTitle?: string
  }>({
    title: '',
    description: '',
    priority: 'medium',
    linkedStudents: [],
    dueDate: '',
    isCase: false
  });

  const { toast } = useToast();

  const signatoryOptions = useMemo(() => {
    const combined = [...new Set([...leaders, ...tutors])];
    return combined.sort((a, b) => a.localeCompare(b));
  }, [leaders, tutors]);

  useEffect(() => {
    const savedTeam = sessionStorage.getItem('current_work_team');
    if (savedTeam) {
      try {
        const parsed = JSON.parse(savedTeam);
        setCurrentWorkTeam(parsed);
        loadTasks(parsed.id);
      } catch (e) {
        sessionStorage.removeItem('current_work_team');
      }
    }
    
    const savedUser = sessionStorage.getItem('current_work_user');
    if (savedUser) setCurrentUser(savedUser);
  }, []);

  const handleUserChange = (val: string) => {
    setCurrentUser(val);
    sessionStorage.setItem('current_work_user', val);
  };

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
        dueDate: parsedDueDate,
        isCase: taskForm.isCase,
        isCaseActive: taskForm.isCase ? true : undefined,
        parentId: taskForm.parentId || undefined,
        parentTitle: taskForm.parentTitle || undefined
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
    setTaskForm({ title: '', description: '', priority: 'medium', linkedStudents: [], dueDate: '', isCase: false, parentId: undefined, parentTitle: '' });
    setEditingTask(null);
  };

  const handleEditTask = (task: WorkTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      linkedStudents: task.linkedStudents,
      dueDate: task.dueDate ? format(task.dueDate.toDate(), 'yyyy-MM-dd') : '',
      isCase: !!task.isCase,
      parentId: task.parentId,
      parentTitle: task.parentTitle
    });
    setIsTaskDialogOpen(true);
  };

  const handleAddDerivedTask = (parentTask: WorkTask) => {
    setEditingTask(null);
    setTaskForm({
      title: `Seguimiento: ${parentTask.title}`,
      description: '',
      priority: parentTask.priority,
      linkedStudents: parentTask.linkedStudents,
      dueDate: '',
      isCase: false,
      parentId: parentTask.id,
      parentTitle: parentTask.title
    });
    setIsTaskDialogOpen(true);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'done') {
        updates.completedAt = Timestamp.now();
      } else {
        updates.completedAt = null;
        updates.completionNotes = null;
      }
      await updateWorkTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      toast({ title: `Estado actualizado: ${STATUS_MAP[newStatus].label}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar estado' });
    }
  };

  const handleToggleCase = async (taskId: string, isCase: boolean) => {
    try {
      const updates: any = { isCase, isCaseActive: isCase ? true : null };
      await updateWorkTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      toast({ title: isCase ? 'Marcado como Caso' : 'Regresado a Pendientes' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar' });
    }
  };

  const handleToggleCaseActive = async (taskId: string, isCaseActive: boolean) => {
    try {
      await updateWorkTask(taskId, { isCaseActive });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCaseActive } : t));
      toast({ title: isCaseActive ? 'Caso activado' : 'Caso inactivado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar' });
    }
  };

  const handleGoToStudent = (studentId: string) => {
    setContextualStudentIds(new Set([studentId]));
    setActiveView('students');
  };

  const routeTasks = useMemo(() => {
    return tasks
      .filter(t => 
        t.status === 'in-progress' || 
        (t.status === 'todo' && t.dueDate && isToday(t.dueDate.toDate()))
      )
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [tasks]);

  const updateOrdersOptimistically = (newSortedTasks: WorkTask[]) => {
    const updatedTasks = tasks.map(t => {
      const foundIdx = newSortedTasks.findIndex(st => st.id === t.id);
      if (foundIdx !== -1) return { ...t, order: foundIdx };
      return t;
    });
    setTasks(updatedTasks);

    const ordersToUpdate = newSortedTasks.map((t, i) => ({ id: t.id, order: i }));
    bulkUpdateTaskOrders(ordersToUpdate).catch(() => {
      toast({ variant: 'destructive', title: 'Error al sincronizar orden' });
      loadTasks(currentTeam!.id); 
    });
  }

  const handleMoveInRoute = (taskId: string, direction: 'up' | 'down') => {
    const currentList = [...routeTasks];
    const idx = currentList.findIndex(t => t.id === taskId);
    if (idx === -1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= currentList.length) return;

    const result = Array.from(currentList);
    const [removed] = result.splice(idx, 1);
    result.splice(newIdx, 0, removed);

    updateOrdersOptimistically(result);
  };

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
    setDraggedTaskId(null);
    
    if (sourceId === targetId) return;

    const currentList = [...routeTasks];
    const sourceIdx = currentList.findIndex(t => t.id === sourceId);
    const targetIdx = currentList.findIndex(t => t.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const result = Array.from(currentList);
    const [removed] = result.splice(sourceIdx, 1);
    result.splice(targetIdx, 0, removed);

    updateOrdersOptimistically(result);
  };

  const handleAddComment = async (taskId: string) => {
    const text = newCommentText[taskId];
    if (!text?.trim()) return;
    
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Identificación necesaria', description: 'Por favor selecciona quién firma en la parte superior.' });
      return;
    }

    try {
      await addWorkTaskComment(taskId, text, currentUser);
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

  const applyBaseFilters = (list: WorkTask[]) => {
    return list
      .filter(t => {
        if (!studentSearch) return true;
        return t.linkedStudents.some(s => 
          s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
          s.id.toLowerCase().includes(studentSearch.toLowerCase())
        );
      })
      .filter(t => (priorityFilter === 'all' || t.priority === priorityFilter))
      .sort((a, b) => {
        const priorityDiff = PRIORITY_MAP[b.priority].weight - PRIORITY_MAP[a.priority].weight;
        if (priorityDiff !== 0) return priorityDiff;
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });
  };

  const pendingTabTasks = useMemo(() => {
    const list = tasks.filter(t => {
      if (statusFilter === 'all' && !t.parentId) return t.status !== 'done' && !t.isCase;
      if (statusFilter === 'all' && t.parentId) return false;
      return t.status === statusFilter && !t.isCase;
    });
    return applyBaseFilters(list);
  }, [tasks, priorityFilter, statusFilter, studentSearch]);

  const caseTabTasks = useMemo(() => {
    const list = tasks.filter(t => t.isCase && t.status !== 'done');
    return applyBaseFilters(list);
  }, [tasks, priorityFilter, studentSearch]);

  const completedTodayTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'done' && t.completedAt && isToday(t.completedAt.toDate()))
      .sort((a, b) => (b.completedAt?.toMillis?.() || 0) - (a.completedAt?.toMillis?.() || 0));
  }, [tasks]);

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <Card className="w-full max-w-sm shadow-xl border-none bg-white/80 backdrop-blur-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 p-3 rounded-2xl w-fit mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black">Ruta de Equipo</CardTitle>
            <CardDescription className="text-xs uppercase tracking-widest font-bold opacity-60">Acceso Restringido</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-11 p-1 bg-muted/50 rounded-xl">
                <TabsTrigger value="login" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background shadow-sm">
                  <LogIn className="h-4 w-4" /> Entrar
                </TabsTrigger>
                <TabsTrigger value="create" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background shadow-sm">
                  <Sparkles className="h-4 w-4" /> Registrar
                </TabsTrigger>
              </TabsList>
              
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">Código del Equipo</Label>
                  <Input 
                    value={authCode} 
                    onChange={e => setAuthCode(e.target.value)} 
                    placeholder="Ej. 12" 
                    className="text-center text-3xl font-black tracking-[0.5em] h-16 border-2 focus:border-primary/50 transition-all rounded-xl"
                    maxLength={10}
                  />
                </div>
              </div>

              <TabsContent value="login" className="pt-4">
                <Button className="w-full h-12 text-lg font-bold rounded-xl shadow-lg" onClick={handleLogin} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : <LogIn className="mr-2 h-5 w-5" />}
                  Cargar Tareas
                </Button>
              </TabsContent>

              <TabsContent value="create" className="pt-4">
                <Button variant="secondary" className="w-full h-12 text-lg font-bold rounded-xl shadow-lg" onClick={handleRegisterTeam} disabled={isLoading}>
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
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700 pb-20">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 to-emerald-900/5 p-6 md:p-8 border border-primary/10 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border">
              <Zap className="h-3 w-3 text-primary" /> Bitácora de Trabajo 2026
            </div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" /> Ruta Diaria
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Equipo:</span>
              <Badge variant="outline" className="text-primary border-primary/30 font-black px-3 py-0.5 bg-white/50">{currentTeam.name}</Badge>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Responsable:</Label>
                <Select value={currentUser} onValueChange={handleUserChange}>
                  <SelectTrigger className="w-[200px] h-7 border-none bg-transparent focus:ring-0 p-0 font-bold text-sm">
                    <SelectValue placeholder="¿Quién eres?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <ScrollArea className="max-h-[300px]">
                      {signatoryOptions.map(option => (
                        <SelectItem key={option} value={option} className="rounded-lg">{option}</SelectItem>
                      ))}
                      <SelectItem value="Secretaria" className="rounded-lg">Asistente / Sec.</SelectItem>
                      <SelectItem value="Otro" className="rounded-lg">Otro Responsable</SelectItem>
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="h-8 w-px bg-muted hidden sm:block" />
            <Button variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl h-9" onClick={() => {
              sessionStorage.removeItem('current_work_team');
              setCurrentWorkTeam(null);
            }}>
              Salir del Equipo
            </Button>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </header>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto h-12 p-1 bg-white/50 backdrop-blur-sm border rounded-2xl shadow-sm mb-10">
          <TabsTrigger value="pending" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Clock className="h-4 w-4" /> Pendientes
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-white/20 text-inherit border-none">{tasks.filter(t => t.status !== 'done' && !t.parentId && !t.isCase).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Briefcase className="h-4 w-4" /> Casos
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-white/20 text-inherit border-none">{tasks.filter(t => t.isCase && t.status !== 'done').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="route" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <PlayCircle className="h-4 w-4" /> Ruta
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-white/20 text-inherit border-none">{routeTasks.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <WorkToolbar 
            priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            studentSearch={studentSearch} setStudentSearch={setStudentSearch}
            onNewClick={() => setIsTaskDialogOpen(true)}
          />
          <div className="grid grid-cols-1 gap-4">
            {pendingTabTasks.length > 0 ? pendingTabTasks.map(task => (
              <TaskCard 
                key={task.id} task={task} allTasks={tasks} onEdit={handleEditTask} onAddDerivedTask={handleAddDerivedTask}
                onStatusChange={handleStatusChange} onToggleCase={handleToggleCase} onToggleCaseActive={handleToggleCaseActive}
                onToggleExpand={toggleExpand} isExpanded={expandedTasks.has(task.id)} newComment={newCommentText[task.id] || ''}
                onCommentChange={(text) => setNewCommentText({...newCommentText, [task.id]: text})} onAddComment={() => handleAddComment(task.id)}
                onDelete={() => deleteWorkTask(task.id).then(() => loadTasks(currentTeam.id))} currentAuthor={currentUser}
                onGoToStudent={handleGoToStudent}
              />
            )) : <EmptyState message="No hay pendientes para mostrar." onAction={() => setIsTaskDialogOpen(true)} actionLabel="Nuevo Pendiente" />}
          </div>
        </TabsContent>

        <TabsContent value="cases" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <WorkToolbar 
            priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
            studentSearch={studentSearch} setStudentSearch={setStudentSearch}
            onNewClick={() => { setTaskForm({...taskForm, isCase: true}); setIsTaskDialogOpen(true); }}
          />
          <div className="grid grid-cols-1 gap-4">
            {caseTabTasks.length > 0 ? caseTabTasks.map(task => (
              <TaskCard 
                key={task.id} task={task} allTasks={tasks} onEdit={handleEditTask} onAddDerivedTask={handleAddDerivedTask}
                onStatusChange={handleStatusChange} onToggleCase={handleToggleCase} onToggleCaseActive={handleToggleCaseActive}
                onToggleExpand={toggleExpand} isExpanded={expandedTasks.has(task.id)} newComment={newCommentText[task.id] || ''}
                onCommentChange={(text) => setNewCommentText({...newCommentText, [task.id]: text})} onAddComment={() => handleAddComment(task.id)}
                onDelete={() => deleteWorkTask(task.id).then(() => loadTasks(currentTeam.id))} currentAuthor={currentUser}
                onGoToStudent={handleGoToStudent}
              />
            )) : <EmptyState message="No hay casos registrados aún." onAction={() => { setTaskForm({...taskForm, isCase: true}); setIsTaskDialogOpen(true); }} actionLabel="Crear un Caso" />}
          </div>
        </TabsContent>

        <TabsContent value="route" className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black flex items-center gap-3 text-primary">
                  <PlayCircle className="h-6 w-6" /> Procedimiento del Día
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </div>
              
              <div className="relative space-y-6 pl-6 border-l-2 border-dashed border-primary/20 ml-2">
                {routeTasks.length > 0 ? routeTasks.map((task, index) => (
                  <div 
                    key={task.id} 
                    id={`route-card-${task.id}`}
                    className="relative group/route-item"
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, task.id)}
                  >
                    <div className="absolute -left-[33px] top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border-4 border-primary shadow-lg z-10 transition-transform group-hover/route-item:scale-125" />
                    <Card className={cn(
                      "hover:shadow-xl transition-all duration-300 border-none border-l-4 overflow-hidden bg-white/80 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none group/card",
                      draggedTaskId === task.id ? "opacity-40 scale-95" : "opacity-100"
                    )} style={{ borderLeftColor: PRIORITY_MAP[task.priority].color.split(' ')[0].replace('bg-', '') }}>
                      <div className="p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 overflow-hidden">
                          <div className="flex flex-col gap-1 items-center shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => handleMoveInRoute(task.id, 'up')} disabled={index === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover/card:text-primary transition-colors shrink-0" />
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => handleMoveInRoute(task.id, 'down')} disabled={index === routeTasks.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-1.5 overflow-hidden">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Badge className={cn("text-[9px] h-4 shrink-0 font-black uppercase tracking-tighter", PRIORITY_MAP[task.priority].color)}>
                                {PRIORITY_MAP[task.priority].label}
                              </Badge>
                              <h3 className="font-bold text-base truncate tracking-tight">{task.title}</h3>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                               <div className="flex items-center gap-1.5">
                                 <Clock className="h-3 w-3 text-primary" />
                                 <span>{STATUS_MAP[task.status].label}</span>
                               </div>
                               {task.parentTitle && (
                                 <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md truncate">
                                   <Link2 className="h-3 w-3" /> {task.parentTitle}
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex gap-2">
                            {task.status === 'in-progress' && (
                              <Button size="sm" variant="ghost" className="h-9 px-4 rounded-xl font-bold text-muted-foreground hover:bg-muted" onClick={() => handleStatusChange(task.id, 'todo')}>
                                <Clock className="h-4 w-4 mr-2" /> Posponer
                              </Button>
                            )}
                            <Button size="sm" className="h-9 px-5 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200" onClick={() => handleStatusChange(task.id, 'done')}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Finalizar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )) : (
                  <div className="p-16 text-center bg-white/30 rounded-3xl border-2 border-dashed border-primary/10">
                    <p className="text-muted-foreground font-medium italic">No hay tareas asignadas para la ruta de hoy.</p>
                    <Button variant="link" onClick={() => setActiveTab('pending')} className="font-bold mt-2">Explorar Centro de Pendientes</Button>
                  </div>
                )}
              </div>
            </div>

            {completedTodayTasks.length > 0 && (
              <div className="space-y-4 pt-10 border-t border-muted/50">
                <h2 className="text-xl font-black flex items-center gap-2 text-green-600 px-2">
                  <CheckCircle2 className="h-5 w-5" /> Completado Hoy
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {completedTodayTasks.map(task => (
                    <Card key={task.id} className="bg-green-50/30 border-none shadow-sm group">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm line-through text-green-800/50">{task.title}</h3>
                            <p className="text-[10px] font-black uppercase text-green-600/60 tracking-widest mt-0.5">
                              Finalizado a las {format(task.completedAt.toDate(), "HH:mm")}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg text-green-700 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleStatusChange(task.id, 'todo')}>
                          <History className="h-3 w-3 mr-1.5" /> Reabrir
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

      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { setIsTaskDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-xl rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingTask ? 'Editar Pendiente' : (taskForm.parentId ? 'Añadir Seguimiento' : 'Nuevo Registro')}</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest font-bold opacity-60">
              {taskForm.parentTitle ? `Vinculado al caso: ${taskForm.parentTitle}` : "Completa los detalles para tu equipo"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase opacity-60 tracking-tighter">Título de la acción</Label>
              <Input 
                value={taskForm.title} 
                onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
                placeholder="Ej. Entrevista con padres de familia"
                className="rounded-xl h-11 border-muted-foreground/20 font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase opacity-60 tracking-tighter">Prioridad</Label>
                <Select value={taskForm.priority} onValueChange={(v: any) => setTaskForm({...taskForm, priority: v})}>
                  <SelectTrigger className="rounded-xl h-11 border-muted-foreground/20 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase opacity-60 tracking-tighter">Fecha límite</Label>
                <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="rounded-xl h-11 border-muted-foreground/20 font-bold" />
              </div>
            </div>
            
            <div className="flex items-center space-x-3 bg-muted/20 p-3 rounded-xl border border-dashed border-primary/20">
              <Switch id="is-case-switch" checked={taskForm.isCase} onCheckedChange={(v) => setTaskForm({...taskForm, isCase: v})} />
              <Label htmlFor="is-case-switch" className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                <Briefcase className="h-4 w-4 text-primary" /> Marcar como "Caso" (Seguimiento largo plazo)
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase opacity-60 tracking-tighter">Vincular Alumnos (Opcional)</Label>
              <StudentSearchPopover onStudentSelect={(s) => {
                if (!taskForm.linkedStudents.find(ls => ls.id === s.id)) {
                  setTaskForm({...taskForm, linkedStudents: [...taskForm.linkedStudents, s]});
                }
              }} />
              {taskForm.linkedStudents.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted/20 rounded-2xl border border-dashed">
                  {taskForm.linkedStudents.map(ls => (
                    <Badge key={ls.id} variant="secondary" className="gap-2 h-7 pl-3 pr-1 rounded-lg bg-white border shadow-sm">
                      <span className="font-bold text-[11px]">{ls.name}</span>
                      <button onClick={() => setTaskForm({...taskForm, linkedStudents: taskForm.linkedStudents.filter(s => s.id !== ls.id)})} className="hover:bg-destructive/10 text-destructive p-1 rounded-md transition-colors"><Trash2 className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase opacity-60 tracking-tighter">Descripción / Acuerdos</Label>
              <Textarea 
                value={taskForm.description} 
                onChange={e => setTaskForm({...taskForm, description: e.target.value})} 
                placeholder="Detalles adicionales que el equipo debe conocer..."
                rows={4}
                className="rounded-xl border-muted-foreground/20 font-medium resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsTaskDialogOpen(false)} className="rounded-xl font-bold text-muted-foreground">Cancelar</Button>
            <Button onClick={handleSaveTask} disabled={isLoading} className="rounded-xl font-black h-11 shadow-lg shadow-primary/20 px-8">
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
              {editingTask ? 'Actualizar' : 'Guardar Registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkToolbar({ 
  priorityFilter, setPriorityFilter, statusFilter, setStatusFilter, studentSearch, setStudentSearch, onNewClick 
}: any) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap bg-white/50 backdrop-blur-sm border-none shadow-sm p-4 rounded-2xl">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-muted/50 rounded-lg"><Filter className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-xs font-black uppercase tracking-tighter opacity-60">Prioridad:</span>
          <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
            <SelectTrigger className="w-[120px] h-8 text-xs font-bold border-none bg-muted/30 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {statusFilter && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-muted/50 rounded-lg"><ListFilter className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-xs font-black uppercase tracking-tighter opacity-60">Estado:</span>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs font-bold border-none bg-muted/30 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Activos</SelectItem>
                <SelectItem value="todo">Pendientes</SelectItem>
                <SelectItem value="in-progress">En Ruta</SelectItem>
                <SelectItem value="done">Completados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="relative group/search-box">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50 group-focus-within/search-box:text-primary transition-colors" />
          <Input 
            value={studentSearch} 
            onChange={e => setStudentSearch(e.target.value)} 
            placeholder="Buscar por alumno..." 
            className="h-8 pl-9 w-[200px] text-xs font-bold border-none bg-muted/30 rounded-lg transition-all focus:w-[250px]"
          />
          {studentSearch && <button onClick={() => setStudentSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"><X size={12}/></button>}
        </div>
      </div>
      <Button onClick={onNewClick} className="rounded-xl font-bold h-9 shadow-lg">
        <PlusCircle className="mr-2 h-4 w-4" /> Nueva Entrada
      </Button>
    </div>
  );
}

function EmptyState({ message, onAction, actionLabel }: any) {
  return (
    <div className="text-center py-24 bg-white/30 rounded-3xl border-2 border-dashed border-primary/10">
      <AlertCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="text-xl font-bold opacity-60">Lista vacía</h3>
      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">{message}</p>
      {onAction && <Button variant="outline" onClick={onAction} className="rounded-xl font-bold">{actionLabel}</Button>}
    </div>
  );
}

function TaskCard({ 
  task, allTasks, onEdit, onAddDerivedTask, onStatusChange, onToggleCase, onToggleCaseActive, onToggleExpand, isExpanded, 
  newComment, onCommentChange, onAddComment, onDelete, currentAuthor, onGoToStudent
}: { 
  task: WorkTask, 
  allTasks: WorkTask[],
  onEdit: (t: WorkTask) => void, 
  onAddDerivedTask: (t: WorkTask) => void,
  onStatusChange: (id: string, s: TaskStatus) => void,
  onToggleCase: (id: string, isCase: boolean) => void,
  onToggleCaseActive: (id: string, active: boolean) => void,
  onToggleExpand: (id: string) => void,
  isExpanded: boolean,
  newComment: string,
  onCommentChange: (val: string) => void,
  onAddComment: () => void,
  onDelete: () => void,
  currentAuthor: string,
  onGoToStudent: (id: string) => void
}) {
  const priorityInfo = PRIORITY_MAP[task.priority];
  const statusInfo = STATUS_MAP[task.status];
  const isDueToday = task.dueDate && isToday(task.dueDate.toDate());

  const subTasks = useMemo(() => 
    allTasks.filter(t => t.parentId === task.id),
    [allTasks, task.id]
  );

  return (
    <Card className={cn(
      "transition-all duration-300 border-none border-l-4 shadow-sm hover:shadow-md overflow-hidden bg-white/80 backdrop-blur-sm group/main-card", 
      task.status === 'done' ? 'opacity-60 bg-muted/10 grayscale-[0.5]' : 'opacity-100',
      task.priority === 'urgent' ? 'border-l-red-600' : 
      task.priority === 'high' ? 'border-l-orange-500' :
      task.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500',
      isDueToday && task.status !== 'done' && "ring-2 ring-primary/20 scale-[1.01]",
      task.isCase && !task.isCaseActive && "grayscale opacity-50",
      task.parentId && "ml-10 bg-white/40 border-dashed"
    )}>
      <div 
        className="p-5 cursor-pointer flex items-center justify-between"
        onClick={() => onToggleExpand(task.id)}
      >
        <div className="flex items-center gap-5 flex-1">
          <Checkbox 
            id={`check-${task.id}`}
            checked={task.status === 'done'} 
            onCheckedChange={(checked) => onStatusChange(task.id, checked ? 'done' : 'todo')} 
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 rounded-md border-2 border-primary/20 data-[state=checked]:bg-primary"
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                "text-lg font-bold leading-tight tracking-tight", 
                task.status === 'done' && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </h3>
              {task.isCase && (
                <Badge variant={task.isCaseActive ? "default" : "outline"} className={cn("text-[8px] h-4 font-black uppercase tracking-widest", task.isCaseActive ? "bg-primary" : "text-muted-foreground")}>
                  {task.isCaseActive ? "Caso Activo" : "Caso Inactivo"}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className={cn("text-[9px] px-2 h-4 font-black uppercase tracking-tighter", priorityInfo.color)}>
                {priorityInfo.label}
              </Badge>
              <span className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-70", statusInfo.color)}>
                {statusInfo.icon} {statusInfo.label}
              </span>
              {task.dueDate && (
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                  isDueToday && task.status !== 'done' ? "text-primary animate-pulse" : "text-muted-foreground opacity-60"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format((task.dueDate as any).toDate(), 'dd MMM', { locale: es })}
                  {isDueToday && task.status !== 'done' && " (Hoy)"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {task.linkedStudents.length > 0 && (
            <div className="hidden sm:flex -space-x-3 mr-2">
              {task.linkedStudents.slice(0, 3).map(s => (
                <div key={s.id} className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-primary uppercase" title={s.name}>
                  {s.name.substring(0, 1)}
                </div>
              ))}
              {task.linkedStudents.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-muted-foreground">
                  +{task.linkedStudents.length - 3}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-1 opacity-0 group-hover/main-card:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", task.isCase ? "text-primary bg-primary/5" : "text-muted-foreground")}
              onClick={() => onToggleCase(task.id, !task.isCase)} title={task.isCase ? "Remover de Casos" : "Convertir en Caso"}
            >
              <Briefcase className="h-4 w-4" />
            </Button>
            
            {task.isCase && (
              <Button 
                variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", task.isCaseActive ? "text-green-600 bg-green-50" : "text-destructive bg-destructive/5")}
                onClick={() => onToggleCaseActive(task.id, !task.isCaseActive)} title={task.isCaseActive ? "Inactivar Caso" : "Activar Caso"}
              >
                {task.isCaseActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
              </Button>
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5 text-muted-foreground hover:text-primary" onClick={() => onEdit(task)}>
              <Edit3 className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black">¿Eliminar registro?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium">
                    Esta acción es irreversible y eliminará toda la información y comentarios vinculados a esta tarea.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                  <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-bold">Eliminar permanentemente</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <div className={cn("p-1 rounded-full transition-colors", isExpanded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="p-6 pt-0 space-y-8 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-muted/50">
            <div className="md:col-span-2 space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-black flex items-center gap-2 opacity-60">
                  <ClipboardList className="h-3 w-3" /> Descripción y Acuerdos
                </Label>
                <div className="text-sm bg-white/50 p-5 rounded-2xl border border-muted/50 text-foreground/80 font-medium whitespace-pre-wrap leading-relaxed shadow-inner">
                  {task.description || "Sin descripción adicional."}
                </div>
              </div>

              {task.linkedStudents.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-black flex items-center gap-2 opacity-60">
                    <User className="h-3 w-3" /> Alumnos Vinculados (Clic para ir al expediente)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {task.linkedStudents.map(ls => (
                      <Badge 
                        key={ls.id} variant="secondary" 
                        className="bg-white text-primary border border-primary/10 hover:bg-primary/5 transition-all py-1.5 pl-3 pr-2 gap-3 rounded-xl shadow-sm cursor-pointer group/ls"
                        onClick={(e) => { e.stopPropagation(); onGoToStudent(ls.id); }}
                      >
                        <GraduationCap className="h-3 w-3 text-primary/40 group-hover/ls:text-primary transition-colors" />
                        <span className="font-bold text-xs">{ls.name}</span>
                        <span className="opacity-40 font-mono text-[9px] bg-primary/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">ID: {ls.id}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {task.status === 'todo' && (
                  <Button className="rounded-xl font-bold h-10 px-6 shadow-md shadow-primary/10" onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'in-progress'); }}>
                    <PlayCircle className="mr-2 h-4 w-4" /> Iniciar Ruta Diaria
                  </Button>
                )}
                {task.status === 'in-progress' && (
                  <Button variant="secondary" className="rounded-xl font-bold h-10 px-6" onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'todo'); }}>
                    <Clock className="mr-2 h-4 w-4" /> Pausar y Regresar
                  </Button>
                )}
                {task.status === 'done' && (
                  <Button variant="outline" className="rounded-xl font-bold h-10 px-6" onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'todo'); }}>
                    <History className="mr-2 h-4 w-4" /> Reabrir Tarea
                  </Button>
                )}
              </div>

              <div className="space-y-4 pt-6 border-t border-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-black flex items-center gap-2 opacity-60">
                    <History className="h-3 w-3" /> Bitácora de Seguimiento ({subTasks.length})
                  </Label>
                  <Button 
                    size="sm" 
                    variant="link" 
                    className="h-auto p-0 text-primary font-black text-[10px] uppercase tracking-widest hover:no-underline hover:opacity-70 transition-opacity" 
                    onClick={(e) => { e.stopPropagation(); onAddDerivedTask(task); }}
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Añadir Entrada
                  </Button>
                </div>
                
                {subTasks.length > 0 ? (
                  <div className="space-y-3">
                    {subTasks.map(st => (
                      <div key={st.id} className="flex items-center justify-between bg-white/40 p-3 rounded-xl border border-muted/50 text-xs group/subtask shadow-sm">
                        <div className="flex items-center gap-4">
                          <Checkbox 
                            checked={st.status === 'done'} 
                            onCheckedChange={(checked) => onStatusChange(st.id, checked ? 'done' : 'todo')}
                            className="h-4 w-4 rounded data-[state=checked]:bg-primary"
                          />
                          <span className={cn("font-bold tracking-tight", st.status === 'done' && "line-through text-muted-foreground opacity-60")}>
                            {st.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn("text-[8px] h-4 font-black uppercase tracking-tighter border-none", PRIORITY_MAP[st.priority].color)}>
                            {PRIORITY_MAP[st.priority].label}
                          </Badge>
                          <div className="flex items-center gap-1 opacity-0 group-hover/subtask:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/5" onClick={(e) => { e.stopPropagation(); onEdit(st); }}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-destructive/5 text-destructive" onClick={(e) => e.stopPropagation()}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl border-none">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-xl font-black">¿Eliminar entrada?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteWorkTask(st.id).then(() => onToggleExpand(task.id))} className="bg-destructive rounded-xl">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic bg-muted/10 p-4 rounded-2xl border border-dashed text-center opacity-60">
                    No hay registros de seguimiento vinculados a este caso.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-5 border-l border-muted/50 pl-8 bg-muted/5 rounded-r-2xl py-2">
              <Label className="text-[10px] uppercase text-muted-foreground tracking-widest font-black flex items-center gap-2 opacity-60">
                <MessageSquare className="h-3 w-3 text-primary" /> Comentarios del Equipo
              </Label>
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-4">
                  {task.comments && task.comments.length > 0 ? task.comments.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-2xl border border-muted/50 shadow-sm space-y-2 group/comment relative">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary uppercase">
                            {c.author.substring(0, 1)}
                          </div>
                          <span className="font-black text-xs text-primary tracking-tight">{c.author}</span>
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground opacity-50 uppercase tracking-widest">
                          {format(c.createdAt.toDate(), 'dd MMM, HH:mm', { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                    </div>
                  )) : (
                    <div className="py-12 text-center">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">Sin notas aún</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="space-y-3 pt-2">
                <div className="relative group/input">
                  <Textarea 
                    value={newComment} 
                    onChange={e => onCommentChange(e.target.value)}
                    placeholder={currentAuthor ? `Escribe como ${currentAuthor}...` : "Escribe una nota para el equipo..."}
                    className="min-h-[80px] text-xs font-medium resize-none rounded-xl border-muted-foreground/20 bg-white/50 focus:bg-white transition-all shadow-inner"
                  />
                  <Button 
                    size="sm" 
                    onClick={onAddComment} 
                    disabled={!newComment.trim() || !currentAuthor}
                    className="absolute bottom-2 right-2 rounded-lg h-8 w-8 p-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {!currentAuthor && (
                  <p className="text-[10px] text-destructive font-black uppercase tracking-tighter text-right animate-pulse">
                    ⚠️ Selecciona tu nombre arriba para comentar
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
