"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { parseContinuidadExcel } from '@/lib/continuityParser';
import { parseVocationalExcel } from '@/lib/vocationalParser';
import { parseRiasecExcel } from '@/lib/riasecParser';
import type { ContinuityStudent, ContinuityCatalog, ContinuityLocalStatus, VocationalDiagnosis, ContinuityTrackingInfo, CareerOption, CareerType } from '@/types/student';
import { 
  Users, Target, AlertCircle, Search, Filter, 
  TrendingUp, BookOpen, MessageSquare, PhoneCall, GraduationCap,
  ChevronDown, ChevronUp, BarChart3, Send, UserCog, History, Clock, HelpCircle,
  Stethoscope, AlertTriangle, Lightbulb, GraduationCap as CapIcon, X, CheckCircle2, Trophy, ListOrdered, Sparkles,
  Landmark, FileJson, PlusCircle, MinusCircle, Calendar as CalendarIcon, Briefcase,
  UserX, Loader2, Trash2, Globe, Save, ArrowUpRight, Group
} from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardFilters } from './DashboardClient';
import { getAllContinuityStatuses, updateContinuityIndeciso, updateContinuityWorkshopAttended, addContinuityComment, bulkUpdateContinuityVocational, bulkUpdateRiasecDiagnoses, updateContinuityTrackingInfo, getCareerCatalog, updateCareerCatalog } from '@/lib/firebase-services';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { RiasecChart } from './RiasecChart';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { TooltipProvider, Tooltip as TooltipUI, TooltipTrigger, TooltipContent } from '../ui/tooltip';

const UNIVERSITY_OPTIONS = [
  "TECMILENIO",
  "UANL",
  "TEC DE MONTERREY",
  "UVM",
  "UDEM",
  "OTRA"
];

const DEFAULT_CAREER_CATALOG: CareerOption[] = [
  { name: "Administración de Empresas", type: 'in-campus' },
  { name: "Administración de Negocios Internacionales", type: 'in-campus' },
  { name: "Comercio Internacional", type: 'in-campus' },
  { name: "Derecho", type: 'in-campus' },
  { name: "Psicología", type: 'in-campus' },
  { name: "Mercadotecnia", type: 'in-campus' },
  { name: "Diseño Gráfico", type: 'in-campus' },
  { name: "Animación y Arte Digital", type: 'in-campus' },
  { name: "Ingeniería Industrial y de Sistemas", type: 'in-campus' },
  { name: "Ingeniería en Mecatrónica", type: 'in-campus' },
  { name: "Ingeniería en Sistemas de Computación", type: 'in-campus' },
  { name: "Gastronomía", type: 'in-campus' },
  { name: "Nutrición", type: 'in-campus' },
  { name: "Turismo", type: 'in-campus' },
  { name: "Contaduría Pública", type: 'in-campus' },
  { name: "Medicina", type: 'external' },
  { name: "Arquitectura", type: 'external' },
  { name: "Veterinaria", type: 'external' }
].sort((a, b) => a.name.localeCompare(b.name));

