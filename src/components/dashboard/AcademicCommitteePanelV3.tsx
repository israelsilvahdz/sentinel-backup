"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { saveAs } from 'file-saver';
import { Copy, Download, FilePlus2, FileText, FolderPlus, Gavel, Save, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAcademicCommitteeCases, getAcademicCommitteeUser, registerAcademicCommitteeUser, saveAcademicCommitteeCases } from '@/lib/firebase-services';
import { caseSchema, generateDocument, generateWordDocument, stepKeys, templates, type CaseData, type Step } from '@/lib/templates';
import { cn, normalizeString } from '@/lib/utils';

import { StudentSearchPopover } from './BitacoraPanel';
import { useDashboardFilters } from './DashboardClient';

const LOCAL_STORAGE_KEY = 'academic_committee_cases_v3';

type CommitteeCaseDraft = {
  id: string;
  studentId: string;
  studentName: string;
  expediente: string;
  activeStep: Step;
  createdAt: string;
  updatedAt: string;
  data: CaseData;
};

const DEFAULT_CASE_VALUES: CaseData = {
  LUGAR: 'San Nicolas',
  FECHA_REPORTE: new Date(),
  LISTA_MIEMBROS_COMITE:
    'Ivan Malpica Lagunes, Director de Nivel Preparatoria\nIsrael Silva Hernandez, Lider de Generacion\nPendiente, Lider de Generacion\nMarce, Coordinador de Bienestar y Desarrollo Estudiantil de nivel preparatoria\nViviana Luis Garcia, Miembro del area de bienestar y salud',
  PRUEBAS_ALUMNO: 'No presento pruebas.',
  APLICA_MEDIDA_CAUTELAR: 'no',
};

const STEP_REQUIRED_FIELDS: Record<Step, (keyof CaseData)[]> = {
  CONVOCATORIA: ['NUMERO_EXPEDIENTE', 'LUGAR', 'NOMBRE_REPORTANTE', 'NOMBRE_ALUMNO', 'MATRICULA_ALUMNO', 'DESCRIPCION_HECHOS', 'ARTICULOS_PRESUNTOS', 'PRESIDENTE_COMITE', 'CARGO_PRESIDENTE'],
  NOTIFICACION: ['LUGAR', 'NOMBRE_ALUMNO', 'MATRICULA_ALUMNO', 'DESCRIPCION_HECHOS', 'ARTICULOS_PRESUNTOS', 'PRESIDENTE_COMITE', 'CARGO_PRESIDENTE', 'NOMBRE_TUTOR', 'PARENTESCO_TUTOR'],
  ACUERDO: ['NUMERO_EXPEDIENTE', 'FECHA_SESION', 'HORA_SESION', 'FECHA_NOTIFICACION_EFECTIVA', 'NOMBRE_ALUMNO', 'MATRICULA_ALUMNO', 'SEMESTRE_ALUMNO', 'CAMPUS'],
  RESOLUCION: ['NUMERO_EXPEDIENTE', 'FECHA_RESOLUCION', 'ARTICULOS_CONFIRMADOS', 'TEXTO_SANCION', 'NOMBRE_ALUMNO', 'MATRICULA_ALUMNO'],
  NOTIFICACION_RESOLUCION: ['NUMERO_EXPEDIENTE', 'FECHA_RESOLUCION', 'NOMBRE_TUTOR', 'PARENTESCO_TUTOR', 'NOMBRE_ALUMNO', 'MATRICULA_ALUMNO'],
};

