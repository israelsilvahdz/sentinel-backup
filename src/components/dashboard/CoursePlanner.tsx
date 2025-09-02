
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
import { ArrowRight, Info } from 'lucide-react';
import { curriculum, type CurriculumCourse, type CurriculumTerm } from '@/lib/curriculum';

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

  const { recommendedLoad, remainingCourses, availableCoursesCount } = useMemo(() => {
    const allCourseIds = new Set(curriculum.flatMap(t => t.courses.map(c => c.name)));
    approvedCourses.forEach(course => allCourseIds.delete(course));
    const remaining = allCourseIds.size;

    if (targetTermIndex === -1) {
      return { recommendedLoad: [], remainingCourses: remaining, availableCoursesCount: 0 };
    }

    // 1. Start with pending courses
    const load: CurriculumCourse[] = Array.from(pendingCourses)
      .map(name => curriculum.flatMap(t => t.courses).find(c => c.name === name))
      .filter((c): c is CurriculumCourse => !!c)
      .filter(c => isPrerequisiteApproved(c.prerequisite));

    // 2. Find available courses from the target term
    const targetTermCourses = curriculum[targetTermIndex]?.courses || [];
    const availableTargetCourses = targetTermCourses.filter(course =>
      !approvedCourses.has(course.name) && isPrerequisiteApproved(course.prerequisite)
    );
    
    // 3. Find available courses from previous terms (that were not marked as pending but prerequisites are met)
    const availablePreviousCourses = previousTerms
      .flatMap(t => t.courses)
      .filter(course => 
        !approvedCourses.has(course.name) && 
        !pendingCourses.has(course.name) &&
        isPrerequisiteApproved(course.prerequisite)
      );

    const allAvailable = [...availablePreviousCourses, ...availableTargetCourses];
    const allAvailableCount = load.length + allAvailable.length;

    // 4. Prioritize prerequisites for future terms
    const futurePrerequisites = new Set(
      curriculum.slice(targetTermIndex + 1).flatMap(t => t.courses.map(c => c.prerequisite).filter(Boolean))
    );

    allAvailable.sort((a, b) => {
      const aIsPrereq = futurePrerequisites.has(a.name);
      const bIsPrereq = futurePrerequisites.has(b.name);
      if (aIsPrereq && !bIsPrereq) return -1;
      if (!aIsPrereq && bIsPrereq) return 1;
      return 0;
    });

    const maxCourses = isGraduationCandidate && remaining <= 2 ? 9 : 7;

    let i = 0;
    while (load.length < maxCourses && i < allAvailable.length) {
        if(!load.some(c => c.name === allAvailable[i].name)) {
           load.push(allAvailable[i]);
        }
        i++;
    }

    return { recommendedLoad: load, remainingCourses: remaining, availableCoursesCount: allAvailableCount };

  }, [approvedCourses, pendingCourses, targetTermIndex, isGraduationCandidate, previousTerms]);

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
               {availableCoursesCount > recommendedLoad.length && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Se encontraron {availableCoursesCount - recommendedLoad.length} materias disponibles adicionales que no se incluyeron en la carga recomendada.
                  </p>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    