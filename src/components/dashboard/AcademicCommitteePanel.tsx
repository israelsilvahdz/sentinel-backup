
"use client";

import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gavel, Copy, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDocument, type CaseData, type Step, stepKeys, templates } from '@/lib/templates';
import { StudentSearchPopover } from './BitacoraPanel';
import { useDashboardFilters } from './DashboardClient';

const caseSchema = z.object({
  NUMERO_EXPEDIENTE: z.string().min(1, 'Requerido'),
  CAMPUS: z.string().min(1, 'Requerido'),
  LUGAR: z.string().min(1, 'Requerido'),
  FECHA_REPORTE: z.date({ required_error: 'Requerido' }),
  NOMBRE_REPORTANTE: z.string().min(1, 'Requerido'),
  NOMBRE_ALUMNO: z.string(),
  MATRICULA_ALUMNO: z.string().min(1, 'Requerido'),
  SEMESTRE_ALUMNO: z.string().min(1, 'Requerido'),
  NOMBRE_TUTOR: z.string().min(1, 'Requerido'),
  PARENTESCO_TUTOR: z.string().min(1, 'Requerido'),
  DESCRIPCION_HECHOS: z.string().min(1, 'Requerido'),
  ARTICULOS_PRESUNTOS: z.string().min(1, 'Requerido'),
  PRESIDENTE_COMITE: z.string().min(1, 'Requerido'),
  CARGO_PRESIDENTE: z.string().min(1, 'Requerido'),
  LISTA_MIEMBROS_COMITE: z.string().min(1, 'Requerido'),
  APLICA_MEDIDA_CAUTELAR: z.enum(['si', 'no']).optional(),
  TIPO_MEDIDA_CAUTELAR: z.string().optional(),
  DESCRIPCION_IMPLICACIONES_MEDIDA: z.string().optional(),
  FECHA_SESION: z.date().optional(),
  HORA_SESION: z.string().optional(),
  FECHA_NOTIFICACION_EFECTIVA: z.date().optional(),
  PRUEBAS_ALUMNO: z.string().optional(),
  FECHA_RESOLUCION: z.date().optional(),
  ARTICULOS_CONFIRMADOS: z.string().optional(),
  TEXTO_SANCION: z.string().optional(),
});