const STEP_UI_COPY: Record<Step, { phase: string; title: string; description: string; reuseHint: string }> = {
  CONVOCATORIA: {
    phase: 'Fase 1',
    title: 'Convocatoria e inicio del expediente',
    description: 'Captura solo los datos base del alumno, del reporte y de la integracion inicial del comite.',
    reuseHint: 'Lo que registres aqui alimenta automaticamente la notificacion, el acuerdo y la resolucion.',
  },
  NOTIFICACION: {
    phase: 'Fase 2',
    title: 'Notificacion a tutor y medida cautelar',
    description: 'Completa solo lo necesario para avisar a la familia y dejar lista la notificacion.',
    reuseHint: 'Se reutilizan alumno, reporte y presidencia del comite registrados en la fase anterior.',
  },
  ACUERDO: {
    phase: 'Fase 3',
    title: 'Sesion y acuerdo de integracion',
    description: 'Registra la sesion del comite, el efecto de la notificacion y las pruebas recibidas.',
    reuseHint: 'Aqui aprovechas expediente, alumno, campus, hechos y miembros ya guardados.',
  },
  RESOLUCION: {
    phase: 'Fase 4',
    title: 'Resolucion del comite',
    description: 'Define la fecha de resolucion, los articulos confirmados y la determinacion final.',
    reuseHint: 'La resolucion usa automaticamente el contexto del expediente y las pruebas previas.',
  },
  NOTIFICACION_RESOLUCION: {
    phase: 'Fase 5',
    title: 'Notificacion de la resolucion',
    description: 'Cierra el proceso con los datos indispensables para comunicar la resolucion.',
    reuseHint: 'Se reutilizan expediente, alumno, tutor, campus y fecha de resolucion.',
  },
};

const OFFENSE_TEMPLATE_FIELDS: (keyof CaseData)[] = [
  'NOMBRE_REPORTANTE',
  'DESCRIPCION_HECHOS',
  'ARTICULOS_PRESUNTOS',
  'PRESIDENTE_COMITE',
  'CARGO_PRESIDENTE',
  'LISTA_MIEMBROS_COMITE',
  'APLICA_MEDIDA_CAUTELAR',
  'TIPO_MEDIDA_CAUTELAR',
  'DESCRIPCION_IMPLICACIONES_MEDIDA',
  'ARTICULOS_CONFIRMADOS',
  'TEXTO_SANCION',
];

const AUTH_SESSION_KEY = 'academic_committee_auth_v1';

type CommitteeAuthSession = {
  leaderKey: string;
  leaderName: string;
  displayName: string;
};

function sanitizeStep(value: unknown): Step {
  return typeof value === 'string' && stepKeys.includes(value as Step) ? (value as Step) : 'CONVOCATORIA';
}

function createEmptyCase(): CommitteeCaseDraft {
  const now = new Date().toISOString();
  return {
    id: `case_${Date.now()}`,
    studentId: '',
    studentName: 'Caso sin alumno',
    expediente: '',
    activeStep: sanitizeStep('CONVOCATORIA'),
    createdAt: now,
    updatedAt: now,
    data: { ...DEFAULT_CASE_VALUES },
  };
}

function normalizeCaseData(data: Partial<CaseData> | undefined): CaseData {
  return {
    ...DEFAULT_CASE_VALUES,
    ...data,
    FECHA_REPORTE: data?.FECHA_REPORTE ? new Date(data.FECHA_REPORTE) : DEFAULT_CASE_VALUES.FECHA_REPORTE,
    FECHA_SESION: data?.FECHA_SESION ? new Date(data.FECHA_SESION) : undefined,
    FECHA_NOTIFICACION_EFECTIVA: data?.FECHA_NOTIFICACION_EFECTIVA ? new Date(data.FECHA_NOTIFICACION_EFECTIVA) : undefined,
    FECHA_RESOLUCION: data?.FECHA_RESOLUCION ? new Date(data.FECHA_RESOLUCION) : undefined,
  };
}

function getStepCompletion(step: Step, data: CaseData) {
  const fields = STEP_REQUIRED_FIELDS[step];
  const completed = fields.filter((field) => {
    const value = data[field];
    if (value instanceof Date) return !Number.isNaN(value.getTime());
    return Boolean(String(value ?? '').trim());
  }).length;

  return {
    completed,
    total: fields.length,
    isComplete: completed === fields.length,
  };
}

function getLeaderKey(leaderName: string) {
  return normalizeString(leaderName);
}

