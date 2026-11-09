"use client";
import { WorkspaceHeader } from './WorkspaceHeader';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDashboardFilters } from './DashboardClient';
import type { WeightingScheme } from '@/types/student';
import * as XLSX from 'xlsx';
import { FileUpload } from './FileUpload';
import { buildWeightingWorkbook, readWeightingWorkbook } from '@/lib/weighting-export';
import { useToast } from '@/hooks/use-toast';


import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Trash2, BookCopy, Edit, CheckCircle, AlertTriangle, ChevronsUpDown } from 'lucide-react';

const schemeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  activities: z.array(z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    weight: z.coerce.number().min(0, 'El valor debe ser positivo').max(100, 'El valor no puede ser mayor a 100'),
    label: z.string().optional(),
  })).min(1, "Debe haber al menos una actividad."),
  subjectNames: z.array(z.string()).min(1, "Debe seleccionar al menos una materia."),
}).refine(data => {
  const totalWeight = data.activities.reduce((sum, act) => sum + (act.weight || 0), 0);
  return Math.abs(totalWeight - 100) < 0.01;
}, {
  message: "La suma de las ponderaciones debe ser exactamente 100%.",
  path: ["activities"],
});

type SchemeFormValues = z.infer<typeof schemeSchema>;


// --- Componente de Formulario con Nueva Lógica de Grupos ---

interface ActivityGroup {
  range: string;
  weight: number;
  label?: string;
}

const parseRange = (rangeStr: string): number[] => {
  if (!rangeStr) return [];
  const result: Set<number> = new Set();
  const parts = rangeStr.replace(/;/g, ',').split(',');
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;
    if (trimmedPart.includes('-')) {
      const [start, end] = trimmedPart.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          result.add(i);
        }
      }
    } else {
      const num = Number(trimmedPart);
      if (!isNaN(num) && num > 0) {
        result.add(num);
      }
    }
  }
  return Array.from(result).sort((a, b) => a - b);
};

const groupActivities = (activities: {name: string, weight: number, label?: string}[]): ActivityGroup[] => {
    if (!activities || activities.length === 0) return [{ range: '', weight: 0, label: '' }];

    const weightsToActivities: Record<string, { nums: number[], label?: string }> = {};
    
    activities.forEach(act => {
        const numMatch = act.name.match(/\d+$/);
        if (numMatch) {
            const num = parseInt(numMatch[0], 10);
            const key = `${act.weight}-${act.label || ''}`;
            if (!weightsToActivities[key]) {
                weightsToActivities[key] = { nums: [], label: act.label };
            }
            weightsToActivities[key].nums.push(num);
        }
    });

    const groups: ActivityGroup[] = [];
    for (const key in weightsToActivities) {
        const { nums, label } = weightsToActivities[key];
        nums.sort((a,b) => a - b);
        let rangeStr = '';
        let startOfRange = -1;
        
        for (let i = 0; i < nums.length; i++) {
            if (startOfRange === -1) {
                startOfRange = nums[i];
            }
            if (i === nums.length - 1 || nums[i+1] !== nums[i] + 1) {
                if (rangeStr) rangeStr += ', ';
                if (startOfRange === nums[i]) {
                    rangeStr += `${startOfRange}`;
                } else {
                    rangeStr += `${startOfRange}-${nums[i]}`;
                }
                startOfRange = -1;
            }
        }
        groups.push({ range: rangeStr, weight: parseFloat(key.split('-')[0]), label: label || '' });
    }
    return groups.length > 0 ? groups : [{ range: '', weight: 0, label: '' }];
};

