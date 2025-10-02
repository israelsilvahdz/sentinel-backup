

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboardFilters } from './DashboardClient';
import type { Student, Team } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { addOrUpdateTeam, deleteTeam, removeStudentFromTeam } from '@/lib/firebase-services';
import { StudentSearchPopover } from './BitacoraPanel';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, UserPlus, PlusCircle, UserX, Shield, Users, Edit } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


function AddStudentToTeamDialog({ team, onUpdate }: { team: Team; onUpdate: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddStudent = async () => {
    if (!selectedStudent) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un alumno.' });
      return;
    }

    if (team.members?.some(member => member.id === selectedStudent.id)) {
        toast({ variant: 'destructive', title: 'Alumno ya en el equipo', description: `${selectedStudent.name} ya es miembro de este equipo.` });
        return;
    }

    setIsSubmitting(true);
    try {
      const updatedMembers = [...(team.members || []), selectedStudent];
      await addOrUpdateTeam({ ...team, members: updatedMembers });
      toast({ title: 'Éxito', description: `${selectedStudent.name} ha sido añadido al equipo ${team.name}.` });
      onUpdate();
      setIsOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error adding student to team:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo añadir el alumno al equipo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={(e) => e.stopPropagation()}>
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Alumno a {team.name}</DialogTitle>
          <DialogDescription>Busca y selecciona un alumno para añadirlo al equipo.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Label>Buscar Alumno</Label>
          <StudentSearchPopover onStudentSelect={setSelectedStudent} />
           {selectedStudent && <p className="text-sm text-muted-foreground">Alumno seleccionado: {selectedStudent.name} ({selectedStudent.id})</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddStudent} disabled={isSubmitting || !selectedStudent}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Añadir Alumno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTeamDialog({ team, onUpdate, children }: { team: Team, onUpdate: () => void, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [teamName, setTeamName] = useState(team.name);
  const [teamType, setTeamType] = useState<Team['type']>(team.type);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setTeamName(team.name);
      setTeamType(team.type);
    }
  }, [isOpen, team]);

  const handleUpdateTeam = async () => {
    if (!teamName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre del equipo no puede estar vacío.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addOrUpdateTeam({ ...team, name: teamName, type: teamType });
      toast({ title: 'Éxito', description: `El equipo ha sido actualizado.` });
      onUpdate();
      setIsOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el equipo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Equipo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-team-name">Nombre del Equipo</Label>
            <Input id="edit-team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-team-type">Tipo de Equipo</Label>
            <Select value={teamType} onValueChange={(value) => setTeamType(value as Team['type'])}>
              <SelectTrigger id="edit-team-type">
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deportivo">Deportivo</SelectItem>
                <SelectItem value="cultural">Cultural</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleUpdateTeam} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamList({ teams, type }: { teams: Team[], type: string }) {
    const { fetchTeams } = useDashboardFilters();
    const { toast } = useToast();

    const handleRemoveStudent = async (team: Team, studentId: string) => {
        try {
            await removeStudentFromTeam(team, studentId);
            toast({ title: 'Alumno Eliminado', description: 'El alumno ha sido eliminado del equipo.' });
            fetchTeams();
        } catch(error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar al alumno.' });
        }
    }

    if (teams.length === 0) {
        return <p className="text-center text-muted-foreground p-8">No hay equipos de tipo {type}.</p>
    }

    return (
        <Accordion type="multiple" className="w-full">
            {teams.map(team => (
                <AccordionItem value={team.id} key={team.id}>
                    <AccordionTrigger>
                        <div className="flex items-center gap-4 flex-1">
                            <Shield className="h-5 w-5 text-primary" />
                            <span className="font-semibold">{team.name}</span>
                            <Badge variant="secondary">{team.members?.length || 0} miembro(s)</Badge>
                        </div>
                         <div className="flex items-center gap-1 pr-4">
                            <AddStudentToTeamDialog team={team} onUpdate={fetchTeams} />
                            <EditTeamDialog team={team} onUpdate={fetchTeams}>
                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><Edit className="h-4 w-4"/></Button>
                            </EditTeamDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar equipo "{team.name}"?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el equipo y todos sus miembros de la base de datos.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => {
                                            await deleteTeam(team.id);
                                            fetchTeams();
                                        }}>Sí, eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <ScrollArea className="h-64 pr-4">
                            {team.members && team.members.length > 0 ? (
                            <div className="space-y-2">
                                {team.members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span>{member.name} ({member.id})</span>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive"><UserX className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Eliminar a {member.name}?</AlertDialogTitle>
                                                    <AlertDialogDescription>Se eliminará al alumno del equipo "{team.name}".</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleRemoveStudent(team, member.id)}>Sí, eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </div>
                            ) : (
                                <p className="text-center text-muted-foreground pt-16">Este equipo aún no tiene miembros.</p>
                            )}
                        </ScrollArea>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}


export function TeamsManagementPanel() {
  const { teams, fetchTeams } = useDashboardFilters();
  const [isNewTeamFormOpen, setIsNewTeamFormOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamType, setNewTeamType] = useState<Team['type']>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);
  
  const { deportivoTeams, culturalTeams, unclassifiedTeams } = useMemo(() => {
    const deportivo: Team[] = [];
    const cultural: Team[] = [];
    const unclassified: Team[] = [];
    
    teams.forEach(team => {
        if (team.type === 'deportivo') deportivo.push(team);
        else if (team.type === 'cultural') cultural.push(team);
        else unclassified.push(team);
    });

    return { 
        deportivoTeams: deportivo, 
        culturalTeams: cultural,
        unclassifiedTeams: unclassified,
    };
  }, [teams]);


  const handleCreateNewTeam = async () => {
    if (!newTeamName.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'El nombre del equipo no puede estar vacío.' });
        return;
    }
    setIsSubmitting(true);
    try {
        const newTeam: Omit<Team, 'id'> = {
            name: newTeamName.trim(),
            type: newTeamType,
            members: []
        };
        await addOrUpdateTeam(newTeam);
        toast({ title: 'Éxito', description: `El equipo "${newTeamName}" ha sido creado.` });
        fetchTeams();
        setIsNewTeamFormOpen(false);
        setNewTeamName('');
        setNewTeamType(undefined);
    } catch(error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el equipo.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Equipos</h1>
          <p className="text-muted-foreground">Crea equipos, añade o elimina miembros de equipos representativos y de seguimiento.</p>
        </div>
        <Dialog open={isNewTeamFormOpen} onOpenChange={setIsNewTeamFormOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Nuevo Equipo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear un Nuevo Equipo</DialogTitle>
                    <DialogDescription>Dale un nombre y un tipo al nuevo equipo.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-team-name">Nombre del Equipo</Label>
                        <Input id="new-team-name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="new-team-type">Tipo de Equipo</Label>
                        <Select value={newTeamType} onValueChange={(value) => setNewTeamType(value as Team['type'])}>
                          <SelectTrigger id="new-team-type">
                            <SelectValue placeholder="Seleccionar tipo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deportivo">Deportivo</SelectItem>
                            <SelectItem value="cultural">Cultural</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsNewTeamFormOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateNewTeam} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Crear Equipo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </header>

       <Tabs defaultValue="deportivo" className="w-full">
            <TabsList>
                <TabsTrigger value="deportivo">Deportivos</TabsTrigger>
                <TabsTrigger value="cultural">Culturales</TabsTrigger>
                <TabsTrigger value="unclassified">Sin Clasificar</TabsTrigger>
            </TabsList>
            <TabsContent value="deportivo">
                <TeamList teams={deportivoTeams} type="deportivo" />
            </TabsContent>
            <TabsContent value="cultural">
                 <TeamList teams={culturalTeams} type="cultural" />
            </TabsContent>
            <TabsContent value="unclassified">
                 <TeamList teams={unclassifiedTeams} type="sin clasificar" />
            </TabsContent>
        </Tabs>
    </div>
  );
}

    