export function AcademicCommitteePanel() {
  const { toast } = useToast();
  const { allStudentsMap } = useDashboardFilters();
  const [activeStep, setActiveStep] = useState<Step>('CONVOCATORIA');
  const [generatedDocuments, setGeneratedDocuments] = useState<Record<string, string>>({});
  
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<CaseData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      LUGAR: 'León',
      FECHA_REPORTE: new Date(),
      LISTA_MIEMBROS_COMITE: "Presidente - [Nombre]\nSecretario - [Nombre]\nVocal - [Nombre]",
      PRUEBAS_ALUMNO: 'No presentó pruebas.',
      APLICA_MEDIDA_CAUTELAR: 'no',
    }
  });
  
  const watchStudentId = watch('MATRICULA_ALUMNO');

  React.useEffect(() => {
    if (watchStudentId) {
      const student = allStudentsMap.get(watchStudentId);
      if (student) {
        setValue('NOMBRE_ALUMNO', student.name);
      }
    }
  }, [watchStudentId, allStudentsMap, setValue]);


  const handleGenerateDocument = (step: Step) => {
    const formData = watch();
    const docText = generateDocument(step, formData);
    setGeneratedDocuments(prev => ({ ...prev, [step]: docText }));
    toast({ title: 'Documento Generado', description: `Se ha generado la previsualización para "${templates[step].title}".` });
  };

  const handleCopy = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Texto Copiado', description: 'El contenido del documento se ha copiado al portapapeles.' });
    });
  };

  const aplicaMedida = watch('APLICA_MEDIDA_CAUTELAR');

  const renderStepFields = () => {
    switch(activeStep) {
      case 'NOTIFICACION':
        return (
          <div className="space-y-4">
            <Label>¿Se aplicará una medida cautelar?</Label>
            <Controller
              name="APLICA_MEDIDA_CAUTELAR"
              control={control}
              render={({ field }) => (
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="medida-no" /><Label htmlFor="medida-no">No</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="si" id="medida-si" /><Label htmlFor="medida-si">Sí</Label></div>
                </RadioGroup>
              )}
            />
            {aplicaMedida === 'si' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="TIPO_MEDIDA_CAUTELAR">Tipo de Medida Cautelar</Label>
                  <Input id="TIPO_MEDIDA_CAUTELAR" {...register('TIPO_MEDIDA_CAUTELAR')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="DESCRIPCION_IMPLICACIONES_MEDIDA">Implicaciones de la Medida</Label>
                  <Textarea id="DESCRIPCION_IMPLICACIONES_MEDIDA" {...register('DESCRIPCION_IMPLICACIONES_MEDIDA')} />
                </div>
              </>
            )}
          </div>
        );
      case 'ACUERDO':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Fecha de Sesión</Label><Input type="date" {...register('FECHA_SESION', { valueAsDate: true })} /></div>
            <div className="space-y-2"><Label>Hora de Sesión</Label><Input type="time" {...register('HORA_SESION')} /></div>
            <div className="space-y-2"><Label>Fecha Notificación Efectiva</Label><Input type="date" {...register('FECHA_NOTIFICACION_EFECTIVA', { valueAsDate: true })} /></div>
            <div className="space-y-2 col-span-2"><Label>Pruebas Presentadas por el Alumno</Label><Textarea {...register('PRUEBAS_ALUMNO')} /></div>
          </div>
        );
      case 'RESOLUCION':
        return (
          <div className="space-y-4">
            <div className="space-y-2"><Label>Fecha de Resolución</Label><Input type="date" {...register('FECHA_RESOLUCION', { valueAsDate: true })} /></div>
            <div className="space-y-2"><Label>Artículos del Reglamento Confirmados</Label><Input {...register('ARTICULOS_CONFIRMADOS')} /></div>
            <div className="space-y-2"><Label>Texto de la Sanción</Label><Textarea {...register('TEXTO_SANCION')} /></div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Asistente de Comité Académico</h1>
        <p className="text-muted-foreground">Genera la documentación para el proceso disciplinario paso a paso.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Datos Centrales del Caso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Matrícula del Alumno</Label>
                        <StudentSearchPopover onStudentSelect={({id}) => setValue('MATRICULA_ALUMNO', id, {shouldValidate: true})} />
                        {errors.MATRICULA_ALUMNO && <p className="text-xs text-destructive">{errors.MATRICULA_ALUMNO.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label># Expediente</Label><Input {...register('NUMERO_EXPEDIENTE')} /></div>
                        <div className="space-y-2"><Label>Campus</Label><Input {...register('CAMPUS')} /></div>
                        <div className="space-y-2"><Label>Lugar</Label><Input {...register('LUGAR')} /></div>
                        <div className="space-y-2"><Label>Semestre Alumno</Label><Input {...register('SEMESTRE_ALUMNO')} /></div>
                        <div className="space-y-2"><Label>Fecha del Reporte</Label><Input type="date" {...register('FECHA_REPORTE', { valueAsDate: true })} /></div>
                    </div>
                    <div className="space-y-2"><Label>Reportado por</Label><Input {...register('NOMBRE_REPORTANTE')} /></div>
                    <div className="space-y-2"><Label>Nombre del Padre/Tutor</Label><Input {...register('NOMBRE_TUTOR')} /></div>
                    <div className="space-y-2"><Label>Parentesco</Label><Input {...register('PARENTESCO_TUTOR')} /></div>
                    <div className="space-y-2"><Label>Presidente del Comité</Label><Input {...register('PRESIDENTE_COMITE')} /></div>
                    <div className="space-y-2"><Label>Cargo del Presidente</Label><Input {...register('CARGO_PRESIDENTE')} /></div>
                    <div className="space-y-2"><Label>Artículos Presuntos</Label><Input {...register('ARTICULOS_PRESUNTOS')} placeholder="Ej. 1, 2 y 3"/></div>
                    <div className="space-y-2"><Label>Descripción de los Hechos</Label><Textarea rows={4} {...register('DESCRIPCION_HECHOS')} /></div>
                    <div className="space-y-2"><Label>Miembros del Comité</Label><Textarea rows={4} {...register('LISTA_MIEMBROS_COMITE')} /></div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generador de Documentos</CardTitle>
              <CardDescription>Selecciona un documento, completa los campos adicionales si es necesario y genera el texto.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div className="flex flex-col gap-2 w-1/3">
                  {stepKeys.map((step, index) => (
                    <Button key={step} variant={activeStep === step ? 'default' : 'outline'} onClick={() => setActiveStep(step)} className="justify-start">
                      <span className="mr-2 font-bold">{index + 1}.</span> {templates[step].title}
                    </Button>
                  ))}
                </div>
                <div className="w-2/3 space-y-4">
                  <h3 className="font-semibold text-lg">{templates[activeStep].title}</h3>
                  {renderStepFields()}
                  <Button onClick={() => handleGenerateDocument(activeStep)}>
                    <Gavel className="mr-2 h-4 w-4" /> Generar Documento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {generatedDocuments[activeStep] && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2"><FileText /> Previsualización</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(generatedDocuments[activeStep])}><Copy className="mr-2 h-4 w-4" /> Copiar Texto</Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80 w-full rounded-md border p-4 bg-muted/50">
                  <pre className="whitespace-pre-wrap text-sm">{generatedDocuments[activeStep]}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