export function AcademicCommitteePanel() {
  const { toast } = useToast();
  const { leaders } = useDashboardFilters();
  const [cases, setCases] = useState<CommitteeCaseDraft[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<Step>('CONVOCATORIA');
  const [generatedDocuments, setGeneratedDocuments] = useState<Record<string, string>>({});
  const [offenseTemplateSourceId, setOffenseTemplateSourceId] = useState<string>('');
  const [authSession, setAuthSession] = useState<CommitteeAuthSession | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authLeaderName, setAuthLeaderName] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CaseData>({
    resolver: zodResolver(caseSchema),
    defaultValues: DEFAULT_CASE_VALUES,
  });

  useEffect(() => {
    const rawSession = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!rawSession) return;
    try {
      const parsed = JSON.parse(rawSession) as CommitteeAuthSession;
      if (parsed?.leaderKey && parsed?.leaderName) {
        setAuthSession(parsed);
        setAuthLeaderName(parsed.leaderName);
        setAuthDisplayName(parsed.displayName || '');
      }
    } catch (error) {
      console.error('No se pudo restaurar la sesion de comites', error);
    }
  }, []);

  useEffect(() => {
    if (!authSession) return;
    const session = authSession;

    const sanitizeCases = (items: CommitteeCaseDraft[]) =>
      items
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => ({
          ...createEmptyCase(),
          ...item,
          id: item.id || `case_recovered_${index}`,
          studentId: item.studentId || '',
          studentName: item.studentName || 'Caso sin alumno',
          expediente: item.expediente || '',
          activeStep: sanitizeStep(item.activeStep),
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
          data: normalizeCaseData(item.data),
        }));

    const applyLoadedCases = (loadedCases: CommitteeCaseDraft[]) => {
      if (loadedCases.length === 0) return;
      setCases(loadedCases);
      setSelectedCaseId(loadedCases[0].id);
      setActiveStep(loadedCases[0].activeStep);
      reset(normalizeCaseData(loadedCases[0].data));
    };

    async function loadCases() {
      let localCases: CommitteeCaseDraft[] = [];
      const rawCases = localStorage.getItem(LOCAL_STORAGE_KEY);

      if (rawCases) {
        try {
          const parsed = JSON.parse(rawCases) as CommitteeCaseDraft[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            localCases = sanitizeCases(parsed);
            applyLoadedCases(localCases);
          }
        } catch (error) {
          console.error('No se pudieron leer los casos locales de comite', error);
        }
      }

      const cloudCases = sanitizeCases(await getAcademicCommitteeCases(session.leaderKey));
      if (cloudCases.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudCases));
        applyLoadedCases(cloudCases);
        return;
      }

      if (localCases.length > 0) {
        try {
          await saveAcademicCommitteeCases(localCases, session.leaderKey, session.leaderName);
        } catch (error) {
          console.error('No se pudieron migrar los casos locales de comite a la nube', error);
        }
      }
    }

    void loadCases();
  }, [authSession, reset]);

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId) ?? null, [cases, selectedCaseId]);
  const currentFormData = watch();
  const appliesMeasure = watch('APLICA_MEDIDA_CAUTELAR');

  const persistCases = (nextCases: CommitteeCaseDraft[]) => {
    setCases(nextCases);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextCases));
    if (!authSession) return;
    const session = authSession;
    void saveAcademicCommitteeCases(nextCases, session.leaderKey, session.leaderName).catch((error) => {
      console.error('No se pudieron sincronizar los casos de comite en la nube', error);
      toast({
        title: 'Guardado local disponible',
        description: 'El expediente se guardó en esta computadora, pero no se pudo sincronizar con Firebase.',
        variant: 'destructive',
      });
    });
  };

  const buildNewCaseFromData = (baseData: Partial<CaseData>, title: string, description: string) => {
    const nextCase: CommitteeCaseDraft = {
      ...createEmptyCase(),
      studentId: baseData.MATRICULA_ALUMNO || '',
      studentName: baseData.NOMBRE_ALUMNO || 'Caso sin alumno',
      expediente: baseData.NUMERO_EXPEDIENTE || '',
      data: normalizeCaseData(baseData),
    };

    const nextCases = [nextCase, ...cases];
    persistCases(nextCases);
    setSelectedCaseId(nextCase.id);
    setActiveStep(nextCase.activeStep);
    reset(nextCase.data);
    setOffenseTemplateSourceId('');
    toast({ title, description });
  };

  const saveCurrentCase = () => {
    const now = new Date().toISOString();
    const formData = watch();
    const nextCase: CommitteeCaseDraft = selectedCase
      ? {
          ...selectedCase,
          studentId: formData.MATRICULA_ALUMNO || '',
          studentName: formData.NOMBRE_ALUMNO || 'Caso sin alumno',
          expediente: formData.NUMERO_EXPEDIENTE || '',
          activeStep: sanitizeStep(activeStep),
          updatedAt: now,
          data: formData,
        }
      : {
          ...createEmptyCase(),
          studentId: formData.MATRICULA_ALUMNO || '',
          studentName: formData.NOMBRE_ALUMNO || 'Caso sin alumno',
          expediente: formData.NUMERO_EXPEDIENTE || '',
          activeStep: sanitizeStep(activeStep),
          updatedAt: now,
          data: formData,
        };

    const nextCases = selectedCase ? cases.map((item) => (item.id === selectedCase.id ? nextCase : item)) : [nextCase, ...cases];
    persistCases(nextCases);
    setSelectedCaseId(nextCase.id);
    toast({
      title: 'Caso guardado',
      description: `Se guardo el expediente ${nextCase.expediente || 'sin numero'} de ${nextCase.studentName}.`,
    });
  };

  const createBlankCase = () => {
    buildNewCaseFromData({}, 'Caso nuevo', 'Se abrió un expediente limpio para capturar otro alumno.');
  };

  const createNewCaseFromCurrent = () => {
    buildNewCaseFromData(
      currentFormData,
      'Caso abierto',
      `Ya puedes continuar el expediente de ${currentFormData.NOMBRE_ALUMNO || 'este alumno'}.`
    );
  };

  const copyOffenseTemplateFromCase = () => {
    const sourceCase = cases.find((item) => item.id === offenseTemplateSourceId);
    if (!sourceCase) {
      toast({
        title: 'Selecciona un expediente',
        description: 'Primero elige el caso desde el que quieres copiar la falta.',
        variant: 'destructive',
      });
      return;
    }

    const clonedFields = OFFENSE_TEMPLATE_FIELDS.reduce((acc, field) => {
      (acc as Record<string, unknown>)[field] = sourceCase.data[field];
      return acc;
    }, {} as Partial<CaseData>);

    clonedFields.NOMBRE_TUTOR = undefined;
    clonedFields.PARENTESCO_TUTOR = undefined;
    clonedFields.NOMBRE_ALUMNO = undefined;
    clonedFields.MATRICULA_ALUMNO = undefined;
    clonedFields.NUMERO_EXPEDIENTE = undefined;
    clonedFields.SEMESTRE_ALUMNO = undefined;

    buildNewCaseFromData(
      clonedFields,
      'Falta copiada',
      `Se copió la falta desde el expediente ${sourceCase.expediente || sourceCase.studentName}. Ahora solo captura el nuevo alumno.`,
    );
  };

  const hashPassword = async (password: string) => {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buffer))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleRegister = async () => {
    if (!authLeaderName || !authDisplayName || !authPassword) {
      toast({
        title: 'Faltan datos',
        description: 'Selecciona tu lider, escribe tu nombre y define una contraseña.',
        variant: 'destructive',
      });
      return;
    }

    setIsAuthLoading(true);
    try {
      const leaderKey = getLeaderKey(authLeaderName);
      const passwordHash = await hashPassword(authPassword);
      await registerAcademicCommitteeUser({
        leaderKey,
        leaderName: authLeaderName,
        displayName: authDisplayName,
        passwordHash,
      });

      const nextSession = { leaderKey, leaderName: authLeaderName, displayName: authDisplayName };
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession));
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setCases([]);
      setSelectedCaseId(null);
      setAuthSession(nextSession);
      setIsRegisterMode(false);
      setAuthPassword('');
      toast({
        title: 'Acceso creado',
        description: 'Tu espacio privado de comites ya quedo registrado.',
      });
    } catch (error: any) {
      toast({
        title: 'No se pudo dar de alta',
        description: error?.message || 'Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authLeaderName || !authPassword) {
      toast({
        title: 'Faltan datos',
        description: 'Selecciona tu lider y escribe la contraseña.',
        variant: 'destructive',
      });
      return;
    }

    setIsAuthLoading(true);
    try {
      const leaderKey = getLeaderKey(authLeaderName);
      const user = await getAcademicCommitteeUser(leaderKey);
      if (!user) {
        throw new Error('Ese lider todavía no tiene acceso registrado. Usa Darme de alta.');
      }

      const passwordHash = await hashPassword(authPassword);
      if (user.passwordHash !== passwordHash) {
        throw new Error('La contraseña no coincide.');
      }

      const nextSession = { leaderKey, leaderName: user.leaderName, displayName: user.displayName };
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextSession));
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setCases([]);
      setSelectedCaseId(null);
      setAuthSession(nextSession);
      setAuthDisplayName(user.displayName);
      setAuthPassword('');
      toast({
        title: 'Acceso concedido',
        description: `Bienvenido, ${user.displayName}.`,
      });
    } catch (error: any) {
      toast({
        title: 'No se pudo ingresar',
        description: error?.message || 'Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setAuthSession(null);
    setCases([]);
    setSelectedCaseId(null);
    setAuthPassword('');
    setOffenseTemplateSourceId('');
    reset(normalizeCaseData(DEFAULT_CASE_VALUES));
  };

  const loadCase = (caseDraft: CommitteeCaseDraft) => {
    setSelectedCaseId(caseDraft.id);
    setActiveStep(sanitizeStep(caseDraft.activeStep));
    reset(normalizeCaseData(caseDraft.data));
  };

  const handleStudentSelect = (student: { id: string; name: string }) => {
    setValue('MATRICULA_ALUMNO', student.id, { shouldValidate: true });
    setValue('NOMBRE_ALUMNO', student.name, { shouldValidate: true });
  };

  const handleGenerateDocument = (step: Step) => {
    const formData = watch();
    const docText = generateDocument(step, formData);
    setGeneratedDocuments((prev) => ({ ...prev, [step]: docText }));
    toast({
      title: 'Documento generado',
      description: `Se genero la previsualizacion para "${templates[step].title}".`,
    });
  };

  const handleCopy = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Texto copiado',
        description: 'El contenido del documento se copio al portapapeles.',
      });
    });
  };

  const handleExportToWord = async (step: Step) => {
    const formData = watch();
    const docBlob = await generateWordDocument(step, formData);
    const stepTitle = templates[step].title.split('. ')[1].replace(/\s+/g, '_');
    const studentName = formData.NOMBRE_ALUMNO?.split(' ')[0] || 'ALUMNO';
    saveAs(docBlob, `${stepTitle}_${studentName}.docx`);
    toast({
      title: 'Documento de Word generado',
      description: 'La descarga comenzara en breve.',
    });
  };

  const renderField = (
    name: keyof CaseData,
    label: string,
    options?: {
      type?: 'text' | 'date' | 'time';
      placeholder?: string;
      textarea?: boolean;
      rows?: number;
      readOnly?: boolean;
      helper?: string;
    }
  ) => {
    const errorMessage = errors[name]?.message;
    const registerOptions = options?.type === 'date' ? { valueAsDate: true } : undefined;

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {options?.textarea ? (
          <Textarea
            rows={options.rows ?? 4}
            placeholder={options.placeholder}
            readOnly={options.readOnly}
            className={options.readOnly ? 'bg-muted/50' : undefined}
            {...register(name as any)}
          />
        ) : (
          <Input
            type={options?.type ?? 'text'}
            placeholder={options?.placeholder}
            readOnly={options?.readOnly}
            className={options?.readOnly ? 'bg-muted/50' : undefined}
            {...register(name as any, registerOptions)}
          />
        )}
        {options?.helper && <p className="text-xs text-muted-foreground">{options.helper}</p>}
        {errorMessage && <p className="text-xs text-destructive">{String(errorMessage)}</p>}
      </div>
    );
  };

  const renderIdentityFields = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>Alumno del expediente</Label>
        <StudentSearchPopover onStudentSelect={handleStudentSelect} />
        {errors.MATRICULA_ALUMNO && <p className="text-xs text-destructive">{String(errors.MATRICULA_ALUMNO.message)}</p>}
      </div>
      {renderField('NOMBRE_ALUMNO', 'Nombre del alumno', {
        readOnly: true,
        helper: 'Se completa al seleccionar al alumno.',
      })}
      {renderField('MATRICULA_ALUMNO', 'Matricula', {
        placeholder: 'Ej. T07005666',
      })}
      {renderField('NUMERO_EXPEDIENTE', '# de expediente', {
        placeholder: 'Ej. PREPA-2026-014',
      })}
      {renderField('SEMESTRE_ALUMNO', 'Semestre del alumno', {
        placeholder: 'Ej. 6to semestre',
      })}
      {renderField('CAMPUS', 'Campus', {
        placeholder: 'Ej. Monterrey',
      })}
      {renderField('LUGAR', 'Lugar', {
        placeholder: 'Ej. San Nicolas',
      })}
    </div>
  );

  const renderStepFields = () => {
    switch (activeStep) {
      case 'CONVOCATORIA':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Identificacion del caso</p>
              <div className="mt-4">{renderIdentityFields()}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Reporte y hechos</p>
              <div className="mt-4 grid gap-4">
                {renderField('FECHA_REPORTE', 'Fecha del reporte', { type: 'date' })}
                {renderField('NOMBRE_REPORTANTE', 'Reportado por', {
                  placeholder: 'Nombre de quien levanta el reporte',
                })}
                {renderField('ARTICULOS_PRESUNTOS', 'Articulos presuntos', {
                  placeholder: 'Ej. 151, 152 y 157',
                })}
                {renderField('DESCRIPCION_HECHOS', 'Descripcion de los hechos', {
                  textarea: true,
                  rows: 5,
                })}
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Integracion del comite</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {renderField('PRESIDENTE_COMITE', 'Presidente del comite', {
                  placeholder: 'Nombre de quien preside',
                })}
                {renderField('CARGO_PRESIDENTE', 'Cargo del presidente', {
                  placeholder: 'Ej. Director de preparatoria',
                })}
                <div className="md:col-span-2">
                  {renderField('LISTA_MIEMBROS_COMITE', 'Miembros del comite', {
                    textarea: true,
                    rows: 5,
                    helper: 'Un integrante por linea para que el Word salga limpio.',
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      case 'NOTIFICACION':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Datos reutilizados</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {renderField('NOMBRE_ALUMNO', 'Alumno', { readOnly: true })}
                {renderField('MATRICULA_ALUMNO', 'Matricula', { readOnly: true })}
                {renderField('LUGAR', 'Lugar', { readOnly: true })}
                {renderField('FECHA_REPORTE', 'Fecha del reporte', { type: 'date' })}
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Destinatario de la notificacion</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {renderField('NOMBRE_TUTOR', 'Nombre del tutor, padre o madre', {
                  placeholder: 'Persona que recibira la notificacion',
                })}
                {renderField('PARENTESCO_TUTOR', 'Parentesco', {
                  placeholder: 'Ej. Madre, padre o tutor',
                })}
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Motivo y medida cautelar</p>
              <div className="mt-4 grid gap-4">
                {renderField('ARTICULOS_PRESUNTOS', 'Articulos presuntos', {
                  placeholder: 'Ej. 151, 152 y 157',
                })}
                {renderField('DESCRIPCION_HECHOS', 'Resumen de los hechos', {
                  textarea: true,
                  rows: 5,
                })}
                <div className="space-y-3">
                  <Label>¿Se aplicara una medida cautelar?</Label>
                  <Controller
                    name="APLICA_MEDIDA_CAUTELAR"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="medida-no" />
                          <Label htmlFor="medida-no">No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="si" id="medida-si" />
                          <Label htmlFor="medida-si">Si</Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>
                {appliesMeasure === 'si' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {renderField('TIPO_MEDIDA_CAUTELAR', 'Tipo de medida cautelar')}
                    {renderField('DESCRIPCION_IMPLICACIONES_MEDIDA', 'Implicaciones de la medida', {
                      textarea: true,
                      rows: 4,
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'ACUERDO':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Datos del acuerdo</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {renderField('FECHA_SESION', 'Fecha de sesion', { type: 'date' })}
                {renderField('HORA_SESION', 'Hora de sesion', { type: 'time' })}
                {renderField('FECHA_NOTIFICACION_EFECTIVA', 'Fecha en que surtio efectos la notificacion', {
                  type: 'date',
                })}
                {renderField('CAMPUS', 'Campus', {
                  placeholder: 'Ej. Monterrey',
                })}
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Alumno y pruebas</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {renderField('NOMBRE_ALUMNO', 'Alumno', { readOnly: true })}
                {renderField('MATRICULA_ALUMNO', 'Matricula', { readOnly: true })}
                {renderField('SEMESTRE_ALUMNO', 'Semestre del alumno', {
                  placeholder: 'Ej. 6to semestre',
                })}
                <div className="md:col-span-2">
                  {renderField('PRUEBAS_ALUMNO', 'Pruebas o escrito presentado por el alumno', {
                    textarea: true,
                    rows: 5,
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      case 'RESOLUCION':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Determinacion final</p>
              <div className="mt-4 grid gap-4">
                {renderField('FECHA_RESOLUCION', 'Fecha de resolucion', { type: 'date' })}
                {renderField('ARTICULOS_CONFIRMADOS', 'Articulos confirmados', {
                  placeholder: 'Articulos que si se acreditaron',
                })}
                {renderField('TEXTO_SANCION', 'Texto de la sancion o resolucion', {
                  textarea: true,
                  rows: 6,
                })}
              </div>
            </div>
          </div>
        );
      case 'NOTIFICACION_RESOLUCION':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-background p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Comunicacion final</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {renderField('NOMBRE_TUTOR', 'Nombre del tutor, padre o madre', {
                  placeholder: 'Persona a la que se notificara',
                })}
                {renderField('PARENTESCO_TUTOR', 'Parentesco', {
                  placeholder: 'Ej. Madre, padre o tutor',
                })}
                {renderField('FECHA_RESOLUCION', 'Fecha de resolucion', { type: 'date' })}
                {renderField('CAMPUS', 'Campus', {
                  placeholder: 'Ej. Monterrey',
                })}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const safeActiveStep = sanitizeStep(activeStep);
  const activeTemplate = templates[safeActiveStep];
  const activePreview = generatedDocuments[safeActiveStep];
  const stepProgress = getStepCompletion(safeActiveStep, currentFormData);
  const activeStepCopy = STEP_UI_COPY[safeActiveStep];

  if (!authSession) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              Acceso privado a comites
            </CardTitle>
            <CardDescription>
              Selecciona el lider responsable y entra con contraseña. La primera vez debes darte de alta para crear tu espacio privado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Que lider eres</Label>
                <Select value={authLeaderName} onValueChange={setAuthLeaderName}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecciona tu lider" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaders.map((leader) => (
                      <SelectItem key={leader} value={leader}>
                        {leader}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isRegisterMode && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Quien eres</Label>
                  <Input
                    value={authDisplayName}
                    onChange={(event) => setAuthDisplayName(event.target.value)}
                    placeholder="Tu nombre"
                    className="rounded-xl"
                  />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder={isRegisterMode ? 'Crea una contraseña' : 'Escribe tu contraseña'}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isRegisterMode ? (
                <Button onClick={handleRegister} disabled={isAuthLoading} className="rounded-xl font-bold">
                  Crear acceso
                </Button>
              ) : (
                <Button onClick={handleLogin} disabled={isAuthLoading} className="rounded-xl font-bold">
                  Entrar a mis comites
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsRegisterMode((current) => !current)}
                disabled={isAuthLoading}
                className="rounded-xl font-bold"
              >
                {isRegisterMode ? 'Ya tengo acceso' : 'Darme de alta'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Expedientes de comite disciplinario</h1>
        <p className="text-muted-foreground">
          Abre un caso por alumno, guarda el avance y descarga cada documento conforme el proceso vaya madurando.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="rounded-full font-bold">
            {authSession.displayName}
          </Badge>
          <Badge variant="secondary" className="rounded-full font-bold">
            {authSession.leaderName}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl font-bold">
            Cerrar sesion
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-3">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-primary" />
                Casos
              </CardTitle>
              <CardDescription>Guarda borradores por expediente para retomarlos sin capturar todo de una sola vez.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={createBlankCase} className="w-full rounded-xl font-bold">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Nuevo caso limpio
              </Button>
              <Button onClick={createNewCaseFromCurrent} className="w-full rounded-xl font-bold">
                <FolderPlus className="mr-2 h-4 w-4" />
                Abrir caso con estos datos
              </Button>
              <Button variant="outline" onClick={saveCurrentCase} className="w-full rounded-xl font-bold">
                <Save className="mr-2 h-4 w-4" />
                Guardar avance
              </Button>
              <div className="rounded-2xl border border-dashed p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Reusar falta</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Copia descripción, artículos y contexto disciplinario desde otro caso, sin copiar alumno, tutor ni expediente.
                </p>
                <div className="mt-3 space-y-2">
                  <Select value={offenseTemplateSourceId} onValueChange={setOffenseTemplateSourceId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona un expediente" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((caseDraft) => (
                        <SelectItem key={caseDraft.id} value={caseDraft.id}>
                          {caseDraft.expediente || 'Sin expediente'} - {caseDraft.studentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={copyOffenseTemplateFromCase}
                    className="w-full rounded-xl font-bold"
                    disabled={!offenseTemplateSourceId}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar falta desde otro caso
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[420px] rounded-2xl border p-2">
                <div className="space-y-2">
                  {cases.length === 0 && (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      Todavia no hay expedientes guardados. Empieza llenando datos y pulsa <strong>Abrir caso</strong>.
                    </div>
                  )}
                  {cases.map((caseDraft) => {
                    const completion = getStepCompletion(caseDraft.activeStep, caseDraft.data);
                    return (
                      <button
                        key={caseDraft.id}
                        onClick={() => loadCase(caseDraft)}
                        className={cn(
                          'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                          selectedCaseId === caseDraft.id ? 'border-primary bg-primary/5' : 'hover:border-primary/30 hover:bg-muted/40'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-foreground">{caseDraft.studentName}</p>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                              {caseDraft.expediente || 'Sin expediente'} · {caseDraft.studentId || 'Sin matricula'}
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full text-[10px] font-black">
                            {completion.completed}/{completion.total}
                          </Badge>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Actualizado {formatDistanceToNow(new Date(caseDraft.updatedAt || Date.now()), { addSuffix: true, locale: es })}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <Card className="rounded-3xl">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Captura por fase</CardTitle>
                  <CardDescription>{activeStepCopy.description}</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full font-black">
                  {activeStepCopy.phase}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary/70">Fase activa</p>
                <h3 className="mt-2 text-lg font-black text-primary">{activeStepCopy.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{activeStepCopy.reuseHint}</p>
              </div>
              {renderStepFields()}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                Documentos del expediente
              </CardTitle>
              <CardDescription>
                Cada documento puede salir en borrador. Eso te permite avanzar el caso aunque todavia falten datos posteriores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {stepKeys.map((step, index) => {
                  const completion = getStepCompletion(step, currentFormData);
                  const stepCopy = STEP_UI_COPY[step];
                  return (
                    <button
                      key={step}
                      onClick={() => setActiveStep(sanitizeStep(step))}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-colors',
                        safeActiveStep === step ? 'border-primary bg-primary/5' : 'hover:border-primary/30 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
                            Documento {index + 1} · {stepCopy.phase}
                          </p>
                          <h3 className="mt-1 font-bold text-foreground">{templates[step].title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{stepCopy.title}</p>
                        </div>
                        <Badge variant={completion.isComplete ? 'default' : 'outline'} className="rounded-full font-black">
                          {completion.completed}/{completion.total}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-3xl border bg-muted/20 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Paso activo</p>
                    <h3 className="mt-1 text-lg font-black text-primary">{activeTemplate.title}</h3>
                  </div>
                  <Badge variant={stepProgress.isComplete ? 'default' : 'secondary'} className="rounded-full text-xs font-black">
                    {stepProgress.isComplete ? 'Listo para version final' : 'Borrador en proceso'}
                  </Badge>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handleGenerateDocument(safeActiveStep)} className="rounded-xl font-bold">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generar previsualizacion
                    </Button>
                    <Button variant="outline" onClick={() => handleExportToWord(safeActiveStep)} className="rounded-xl font-bold">
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Word
                    </Button>
                    <Button variant="outline" onClick={saveCurrentCase} className="rounded-xl font-bold">
                      <Save className="mr-2 h-4 w-4" />
                      Guardar caso
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {activePreview && (
            <Card className="rounded-3xl">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Previsualizacion
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => handleCopy(activePreview)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar texto
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl font-bold" onClick={() => handleExportToWord(safeActiveStep)}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar a Word
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full rounded-2xl border bg-muted/40 p-4">
                  <pre className="whitespace-pre-wrap text-sm">{activePreview}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
