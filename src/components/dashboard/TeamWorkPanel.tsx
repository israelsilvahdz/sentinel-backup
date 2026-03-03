
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
  getDailyRoute,
  saveDailyRoute
} from '@/lib/team-work-services';
import type { WorkTeam, WorkTask, DailyRoute, TaskPriority, TaskStatus, Student } from '@/types/student';
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
  Loader2, PlusCircle, Trash2, ClipboardList, Route, ShieldCheck, 
  AlertCircle, ChevronRight, UserPlus, Filter, ArrowUpDown, Calendar,
  CheckCircle2, Clock, PlayCircle
} from 'lucide-react';
import { StudentSearchPopover } from './BitacoraPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PRIORITY_MAP: Record<TaskPriority, { label: string, color: string, weight: number }> = {
  urgent: { label: 'Urgente', color: 'bg-red-600 text-white', weight: 4 },
  high: { label: 'Alta', color: 'bg-orange-500 text-white', weight: 3 },
  medium: { label: 'Media', color: 'bg-yellow-500 text-black', weight: 2 },
  low: { label: 'Baja', color: 'bg-blue-500 text-white', weight: 1 },
};

const STATUS_MAP: Record<TaskStatus, { label: string, icon: React.ReactNode }> = {
  'todo': { label: 'Pendiente', icon: <Clock className="h-4 w-4" /> },
  'in-progress': { label: 'En Proceso', icon: <PlayCircle className="h-4 w-4" /> },
  'done': { label: 'Completado', icon: <CheckCircle2 className="h-4 w-4" /> },
};

