
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
import { Lightbulb, Users } from 'lucide-react';

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
    setPendingCourses(new Set()); // Reset pending courses when a new term is selected
    setManuallyApprovedCourses(new Set()); // Reset manually approved courses as well
    if (termIndex < 5) {
        setIsGraduationCandidate(false);
    }
  };
  
  const handleCourseStatusToggle = (courseName: string, termIndex: number) => {
    // Logic for past terms: Toggle Pending Status
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
    // Logic for current or future terms: Toggle Manually Approved Status
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

  const { approvedCourses, lockedCourses, recommendedCourses } = useMemo(() => {
    // 1. Define the base set of approved courses
    const approved = new Set<string>();
    if (selectedTermIndex > -1) {
      for (let i = 0; i < selectedTermIndex; i++) {
        curriculum[i].courses.forEach(c => {
          if (!c.isPlaceholder) approved.add(c.name);
        });
      }
    }
    manuallyApprovedCourses.forEach(c => approved.add(c));
    // Crucially, remove any course marked as pending from the approved list
    pendingCourses.forEach(pc => approved.delete(pc));

    // 2. Determine locked courses with cascading effect
    const locked = new Set<string>();
    let prevLockedSize = -1;

    while (locked.size > prevLockedSize) {
        prevLockedSize = locked.size;

        for (const course of courseMap.values()) {
            if (course.isPlaceholder || locked.has(course.name)) {
                continue;
            }

            const isFlex = !HIGH_PRIORITY_COURSES.has(course.name);
            const courseTermInfo = courseMap.get(course.name);
            const isTermActive = courseTermInfo && activeTerms.has(courseTermInfo.term);
            
            const prereq = course.prerequisite;
            // A course is locked if its prerequisite is NOT approved OR if its prerequisite IS locked.
            const isPrereqMet = prereq ? approved.has(prereq) && !locked.has(prereq) : true;
            
            if (!isPrereqMet || (!isFlex && !isTermActive)) {
                 locked.add(course.name);
            }
        }
    }
    
    // Ignore prerequisites for graduation candidates in the final term
    const isGraduationMode = isGraduationCandidate && selectedTermIndex === 5;

    // 3. Determine recommended courses for the current term
    let recommendedLoad: CurriculumCourse[] = [];
    const maxCourses = isGraduationMode ? 9 : 7;
    
    if (selectedTermIndex > -1) {
      const isCourseAvailable = (course: CurriculumCourse, currentApproved: Set<string>) => {
        if (!course || course.isPlaceholder || locked.has(course.name) || currentApproved.has(course.name)) return false;

        const courseTermInfo = courseMap.get(course.name);
        if (!courseTermInfo) return false;

        if (isGraduationMode) return true; // In graduation mode, all non-approved/non-locked are available

        const isFlex = !HIGH_PRIORITY_COURSES.has(course.name);
        const isTermActive = activeTerms.has(courseTermInfo.term);
        const prereqMet = course.prerequisite ? currentApproved.has(course.prerequisite) : true;
        
        return prereqMet && (isFlex || isTermActive);
      };

      // Priority 1: Pending courses from past terms that can be taken now
      const pendingToTake = Array.from(pendingCourses)
        .map(name => courseMap.get(name)!)
        .filter(course => course && isCourseAvailable(course, approved));
      
      recommendedLoad = [...pendingToTake];
      let recommendedSet = new Set(recommendedLoad.map(c => c.name));

      // Priority 2: Courses from the current term
      if (recommendedLoad.length < maxCourses) {
          const targetTermCourses = (curriculum[selectedTermIndex]?.courses || [])
              .filter(c => !recommendedSet.has(c.name) && isCourseAvailable(c, approved));
          
          for (const course of targetTermCourses) {
              if (recommendedLoad.length < maxCourses) {
                  recommendedLoad.push(course);
                  recommendedSet.add(course.name);
              }
          }
      }

      // Priority 3: Advance subjects if there's space
      if (recommendedLoad.length < maxCourses) {
        const effectiveApproved = new Set([...approved, ...recommendedSet]);
        const futureTerms = curriculum.slice(selectedTermIndex + 1);

        for (const term of futureTerms) {
          if (recommendedLoad.length >= maxCourses) break;
          for (const course of term.courses) {
            if (recommendedLoad.length >= maxCourses) break;
            
            // Check availability based on the dynamically growing set of approved+recommended courses
            if (isCourseAvailable(course, effectiveApproved)) {
                // Additional rules for advancing subjects
                const isCourseSeq = course.prerequisite && recommendedSet.has(course.prerequisite);
                const isBlockedByPending = course.prerequisite && pendingCourses.has(course.prerequisite);

                if (!isCourseSeq && !isBlockedByPending) {
                    recommendedLoad.push(course);
                    recommendedSet.add(course.name);
                    effectiveApproved.add(course.name); // Update for next iteration
                }
            }
          }
        }
      }
    }
    
    const recommended = new Set(recommendedLoad.map(c => c.name));

    return { approvedCourses: approved, lockedCourses: locked, recommendedCourses: recommended };
  }, [selectedTermIndex, pendingCourses, manuallyApprovedCourses, activeTerms, isGraduationCandidate]);

  const gridStructure = useMemo(() => {
    const maxRows = Math.max(...curriculum.map(t => t.courses.length)) + 1; // +1 for header
    return {
        rows: maxRows,
        columns: curriculum.length
    }
  }, []);

  const getCourseState = (courseName: string) => {
     if (approvedCourses.has(courseName)) return 'approved';
     if (lockedCourses.has(courseName)) return 'locked';
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
            
            // A line is 'pending' if the prerequisite is pending OR the target course is locked
            const isPendingOrLocked = pendingCourses.has(course.prerequisite) || lockedCourses.has(courseName);

            lines.push(
                 <path
                    key={`${course.prerequisite}-${courseName}`}
                    d={`M ${startX},${startY} C ${startX + 30},${startY} ${endX - 30},${endY} ${endX},${endY}`}
                    className={cn('connector-line', { 'pending': isPendingOrLocked, 'locked': isPendingOrLocked })}
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
                <li>Las materias de períodos anteriores se marcarán como <span className="font-semibold text-green-700">aprobadas</span>.</li>
                <li>Las materias del período seleccionado se marcarán como <span className="font-semibold text-blue-700">recomendadas</span> para cursar.</li>
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
                      const state = getCourseState(course.name);
                      const isPending = pendingCourses.has(course.name);
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
