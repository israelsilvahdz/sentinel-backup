"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { parseContinuidadExcel } from '@/lib/continuityParser';
import { parseVocationalExcel } from '@/lib/vocationalParser';
import type { ContinuityStudent, ContinuityCatalog, ContinuityLocalStatus, ContinuityComment, VocationalDiagnosis } from '@/types/student';
import { 
  Users, Target, Award, AlertCircle, Search, Filter, 
  TrendingUp, BookOpen, MessageSquare, PhoneCall, GraduationCap,
  ChevronDown, ChevronUp, BarChart3, PieChart, Send, UserCog, History, Clock, HelpCircle,
  Stethoscope, AlertTriangle, Lightbulb, GraduationCap as CapIcon, X
} from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardFilters } from './DashboardClient';
import { getAllContinuityStatuses, updateContinuityIndeciso, addContinuityComment, bulkUpdateContinuityVocational } from '@/lib/firebase-services';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';

export function ContinuidadPanel() {
  const { toast } = useToast();
  const { 
    selectedValue, filterType, 
    continuityStudents: students, setContinuityStudents: setStudents, 
    continuityCatalog: catalog, setContinuityCatalog: setCatalog 
  } = useDashboardFilters();
  
  const [localStatuses, setLocalStatuses] = useState<Record<string, ContinuityLocalStatus>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingVoc, setIsProcessingVoc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCycle, setSelectedCycle] = useState('all');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  useEffect(() => {
    const loadLocalStatuses = async () => {
      const statuses = await getAllContinuityStatuses();
      setLocalStatuses(statuses);
    };
    loadLocalStatuses();
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

  const advisors = useMemo(() => [...new Set(students.map(s => s.advisor).filter(Boolean))].sort(), [students]);
  const statuses = useMemo(() => [...new Set(students.map(s => s.status).filter(Boolean))].sort(), [students]);

  const filteredStudents = useMemo(() => {
    let list = students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm);
      const matchesAdvisor = selectedAdvisor === 'all' || s.advisor === selectedAdvisor;
      const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
      const matchesCycle = selectedCycle === 'all' || s.cycle === selectedCycle;
      
      const matchesGlobalLeader = (filterType === 'leader' && selectedValue) ? s.leader === selectedValue : true;

      return matchesSearch && matchesAdvisor && matchesStatus && matchesCycle && matchesGlobalLeader;
    });

    if (selectedKpi) {
      list = list.filter(s => {
        const local = localStatuses[s.id];
        const voc = local?.vocationalDiagnosis;
        switch(selectedKpi) {
          case 'inscribed': return s.isInscribed;
          case 'indeciso': return local?.isIndeciso;
          case 'sos': return voc && voc.urgencyLevel >= 8;
          case 'taller': return voc?.requiresWorkshop;
          case 'risk': return s.average >= 90 && s.status.toLowerCase().includes('descartado');
          default: return true;
        }
      });
    }

    return list;
  }, [students, searchTerm, selectedAdvisor, selectedStatus, selectedCycle, filterType, selectedValue, selectedKpi, localStatuses]);

  const stats = useMemo(() => {
    const total = students.length || 1;
    const inscribed = students.filter(s => s.isInscribed).length;
    const highInterest = students.filter(s => s.interestLevel?.toLowerCase().includes('alto')).length;
    const talentRisk = students.filter(s => s.average >= 90 && s.status.toLowerCase().includes('descartado')).length;
    
    // Stats based on joined Firestore data
    let indecisosCount = 0;
    let sosCount = 0;
    let tallerCount = 0;

    students.forEach(s => {
      const local = localStatuses[s.id];
      if (local?.isIndeciso) indecisosCount++;
      if (local?.vocationalDiagnosis) {
        if (local.vocationalDiagnosis.urgencyLevel >= 8) sosCount++;
        if (local.vocationalDiagnosis.requiresWorkshop) tallerCount++;
      }
    });
    
    const statusDistribution = statuses.map(st => ({
      name: st,
      value: students.filter(s => s.status === st).length
    })).sort((a,b) => b.value - a.value);

    const advisorProgress = advisors.map(adv => {
      const advStudents = students.filter(s => s.advisor === adv);
      return {
        name: adv,
        total: advStudents.length,
        inscribed: advStudents.filter(s => s.isInscribed).length
      };
    }).sort((a,b) => b.total - a.total);

    return { total, inscribed, highInterest, talentRisk, statusDistribution, advisorProgress, indecisosCount, sosCount, tallerCount };
  }, [students, advisors, statuses, localStatuses]);

  const handleUpdateIndeciso = async (studentId: string, isIndeciso: boolean) => {
    await updateContinuityIndeciso(studentId, isIndeciso);
    setLocalStatuses(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { comments: [] }), isIndeciso }
    }));
  };

  const handleAddComment = async (studentId: string, text: string, author: string) => {
    await addContinuityComment(studentId, text, author);
    const updated = await getAllContinuityStatuses();
    setLocalStatuses(updated);
  };

  const handleKpiClick = (kpi: string) => {
    setSelectedKpi(kpi);
    setActiveTab('list');
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
        <div className="flex gap-2">
          <FileUpload onFileSelect={handleVocationalUpload} selectedFile={null} isLoading={isProcessingVoc} variant="secondary" label="Cargar Encuesta Vocacional" icon={<History className="h-4 w-4" />} />
          <FileUpload onFileSelect={handleFileUpload} selectedFile={null} isLoading={isProcessing} variant="outline" label="Actualizar Base Operativa" />
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total Alumnos" value={stats.total} icon={Users} onClick={() => handleKpiClick('all')} />
        <KpiCard title="Inscritos" value={stats.inscribed} icon={Target} color="blue" onClick={() => handleKpiClick('inscribed')} />
        <KpiCard title="Indecisos" value={stats.indecisosCount} icon={HelpCircle} color="purple" onClick={() => handleKpiClick('indeciso')} />
        <KpiCard title="Urgente SOS" value={stats.sosCount} icon={AlertTriangle} color="red" onClick={() => handleKpiClick('sos')} />
        <KpiCard title="Taller Voc." value={stats.tallerCount} icon={CapIcon} color="blue" onClick={() => handleKpiClick('taller')} />
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
                    <Bar dataKey="total" name="Pendientes" fill="hsl(var(--muted))" stackId="a" />
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estatus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estatus</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ciclo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ambos Ciclos</SelectItem>
                <SelectItem value="Enero 26">Enero 26</SelectItem>
                <SelectItem value="Agosto 26">Agosto 26</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedKpi && (
              <Button variant="ghost" onClick={() => setSelectedKpi(null)} className="text-destructive h-10">
                <X className="mr-2 h-4 w-4" /> Limpiar Filtro KPI
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
                onToggle={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                onUpdateIndeciso={handleUpdateIndeciso}
                onAddComment={handleAddComment}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContinuityCard({ 
  student, localStatus, isExpanded, onToggle, onUpdateIndeciso, onAddComment 
}: { 
  student: ContinuityStudent, 
  localStatus?: ContinuityLocalStatus,
  isExpanded: boolean, 
  onToggle: () => void,
  onUpdateIndeciso: (id: string, val: boolean) => void,
  onAddComment: (id: string, text: string, author: string) => void
}) {
  const isHighValueRisk = student.average >= 90 && student.status.toLowerCase().includes('descartado');
  const vocational = localStatus?.vocationalDiagnosis;
  const isSOS = vocational && vocational.urgencyLevel >= 8;
  const isSecondOption = vocational?.isSecondOption;

  const [commentText, setCommentText] = useState('');
  const { leaders, tutors } = useDashboardFilters();
  const [author, setAuthor] = useState('');

  const signatoryOptions = useMemo(() => {
    return [...new Set([...leaders, ...tutors])].sort((a, b) => a.localeCompare(b));
  }, [leaders, tutors]);

  return (
    <Card className={cn(
      "transition-all border-l-4",
      student.isInscribed ? "border-l-green-500" : "border-l-muted",
      (isHighValueRisk || isSOS) && "ring-2 ring-red-500/50",
      localStatus?.isIndeciso && "border-l-purple-500 bg-purple-50/5"
    )}>
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/5" onClick={onToggle}>
        <div className="flex items-center gap-4 flex-1">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm",
            student.isInscribed ? "bg-green-600" : "bg-muted-foreground/40"
          )}>
            {student.isInscribed ? <GraduationCap className="h-5 w-5" /> : student.id.substring(0, 2)}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold flex items-center gap-2 flex-wrap">
              {student.name}
              {isSOS && <Badge variant="destructive" className="animate-pulse flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> URGENTE SOS</Badge>}
              {isHighValueRisk && <Badge variant="destructive">Alerta Fuga</Badge>}
              {student.isInscribed && <Badge className="bg-green-100 text-green-800 border-green-200">Inscrito</Badge>}
              {localStatus?.isIndeciso && <Badge className="bg-purple-100 text-purple-800 border-purple-200"><HelpCircle className="h-3 w-3 mr-1" />Indeciso</Badge>}
              {isSecondOption && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Segunda Opción</Badge>}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-semibold text-primary"><Users className="h-3 w-3" /> {student.advisor}</span>
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {student.cycle}</span>
              <span className="font-mono">{student.id}</span>
              <span className="font-bold">Promedio: {student.average}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="hidden sm:inline-flex">{student.status}</Badge>
          {isExpanded ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>

      {isExpanded && (
        <CardContent className="border-t bg-muted/5 pt-6 space-y-6 animate-in slide-in-from-top-2">
          <div className="flex justify-end mb-2">
            <div className="flex items-center space-x-2 bg-background p-2 rounded-lg border shadow-sm">
              <Checkbox 
                id={`indeciso-${student.id}`} 
                checked={localStatus?.isIndeciso || false} 
                onCheckedChange={(checked) => onUpdateIndeciso(student.id, !!checked)}
              />
              <Label htmlFor={`indeciso-${student.id}`} className="text-xs font-bold cursor-pointer">Marcar como Indeciso</Label>
            </div>
          </div>

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
              <Label className="text-xs uppercase font-bold text-muted-foreground">Perfil Vocacional</Label>
              <div className="space-y-2">
                <div className="text-sm flex items-center gap-2">
                  <strong>Interés:</strong> 
                  <Badge className={cn(
                    student.interestLevel?.toLowerCase().includes('alto') ? "bg-red-500" : 
                    student.interestLevel?.toLowerCase().includes('medio') ? "bg-yellow-500" : "bg-green-500"
                  )}>{student.interestLevel || 'No definido'}</Badge>
                </div>
                <p className="text-sm"><strong>Programa:</strong> {student.programOfInterest || 'Pendiente'}</p>
                <p className="text-sm"><strong>Compite con:</strong> {student.competitorUniversity || 'N/A'}</p>
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

          {vocational && (
            <div className="pt-6 border-t space-y-4">
              <Label className="text-xs uppercase font-bold text-primary flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> Diagnóstico Vocacional (Encuesta)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-primary/10">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Nivel de Certeza</p>
                        <p className="text-sm font-semibold">{vocational.certaintyLevel || 'No declarado'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Urgencia S.O.S</p>
                        <Badge variant={vocational.urgencyLevel >= 8 ? 'destructive' : 'outline'} className="text-lg py-0 px-2">
                          {vocational.urgencyLevel}/10
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Obstáculo Principal</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-white border">
                          {vocational.mainObstacle.includes('Económico') ? <Target className="h-3 w-3 mr-1 text-red-500" /> : <Lightbulb className="h-3 w-3 mr-1 text-yellow-500" />}
                          {vocational.mainObstacle || 'Ninguno'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Preferencia de Universidades</p>
                      <p className="text-xs italic mt-1 leading-relaxed">{vocational.universityRanking}</p>
                    </div>
                    {vocational.requiresWorkshop && (
                      <div className="flex items-center gap-2 p-2 bg-purple-100 text-purple-800 rounded-lg border border-purple-200">
                        <GraduationCap className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">Requiere Taller Vocacional</span>
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
    purple: "text-purple-600 bg-purple-50 border-purple-100",
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
