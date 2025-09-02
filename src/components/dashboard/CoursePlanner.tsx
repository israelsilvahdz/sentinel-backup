
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, Info, BookOpen } from 'lucide-react';
import { curriculum, type CurriculumCourse, type CurriculumTerm } from '@/lib/curriculum';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function CoursePlanner() {
  const [targetTermName, setTargetTermName] = useState<string>('');
  const [hasPendingCourses, setHasPendingCourses] = useState(false);
  const [pendingCourses, setPendingCourses] = useState<Set<string>>(new Set());
  const [isGraduationCandidate, setIsGraduationCandidate] = useState(false);

  const totalCourses = useMemo(() => curriculum.flatMap(t => t.courses).length, []);

  const handleTargetTermChange = (termName: string) => {
    setTargetTermName(termName);
    // Reset graduation candidate status if term is not the last one
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

  const isPrerequisiteApproved = (prerequisite: string | undefined): boolean => {
    if (!prerequisite) return true;
    return approvedCourses.has(prerequisite);
  };

  const { recommendedLoad, remainingCourses, availableButNotRecommended } = useMemo(() => {
    const allCourseIds = new Set(curriculum.flatMap(t => t.courses.map(c => c.name)));
    approvedCourses.forEach(course => allCourseIds.delete(course));
    const remaining = allCourseIds.size;

    if (targetTermIndex === -1) {
      return { recommendedLoad: [], remainingCourses: remaining, availableButNotRecommended: [] };
    }

    // 1. Identify all truly available courses for this student
    const allPossibleCourses = curriculum.flatMap(term => term.courses)
      .filter(course => 
        !approvedCourses.has(course.name) && // Not already approved
        isPrerequisiteApproved(course.prerequisite) // Prerequisite is met
      );
    
    // 2. Build the recommended load, starting with pending courses
    let load: CurriculumCourse[] = allPossibleCourses.filter(c => pendingCourses.has(c.name));

    // 3. Get other available courses (not marked as pending)
    const otherAvailableCourses = allPossibleCourses.filter(c => !pendingCourses.has(c.name));
    
    // 4. Prioritize courses that are prerequisites for future terms
    const futurePrerequisites = new Set(
      curriculum.slice(targetTermIndex + 1).flatMap(t => t.courses.map(c => c.prerequisite).filter(Boolean))
    );

    otherAvailableCourses.sort((a, b) => {
      const aIsPrereq = futurePrerequisites.has(a.name);
      const bIsPrereq = futurePrerequisites.has(b.name);
      if (aIsPrereq && !bIsPrereq) return -1;
      if (!aIsPrereq && bIsPrereq) return 1;
      return 0;
    });

    // 5. Fill the rest of the load up to the max course limit
    const maxCourses = isGraduationCandidate && remaining <= 2 ? 9 : 7;

    let i = 0;
    while (load.length < maxCourses && i < otherAvailableCourses.length) {
        if(!load.some(c => c.name === otherAvailableCourses[i].name)) {
           load.push(otherAvailableCourses[i]);
        }
        i++;
    }
    
    // 6. Determine which available courses were not recommended
    const recommendedSet = new Set(load.map(c => c.name));
    const notRecommended = allPossibleCourses.filter(c => !recommendedSet.has(c.name));

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
                      <div className="flex flex-col">
                        <span className="font-medium">{course.name}</span>
                        {pendingCourses.has(course.name) && (
                            <Badge variant="destructive" className="w-fit mt-1">Pendiente</Badge>
                        )}
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
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle className='text-lg'>Otras Materias Disponibles</CardTitle>
                            <CardDescription className='text-left'>Materias que no se incluyeron en la carga.</CardDescription>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                                <BookOpen className="h-4 w-4" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Estas materias cumplían los prerrequisitos pero no se incluyeron en la recomendación para dar prioridad a las pendientes o porque se alcanzó el límite de carga académica.
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
