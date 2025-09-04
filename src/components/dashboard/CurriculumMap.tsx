
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { curriculum } from '@/lib/curriculum';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const courseMap = new Map(curriculum.flatMap(term => term.courses.map(course => [course.name, { ...course, term: term.name }])));

const prerequisiteForMap = new Map<string, string[]>();
for (const course of courseMap.values()) {
  if (course.prerequisite) {
    if (!prerequisiteForMap.has(course.prerequisite)) {
      prerequisiteForMap.set(course.prerequisite, []);
    }
    prerequisiteForMap.get(course.prerequisite)?.push(course.name);
  }
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CurriculumMap() {
  const [highlightedTerm, setHighlightedTerm] = useState<string>('');
  const [pendingCourses, setPendingCourses] = useState<Set<string>>(new Set());
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateNodePositions() {
        if (!gridRef.current) return;
        const newPositions: Record<string, NodePosition> = {};
        const gridRect = gridRef.current.getBoundingClientRect();

        gridRef.current.querySelectorAll('.course-cell').forEach(node => {
            const courseName = (node as HTMLElement).dataset.courseName;
            if (courseName) {
                const nodeRect = node.getBoundingClientRect();
                newPositions[courseName] = {
                    x: nodeRect.left - gridRect.left,
                    y: nodeRect.top - gridRect.top,
                    width: nodeRect.width,
                    height: nodeRect.height,
                };
            }
        });
        setNodePositions(newPositions);
    }

    updateNodePositions();
    window.addEventListener('resize', updateNodePositions);
    return () => window.removeEventListener('resize', updateNodePositions);
  }, []); // Runs once on mount and cleans up

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

  const gridStructure = useMemo(() => {
    const maxRows = Math.max(...curriculum.map(t => t.courses.length)) + 1; // +1 for header
    return {
        rows: maxRows,
        columns: curriculum.length
    }
  }, []);

  const getCourseState = (courseName: string) => {
     if (lockedCourses.has(courseName)) return 'locked';
     if (pendingCourses.has(courseName)) return 'pending';
     return 'default';
  }

  const connectorLines = useMemo(() => {
    const lines = [];
    for (const [courseName, course] of courseMap.entries()) {
        if (course.prerequisite && nodePositions[courseName] && nodePositions[course.prerequisite]) {
            const fromNode = nodePositions[course.prerequisite];
            const toNode = nodePositions[courseName];
            
            const startX = fromNode.x + fromNode.width;
            const startY = fromNode.y + fromNode.height / 2;
            const endX = toNode.x;
            const endY = toNode.y + toNode.height / 2;

            const isLocked = lockedCourses.has(courseName);
            const isPending = pendingCourses.has(course.prerequisite);

            lines.push(
                 <line
                    key={`${course.prerequisite}-${courseName}`}
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    className={cn('connector-line', { locked: isLocked, pending: isPending })}
                />
            );
        }
    }
    return lines;
  }, [nodePositions, lockedCourses, pendingCourses]);

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
                  <h3 className="font-semibold mb-2">Leyenda</h3>
                  <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-md bg-blue-100 border border-blue-300"></div>
                          <span>Resaltado</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-md bg-red-100 border border-red-300"></div>
                          <span>Pendiente</span>
                      </div>
                      <div className="flex items-center gap-2">
                           <div className="w-4 h-4 rounded-md bg-gray-200 border border-gray-400"></div>
                          <span>Bloqueada</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 bg-gray-300"></div>
                          <span>Conexión</span>
                      </div>
                       <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 bg-red-300"></div>
                          <span>Conexión Bloqueada</span>
                      </div>
                  </div>
              </div>
          </aside>

          <main className="flex-1 overflow-x-auto">
              <div
                  ref={gridRef}
                  className="curriculum-grid relative"
                  style={{
                      gridTemplateColumns: `repeat(${gridStructure.columns}, minmax(160px, 1fr))`,
                      gridTemplateRows: `auto repeat(${gridStructure.rows - 1}, minmax(80px, auto))`,
                  }}
              >
                  <svg className="svg-connector-layer">
                      <g>{connectorLines}</g>
                  </svg>
                  {curriculum.map((term, termIndex) => (
                      <div key={term.name} className="term-header" style={{ gridColumn: termIndex + 1 }}>
                          <h2 className="font-bold text-center text-primary">{term.name}</h2>
                      </div>
                  ))}

                  {Array.from(courseMap.values()).map(course => {
                      const termIndex = curriculum.findIndex(t => t.name === course.term);
                      const courseIndex = curriculum[termIndex].courses.findIndex(c => c.name === course.name);
                      const state = getCourseState(course.name);

                      return (
                          <div
                              key={course.name}
                              data-course-name={course.name}
                              className={cn('course-cell', {
                                  'highlight': highlightedTerm === course.term,
                                  'locked': state === 'locked',
                                  'pending': state === 'pending'
                              })}
                              style={{ 
                                  gridColumn: termIndex + 1,
                                  gridRow: courseIndex + 2 // +2 because row 1 is for headers
                              }}
                          >
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <div className="course-card" onClick={() => handlePendingToggle(course.name)}>
                                          <p className="text-xs font-semibold leading-tight">{course.name}</p>
                                      </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p className="font-bold">{course.name}</p>
                                      <p className="text-xs text-muted-foreground">Estado: {state}</p>
                                      {course.prerequisite && <p className="text-xs text-muted-foreground">Prerrequisito: {course.prerequisite}</p>}
                                      {prerequisiteForMap.get(course.name) && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                              Requisito para: {prerequisiteForMap.get(course.name)!.join(', ')}
                                          </p>
                                      )}
                                  </TooltipContent>
                              </Tooltip>
                          </div>
                      );
                  })}
              </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
