
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { curriculum } from '@/lib/curriculum';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, Check, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// We create a map for faster lookups of course data
const courseMap = new Map(curriculum.flatMap(term => term.courses.map(course => [course.name, { ...course, term: term.name }])));

// A map to find all courses that have a specific course as a prerequisite
const prerequisiteForMap = new Map<string, string[]>();
for (const course of courseMap.values()) {
  if (course.prerequisite) {
    if (!prerequisiteForMap.has(course.prerequisite)) {
      prerequisiteForMap.set(course.prerequisite, []);
    }
    prerequisiteForMap.get(course.prerequisite)?.push(course.name);
  }
}

export function CurriculumMap() {
  const [highlightedTerm, setHighlightedTerm] = useState<string>('');
  const [pendingCourses, setPendingCourses] = useState<Set<string>>(new Set());

  const handlePendingToggle = (courseName: string) => {
    setPendingCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseName)) {
        newSet.delete(courseName);
      } else {
        newSet.add(courseName);
      }
      return newSet;
    });
  };
  
  const getLockedCourses = useCallback((): Set<string> => {
    const locked = new Set<string>();
    const toCheck = [...pendingCourses];
    const checked = new Set<string>();
    
    while(toCheck.length > 0) {
      const courseName = toCheck.pop();
      if(courseName && !checked.has(courseName)){
        const dependents = prerequisiteForMap.get(courseName);
        if (dependents) {
          dependents.forEach(dep => {
            locked.add(dep);
            toCheck.push(dep);
          });
        }
        checked.add(courseName)
      }
    }
    return locked;
  }, [pendingCourses]);

  const lockedCourses = useMemo(() => getLockedCourses(), [getLockedCourses]);

  const gridAreas = useMemo(() => {
    const areas: { [key: string]: string } = {};
    curriculum.forEach((term, termIndex) => {
      term.courses.forEach((course, courseIndex) => {
        const safeName = course.name.replace(/[^a-zA-Z0-9]/g, '');
        areas[safeName] = `${courseIndex + 1} / ${termIndex + 1}`;
      });
    });
    return areas;
  }, []);
  
  const getCourseState = (courseName: string) => {
     if (lockedCourses.has(courseName)) return 'locked';
     if (pendingCourses.has(courseName)) return 'pending';
     return 'default';
  }

  return (
    <TooltipProvider>
    <div className="p-6 bg-slate-50 min-h-full">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/4 xl:w-1/5 space-y-6">
            <div className="p-4 border rounded-lg bg-white shadow-sm">
                <h3 className="font-semibold mb-3">Resaltar Tetramestre</h3>
                <RadioGroup value={highlightedTerm} onValueChange={setHighlightedTerm}>
                    {curriculum.map(term => (
                    <div key={term.name} className="flex items-center space-x-2">
                        <RadioGroupItem value={term.name} id={term.name} />
                        <Label htmlFor={term.name}>{term.name}</Label>
                    </div>
                    ))}
                </RadioGroup>
                {highlightedTerm && (
                    <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setHighlightedTerm('')}>
                        Limpiar selección
                    </Button>
                )}
            </div>
            <div className="p-4 border rounded-lg bg-white shadow-sm">
                <h3 className="font-semibold mb-3">Marcar Materias Pendientes</h3>
                <p className="text-xs text-muted-foreground mb-4">Selecciona las materias que el alumno debe para ver el impacto en su ruta.</p>
                 <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {Array.from(courseMap.values()).sort((a,b) => a.term.localeCompare(b.term)).map(course => (
                        <div key={course.name} className="flex items-center space-x-2">
                            <Checkbox
                                id={`check-${course.name}`}
                                checked={pendingCourses.has(course.name)}
                                onCheckedChange={() => handlePendingToggle(course.name)}
                                disabled={lockedCourses.has(course.name)}
                            />
                            <Label htmlFor={`check-${course.name}`} className="text-sm">
                                {course.name}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>
        </aside>

        <main className="flex-1 overflow-x-auto">
            <div
                className="curriculum-grid"
                style={{
                    gridTemplateColumns: `repeat(${curriculum.length}, minmax(160px, 1fr))`,
                    gridTemplateRows: `repeat(${Math.max(...curriculum.map(t => t.courses.length))}, auto)`,
                }}
            >
                {curriculum.map((term, termIndex) => (
                    <div key={term.name} className="term-header" style={{ gridColumn: termIndex + 1 }}>
                        <h2 className="font-bold text-center text-primary">{term.name}</h2>
                    </div>
                ))}

                {Array.from(courseMap.values()).map(course => {
                    const safeName = course.name.replace(/[^a-zA-Z0-9]/g, '');
                    const gridArea = gridAreas[safeName];
                    const [row, col] = gridArea ? gridArea.split(' / ').map(Number) : [0,0];
                    const state = getCourseState(course.name);

                    return (
                        <div
                            key={course.name}
                            className={cn('course-cell', {
                                'highlight': highlightedTerm === course.term,
                                'locked': state === 'locked',
                                'pending': state === 'pending'
                            })}
                            style={{ gridArea: gridArea }}
                        >
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="course-card">
                                        <p className="text-xs font-semibold leading-tight">{course.name}</p>
                                        {course.prerequisite && <div className="prereq-indicator" />}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-bold">{course.name}</p>
                                    {course.prerequisite && <p className="text-xs text-muted-foreground">Prerrequisito: {course.prerequisite}</p>}
                                </TooltipContent>
                            </Tooltip>
                            
                           {prerequisiteForMap.get(course.name) && <div className="postreq-indicator" />}
                           
                           <button
                             onClick={() => handlePendingToggle(course.name)}
                             className={cn("absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white transition-all", {
                                 "bg-gray-300 hover:bg-gray-400": state === 'default',
                                 "bg-red-500 hover:bg-red-600": state === 'pending',
                                 "bg-gray-500 cursor-not-allowed": state === 'locked',
                             })}
                             disabled={state === 'locked'}
                             aria-label={`Marcar ${course.name} como pendiente`}
                           >
                            {state === 'pending' ? <X size={12} /> : <Check size={12} />}
                           </button>
                        </div>
                    );
                })}
            </div>
            <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border">
                <h3 className="font-semibold mb-2">Leyenda de Colores</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-100 border border-blue-300"></div>
                        <span>Materia resaltada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-100 border border-red-300 flex items-center justify-center">
                            <X size={12} className="text-red-600" />
                        </div>
                        <span>Materia pendiente</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="w-4 h-4 rounded-full bg-gray-300 border border-gray-400"></div>
                        <span>Materia bloqueada</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500 ring-2 ring-offset-2 ring-gray-500"></div>
                        <span>Tiene prerrequisito</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-gray-500 rounded-full"></div>
                        <span>Es prerrequisito</span>
                    </div>
                </div>
            </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
