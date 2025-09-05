
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { curriculum, type CurriculumCourse, type CurriculumTerm } from '@/lib/curriculum';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Users, AlertTriangle } from 'lucide-react';

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

const ORDINAL_MAP: Record<string, string> = {
    'Primer Tetramestre': '1°',
    'Segundo Tetramestre': '2°',
    'Tercer Tetramestre': '3°',
    'Cuarto Tetramestre': '4°',
    'Quinto Tetramestre': '5°',
    'Sexto Tetramestre': '6°',
};

const getCriticalCourses = (currentTermIndex: number, activeTerms: Set<string>): Set<string> => {
    const critical = new Set<string>();
    if (currentTermIndex < 0 || currentTermIndex >= curriculum.length) return critical;

    // A term is critical if there's no "cushion" generation (N-1) active
    const previousTermIndex = currentTermIndex - 1;
    if (previousTermIndex >= 0) {
        const previousTerm = curriculum[previousTermIndex];
        if (!activeTerms.has(previousTerm.name)) {
            // This means there's no active generation that will be in the currentTermIndex next period
            const currentTermCourses = curriculum[currentTermIndex].courses;
            currentTermCourses.forEach(course => {
                if (HIGH_PRIORITY_COURSES.has(course.name)) {
                    critical.add(course.name);
                }
            });
        }
    }
    return critical;
};


