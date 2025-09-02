"use client";

import { useDashboardFilters } from './DashboardLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from 'lucide-react';

export function DashboardFilters() {
  const {
    leaders,
    tutors,
    subjects,
    selectedLeader,
    setSelectedLeader,
    selectedTutor,
    setSelectedTutor,
    selectedSubject,
    setSelectedSubject,
    hasData,
  } = useDashboardFilters();

  if (!hasData) return null;

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
            <Filter size={16}/>
            <span>Filtros</span>
        </div>
        <div>
            <label className="text-sm font-medium">Líder</label>
            <Select onValueChange={(val) => setSelectedLeader(val === 'all' ? null : val)} value={selectedLeader || 'all'}>
                <SelectTrigger className='w-full'>
                    <SelectValue placeholder="Seleccionar líder..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {leaders.map(leader => (
                        <SelectItem key={leader} value={leader}>{leader}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div>
            <label className="text-sm font-medium">Tutor</label>
            <Select onValueChange={(val) => setSelectedTutor(val === 'all' ? null : val)} value={selectedTutor || 'all'}>
                <SelectTrigger className='w-full'>
                    <SelectValue placeholder="Seleccionar tutor..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {tutors.map(tutor => (
                        <SelectItem key={tutor} value={tutor}>{tutor}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
         <div>
            <label className="text-sm font-medium">Materia</label>
            <Select onValueChange={(val) => setSelectedSubject(val === 'all' ? null : val)} value={selectedSubject || 'all'}>
                <SelectTrigger className='w-full'>
                    <SelectValue placeholder="Seleccionar materia..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    </div>
  );
}
