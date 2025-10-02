

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
import { Loader2, Trash2, UserPlus, PlusCircle, UserX, Shield, Users } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
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


export function TeamsManagementPanel() {
  const { teams, fetchTeams } = useDashboardFilters();
  const [isNewTeamFormOpen, setIsNewTeamFormOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);
  
  const handleRemoveStudent = async (team: Team, studentId: string) => {
    try {
        await removeStudentFromTeam(team, studentId);
        toast({ title: 'Alumno Eliminado', description: 'El alumno ha sido eliminado del equipo.' });
        fetchTeams();
    } catch(error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar al alumno.' });
    }
  }

  const handleCreateNewTeam = async () => {
    if (!newTeamName.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'El nombre del equipo no puede estar vacío.' });
        return;
    }
    setIsSubmitting(true);
    try {
        const newTeam: Omit<Team, 'id'> = {
            name: newTeamName.trim(),
            members: []
        };
        await addOrUpdateTeam(newTeam);
        toast({ title: 'Éxito', description: `El equipo "${newTeamName}" ha sido creado.` });
        fetchTeams();
        setIsNewTeamFormOpen(false);
        setNewTeamName('');
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
                    <DialogDescription>Dale un nombre al nuevo equipo (ej. "Debate", "Robótica", "Fútbol Femenil").</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="new-team-name">Nombre del Equipo</Label>
                    <Input id="new-team-name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
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

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => (
            <Card key={team.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> {team.name}</CardTitle>
                        <CardDescription>{team.members?.length || 0} miembro(s)</CardDescription>
                    </div>
                     <div className="flex items-center gap-1">
                        <AddStudentToTeamDialog team={team} onUpdate={fetchTeams} />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar equipo "{team.name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el equipo y todos sus miembros de la base de datos.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteTeam(team.id).then(fetchTeams)}>Sí, eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </div>
                </CardHeader>
                <CardContent className="flex-grow">
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
                </CardContent>
            </Card>
        ))}
       </div>
    </div>
  );
}