export function MapPlanner() {
  const [selectedTermIndex, setSelectedTermIndex] = useState<number>(-1);
  const [pendingCourses, setPendingCourses] = useState<Set<string>>(new Set());
  const [manuallyApprovedCourses, setManuallyApprovedCourses] = useState<Set<string>>(new Set());
  const [activeTerms, setActiveTerms] = useState<Set<string>>(new Set(curriculum.map(term => term.name)));
  const [isGraduationCandidate, setIsGraduationCandidate] = useState(false);
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
    if (termIndex < 5) {
        setIsGraduationCandidate(false);
    }
  };
  
  const handleCourseStatusToggle = (courseName: string, termIndex: number) => {
    if (selectedTermIndex > -1 && termIndex < selectedTermIndex) {
        setPendingCourses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(courseName)) {
                newSet.delete(courseName);
            } else {
                newSet.add(courseName);
            }
            return newSet;
        });
    } 
    else if (selectedTermIndex > -1 && termIndex >= selectedTermIndex) {
        setManuallyApprovedCourses(prev => {
             const newSet = new Set(prev);
            if (newSet.has(courseName)) {
                newSet.delete(courseName);
            } else {
                newSet.add(courseName);
            }
            return newSet;
        });
    }
  };

  const handleActiveTermToggle = (termName: string) => {
      setActiveTerms(prev => {
        const newSet = new Set(prev);
        if(newSet.has(termName)) {
            newSet.delete(termName);
        } else {
            newSet.add(termName);
        }
        return newSet;
      })
  }

  const { approvedCourses, lockedCourses, recommendedCourses, criticalCourses } = useMemo(() => {
    // 1. Determine Locked Courses first (Cascading effect)
    const locked = new Set<string>();
    let prevLockedSize = -1;
    
    // This loop ensures that the blocking cascades through all dependencies.
    while (locked.size > prevLockedSize) {
        prevLockedSize = locked.size;
        for (const course of courseMap.values()) {
            if (course.isPlaceholder || locked.has(course.name)) continue;

            const isPrereqPending = course.prerequisite ? pendingCourses.has(course.prerequisite) : false;
            const isPrereqLocked = course.prerequisite ? locked.has(course.prerequisite) : false;

            if (isPrereqPending || isPrereqLocked) {
                locked.add(course.name);
            }
        }
    }

    // 2. Determine Approved Courses
    const approved = new Set<string>();
    if (selectedTermIndex > -1) {
      for (let i = 0; i < selectedTermIndex; i++) {
        curriculum[i].courses.forEach(c => {
          // A past course is approved ONLY if it's not pending and not locked
          if (!c.isPlaceholder && !pendingCourses.has(c.name) && !locked.has(c.name)) {
            approved.add(c.name);
          }
        });
      }
    }
    // Add manually approved courses, but only if they are not locked.
    manuallyApprovedCourses.forEach(c => {
        if (!locked.has(c)) {
            approved.add(c);
        }
    });

    // 3. Determine Recommended and Critical Courses
    const critical = getCriticalCourses(selectedTermIndex, activeTerms);
    const recommended = new Set<string>();

    if (selectedTermIndex > -1) {
        // Rule 1: Recommend all PENDING courses that are not locked
        pendingCourses.forEach(pendingCourse => {
            if (!locked.has(pendingCourse)) {
                recommended.add(pendingCourse);
            }
        });

        // Rule 2: Recommend courses from the current term
        const currentTermCourses = curriculum[selectedTermIndex].courses;
        currentTermCourses.forEach(course => {
            if (course.isPlaceholder) return;
            const prereq = course.prerequisite;
            const prereqMet = prereq ? approved.has(prereq) : true;
            if (prereqMet && !locked.has(course.name) && !approved.has(course.name)) {
                recommended.add(course.name);
            }
        });
    }

    return { 
        approvedCourses: approved, 
        lockedCourses: locked, 
        recommendedCourses: recommended,
        criticalCourses: critical 
    };
  }, [selectedTermIndex, pendingCourses, manuallyApprovedCourses, activeTerms]);


  const gridStructure = useMemo(() => {
    const maxRows = Math.max(...curriculum.map(t => t.courses.length)) + 1; // +1 for header
    return {
        rows: maxRows,
        columns: curriculum.length
    }
  }, []);

  const getCourseState = (courseName: string, isPending: boolean) => {
     if (lockedCourses.has(courseName)) return 'locked';
     if (criticalCourses.has(courseName)) return 'critical';
     if (approvedCourses.has(courseName)) return 'approved';
     // A pending course is now also recommended, the 'pending' class will handle the indicator
     if (recommendedCourses.has(courseName)) return 'recommended';
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
            
            const isSourcePending = pendingCourses.has(course.prerequisite);
            const isTargetLocked = lockedCourses.has(courseName);

            lines.push(
                 <path
                    key={`${course.prerequisite}-${courseName}`}
                    d={`M ${startX},${startY} C ${startX + 30},${startY} ${endX - 30},${endY} ${endX},${endY}`}
                    className={cn('connector-line', { 'pending': isSourcePending || isTargetLocked })}
                    fill="none"
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
            <AlertTitle className="text-blue-800">Planificador por Mapa Interactivo</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
                <li>Selecciona los **períodos activos** para simular la oferta académica real. Las materias no flexibles de períodos inactivos se bloquearán.</li>
                <li>Haz clic en el **título de un período (ej. 1°)** para simular el avance de un alumno.</li>
                <li>Las materias de períodos anteriores se marcarán como <span className="font-semibold text-green-700">aprobadas</span>. Las materias reprobadas de periodos anteriores se marcarán como <span className="font-semibold text-blue-700">recomendadas</span> para cursar.</li>
                <li>Las materias del período seleccionado se marcarán como <span className="font-semibold text-blue-700">recomendadas</span> o <span className="font-semibold text-red-700">críticas</span> para cursar.</li>
                <li>Haz clic en el <span className="font-semibold">círculo de una materia</span> para cambiar su estado (pendiente o aprobada manualmente).</li>
              </ol>
            </AlertDescription>
        </Alert>
         <Card className="mb-6">
            <CardHeader>
                <CardTitle>Define el Contexto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-6 gap-y-4 items-center">
                 <div>
                    <h3 className='font-medium mb-2'>Periodos Activos</h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {curriculum.map((term) => (
                        <div key={term.name} className="flex items-center space-x-2">
                            <Checkbox
                                id={`active-${term.name}`}
                                checked={activeTerms.has(term.name)}
                                onCheckedChange={() => handleActiveTermToggle(term.name)}
                            />
                            <Label htmlFor={`active-${term.name}`} className="font-medium cursor-pointer">
                            {ORDINAL_MAP[term.name] ?? term.name}
                            </Label>
                        </div>
                    ))}
                    </div>
                 </div>
                 {selectedTermIndex === 5 && (
                    <div className="flex items-center space-x-2 pt-5 pl-4">
                        <Checkbox
                            id="graduation-candidate"
                            checked={isGraduationCandidate}
                            onCheckedChange={(checked) => setIsGraduationCandidate(!!checked)}
                        />
                        <Label htmlFor="graduation-candidate" className="font-medium flex items-center gap-2 cursor-pointer">
                           <Users className='h-4 w-4' /> Es Candidato a Graduación
                        </Label>
                    </div>
                 )}
            </CardContent>
         </Card>
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
                        )}>{ORDINAL_MAP[term.name] ?? term.name}</h2>
                    </div>
                ))}

                {curriculum.flatMap((term, termIndex) => 
                    term.courses.map((course, courseIndex) => {
                        if (course.isPlaceholder) {
                          return (
                              <div key={`${term.name}-${course.name}-${courseIndex}`} style={{ gridColumn: termIndex + 1, gridRow: courseIndex + 2 }}></div>
                          );
                        }
                      const isPending = pendingCourses.has(course.name);
                      const state = getCourseState(course.name, isPending);
                      const isFlex = !HIGH_PRIORITY_COURSES.has(course.name);
                      
                      return (
                          <div
                              key={course.name}
                              data-course-name={course.name}
                              className={cn('course-cell', {
                                  'locked': state === 'locked',
                                  'pending': isPending,
                                  'approved': state === 'approved',
                                  'recommended': state === 'recommended',
                                  'critical': state === 'critical',
                              })}
                              style={{ 
                                  gridColumn: termIndex + 1,
                                  gridRow: courseIndex + 2 // +2 because row 1 is for headers
                              }}
                          >
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <div className="course-card">
                                          {selectedTermIndex > -1 && (
                                              <div 
                                                className="course-status-indicator" 
                                                onClick={() => handleCourseStatusToggle(course.name, termIndex)}
                                                title={
                                                    termIndex < selectedTermIndex 
                                                        ? (isPending ? 'Marcar como aprobada' : 'Marcar como pendiente')
                                                        : (approvedCourses.has(course.name) ? 'Desmarcar como aprobada' : 'Marcar como aprobada manualmente')
                                                }
                                              />
                                          )}
                                          {isFlex && <div className="course-flex-indicator">F</div>}
                                          <p className="text-xs font-semibold leading-tight">{course.name}</p>
                                      </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p className="font-bold">{course.name}</p>
                                      {state === 'critical' && (
                                        <p className="text-xs text-destructive font-semibold flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            ¡Crítica! Si no la cursas ahora, te atrasarás un ciclo.
                                        </p>
                                      )}
                                      <div className='flex gap-2 items-center'>
                                        <p className="text-xs text-muted-foreground capitalize">Estado: {state}</p>
                                        {isPending && <p className="text-xs text-red-500 font-semibold">Pendiente</p>}
                                      </div>
                                      {isFlex && <p className="text-xs text-blue-500 font-semibold">Materia Flexible</p>}
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
