
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowRight, Info } from 'lucide-react';
import { curriculum, type CurriculumCourse } from '@/lib/curriculum';

export function CoursePlanner() {
  const [approvedCourses, setApprovedCourses] = useState<Set<string>>(new Set());
  const [isGraduationCandidate, setIsGraduationCandidate] = useState(false);

  const totalCourses = useMemo(() => curriculum.flatMap(t => t.courses).length, []);

  const handleCourseToggle = (courseId: string) => {
    setApprovedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const isPrerequisiteApproved = (prerequisite: string | undefined): boolean => {
    if (!prerequisite) return true;
    return approvedCourses.has(prerequisite);
  };
  
  const remainingCourses = useMemo(() => {
    const allCourseIds = new Set(curriculum.flatMap(t => t.courses.map(c => c.name)));
    approvedCourses.forEach(course => allCourseIds.delete(course));
    return allCourseIds.size;
  }, [approvedCourses]);

  const availableCourses = useMemo(() => {
    const available: CurriculumCourse[] = [];
    for (const term of curriculum) {
      for (const course of term.courses) {
        if (!approvedCourses.has(course.name) && isPrerequisiteApproved(course.prerequisite)) {
          available.push(course);
        }
      }
    }
    return available;
  }, [approvedCourses]);

  const maxCourses = isGraduationCandidate && remainingCourses <= 2 ? 9 : 7;

  const recommendedLoad = availableCourses.slice(0, maxCourses);
  
  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Planificador de Carga Académica</h1>
        <p className="text-muted-foreground">
          Selecciona las materias que el alumno ya ha aprobado para generar una carga recomendada.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna de Selección */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Materias Aprobadas</CardTitle>
              <CardDescription>
                Marca todas las materias que el alumno ha cursado y aprobado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="graduationCandidate"
                  checked={isGraduationCandidate}
                  onCheckedChange={(checked) => setIsGraduationCandidate(!!checked)}
                />
                <Label htmlFor="graduationCandidate" className="font-semibold">
                  ¿Es candidato a graduarse y debe 2 o menos materias?
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                (Marcar esto permite una carga de hasta 9 materias según la regla).
              </p>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            {curriculum.map((term, termIndex) => (
              <Card key={termIndex}>
                <CardHeader>
                  <CardTitle className="text-lg">{term.name}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {term.courses.map(course => (
                    <div key={course.name} className="flex items-center space-x-3">
                      <Checkbox
                        id={course.name}
                        checked={approvedCourses.has(course.name)}
                        onCheckedChange={() => handleCourseToggle(course.name)}
                      />
                      <Label htmlFor={course.name} className="flex-1 cursor-pointer">
                        {course.name}
                        {course.prerequisite && (
                          <span className="text-xs text-muted-foreground ml-1 block">
                            Req: {course.prerequisite}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Columna de Resultados */}
        <div className="space-y-6 sticky top-24 self-start">
            <Card>
                <CardHeader>
                    <CardTitle>Resumen del Alumno</CardTitle>
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
                Basado en los prerrequisitos, estas son las materias que el alumno puede cursar.
                Se muestra un máximo de {maxCourses} materias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendedLoad.length > 0 ? (
                <ul className="space-y-3">
                  {recommendedLoad.map(course => (
                    <li key={course.name} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                      <span className="font-medium">{course.name}</span>
                      <Badge variant="outline">Disponible</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No hay materias disponibles</AlertTitle>
                    <AlertDescription>
                        El alumno ha aprobado todas las materias disponibles según los prerrequisitos o ha completado el plan de estudios.
                    </AlertDescription>
                 </Alert>
              )}
               {availableCourses.length > recommendedLoad.length && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Se encontraron {availableCourses.length - recommendedLoad.length} materias disponibles adicionales.
                  </p>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    