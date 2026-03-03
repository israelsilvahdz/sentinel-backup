"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Search, User } from 'lucide-react';
import { useDashboardFilters } from './DashboardClient';
import { ScrollArea } from '../ui/scroll-area';
import { normalizeString } from '@/lib/utils';

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
    if (!searchValue || searchValue.trim().length < 2) return [];
    
    const searchNormalized = normalizeString(searchValue.trim());
    
    return allStudents.filter(s => {
      const nameNormalized = normalizeString(s.name || "");
      const idNormalized = (s.id || "").toLowerCase();
      
      return nameNormalized.includes(searchNormalized) || 
             idNormalized.includes(searchNormalized);
    }).slice(0, 20);
  }, [searchValue, allStudents]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-muted-foreground h-10">
          <Search className="mr-2 h-4 w-4" />
          {searchValue ? `Buscando: ${searchValue}` : "Buscar alumno por nombre o matrícula..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Escribe al menos 2 caracteres..." 
            value={searchValue} 
            onValueChange={setSearchValue} 
          />
          {searchValue.trim().length >= 2 && filteredStudents.length === 0 && (
            <CommandEmpty>No se encontraron resultados para "{searchValue}".</CommandEmpty>
          )}
          {searchValue.trim().length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">Escribe al menos 2 letras para buscar...</div>
          )}
          <CommandGroup>
            <ScrollArea className={filteredStudents.length > 0 ? "h-64" : "h-0"}>
              {filteredStudents.map((student) => (
                <CommandItem
                  key={student.id}
                  value={student.id}
                  onSelect={() => {
                    onStudentSelect({ id: student.id, name: student.name });
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{student.name}</span>
                    <span className="text-xs text-muted-foreground">{student.id}</span>
                  </div>
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
