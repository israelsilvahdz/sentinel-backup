
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Info, BookOpen, BrainCircuit } from 'lucide-react';
import { curriculum, type CurriculumCourse } from '@/lib/curriculum';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const HIGH_PRIORITY_COURSES = new Set([
  'Ecología y Geografía',
  'Transformación de la materia',
  'El carbono y sus componentes',
  'Materia y energía I',
  'Ciencias de la Vida',
  'Materia y energía II',
  'Cuidado del cuerpo humano',
  'Tecnologías de la Información I',
  'Tecnologías de la Información II',
  'Habilidades y valores I: bienestar',
  'Habilidades y valores II: pensamiento crítico',
  'Habilidades y valores III: ser creativo',
  'Habilidades y valores IV: plan de vida y carrera',
  'Habilidades y valores V: lenguaje',
  'Habilidades y valores VI: toma de decisiones',
]);

export function CoursePlanner() {
  const [targetTermName, setTargetTermName] = useState<string>('');
  const [hasPendingCourses, setHasPendingCourses] = useState(false);
  const [pendingCourses, setPendingCourses] = useState<Set<string>>(new Set());
  const [isGraduationCandidate, setIsGraduationCandidate] = useState(false);

  const totalCourses = useMemo(() => curriculum.flatMap(t => t.courses).length, []);

  const handleTargetTermChange = (termName: string) => {
    setTargetTermName(termName);
    if (termName !== 'Sexto Tetramestre') {
      setIsGraduationCandidate(false);
    }
  };

  const handlePendingCourseToggle = (courseId: string) => {
    setPendingCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const { approvedCourses, previousTerms, targetTermIndex } = useMemo(() => {
    if (!targetTermName) {
      return { approvedCourses: new Set<string>(), previousTerms: [], targetTermIndex: -1 };
    }

    const termIndex = curriculum.findIndex(t => t.name === targetTermName);
    const prevTerms = curriculum.slice(0, termIndex);
    const allPreviousCourses = new Set(prevTerms.flatMap(t => t.courses.map(c => c.name)));

    pendingCourses.forEach(course => {
      allPreviousCourses.delete(course);
    });

    return { approvedCourses: allPreviousCourses, previousTerms: prevTerms, targetTermIndex: termIndex };
  }, [targetTermName, pendingCourses]);

  const isPrerequisiteApproved = useCallback((prerequisite: string | undefined): boolean => {
    if (!prerequisite) return true;
    return approvedCourses.has(prerequisite);
  }, [approvedCourses]);


  const { recommendedLoad, remainingCourses, availableButNotRecommended } = useMemo(() => {
    const allCourseIds = new Set(curriculum.flatMap(t => t.courses.map(c => c.name)));
    approvedCourses.forEach(course => allCourseIds.delete(course));
    const remaining = allCourseIds.size;

    if (targetTermIndex === -1) {
      return { recommendedLoad: [], remainingCourses: remaining, availableButNotRecommended: [] };
    }
    
    const maxCourses = isGraduationCandidate && remaining <= 2 ? 9 : 7;
    
    const pendingCoursesFromCurriculum = curriculum
      .flatMap(term => term.courses)
      .filter(course => pendingCourses.has(course.name));

    // Prioritize pending courses that have their prerequisites met
    const pendingToTake = pendingCoursesFromCurriculum.filter(course => isPrerequisiteApproved(course.prerequisite));

    let load: CurriculumCourse[] = [...pendingToTake];
    
    const targetTermCourses = (curriculum[targetTermIndex]?.courses || [])
        .filter(c => !approvedCourses.has(c.name) && isPrerequisiteApproved(c.prerequisite));
    
    const allAvailableCourses = [...targetTermCourses, ...pendingCoursesFromCurriculum.filter(c => !pendingToTake.includes(c))];

    // Sort target term courses by prioritizing high priority and then prerequisites for future terms
    allAvailableCourses.sort((a, b) => {
      const aIsHighPriority = HIGH_PRIORITY_COURSES.has(a.name);
      const bIsHighPriority = HIGH_PRIORITY_COURSES.has(b.name);
      
      if (aIsHighPriority && !bIsHighPriority) return -1;
      if (!aIsHighPriority && bIsHighPriority) return 1;

      const futurePrerequisites = new Set(
        curriculum.slice(targetTermIndex + 1).flatMap(t => t.courses.map(c => c.prerequisite).filter(Boolean))
      );
      const aIsPrereq = futurePrerequisites.has(a.name);
      const bIsPrereq = futurePrerequisites.has(b.name);
      if (aIsPrereq && !bIsPrereq) return -1;
      if (!aIsPrereq && bIsPrereq) return 1;

      return 0;
    });

    let i = 0;
    while (load.length < maxCourses && i < allAvailableCourses.length) {
      const courseToAdd = allAvailableCourses[i];
      if(!load.some(c => c.name === courseToAdd.name)) {
         load.push(courseToAdd);
      }
      i++;
    }
    
    const recommendedSet = new Set(load.map(c => c.name));
    const notRecommended = targetTermCourses.filter(c => !recommendedSet.has(c.name));

    return { recommendedLoad: load, remainingCourses: remaining, availableButNotRecommended: notRecommended };

  }, [approvedCourses, pendingCourses, targetTermIndex, isGraduationCandidate, isPrerequisiteApproved]);
  
  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Planificador de Carga Académica</h1>
        <p className="text-muted-foreground">
          Genera una carga recomendada para un alumno basado en su progreso y materias pendientes.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Columna de Selección */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paso 1: Define el Contexto del Alumno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="term-select" className="text-base font-semibold">¿A qué tetramestre ingresa el alumno?</Label>
                <Select value={targetTermName} onValueChange={handleTargetTermChange}>
                  <SelectTrigger id="term-select" className="mt-2">
                    <SelectValue placeholder="Selecciona un tetramestre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {curriculum.map(term => (
                      <SelectItem key={term.name} value={term.name}>{term.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-3">
                <Switch
                  id="has-pending-courses"
                  checked={hasPendingCourses}
                  onCheckedChange={setHasPendingCourses}
                  disabled={!targetTermName}
                />
                <Label htmlFor="has-pending-courses" className="text-base font-semibold">
                  ¿Tiene materias pendientes de tetras anteriores?
                </Label>
              </div>
              
              {targetTermName === 'Sexto Tetramestre' && (
                <div className="flex items-center space-x-3">
                    <Checkbox
                    id="graduationCandidate"
                    checked={isGraduationCandidate}
                    onCheckedChange={(checked) => setIsGraduationCandidate(!!checked)}
                    />
                    <Label htmlFor="graduationCandidate" className="font-semibold">
                     ¿Es candidato a graduarse y debe 2 o menos materias?
                    </Label>
                </div>
              )}

            </CardContent>
          </Card>
          
          {targetTermName && hasPendingCourses && (
            <Card>
              <CardHeader>
                <CardTitle>Paso 2: Selecciona las Materias Pendientes</CardTitle>
                 <CardDescription>Marca las materias que el alumno debe de tetramestres anteriores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {previousTerms.length > 0 ? previousTerms.map((term) => (
                  <div key={term.name}>
                    <h4 className="font-semibold mb-2">{term.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                      {term.courses.map(course => (
                        <div key={course.name} className="flex items-center space-x-3">
                          <Checkbox
                            id={`pending-${course.name}`}
                            checked={pendingCourses.has(course.name)}
                            onCheckedChange={() => handlePendingCourseToggle(course.name)}
                          />
                          <Label htmlFor={`pending-${course.name}`} className="flex-1 cursor-pointer">
                            {course.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No hay tetramestres anteriores.</p>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna de Resultados */}
        <div className="space-y-6 sticky top-24 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Progreso</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around text-center">
              <div>
                <p className="text-2xl font-bold">{approvedCourses.size}</p>
                <p className="text-muted-foreground">Materias Aprobadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{remainingCourses}</p>
                <p className="text-muted-foreground">Materias Restantes</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCourses}</p>
                <p className="text-muted-foreground">Materias Totales</p>
              </div>
            </CardContent>
          </Card>
          
          <Alert>
            <BrainCircuit className="h-4 w-4" />
            <AlertTitle>Lógica de Recomendación</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-1 mt-2 text-xs">
                  <li>**Prioridad 1:** Materias pendientes seleccionadas.</li>
                  <li>**Prioridad 2:** Materias de alta prioridad (sin opción "flex").</li>
                  <li>**Prioridad 3:** Materias que son prerrequisito para futuros tetramestres.</li>
                  <li>**Prioridad 4:** Resto de materias del tetramestre actual.</li>
              </ol>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Carga Recomendada para el Siguiente Periodo</CardTitle>
              <CardDescription>
                Esta es la carga académica sugerida, priorizando materias pendientes y prerrequisitos clave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!targetTermName ? (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Selecciona un Tetramestre</AlertTitle>
                    <AlertDescription>
                        Para comenzar, elige el tetramestre al que el alumno va a ingresar.
                    </AlertDescription>
                 </Alert>
              ) : recommendedLoad.length > 0 ? (
                <ul className="space-y-3">
                  {recommendedLoad.map(course => (
                    <li key={course.name} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                      <div className="flex flex-col gap-y-1.5">
                        <span className="font-medium">{course.name}</span>
                        <div className="flex gap-2">
                           {pendingCourses.has(course.name) && (
                                <Badge variant="destructive" className="w-fit">Pendiente</Badge>
                           )}
                           {HIGH_PRIORITY_COURSES.has(course.name) && (
                                <Badge variant="outline" className="w-fit border-amber-500 text-amber-500">Sin Flex</Badge>
                           )}
                        </div>
                      </div>
                       <Badge variant="outline">Sugerida</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No hay materias para recomendar</AlertTitle>
                    <AlertDescription>
                        Revisa los prerrequisitos y las materias pendientes. Es posible que el alumno ya haya aprobado todo lo disponible.
                    </AlertDescription>
                 </Alert>
              )}
            </CardContent>
          </Card>
          
          {availableButNotRecommended.length > 0 && (
            <Card>
                <Collapsible>
                    <div className="flex justify-between items-center p-6">
                        <div>
                            <CardTitle className='text-lg'>Materias del Tetra No Incluidas</CardTitle>
                            <CardDescription className='text-left mt-1'>Materias que debería llevar pero se omitieron.</CardDescription>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                                <BookOpen className="h-4 w-4" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                        <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground mb-4">
                                Estas materias corresponden al tetra actual pero no se incluyeron para dar prioridad a las pendientes.
                            </p>
                             <ul className="space-y-2">
                                {availableButNotRecommended.map(course => (
                                    <li key={course.name} className="text-sm p-2 bg-muted/50 rounded-md">
                                    {course.name}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </CollapsibleContent>
                </Collapsible>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