export function ContinuidadPanel() {
  const { toast } = useToast();
  const { 
    selectedValue, filterType, setActiveView, setContextualStudentIds,
    continuityStudents: students, setContinuityStudents: setStudents, 
    continuityCatalog: catalog, setContinuityCatalog: setCatalog,
    allStudentsMap
  } = useDashboardFilters();
  
  const [localStatuses, setLocalStatuses] = useState<Record<string, ContinuityLocalStatus>>({});
  const [careerCatalog, setCareerCatalog] = useState<CareerOption[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingVoc, setIsProcessingVoc] = useState(false);
  const [isProcessingRiasec, setIsProcessingRiasec] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCycle, setSelectedCycle] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [statuses, careers] = await Promise.all([
        getAllContinuityStatuses(),
        getCareerCatalog()
      ]);
      setLocalStatuses(statuses);
      setCareerCatalog(careers.length > 0 ? careers : DEFAULT_CAREER_CATALOG);
    };
    loadData();
  }, []);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const data = await parseContinuidadExcel(file);
      if (data) {
        setStudents(data.students);
        setCatalog(data.catalog);
        toast({ title: "Continuidad Cargada", description: `Se procesaron ${data.students.length} alumnos.` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Error al cargar", description: "No se pudo procesar el archivo de continuidad." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVocationalUpload = async (file: File | null) => {
    if (!file) return;
    setIsProcessingVoc(true);
    try {
      const result = await parseVocationalExcel(file);
      if (result) {
        await bulkUpdateContinuityVocational(result.diagnoses, result.indecisosIds);
        const updated = await getAllContinuityStatuses();
        setLocalStatuses(updated);
        toast({ title: "Encuesta Vocacional Procesada", description: "El Diagnóstico Vocacional ha sido guardado permanentemente." });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Error al cargar", description: "No se pudo procesar el archivo vocacional." });
    } finally {
      setIsProcessingVoc(false);
    }
  };

  const handleRiasecUpload = async (file: File | null) => {
    if (!file) return;
    setIsProcessingRiasec(true);
    try {
      const diagnoses = await parseRiasecExcel(file, {}); // No source map needed for now
      if (diagnoses) {
        await bulkUpdateRiasecDiagnoses(diagnoses);
        const updated = await getAllContinuityStatuses();
        setLocalStatuses(updated);
        toast({ title: "Test RIASEC Procesado", description: `Se actualizaron ${Object.keys(diagnoses).length} perfiles.` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Error al cargar RIASEC" });
    } finally {
      setIsProcessingRiasec(false);
    }
  };

  // Helper to get group from monitoring data
  const getStudentGroupFromMonitoring = (studentId: string): string => {
    const monitorStudent = allStudentsMap.get(studentId);
    if (!monitorStudent || !monitorStudent.subjectSummaries) return '';
    
    // Find the first group that isn't online/flexible
    const regularSubject = monitorStudent.subjectSummaries.find(s => 
      s.group && !s.group.toUpperCase().startsWith('F') && !s.group.startsWith('10')
    );
    
    return regularSubject?.group || monitorStudent.subjectSummaries[0]?.group || '';
  };

  // Enriched students with group from monitoring
  const enrichedStudents = useMemo(() => {
    return students.map(s => ({
      ...s,
      group: getStudentGroupFromMonitoring(s.id) || s.group || ''
    }));
  }, [students, allStudentsMap]);

  const advisors = useMemo(() => [...new Set(enrichedStudents.map(s => s.advisor).filter(Boolean))].sort(), [enrichedStudents]);
  const statuses = useMemo(() => [...new Set(enrichedStudents.map(s => s.status).filter(Boolean))].sort(), [enrichedStudents]);
  const groups = useMemo(() => [...new Set(enrichedStudents.map(s => s.group).filter(Boolean))].sort(), [enrichedStudents]);

  const filteredByCycleStudents = useMemo(() => {
    return enrichedStudents.filter(s => {
      const matchesCycle = selectedCycle === 'all' || s.cycle === selectedCycle;
      const matchesGlobalLeader = (filterType === 'leader' && selectedValue) ? s.leader === selectedValue : true;
      return matchesCycle && matchesGlobalLeader;
    });
  }, [enrichedStudents, selectedCycle, filterType, selectedValue]);

  const filteredStudents = useMemo(() => {
    let list = filteredByCycleStudents.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm);
      const matchesAdvisor = selectedAdvisor === 'all' || s.advisor === selectedAdvisor;
      const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
      const matchesGroup = selectedGroup === 'all' || s.group === selectedGroup;
      return matchesSearch && matchesAdvisor && matchesStatus && matchesGroup;
    });

    if (selectedKpi) {
      list = list.filter(s => {
        const local = localStatuses[s.id];
        const voc = local?.vocationalDiagnosis;
        const topUni = voc?.universityRanking?.split(/[;,]/)[0]?.trim().toUpperCase() || '';

        switch(selectedKpi) {
          case 'inscribed': return s.isInscribed;
          case 'pending': return !s.isInscribed;
          case 'indeciso': return !s.isInscribed && local?.isIndeciso;
          case 'sos': return !s.isInscribed && voc && voc.urgencyLevel >= 8;
          case 'taller': return !s.isInscribed && voc?.requiresWorkshop && !local?.workshopAttended;
          case 'risk': return !s.isInscribed && s.average >= 90 && s.status.toLowerCase().includes('descartado');
          default: return true;
        }
      });
    }

    return list;
  }, [filteredByCycleStudents, searchTerm, selectedAdvisor, selectedStatus, selectedGroup, selectedKpi, localStatuses]);

  const stats = useMemo(() => {
    const baseList = filteredByCycleStudents;
    const total = baseList.length || 0;
    const inscribed = baseList.filter(s => s.isInscribed).length;
    const pending = total - inscribed;
    const talentRisk = baseList.filter(s => !s.isInscribed && s.average >= 90 && s.status.toLowerCase().includes('descartado')).length;
    
    let indecisosCount = 0;
    let sosCount = 0;
    let tallerCount = 0;

    baseList.forEach(s => {
      if (s.isInscribed) return;

      const local = localStatuses[s.id];
      if (local?.isIndeciso) indecisosCount++;
      
      const voc = local?.vocationalDiagnosis;
      if (voc) {
        if (voc.urgencyLevel >= 8) sosCount++;
        if (voc.requiresWorkshop && !local.workshopAttended) tallerCount++;
      }
    });
    
    const statusDistribution = statuses.map(st => ({
      name: st,
      value: baseList.filter(s => s.status === st).length
    })).sort((a,b) => b.value - a.value);

    const advisorProgress = advisors.map(adv => {
      const advStudents = baseList.filter(s => s.advisor === adv);
      return {
        name: adv,
        total: advStudents.length,
        inscribed: advStudents.filter(s => s.isInscribed).length
      };
    }).sort((a,b) => b.total - a.total);

    return { total, inscribed, pending, talentRisk, statusDistribution, advisorProgress, indecisosCount, sosCount, tallerCount };
  }, [filteredByCycleStudents, advisors, statuses, localStatuses]);

  const handleUpdateIndeciso = async (studentId: string, isIndeciso: boolean) => {
    await updateContinuityIndeciso(studentId, isIndeciso);
    setLocalStatuses(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { comments: [] }), isIndeciso }
    }));
  };

  const handleUpdateWorkshopAttended = async (studentId: string, attended: boolean) => {
    await updateContinuityWorkshopAttended(studentId, attended);
    setLocalStatuses(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { comments: [] }), workshopAttended: attended }
    }));
    toast({
      title: attended ? "Asistencia registrada" : "Asistencia removida",
      description: `Se ha actualizado el estado del taller vocacional.`
    });
  };

  const handleUpdateTracking = async (studentId: string, info: ContinuityTrackingInfo) => {
    await updateContinuityTrackingInfo(studentId, info);
    setLocalStatuses(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { comments: [] }), trackingInfo: info }
    }));
    toast({ title: "Seguimiento Guardado", description: "Los datos de decisión final se han actualizado." });
  }

  const handleAddComment = async (studentId: string, text: string, author: string) => {
    await addContinuityComment(studentId, text, author);
    const updated = await getAllContinuityStatuses();
    setLocalStatuses(updated);
  };

  const handleKpiClick = (kpi: string) => {
    setSelectedKpi(kpi);
    setActiveTab('list');
  };

  const handleJumpToStudent = (studentId: string) => {
    setContextualStudentIds(new Set([studentId]));
    setActiveView('students');
  };

  if (students.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] space-y-6">
        <div className="bg-primary/10 p-6 rounded-full">
          <TrendingUp className="h-16 w-16 text-primary" />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-2">Seguimiento de Continuidad</h1>
          <p className="text-muted-foreground mb-6">Carga el archivo Excel de Continuidad para visualizar las metas de inscripción y el perfil vocacional de los alumnos.</p>
          <FileUpload onFileSelect={handleFileUpload} selectedFile={null} isLoading={isProcessing} label="Cargar Excel de Continuidad" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estrategia de Continuidad</h1>
          <p className="text-muted-foreground">Inscripciones a profesional y seguimiento vocacional.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-[180px] bg-primary text-white border-none font-bold">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por Ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Ciclos</SelectItem>
              <SelectItem value="Enero 26">Enero 26</SelectItem>
              <SelectItem value="Agosto 26">Agosto 26</SelectItem>
            </SelectContent>
          </Select>
          
          <CareerManagementDialog 
            catalog={careerCatalog} 
            onUpdate={async (newCatalog) => {
              setCareerCatalog(newCatalog);
              await updateCareerCatalog(newCatalog);
            }} 
          />

          <FileUpload onFileSelect={handleRiasecUpload} selectedFile={null} isLoading={isProcessingRiasec} variant="secondary" label="Cargar RIASEC" icon={<FileJson className="h-4 w-4" />} />
          <FileUpload onFileSelect={handleVocationalUpload} selectedFile={null} isLoading={isProcessingVoc} variant="outline" label="Encuesta Vocacional" icon={<History className="h-4 w-4" />} />
          <FileUpload onFileSelect={handleFileUpload} selectedFile={null} isLoading={isProcessing} variant="default" label="Actualizar Base Operativa" />
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <KpiCard title="Total Alumnos" value={stats.total} icon={Users} onClick={() => handleKpiClick('all')} />
        <KpiCard title="Inscritos" value={stats.inscribed} icon={Target} color="green" onClick={() => handleKpiClick('inscribed')} />
        <KpiCard title="No Inscritos" value={stats.pending} icon={UserX} color="blue" onClick={() => handleKpiClick('pending')} />
        <KpiCard title="Urgente SOS" value={stats.sosCount} icon={AlertTriangle} color="red" onClick={() => handleKpiClick('sos')} />
        <KpiCard title="Indecisos" value={stats.indecisosCount} icon={HelpCircle} color="purple" onClick={() => handleKpiClick('indeciso')} />
        <KpiCard title="Pend. Taller" value={stats.tallerCount} icon={CapIcon} color="blue" onClick={() => handleKpiClick('taller')} />
        <KpiCard title="Fuga Talento" value={stats.talentRisk} icon={AlertCircle} color="red" onClick={() => handleKpiClick('risk')} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="stats"><BarChart3 className="mr-2 h-4 w-4" /> Analíticos</TabsTrigger>
          <TabsTrigger value="list"><Filter className="mr-2 h-4 w-4" /> Base Operativa</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Avance de Inscritos por Asesor</CardTitle></CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.advisorProgress} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="inscribed" name="Inscritos" fill="hsl(var(--primary))" stackId="a" />
                    <Bar dataKey="total" name="No Inscritos" fill="hsl(var(--muted))" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Distribución por Estatus</CardTitle></CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.statusDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-6 pt-6">
          <div className="flex flex-wrap gap-4 bg-card border p-4 rounded-xl shadow-sm">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o matrícula..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Asesor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los asesores</SelectItem>
                {advisors.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Grupo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estatus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estatus</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            
            {selectedKpi && (
              <Button variant="ghost" onClick={() => setSelectedKpi(null)} className="text-destructive h-10">
                <X className="mr-2 h-4 w-4" /> Limpiar Filtro: {selectedKpi === 'pending' ? 'No Inscritos' : selectedKpi}
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {filteredStudents.map(student => (
              <ContinuityCard 
                key={student.id} 
                student={student} 
                localStatus={localStatuses[student.id]}
                isExpanded={expandedStudent === student.id}
                careerCatalog={careerCatalog}
                onToggle={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                onUpdateIndeciso={handleUpdateIndeciso}
                onUpdateWorkshopAttended={handleUpdateWorkshopAttended}
                onUpdateTracking={handleUpdateTracking}
                onAddComment={handleAddComment}
                onJumpToStudent={() => handleJumpToStudent(student.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CareerManagementDialog({ catalog, onUpdate }: { catalog: CareerOption[], onUpdate: (c: CareerOption[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localCatalog, setLocalCatalog] = useState<CareerOption[]>([]);
  const [newCareerName, setNewCareerName] = useState('');
  const [newCareerType, setNewCareerType] = useState<CareerType>('in-campus');
  const [isSaving, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setLocalCatalog([...catalog]);
  }, [isOpen, catalog]);

  const handleAddCareer = () => {
    if (!newCareerName.trim()) return;
    const updated = [...localCatalog, { name: newCareerName.trim(), type: newCareerType }].sort((a,b) => a.name.localeCompare(b.name));
    setLocalCatalog(updated);
    setNewCareerName('');
  };

  const handleRemoveCareer = (name: string) => {
    setLocalCatalog(localCatalog.filter(c => c.name !== name));
  };

  const handleTypeChange = (name: string, type: CareerType) => {
    setLocalCatalog(localCatalog.map(c => c.name === name ? { ...c, type } : c));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate(localCatalog);
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 font-bold border-primary text-primary hover:bg-primary/5">
          <Briefcase className="h-4 w-4" /> Gestionar Carreras
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Catálogo Maestro de Carreras</DialogTitle>
          <DialogDescription>Define qué carreras tenemos en campus, en otros campus Tecmilenio o si son oferta externa.</DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 items-end py-4 border-b">
          <div className="flex-1 space-y-2">
            <Label className="text-xs font-bold uppercase">Nueva Carrera</Label>
            <Input value={newCareerName} onChange={e => setNewCareerName(e.target.value)} placeholder="Ej. Medicina Veterinaria..." className="rounded-xl" />
          </div>
          <div className="w-[180px] space-y-2">
            <Label className="text-xs font-bold uppercase">Clasificación</Label>
            <Select value={newCareerType} onValueChange={(v: any) => setNewCareerType(v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in-campus">En este Campus</SelectItem>
                <SelectItem value="other-campus">Campus Externo TM</SelectItem>
                <SelectItem value="external">Universidad Externa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddCareer} className="rounded-xl h-10 px-4"><PlusCircle className="h-4 w-4 mr-2" /> Añadir</Button>
        </div>

        <ScrollArea className="flex-1 pr-4 py-4">
          <div className="space-y-2">
            {localCatalog.map(c => (
              <div key={c.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-transparent hover:border-primary/10 transition-all">
                <span className="font-bold text-sm flex-1">{c.name}</span>
                <div className="flex items-center gap-2">
                  <Select value={c.type} onValueChange={(v: any) => handleTypeChange(c.name, v)}>
                    <SelectTrigger className={cn(
                      "w-[160px] h-8 text-[10px] font-black uppercase rounded-lg border-none shadow-sm",
                      c.type === 'in-campus' ? "bg-primary/10 text-primary" : 
                      c.type === 'other-campus' ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-campus">En este Campus</SelectItem>
                      <SelectItem value="other-campus">Campus Externo TM</SelectItem>
                      <SelectItem value="external">Univ. Externa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveCareer(c.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-xl font-black px-8">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Guardar Catálogo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContinuityCard({ 
  student, localStatus, isExpanded, careerCatalog, onToggle, onUpdateIndeciso, onUpdateWorkshopAttended, onUpdateTracking, onAddComment, onJumpToStudent
}: { 
  student: ContinuityStudent, 
  localStatus?: ContinuityLocalStatus,
  isExpanded: boolean, 
  careerCatalog: CareerOption[],
  onToggle: () => void,
  onUpdateIndeciso: (id: string, val: boolean) => void,
  onUpdateWorkshopAttended: (id: string, val: boolean) => void,
  onUpdateTracking: (id: string, info: ContinuityTrackingInfo) => void,
  onAddComment: (id: string, text: string, author: string) => void,
  onJumpToStudent: () => void
}) {
  const isHighValueRisk = !student.isInscribed && student.average >= 90 && student.status.toLowerCase().includes('descartado');
  const vocational = localStatus?.vocationalDiagnosis;
  const riasec = localStatus?.riasecDiagnosis;
  const tracking = localStatus?.trackingInfo || { chosenUniversity: '', chosenCareers: [], processStatus: 'Pendiente', resultDate: '' };
  
  const isSOS = !student.isInscribed && vocational && vocational.urgencyLevel >= 8;
  const isIndeciso = !student.isInscribed && localStatus?.isIndeciso;
  const isWorkshopRequired = vocational?.requiresWorkshop && !student.isInscribed;
  const isWorkshopAttended = localStatus?.workshopAttended;

  const universityRankingArray = useMemo(() => {
    if (!vocational?.universityRanking) return [];
    return vocational.universityRanking.split(/[;,]/).filter(Boolean).map(u => u.trim());
  }, [vocational]);

  const tecmilenioRank = useMemo(() => {
    const idx = universityRankingArray.findIndex(u => u.toUpperCase().includes('TECMILENIO'));
    return idx !== -1 ? idx + 1 : null;
  }, [universityRankingArray]);

  const [commentText, setCommentText] = useState('');
  const { leaders, tutors } = useDashboardFilters();
  const [author, setAuthor] = useState('');

  const signatoryOptions = useMemo(() => {
    return [...new Set([...leaders, ...tutors])].sort((a, b) => a.localeCompare(b));
  }, [leaders, tutors]);

  // Tracking form states
  const [university, setUniversity] = useState(tracking.chosenUniversity);
  const [otherUniversity, setOtherUniversity] = useState('');
  const [procStatus, setProcStatus] = useState(tracking.processStatus);
  const [resDate, setResDate] = useState(tracking.resultDate);
  const [careers, setCareers] = useState<string[]>(tracking.chosenCareers);
  const [careerSearch, setCareerSearch] = useState('');
  const [isCareerPopoverOpen, setIsCareerPopoverOpen] = useState(false);

  const handleAddCareer = (careerName: string) => {
    if (careers.includes(careerName)) return;
    setCareers(prev => [...prev, careerName]);
    setIsCareerPopoverOpen(false);
    setCareerSearch('');
  };

  const handleRemoveCareer = (idx: number) => {
    setCareers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTracking = () => {
    const finalUniversity = university === 'OTRA' ? otherUniversity : university;
    onUpdateTracking(student.id, {
      chosenUniversity: finalUniversity,
      chosenCareers: careers,
      processStatus: procStatus,
      resultDate: resDate
    });
  };

  const filteredCareerOptions = useMemo(() => {
    if (!careerSearch) return careerCatalog;
    const search = careerSearch.toLowerCase();
    return careerCatalog.filter(c => c.name.toLowerCase().includes(search));
  }, [careerSearch, careerCatalog]);

  return (
    <TooltipProvider>
    <Card className={cn(
      "transition-all border-l-4",
      student.isInscribed ? "border-l-green-500" : "border-l-muted",
      (isHighValueRisk || isSOS) && "ring-2 ring-red-500/50",
      isIndeciso && "border-l-purple-500 bg-purple-50/5"
    )}>
      <div className="p-4 flex flex-col cursor-pointer hover:bg-muted/5" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm",
              student.isInscribed ? "bg-green-600" : "bg-muted-foreground/40"
            )}>
              {student.isInscribed ? <GraduationCap className="h-5 w-5" /> : student.id.substring(0, 2)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold flex items-center gap-2 flex-wrap text-sm sm:text-base">
                  {student.name}
                  {isSOS && <Badge variant="destructive" className="animate-pulse flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> URGENTE SOS</Badge>}
                  {isHighValueRisk && <Badge variant="destructive">Alerta Fuga</Badge>}
                  {student.isInscribed && <Badge className="bg-green-100 text-green-800 border-green-200">Inscrito</Badge>}
                  {isIndeciso && <Badge className="bg-purple-100 text-purple-800 border-purple-200"><HelpCircle className="h-3 w-3 mr-1" />Indeciso</Badge>}
                  {!student.isInscribed && tecmilenioRank !== null && (
                    <Badge variant={tecmilenioRank === 1 ? 'default' : 'outline'} className={cn(
                      tecmilenioRank === 1 ? "bg-primary" : "text-orange-600 border-orange-200 bg-orange-50"
                    )}>
                      {tecmilenioRank === 1 ? <Trophy className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                      Opción {tecmilenioRank}
                    </Badge>
                  )}
                  {riasec && <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1"><Sparkles className="h-3 w-3" /> RIASEC OK</Badge>}
                </h3>
                <TooltipUI>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-primary hover:bg-primary/5" onClick={(e) => { e.stopPropagation(); onJumpToStudent(); }}>
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="font-bold">Ver Expediente Académico</TooltipContent>
                </TooltipUI>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-primary"><Users className="h-3 w-3" /> {student.advisor}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {student.cycle}</span>
                <span className="flex items-center gap-1 font-mono font-bold text-foreground">
                  <Group className="h-3 w-3 text-muted-foreground" /> 
                  {student.group ? `GPO: ${student.group}` : 'Sin Gpo (Monitoreo)'}
                </span>
                <span className="font-mono">{student.id}</span>
                <span className="font-bold">Promedio: {student.average}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="hidden lg:inline-flex">{student.status}</Badge>
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </div>
        </div>

        {/* Banner Summary Info */}
        {!student.isInscribed && (vocational?.interestedCareers || vocational?.universityRanking) && (
          <div className="mt-2 pl-14 flex flex-col gap-1 border-t border-dashed pt-2">
            {vocational?.interestedCareers && (
              <div className="text-[10px] text-primary font-bold flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                <span className="uppercase text-[9px] text-muted-foreground font-semibold">Carreras:</span> {vocational.interestedCareers}
              </div>
            )}
            {universityRankingArray.length > 0 && (
              <div className="text-[10px] text-foreground font-medium flex items-center gap-1.5">
                <ListOrdered className="h-3 w-3 text-muted-foreground" />
                <span className="uppercase text-[9px] text-muted-foreground font-semibold">Top 3:</span> 
                {universityRankingArray.slice(0, 3).map((uni, i) => (
                  <span key={i} className={cn(uni.toUpperCase().includes('TECMILENIO') ? "text-primary font-bold" : "")}>
                    {i + 1}. {uni}{i < Math.min(universityRankingArray.length, 3) - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <CardContent className="border-t bg-muted/5 pt-6 space-y-6 animate-in slide-in-from-top-2">
          {!student.isInscribed && (
            <div className="flex flex-wrap gap-3 justify-end mb-2">
              <div className="flex items-center space-x-2 bg-background p-2 rounded-lg border shadow-sm">
                <Checkbox 
                  id={`indeciso-${student.id}`} 
                  checked={localStatus?.isIndeciso || false} 
                  onCheckedChange={(checked) => onUpdateIndeciso(student.id, !!checked)}
                />
                <Label htmlFor={`indeciso-${student.id}`} className="text-xs font-bold cursor-pointer">Marcar como Indeciso</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 bg-background p-2 rounded-lg border shadow-sm transition-colors",
                isWorkshopRequired && !isWorkshopAttended && "ring-2 ring-blue-500/20"
              )}>
                <Checkbox 
                  id={`taller-${student.id}`} 
                  checked={localStatus?.workshopAttended || false} 
                  onCheckedChange={(checked) => onUpdateWorkshopAttended(student.id, !!checked)}
                />
                <Label htmlFor={`taller-${student.id}`} className="text-xs font-bold cursor-pointer flex items-center gap-1">
                  Taller Vocacional Tomado
                  {isWorkshopRequired && <span className="text-[9px] text-blue-600 font-bold uppercase">(Prioridad)</span>}
                </Label>
              </div>
            </div>
          )}

          {/* Decision Tracking Section */}
          {!student.isInscribed && (
            <div className="pt-4 border-t space-y-4">
              <Label className="text-xs uppercase font-bold text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Seguimiento de Decisión Final
              </Label>
              <div className="bg-background p-6 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Universidad Elegida</Label>
                    <Select value={UNIVERSITY_OPTIONS.includes(university) ? university : (university ? 'OTRA' : '')} onValueChange={(val) => {
                      setUniversity(val);
                      if (val !== 'OTRA') setOtherUniversity('');
                    }}>
                      <SelectTrigger className="rounded-xl h-10">
                        <SelectValue placeholder="Seleccionar institución..." />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIVERSITY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {university === 'OTRA' && (
                      <Input 
                        value={otherUniversity} 
                        onChange={e => setOtherUniversity(e.target.value)} 
                        placeholder="Nombre de la universidad..."
                        className="rounded-xl h-10 mt-2 animate-in fade-in"
                      />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Carrera(s) Seleccionada(s)</Label>
                    <Popover open={isCareerPopoverOpen} onOpenChange={setIsCareerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start rounded-xl h-10 text-muted-foreground font-normal">
                          <Search className="mr-2 h-4 w-4" />
                          Buscar carrera en catálogo...
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Ej. Medicina, Psicología..." value={careerSearch} onValueChange={setCareerSearch} />
                          <CommandList>
                            <CommandEmpty>No se encontró esa carrera.</CommandEmpty>
                            <CommandGroup>
                              <ScrollArea className="h-[200px]">
                                {filteredCareerOptions.map(c => (
                                  <CommandItem 
                                    key={c.name} 
                                    onSelect={() => handleAddCareer(c.name)}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="text-xs font-bold">{c.name}</span>
                                    <Badge className={cn(
                                      "text-[8px] h-4 font-black uppercase",
                                      c.type === 'in-campus' ? "bg-primary/10 text-primary" : 
                                      c.type === 'other-campus' ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                                    )}>
                                      {c.type === 'in-campus' ? 'Local' : c.type === 'other-campus' ? 'Otro Campus' : 'Externa'}
                                    </Badge>
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {careers.map((c, i) => {
                        const careerInfo = careerCatalog.find(cat => cat.name === c);
                        return (
                          <Badge key={i} variant="secondary" className={cn(
                            "pl-3 pr-1 py-1 rounded-lg border gap-2 shadow-sm",
                            careerInfo?.type === 'in-campus' ? "bg-primary/5 text-primary border-primary/10" : 
                            careerInfo?.type === 'other-campus' ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-orange-50 text-orange-700 border-orange-100"
                          )}>
                            <span className="font-bold">{c}</span>
                            {careerInfo?.type === 'external' && <AlertCircle className="h-3 w-3 shrink-0" title="Carrera no disponible en Tecmilenio" />}
                            {careerInfo?.type === 'other-campus' && <Globe className="h-3 w-3 shrink-0" title="Disponible en otro campus Tecmilenio" />}
                            <button onClick={() => handleRemoveCareer(i)} className="hover:bg-destructive/10 text-destructive p-0.5 rounded"><MinusCircle className="h-3.5 w-3.5" /></button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Estatus del Proceso</Label>
                      <Select value={procStatus} onValueChange={setProcStatus}>
                        <SelectTrigger className="rounded-xl h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="Interesado">Interesado</SelectItem>
                          <SelectItem value="Aplicando">Aplicando</SelectItem>
                          <SelectItem value="Admitido">Admitido</SelectItem>
                          <SelectItem value="Inscrito">Inscrito en otra</SelectItem>
                          <SelectItem value="Declinado">Declinado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <CalendarIcon className="h-3 w-3" /> Fecha Resultados
                      </Label>
                      <Input 
                        type="date" 
                        value={resDate} 
                        onChange={e => setResDate(e.target.value)}
                        className="rounded-xl h-10"
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleSaveTracking} className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/10">
                      <Send className="mr-2 h-4 w-4" /> Guardar Seguimiento
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Estado Operativo</Label>
              <div className="space-y-2">
                <p className="text-sm"><strong>Beca actual:</strong> {student.scholarship}</p>
                <p className="text-sm"><strong>Prioridad de interés:</strong> {student.priority}/5</p>
                <p className="text-sm"><strong>Líder:</strong> {student.leader}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Perfil Vocacional (Excel)</Label>
              <div className="space-y-2">
                <div className="text-sm flex items-center gap-2">
                  <strong>Interés:</strong> 
                  <Badge className={cn(
                    student.interestLevel?.toLowerCase().includes('alto') ? "bg-red-500" : 
                    student.interestLevel?.toLowerCase().includes('medio') ? "bg-yellow-500" : "bg-green-500"
                  )}>{student.interestLevel || 'No definido'}</Badge>
                </div>
                <p className="text-sm"><strong>Programa:</strong> {student.programOfInterest || 'Pendiente'}</p>
                <div className="text-sm">
                  <strong>Compite con:</strong> 
                  <span className={cn(
                    "ml-1 font-bold",
                    (student.competitorUniversity?.toUpperCase().includes('TEC') || student.competitorUniversity?.toUpperCase().includes('UANL')) ? "text-destructive" : "text-foreground"
                  )}>{student.competitorUniversity || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Bitácora de Contacto (Excel)</Label>
              <div className="bg-background p-3 rounded-lg border text-sm">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <PhoneCall className="h-3 w-3" /> {student.lastContactDate || 'Sin fecha'}
                </p>
                <p className="italic text-foreground/80">"{student.lastContactComment || 'No hay comentarios registrados.'}"</p>
              </div>
            </div>
          </div>

          {riasec && (
            <div className="pt-6 border-t space-y-4">
              <Label className="text-xs uppercase font-bold text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Diagnóstico Vocacional (Modelo RIASEC)
              </Label>
              <RiasecChart diagnosis={riasec} />
            </div>
          )}

          {vocational && (
            <div className="pt-6 border-t space-y-4">
              <Label className="text-xs uppercase font-bold text-primary flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> Diagnóstico Vocacional (Encuesta)
              </Label>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/10">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Nivel de Certeza</p>
                        <p className="text-sm font-semibold">{vocational.certaintyLevel || 'No declarado'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Urgencia S.O.S</p>
                        <Badge variant={vocational.urgencyLevel >= 8 ? 'destructive' : 'outline'} className={cn("text-lg py-0 px-2", student.isInscribed && "opacity-50 grayscale")}>
                          {vocational.urgencyLevel}/10
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Obstáculo Principal</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-white border text-left h-auto py-1">
                          {vocational.mainObstacle.includes('Económico') ? <Landmark className="h-3 w-3 mr-1 text-red-500 shrink-0" /> : <Lightbulb className="h-3 w-3 mr-1 text-yellow-500 shrink-0" />}
                          <span className="whitespace-normal leading-tight">{vocational.mainObstacle || 'Ninguno'}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ListOrdered className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-bold text-muted-foreground uppercase">Ranking de Universidades</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {universityRankingArray.length > 0 ? universityRankingArray.map((uni, idx) => (
                        <div key={idx} className="flex items-center">
                          <Badge variant="outline" className={cn(
                            "text-[10px] py-0 px-1.5 h-6",
                            uni.toUpperCase().includes('TECMILENIO') ? "bg-primary text-white border-primary" : "bg-white"
                          )}>
                            {idx + 1}. {uni}
                          </Badge>
                          {idx < universityRankingArray.length - 1 && <span className="text-muted-foreground mx-0.5">→</span>}
                        </div>
                      )) : (
                        <p className="text-xs text-muted-foreground italic">No se declaró un ranking.</p>
                      )}
                    </div>
                    {tecmilenioRank && tecmilenioRank > 1 && !student.isInscribed && (
                      <div className="bg-orange-100 text-orange-800 p-2 rounded-lg text-[10px] font-bold flex items-center gap-2 mt-2">
                        <AlertCircle className="h-3 w-3" />
                        COMPETENCIA: SOMOS LA OPCIÓN {tecmilenioRank}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Carreras de Interés</p>
                      <p className="text-xs font-semibold mt-1 leading-relaxed">{vocational.interestedCareers || 'No especificadas'}</p>
                    </div>
                    {vocational.requiresWorkshop && !student.isInscribed && (
                      <div className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-xs font-bold uppercase",
                        isWorkshopAttended ? "bg-green-100 text-green-800 border-green-200" : "bg-purple-100 text-purple-800 border-purple-200"
                      )}>
                        {isWorkshopAttended ? <CheckCircle2 className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                        <span>{isWorkshopAttended ? "Taller Realizado" : "Requiere Taller Vocacional"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Label className="text-xs uppercase font-bold text-muted-foreground block mb-2">Decisión sobre carrera</Label>
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3">
              <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-1" />
              <p className="text-sm leading-relaxed">{student.decisionTaken || "Sin respuesta declarada."}</p>
            </div>
          </div>

          <div className="pt-6 border-t space-y-4">
            <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4" /> Bitácora de Seguimiento Interno (Sentinel)
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-3">
                    {localStatus?.comments && localStatus.comments.length > 0 ? (
                      [...localStatus.comments].reverse().map(c => (
                        <div key={c.id} className="bg-background p-3 rounded-lg border shadow-sm text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-primary flex items-center gap-1">
                              <UserCog className="h-3 w-3" /> {c.author}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(c.createdAt.toDate(), 'dd MMM, HH:mm', { locale: es })}
                            </span>
                          </div>
                          <p className="text-foreground/90 whitespace-pre-wrap">{c.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-10">Sin comentarios internos aún.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3 bg-background p-4 rounded-xl border">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Nueva nota de seguimiento:</Label>
                  <Select value={author} onValueChange={setAuthor}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="¿Quién firma?" />
                    </SelectTrigger>
                    <SelectContent>
                      {signatoryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea 
                    value={commentText} 
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Escribe aquí los detalles de la última interacción..."
                    className="min-h-[100px] text-sm resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      if (!author || !commentText.trim()) return;
                      onAddComment(student.id, commentText, author);
                      setCommentText('');
                    }}
                    disabled={!commentText.trim() || !author}
                  >
                    <Send className="h-4 w-4 mr-2" /> Guardar Nota
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
    </TooltipProvider>
  );
}

function KpiCard({ 
  title, value, icon: Icon, color, onClick 
}: { 
  title: string, value: number | string, icon: any, color?: string, onClick?: () => void 
}) {
  const colors = {
    red: "text-red-600 bg-red-50 border-red-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-100",
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    green: "text-green-600 bg-green-50 border-green-100",
    default: "text-primary bg-primary/5 border-primary/10"
  };
  const colorClass = color ? (colors[color as keyof typeof colors] || colors.default) : colors.default;

  return (
    <Card 
      className={cn(
        "shadow-sm transition-all", 
        onClick && "cursor-pointer hover:shadow-md hover:scale-105 active:scale-95"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
