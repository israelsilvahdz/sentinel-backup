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
  deleteWorkTask
} from '@/lib/team-work-services';
import type { WorkTeam, WorkTask, TaskPriority, TaskStatus } from '@/types/student';
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
  AlertCircle, Filter, Calendar, CheckCircle2, Clock, PlayCircle, UserPlus, LogIn
} from 'lucide-react';
import { StudentSearchPopover } from './BitacoraPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  // Task Form
  const [newTask, setNewTask] = useState<{
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
      toast({ variant: 'destructive', title: 'Error al cargar tareas' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authName || !authCode) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Por favor ingresa nombre y código.' });
      return;
    }
    setIsLoading(true);
    try {
      const team = await findWorkTeamByName(authName);
      if (team) {
        if (team.accessCode === authCode) {
          setCurrentWorkTeam(team);
          sessionStorage.setItem('current_work_team', JSON.stringify(team));
          loadTasks(team.id);
          toast({ title: `Bienvenido al equipo ${team.name}` });
        } else {
          toast({ variant: 'destructive', title: 'Código incorrecto' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Equipo no encontrado', description: 'Asegúrate de que el nombre sea correcto o cámbiate a la pestaña de registro.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterTeam = async () => {
    if (!authName || !authCode) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Define un nombre y un código para el equipo.' });
      return;
    }
    setIsLoading(true);
    try {
      const existing = await findWorkTeamByName(authName);
      if (existing) {
        toast({ variant: 'destructive', title: 'Nombre ocupado', description: 'Ese nombre de equipo ya existe. Usa otro o cámbiate a la pestaña de entrada.' });
      } else {
        const newTeam = await createWorkTeam(authName, authCode);
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

  const handleCreateTask = async () => {
    if (!newTask.title || !currentTeam) {
      toast({ variant: 'destructive', title: 'El título es obligatorio' });
      return;
    }
    setIsLoading(true);
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
      toast({ title: 'Tarea creada con éxito' });
      setIsTaskDialogOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', linkedStudents: [], dueDate: '' });
      await loadTasks(currentTeam.id);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error al guardar tarea' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateWorkTask(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar estado' });
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('¿Eliminar esta tarea permanentemente?')) return;
    try {
      await deleteWorkTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Tarea eliminada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
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
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Ruta Diaria / Equipo</CardTitle>
            <CardDescription>Accede a tus pendientes compartidos o configura un nuevo equipo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Entrar
                </TabsTrigger>
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Registrar
                </TabsTrigger>
              </TabsList>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Equipo</Label>
                  <Input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Ej. Líderes Prepa" />
                </div>
                <div className="space-y-2">
                  <Label>Código de Acceso</Label>
                  <Input type="password" value={authCode} onChange={e => setAuthCode(e.target.value)} placeholder="Introduce la clave..." />
                </div>
              </div>

              <TabsContent value="login" className="pt-4">
                <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Acceder al Equipo
                </Button>
              </TabsContent>

              <TabsContent value="create" className="pt-4">
                <Button variant="secondary" className="w-full" onClick={handleRegisterTeam} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Crear Nuevo Equipo
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  El código servirá para que tus compañeros puedan unirse al equipo.
                </p>
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
          <p className="text-muted-foreground">
            Equipo: <Badge variant="outline" className="text-foreground border-primary ml-1">{currentTeam.name}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-md">
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Pendiente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Añadir Nueva Tarea</DialogTitle>
                <DialogDescription>Describe el pendiente y vincula a los alumnos si es necesario.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título del Pendiente</Label>
                  <Input 
                    value={newTask.title} 
                    onChange={e => setNewTask({...newTask, title: e.target.value})} 
                    placeholder="Ej. Entrevista con padres de familia"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    <Label>Fecha límite</Label>
                    <Input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vincular Alumnos (Opcional)</Label>
                  <StudentSearchPopover onStudentSelect={(s) => {
                    if (!newTask.linkedStudents.find(ls => ls.id === s.id)) {
                      setNewTask({...newTask, linkedStudents: [...newTask.linkedStudents, s]});
                    }
                  }} />
                  {newTask.linkedStudents.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 p-2 bg-muted/30 rounded-md">
                      {newTask.linkedStudents.map(s => (
                        <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                          {s.name}
                          <button onClick={() => setNewTask({...newTask, linkedStudents: newTask.linkedStudents.filter(ls => ls.id !== s.id)})} className="hover:text-destructive p-0.5"><Trash2 className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Descripción / Acuerdos</Label>
                  <Textarea 
                    value={newTask.description} 
                    onChange={e => setNewTask({...newTask, description: e.target.value})} 
                    placeholder="Detalles adicionales..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsTaskDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateTask} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                  Guardar Tarea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => {
            sessionStorage.removeItem('current_work_team');
            setCurrentWorkTeam(null);
          }}>
            Cambiar Equipo
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-4 flex-wrap bg-card border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filtros rápidos:</span>
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="todo">Pendientes</SelectItem>
            <SelectItem value="in-progress">En Proceso</SelectItem>
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
          {filteredAndSortedTasks.length} tareas en pantalla
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando tablero...</p>
          </div>
        ) : filteredAndSortedTasks.length > 0 ? (
          filteredAndSortedTasks.map(task => (
            <Card key={task.id} className={cn(
              "hover:shadow-lg transition-all duration-200 border-l-4", 
              task.status === 'done' ? 'opacity-60 grayscale' : 'opacity-100',
              task.priority === 'urgent' ? 'border-l-red-600' : 
              task.priority === 'high' ? 'border-l-orange-500' :
              task.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
            )}>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id={`check-${task.id}`}
                      checked={task.status === 'done'} 
                      onCheckedChange={(checked) => handleStatusChange(task.id, checked ? 'done' : 'todo')} 
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor={`check-${task.id}`} className={cn(
                        "text-lg font-bold cursor-pointer block leading-tight", 
                        task.status === 'done' && 'line-through text-muted-foreground'
                      )}>
                        {task.title}
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={cn("text-[10px] px-1.5 h-5", PRIORITY_MAP[task.priority].color)}>
                          {PRIORITY_MAP[task.priority].label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 gap-1 bg-background">
                          {STATUS_MAP[task.status].icon}
                          {STATUS_MAP[task.status].label}
                        </Badge>
                        {task.dueDate && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5 gap-1">
                            <Calendar className="h-3 w-3" />
                            {format((task.dueDate as any).toDate(), 'dd MMM', { locale: es })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {task.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-dashed">
                    {task.description}
                  </p>
                )}
                {task.linkedStudents.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {task.linkedStudents.map(s => (
                      <Badge key={s.id} variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[11px]">
                        {s.name} <span className="ml-1 opacity-60 font-mono">({s.id})</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-3 pt-0 border-t border-muted/50 flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                <span>ID: {task.id.substring(0,8)} | Creado: {format((task.createdAt as any).toDate(), "dd/MM/yy HH:mm")}</span>
                <div className="flex gap-2">
                  {task.status !== 'done' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] hover:bg-primary/10 hover:text-primary" 
                      onClick={() => handleStatusChange(task.id, task.status === 'todo' ? 'in-progress' : 'todo')}
                    >
                      {task.status === 'todo' ? 'Iniciar hoy' : 'Pausar'}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="text-center py-24 bg-card rounded-2xl border-2 border-dashed shadow-inner">
            <div className="bg-muted/50 p-4 rounded-full w-fit mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">Sin tareas que mostrar</h3>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">Ajusta tus filtros o añade un nuevo pendiente para el equipo.</p>
            <Button variant="outline" className="mt-6" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); }}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
