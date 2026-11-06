
"use client";
import { WorkspaceHeader } from './WorkspaceHeader';

import { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardFilters } from './DashboardClient';
import { HelpCircle, CheckCircle2, User, BookOpen } from 'lucide-react';
import { type Student, type SubjectSummary } from '@/types/student';

// New interface for the component's state
interface StudentWithUnclassified {
    student: Student;
    unclassifiedSubjects: SubjectSummary[];
}

export function UnclassifiedSubjectsPanel() {
  // Use filteredStudents to respect the global leader filter
  const { filteredStudents, isLoading, weightingSchemes, hasData } = useDashboardFilters();

  const studentsWithUnclassifiedSubjects = useMemo(() => {
    if (isLoading || !filteredStudents) return [];

    // 1. Create a set of all subjects that have a weighting scheme.
    const classifiedSubjects = new Set<string>();
    weightingSchemes.forEach(scheme => {
        scheme.subjectNames.forEach(name => classifiedSubjects.add(name));
    });

    const result: StudentWithUnclassified[] = [];

    // 2. Iterate through the (already filtered) students.
    for (const student of filteredStudents) {
      // 3. Find subjects for this student that are not in the classified set.
      const unclassified = (student.subjectSummaries || []).filter(
        subject => !classifiedSubjects.has(subject.name)
      );

      // 4. If the student has any unclassified subjects, add them to the result list.
      if (unclassified.length > 0) {
        result.push({
          student: student,
          unclassifiedSubjects: unclassified,
        });
      }
    }

    return result;
  }, [filteredStudents, isLoading, weightingSchemes]);

  return (
    <div className="workspace-page">
<WorkspaceHeader eyebrow="Configuración académica" title="Materias sin clasificar" description="Identifica las materias que necesitan un esquema de ponderación. Puedes acotar los resultados desde Filtros." />

      <Card>
        <CardHeader>
          <CardTitle>Resultados del Análisis</CardTitle>
          <CardDescription>
            A continuación se muestran los alumnos y las materias específicas que no están clasificadas en ningún esquema de ponderación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentsWithUnclassifiedSubjects.length > 0 ? (
            <div className="space-y-6">
              {studentsWithUnclassifiedSubjects.map(({ student, unclassifiedSubjects }) => (
                <Card key={student.id} className="p-4">
                  <div className="flex items-center gap-4">
                     <User className="h-5 w-5 text-primary" />
                     <div>
                        <h3 className="font-semibold">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">{student.id} | Líder: {student.leader}</p>
                     </div>
                  </div>
                  <div className="mt-4 pl-9">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" />Materias sin ponderación:</h4>
                    <div className="flex flex-wrap gap-2">
                        {unclassifiedSubjects.map(subject => (
                          <Badge key={subject.id} variant="destructive">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            {subject.name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold">{hasData ? 'Sin materias pendientes de clasificar' : 'Carga tus archivos para comenzar'}</h3>
                <p className="text-muted-foreground mt-2">
                    {hasData ? 'No se encontraron materias sin esquema para la selección actual.' : 'Usa los botones superiores para cargar la base principal y el monitoreo.'}
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
