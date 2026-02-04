
"use client";

import { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardFilters } from './DashboardClient';
import { HelpCircle, CheckCircle2 } from 'lucide-react';

export function UnclassifiedSubjectsPanel() {
  const { allStudents, isLoading, weightingSchemes } = useDashboardFilters();

  const unclassifiedSubjects = useMemo(() => {
    if (isLoading || !allStudents) return [];

    const subjectSet = new Set<string>();

    const classifiedSubjects = new Set<string>();
    weightingSchemes.forEach(scheme => {
        scheme.subjectNames.forEach(name => classifiedSubjects.add(name));
    });

    allStudents.forEach(student => {
      student.subjectSummaries?.forEach(subject => {
        if (!classifiedSubjects.has(subject.name)) {
          subjectSet.add(subject.name);
        }
      });
    });

    return Array.from(subjectSet).sort();
  }, [allStudents, isLoading, weightingSchemes]);

  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Materias Sin Clasificar</h1>
        <p className="text-muted-foreground">
          Un listado de todas las materias encontradas en los reportes que no corresponden a ningún esquema de ponderación definido.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Materias No Reconocidas</CardTitle>
          <CardDescription>
            Utiliza esta lista para identificar qué materias necesitan ser añadidas a un esquema en el Gestor de Ponderaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unclassifiedSubjects.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {unclassifiedSubjects.map(subjectName => (
                <Badge key={subjectName} variant="destructive" className="text-base px-3 py-1">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  {subjectName}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold">¡Todo en orden!</h3>
                <p className="text-muted-foreground mt-2">
                    No se encontraron materias sin clasificar en los datos cargados actualmente.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
