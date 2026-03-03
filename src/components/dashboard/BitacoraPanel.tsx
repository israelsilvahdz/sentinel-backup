"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Search, User } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { ScrollArea } from '../ui/scroll-area';

export function BitacoraPanel() {
  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Componente Descontinuado</CardTitle>
          <CardDescription>
            Esta sección ha sido eliminada para optimizar costos y simplificar la aplicación.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export function StudentSearchPopover({ onStudentSelect }: { onStudentSelect: (student: { id: string, name: string }) => void }) {
  const [open, setOpen] = useState(false);
  const { allStudents } = useDashboardFilters();
  const [searchValue, setSearchValue] = useState("");

  const filteredStudents = useMemo(() => {
    if (!searchValue) return [];
    const lower = searchValue.toLowerCase();
    return allStudents.filter(s => 
      s.name.toLowerCase().includes(lower) || 
      s.id.toLowerCase().includes(lower)
    ).slice(0, 10);
  }, [searchValue, allStudents]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-muted-foreground">
          <Search className="mr-2 h-4 w-4" />
          Buscar alumno...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Nombre o matrícula..." 
            value={searchValue} 
            onValueChange={setSearchValue} 
          />
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-48">
              {filteredStudents.map((student) => (
                <CommandItem
                  key={student.id}
                  onSelect={() => {
                    onStudentSelect({ id: student.id, name: student.name });
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{student.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{student.id}</span>
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
