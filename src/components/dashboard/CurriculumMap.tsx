
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { curriculum, type CurriculumCourse } from '@/lib/curriculum';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb } from 'lucide-react';

const courseMap = new Map(curriculum.flatMap((term, termIndex) => term.courses.map(course => [course.name, { ...course, term: term.name, termIndex }])));

const prerequisiteForMap = new Map<string, string[]>();
for (const course of courseMap.values()) {
  if (course.prerequisite) {
    if (!prerequisiteForMap.has(course.prerequisite)) {
      prerequisiteForMap.set(course.prerequisite, []);
    }
    prerequisiteForMap.get(course.prerequisite)?.push(course.name);
  }
}

const HIGH_PRIORITY_COURSES = new Set([
  'Ecología y Geografía', 'Transformación de la materia', 'El carbono y sus componentes',
  'Materia y energía I', 'Ciencias de la Vida', 'Materia y energía II', 'Cuidado del cuerpo humano',
  'Tecnologías de la Información I', 'Tecnologías de la Información II',
  'Habilidades y valores I: bienestar', 'Habilidades y valores II: pensamiento crítico',
  'Habilidades y valores III: ser creativo', 'Habilidades y valores IV: plan de vida y carrera',
  'Habilidades y valores V: lenguaje', 'Habilidades y valores VI: toma de decisiones',
]);


interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CurriculumMap() {
  const [selectedTermIndex, setSelectedTermIndex] = useState<number>(-1);
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
            if (courseName && !courseMap.get(courseName)?.isPlaceholder) {
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
    const resizeObserver = new ResizeObserver(updateNodePositions);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }
    window.addEventListener('resize', updateNodePositions);
    
    return () => {
      if (gridRef.current) {
        resizeObserver.unobserve(gridRef.current);
      }
      window.removeEventListener('resize', updateNodePositions);
    };
  }, []);
  
  const handleTermClick = (termIndex: number) => {
    setSelectedTermIndex(termIndex);
    setPendingCourses(new Set()); // Reset pending courses when a new term is selected
  };
  
  const handleCourseClick = (courseName: string, termIndex: number) => {
    if (selectedTermIndex === -1 || termIndex >= selectedTermIndex) {
        return; // Can only mark courses from previous terms as pending
    }

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
  
  const { approvedCourses, lockedCourses, recommendedCourses } = useMemo(() => {
    const approved = new Set<string>();
    if (selectedTermIndex > -1) {
        for(let i = 0; i < selectedTermIndex; i++) {
            curriculum[i].courses.forEach(c => {
                if(!c.isPlaceholder) approved.add(c.name);
            });
        }
    }
    
    pendingCourses.forEach(pc => approved.delete(pc));
    
    const isPrerequisiteApproved = (prereq: string | undefined) => !prereq || approved.has(prereq);

    // --- Start Recommendation Logic ---
    let recommended = new Set<string>();
    if (selectedTermIndex > -1) {
        const targetTermCourses = (curriculum[selectedTermIndex]?.courses || [])
            .filter(c => !c.isPlaceholder && !approved.has(c.name) && isPrerequisiteApproved(c.prerequisite));

        const pendingFromCurriculum = curriculum
            .flatMap(term => term.courses)
            .filter(course => pendingCourses.has(course.name));
            
        const pendingToTake = pendingFromCurriculum.filter(course => isPrerequisiteApproved(course.prerequisite));

        let load: CurriculumCourse[] = [...pendingToTake];

        const allAvailableCourses = [...targetTermCourses];
        
        allAvailableCourses.sort((a, b) => {
            const aIsHighPriority = HIGH_PRIORITY_COURSES.has(a.name);
            const bIsHighPriority = HIGH_PRIORITY_COURSES.has(b.name);
            if (aIsHighPriority && !bIsHighPriority) return -1;
            if (!aIsHighPriority && bIsHighPriority) return 1;

            const futurePrerequisites = new Set(
                curriculum.slice(selectedTermIndex + 1).flatMap(t => t.courses.map(c => c.prerequisite).filter(Boolean))
            );
            const aIsPrereq = futurePrerequisites.has(a.name);
            const bIsPrereq = futurePrerequisites.has(b.name);
            if (aIsPrereq && !bIsPrereq) return -1;
            if (!aIsPrereq && bIsPrereq) return 1;

            return 0;
        });
        
        let i = 0;
        while (load.length < 7 && i < allAvailableCourses.length) {
            const courseToAdd = allAvailableCourses[i];
            if(!load.some(c => c.name === courseToAdd.name)) {
                load.push(courseToAdd);
            }
            i++;
        }
        recommended = new Set(load.map(c => c.name));
    }
    // --- End Recommendation Logic ---

    const locked = new Set<string>();
    for(const course of courseMap.values()){
        if(course.isPlaceholder) continue;

        if (selectedTermIndex > -1 && course.termIndex >= selectedTermIndex) {
            // Lock if it's in the current or future term but not recommended
            if(course.termIndex === selectedTermIndex && !recommended.has(course.name)) {
               locked.add(course.name);
            }
            // Lock if prerequisite is not met
            if (!isPrerequisiteApproved(course.prerequisite)) {
               locked.add(course.name);
            }
        }
    }
    
    const toCheck = new Set(locked);
    const checked = new Set<string>();
    while(toCheck.size > 0) {
      const courseName = toCheck.values().next().value;
      toCheck.delete(courseName);

      if(!checked.has(courseName)){
        const dependents = prerequisiteForMap.get(courseName);
        if (dependents) {
          dependents.forEach(dep => {
            if(!locked.has(dep)){
              locked.add(dep);
              toCheck.add(dep);
            }
          });
        }
        checked.add(courseName);
      }
    }

    return { approvedCourses: approved, lockedCourses: locked, recommendedCourses: recommended };
  }, [selectedTermIndex, pendingCourses]);

  const gridStructure = useMemo(() => {
    const maxRows = Math.max(...curriculum.map(t => t.courses.length)) + 1; // +1 for header
    return {
        rows: maxRows,
        columns: curriculum.length
    }
  }, []);

  const getCourseState = (courseName: string, termIndex: number) => {
     if (recommendedCourses.has(courseName) && termIndex === selectedTermIndex) return 'recommended';
     if (lockedCourses.has(courseName)) return 'locked';
     if (pendingCourses.has(courseName)) return 'pending';
     if (approvedCourses.has(courseName)) return 'approved';
     if (selectedTermIndex > -1 && termIndex < selectedTermIndex) return 'approved';
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
            
            const isLocked = lockedCourses.has(courseName) || (course.prerequisite && lockedCourses.has(course.prerequisite));
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
        <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Mapa Curricular Interactivo</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
                <li>Haz clic en el **título de un tetramestre** para simular el avance de un alumno hasta ese punto.</li>
                <li>Las materias de tetramestres anteriores se marcarán como <span className="font-semibold text-green-700">aprobadas</span>.</li>
                <li>Las materias del tetramestre seleccionado se marcarán como <span className="font-semibold text-blue-700">recomendadas</span>.</li>
                <li>Haz clic en una materia aprobada para marcarla como <span className="font-semibold text-red-700">pendiente</span> y ver cómo afecta el futuro.</li>
              </ol>
            </AlertDescription>
        </Alert>
        <main className="flex-1 overflow-x-auto">
            <div
                ref={gridRef}
                className="curriculum-grid relative"
                style={{
                    gridTemplateColumns: `repeat(${gridStructure.columns}, minmax(160px, 1fr))`,
                    gridTemplateRows: `auto repeat(${gridStructure.rows - 1}, minmax(60px, auto))`,
                }}
            >
                <svg className="svg-connector-layer">
                    <g>{connectorLines}</g>
                </svg>
                {curriculum.map((term, termIndex) => (
                    <div key={term.name} className="term-header" style={{ gridColumn: termIndex + 1 }} onClick={() => handleTermClick(termIndex)}>
                        <h2 className={cn(
                          "font-bold text-center text-primary cursor-pointer hover:underline p-2 rounded-md transition-colors",
                          selectedTermIndex === termIndex && "bg-primary/10 ring-2 ring-primary"
                        )}>{term.name}</h2>
                    </div>
                ))}

                {curriculum.flatMap((term, termIndex) => 
                    term.courses.map((course, courseIndex) => {
                        if (course.isPlaceholder) {
                          return (
                              <div key={`${term.name}-${course.name}`} style={{ gridColumn: termIndex + 1, gridRow: courseIndex + 2 }}></div>
                          );
                        }
                      const state = getCourseState(course.name, termIndex);
                      return (
                          <div
                              key={course.name}
                              data-course-name={course.name}
                              className={cn('course-cell', {
                                  'locked': state === 'locked',
                                  'pending': state === 'pending',
                                  'approved': state === 'approved',
                                  'recommended': state === 'recommended',
                              })}
                              style={{ 
                                  gridColumn: termIndex + 1,
                                  gridRow: courseIndex + 2 // +2 because row 1 is for headers
                              }}
                          >
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <div className="course-card" onClick={() => handleCourseClick(course.name, termIndex)}>
                                          <p className="text-xs font-semibold leading-tight">{course.name}</p>
                                      </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p className="font-bold">{course.name}</p>
                                      <p className="text-xs text-muted-foreground capitalize">Estado: {state}</p>
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
                    })
                )}
            </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