export function TeamWorkPanel() {
  const [currentTeam, setCurrentWorkTeam] = useState<WorkTeam | null>(null);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'route'>('all');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  // Task Form
  const [newTask, setNewTask] = useState<{
    title: string, 
    description: string, 
    priority: TaskPriority, 
    linkedStudents: { id: string, name: string }[],
    dueDate?: string
  }>({
    title: '',
    description: '',
    priority: 'medium',
    linkedStudents: []
  });

  const { toast } = useToast();

  // Load from session
  useEffect(() => {
    const saved = sessionStorage.getItem('current_work_team');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCurrentWorkTeam(parsed);
      setIsAuthDialogOpen(false);
      loadTasks(parsed.id);
    }
  }, []);

  const loadTasks = async (teamId: string) => {
    setIsLoading(true);
    try {
      const data = await getWorkTasks(teamId);
      setTasks(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al cargar tareas' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authName || !authCode) return;
    setIsLoading(true);
    try {
      const team = await findWorkTeamByName(authName);
      if (team) {
        if (team.accessCode === authCode) {
          setCurrentWorkTeam(team);
          sessionStorage.setItem('current_work_team', JSON.stringify(team));
          setIsAuthDialogOpen(false);
          loadTasks(team.id);
        } else {
          toast({ variant: 'destructive', title: 'Código de acceso incorrecto' });
        }
      } else {
        // Option to create
        if (window.confirm(`El equipo "${authName}" no existe. ¿Quieres crearlo con este código?`)) {
          const newTeam = await createWorkTeam(authName, authCode);
          setCurrentWorkTeam(newTeam);
          sessionStorage.setItem('current_work_team', JSON.stringify(newTeam));
          setIsAuthDialogOpen(false);
          loadTasks(newTeam.id);
        }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !currentTeam) return;
    try {
      await addWorkTask({
        teamId: currentTeam.id,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: 'todo',
        linkedStudents: newTask.linkedStudents,
        dueDate: newTask.dueDate ? Timestamp.fromDate(new Date(newTask.dueDate)) : null
      });
      toast({ title: 'Tarea creada' });
      setIsTaskDialogOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', linkedStudents: [] });
      loadTasks(currentTeam.id);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al guardar tarea' });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateWorkTask(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    try {
      await deleteWorkTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Tarea eliminada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter(t => (statusFilter === 'all' || t.status === statusFilter))
      .filter(t => (priorityFilter === 'all' || t.priority === priorityFilter))
      .sort((a, b) => PRIORITY_MAP[b.priority].weight - PRIORITY_MAP[a.priority].weight);
  }, [tasks, statusFilter, priorityFilter]);

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary" /> Acceso a Equipo
            </CardTitle>
            <CardDescription>Escribe el nombre de tu equipo y código de acceso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Equipo</Label>
              <Input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Ej. Equipo Liderazgo" />
            </div>
            <div className="space-y-2">
              <Label>Código de Acceso</Label>
              <Input type="password" value={authCode} onChange={e => setAuthCode(e.target.value)} placeholder="****" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar / Crear'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" /> Gestión de Pendientes
          </h1>
          <p className="text-muted-foreground">
            Equipo: <span className="font-bold text-foreground">{currentTeam.name}</span> | Acciones y seguimiento diario.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Pendiente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Añadir Pendiente</DialogTitle>
                <DialogDescription>Describe la tarea y vincula a los alumnos involucrados.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título de la Tarea</Label>
                  <Input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={newTask.priority} onValueChange={(v: any) => setNewTask({...newTask, priority: v})}>
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
                  <Label>Vincular Alumnos</Label>
                  <StudentSearchPopover onStudentSelect={(s) => {
                    if (!newTask.linkedStudents.find(ls => ls.id === s.id)) {
                      setNewTask({...newTask, linkedStudents: [...newTask.linkedStudents, s]});
                    }
                  }} />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTask.linkedStudents.map(s => (
                      <Badge key={s.id} variant="secondary" className="gap-1">
                        {s.name}
                        <button onClick={() => setNewTask({...newTask, linkedStudents: newTask.linkedStudents.filter(ls => ls.id !== s.id)})} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fecha límite (Opcional)</Label>
                  <Input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Descripción / Notas</Label>
                  <Textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsTaskDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateTask}>Crear Pendiente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => {
            sessionStorage.removeItem('current_work_team');
            setCurrentWorkTeam(null);
          }}>
            Salir del Equipo
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4 flex-wrap bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="todo">Pendientes</SelectItem>
            <SelectItem value="in-progress">En Proceso</SelectItem>
            <SelectItem value="done">Completados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredAndSortedTasks.length} tareas encontradas.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAndSortedTasks.length > 0 ? (
          filteredAndSortedTasks.map(task => (
            <Card key={task.id} className={cn("hover:shadow-md transition-shadow", task.status === 'done' && 'opacity-60')}>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={task.status === 'done'} 
                      onCheckedChange={(checked) => handleStatusChange(task.id, checked ? 'done' : 'todo')} 
                    />
                    <div>
                      <CardTitle className={cn("text-lg", task.status === 'done' && 'line-through')}>
                        {task.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge className={PRIORITY_MAP[task.priority].color}>
                          {PRIORITY_MAP[task.priority].label}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {STATUS_MAP[task.status].icon}
                          {STATUS_MAP[task.status].label}
                        </Badge>
                        {task.dueDate && (
                          <Badge variant="secondary" className="gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(task.dueDate.toDate(), 'dd/MM/yy')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {task.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/20 p-2 rounded">
                    {task.description}
                  </p>
                )}
                {task.linkedStudents.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {task.linkedStudents.map(s => (
                      <Badge key={s.id} variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                        {s.name} ({s.id})
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 border-t border-muted/50 flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Creado: {format(task.createdAt.toDate(), "d 'de' LLLL 'a las' HH:mm", { locale: es })}</span>
                <div className="flex gap-2">
                  {task.status !== 'done' && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handleStatusChange(task.id, task.status === 'todo' ? 'in-progress' : 'todo')}>
                      {task.status === 'todo' ? 'Comenzar' : 'Detener'}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 bg-muted/10 rounded-lg border-2 border-dashed">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No hay tareas pendientes</h3>
            <p className="text-muted-foreground">¡Todo en orden! Crea una nueva tarea para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