function SchemeForm({ onFormSubmit, existingScheme, allSubjectNames, onCancel }: { onFormSubmit: (data: SchemeFormValues) => void, existingScheme?: WeightingScheme, allSubjectNames: string[], onCancel: () => void }) {
  const { register, control, handleSubmit, watch, formState: { errors }, setValue, trigger } = useForm<SchemeFormValues>({
    resolver: zodResolver(schemeSchema),
    defaultValues: existingScheme ? {
      ...existingScheme,
    } : {
      name: '',
      activities: [],
      subjectNames: []
    }
  });

  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>(
    existingScheme ? groupActivities(existingScheme.activities) : [{ range: '', weight: 0, label: '' }]
  );

  useEffect(() => {
    const flattenedActivities: { name: string; weight: number; label?: string }[] = [];
    activityGroups.forEach(group => {
        const activityNumbers = parseRange(group.range);
        activityNumbers.forEach(num => {
            const activity: { name: string; weight: number; label?: string } = {
                name: `Actividad ${num}`,
                weight: group.weight || 0,
            };
            if (group.label && group.label.trim() !== '') {
                activity.label = group.label;
            }
            flattenedActivities.push(activity);
        });
    });
    setValue('activities', flattenedActivities, { shouldValidate: true });
    if (errors.activities?.root) {
        trigger('activities');
    }
  }, [activityGroups, setValue, errors.activities?.root, trigger]);

  const totalWeight = useMemo(() => {
    return activityGroups.reduce((total, group) => {
        const count = parseRange(group.range).length;
        return total + (count * (group.weight || 0));
    }, 0);
  }, [activityGroups]);

  const handleGroupChange = (index: number, field: keyof ActivityGroup, value: string | number) => {
    const newGroups = [...activityGroups];
    (newGroups[index] as any)[field] = value;
    setActivityGroups(newGroups);
  };
  
  const addGroup = () => {
    setActivityGroups([...activityGroups, { range: '', weight: 0, label: '' }]);
  };

  const removeGroup = (index: number) => {
    if (activityGroups.length > 1) {
      setActivityGroups(activityGroups.filter((_, i) => i !== index));
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Esquema</Label>
          <Input id="name" {...register('name')} placeholder="Ej. Ciencias Sociales Tetramestre" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Materias Aplicables</Label>
           <Controller
            control={control}
            name="subjectNames"
            render={({ field }) => (
              <MultiSelectPopover 
                options={allSubjectNames} 
                selected={new Set(field.value)} 
                onChange={field.onChange} 
              />
            )}
          />
          {errors.subjectNames && <p className="text-sm text-destructive">{errors.subjectNames.message}</p>}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <div>
                 <Label>Actividades y Ponderaciones</Label>
                 {errors.activities?.root && <p className="text-sm text-destructive">{errors.activities.root.message}</p>}
            </div>
            <Badge variant={totalWeight === 100 ? 'default' : 'destructive'} className="flex items-center gap-1">
              {totalWeight === 100 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4"/>}
              Total: {totalWeight.toFixed(2)}%
            </Badge>
        </div>
        <Card className="p-4 bg-muted/50">
          <ScrollArea className="h-48">
            <div className="space-y-3 pr-4">
              {activityGroups.map((group, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input 
                    placeholder="Ej: 1-3, 5" 
                    value={group.range} 
                    onChange={(e) => handleGroupChange(index, 'range', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Etiqueta (Ej. Examen)"
                    value={group.label || ''}
                    onChange={(e) => handleGroupChange(index, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="%" 
                      value={Number.isNaN(group.weight) ? '' : group.weight}
                      onChange={(e) => handleGroupChange(index, 'weight', e.target.valueAsNumber)}
                      className="w-28 pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeGroup(index)} disabled={activityGroups.length <= 1}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
              ))}
            </div>
          </ScrollArea>
           <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addGroup}>
             <PlusCircle className="mr-2 h-4 w-4" /> Añadir Grupo
          </Button>
        </Card>
      </div>

       <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit">Guardar Esquema</Button>
      </DialogFooter>
    </form>
  );
}


function MultiSelectPopover({ options, selected, onChange }: { options: string[], selected: Set<string>, onChange: (selected: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    return options.filter(option => option.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const handleSelect = (option: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(option)) {
      newSelected.delete(option);
    } else {
      newSelected.add(option);
    }
    onChange(Array.from(newSelected));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          <span className="truncate">{selected.size > 0 ? `${selected.size} materia(s) seleccionada(s)` : "Seleccionar materias..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar materia..." value={search} onValueChange={setSearch} />
          <CommandEmpty>No se encontraron materias.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-72">
            {filteredOptions.map(option => (
              <CommandItem key={option} onSelect={() => handleSelect(option)} className="flex items-center gap-2">
                <Checkbox checked={selected.has(option)} />
                <span>{option}</span>
              </CommandItem>
            ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


export function PonderacionesDashboard() {
  const [schemeQuery, setSchemeQuery] = useState('');
  const { weightingSchemes, setWeightingSchemes, fetchWeightingSchemes, subjects: allSubjectNames } = useDashboardFilters();
  const visibleSchemes = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize(schemeQuery.trim());
    return weightingSchemes.filter(scheme => normalize([scheme.name, ...scheme.subjectNames].join(' ')).includes(query));
  }, [weightingSchemes, schemeQuery]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<WeightingScheme | undefined>(undefined);
  const { toast } = useToast();

  const handleValidateFile = async (file: File | null) => {
    if (!file) return;
    try {
      const schemes = readWeightingWorkbook(XLSX.read(await file.arrayBuffer(), { type: 'array' }));
      toast({ title: 'Formato compatible', description: schemes.length + ' bloques de ponderación reconocidos. Esta revisión no modifica los esquemas guardados.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Revisa el archivo', description: error instanceof Error ? error.message : 'No se pudo leer.' });
    }
  };

  const handleExport = () => {
    try {
      const workbook = buildWeightingWorkbook(weightingSchemes, allSubjectNames);
      XLSX.writeFile(workbook, `Ponderaciones_Sentinel_${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
      toast({ title: 'Respaldo descargado', description: `${weightingSchemes.length} esquemas exportados en una sola hoja, organizados por materia.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'No se pudo exportar', description: error instanceof Error ? error.message : 'Intenta nuevamente.' });
    }
  };

  useEffect(() => {
    if (!isFormOpen) {
        fetchWeightingSchemes();
    }
  }, [isFormOpen, fetchWeightingSchemes]);

  const handleFormSubmit = async (data: SchemeFormValues) => {
    try {
      const scheme = { ...data, id: data.id || crypto.randomUUID() };
      setWeightingSchemes(previous => [...previous.filter(item => item.id !== scheme.id), scheme]);
      toast({ title: "Éxito", description: `El esquema "${data.name}" ha sido guardado.` });
      fetchWeightingSchemes();
      setIsFormOpen(false);
      setEditingScheme(undefined);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el esquema." });
    }
  };

  const handleDelete = async (schemeId: string, schemeName: string) => {
    try {
        setWeightingSchemes(previous => previous.filter(scheme => scheme.id !== schemeId));
        toast({ title: "Eliminado", description: `El esquema "${schemeName}" ha sido eliminado.`});
        fetchWeightingSchemes();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el esquema." });
    }
  };
  
  return (
    <div className="workspace-page">
<WorkspaceHeader eyebrow="Configuración académica" title="Gestor de ponderaciones" description="Administra los pesos de las actividades y su asignación por materia.">        <div className="flex flex-wrap gap-2">
         <FileUpload onFileSelect={handleValidateFile} selectedFile={null} isLoading={false} label="Verificar Excel de ponderaciones" variant="outline" />
         <Button variant="outline" onClick={handleExport} disabled={weightingSchemes.length === 0}>Descargar ponderaciones (Excel)</Button>
         <Button onClick={() => { setEditingScheme(undefined); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Esquema
        </Button>
        </div>
      </WorkspaceHeader>
      <p className="text-sm text-muted-foreground">Una sola hoja con un bloque por materia: Actividad, Etiqueta y Weight. Incluye todos los esquemas cargados; puedes copiarla al archivo base.</p>

      {weightingSchemes.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><BookCopy className="mx-auto mb-4 h-8 w-8 text-primary" /><h2 className="text-lg font-semibold">Tus ponderaciones aparecerán aquí</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Carga el archivo base con su hoja de ponderaciones o crea tu primer esquema.</p></div>}
      {weightingSchemes.length > 0 && <div className="flex flex-wrap items-center gap-3"><Input aria-label="Buscar esquema o materia" placeholder="Buscar esquema o materia…" value={schemeQuery} onChange={event => setSchemeQuery(event.target.value)} className="h-11 max-w-md bg-white" /><span className="text-xs text-slate-500">{visibleSchemes.length} de {weightingSchemes.length} esquemas</span></div>}
      {weightingSchemes.length > 0 && visibleSchemes.length === 0 && <p role="status" className="rounded-xl border bg-white p-6 text-sm text-slate-500">No hay esquemas que coincidan con tu búsqueda.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleSchemes.map(scheme => (
          <Card key={scheme.id} className="flex flex-col overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-start gap-2 text-base leading-snug">
                    <BookCopy /> {scheme.name}
                </CardTitle>
                <div className="flex gap-1">
                    <Button aria-label={'Editar ' + scheme.name} variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingScheme(scheme); setIsFormOpen(true); }}>
                        <Edit className="h-4 w-4"/>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button aria-label={'Eliminar ' + scheme.name} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                          <AlertDialogDescription>Se eliminará el esquema "{scheme.name}". Esta acción no se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive" onClick={() => handleDelete(scheme.id!, scheme.name)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <details className="space-y-3 text-sm rounded-lg bg-slate-50 p-3">
                <summary className="cursor-pointer font-medium text-primary focus-visible:outline-primary">Ver {scheme.activities.length} actividades</summary>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {scheme.activities.map((act, i) => (
                        <li key={i}><strong>{act.name}:</strong> {act.weight}% {act.label && <span className="text-blue-600 font-semibold">({act.label})</span>}</li>
                    ))}
                </ul>
              </details>
              <div className="space-y-2 pt-2">
                <h4 className="font-semibold">Materias que usan este esquema:</h4>
                <div className="flex flex-wrap gap-2">
                    {scheme.subjectNames.map(name => (
                        <Badge key={name} variant="secondary">{name}</Badge>
                    ))}
                </div>
              </div>
            </CardContent>
             <CardFooter>
                <Badge variant={scheme.activities.reduce((s, a) => s + a.weight, 0) === 100 ? "default" : "destructive"}>
                  Total: {scheme.activities.reduce((s, a) => s + a.weight, 0)}%
                </Badge>
            </CardFooter>
          </Card>
        ))}
      </div>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingScheme ? 'Editar Esquema de Ponderación' : 'Crear Nuevo Esquema'}</DialogTitle>
          </DialogHeader>
          <SchemeForm 
            onFormSubmit={handleFormSubmit}
            existingScheme={editingScheme}
            allSubjectNames={allSubjectNames}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
