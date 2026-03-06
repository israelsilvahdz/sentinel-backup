
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { parseContinuidadExcel, parseCareerChoiceSurvey } from '@/lib/continuityParser';
import { parseVocationalExcel } from '@/lib/vocationalParser';
import { parseRiasecExcel } from '@/lib/riasecParser';
import type { ContinuityStudent, ContinuityCatalog, ContinuityLocalStatus, VocationalDiagnosis, ContinuityTrackingInfo, CareerOption, CareerType, CareerChoiceSurvey } from '@/types/student';
import { 
  Users, Target, AlertCircle, Search, Filter, 
  TrendingUp, BookOpen, MessageSquare, 
  ChevronDown, ChevronUp, BarChart3, Send, UserCog, History, HelpCircle,
  AlertTriangle, Sparkles, GraduationCap as CapIcon, X, CheckCircle2, Trophy, ListOrdered,
  Landmark, FileJson, PlusCircle, Calendar as CalendarIcon, Briefcase,
  UserX, Loader2, Trash2, Globe, Save, ArrowUpRight, Group, FileWarning, PieChart, ClipboardList
} from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart as RePieChart, Pie, LabelList } from 'recharts';
import { useDashboardFilters } from './DashboardClient';
import { getAllContinuityStatuses, updateContinuityIndeciso, updateContinuityWorkshopAttended, addContinuityComment, bulkUpdateContinuityVocational, bulkUpdateRiasecDiagnoses, updateContinuityTrackingInfo, getCareerCatalog, updateCareerCatalog, bulkUpdateCareerSurvey } from '@/lib/firebase-services';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Textarea } from '../ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TooltipProvider, Tooltip as TooltipUI, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const COLORS = ['#17594A', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];

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
  const [isProcessingSurvey, setIsProcessingSurvey] = useState(false);
  
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
      setLocalStatuses(statuses || {});
      setCareerCatalog(careers.length > 0 ? careers : []);
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
        toast({ title: "Diagnóstico Vocacional Guardado", description: "Los datos operativos han sido actualizados." });
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
      const diagnoses = await parseRiasecExcel(file, {});
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

  const handleSurveyUpload = async (file: File | null) => {
    if (!file) return;
    setIsProcessingSurvey(true);
    try {
      const surveys = await parseCareerChoiceSurvey(file);
      if (surveys) {
        const officialStatuses: Record<string, string> = {};
        students.forEach(s => officialStatuses[s.id] = s.status);
        
        await bulkUpdateCareerSurvey(surveys, officialStatuses);
        const updated = await getAllContinuityStatuses();
        setLocalStatuses(updated);
        toast({ title: "Encuesta Reciente Guardada", description: `Se actualizaron ${Object.keys(surveys).length} respuestas y se activaron alertas de discrepancia.` });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Error al cargar encuesta", description: "Revisa el formato del archivo CSV." });
    } finally {
      setIsProcessingSurvey(false);
    }
  };

  const getStudentGroupFromMonitoring = (studentId: string): string => {
    const normalizedId = studentId.trim().toUpperCase();
    let monitorStudent = allStudentsMap.get(studentId) || allStudentsMap.get(normalizedId);
    if (!monitorStudent) {
      for (const student of allStudentsMap.values()) {
        if (student.id.trim().toUpperCase() === normalizedId) {
          monitorStudent = student;
          break;
        }
      }
    }
    if (!monitorStudent || !monitorStudent.subjectSummaries) return '';
    const regularSubject = monitorStudent.subjectSummaries.find(s => 
      s.group && 
      !s.group.toUpperCase().startsWith('F') && 
      !s.group.startsWith('10') &&
      s.group.trim() !== ''
    );
    return regularSubject?.group || monitorStudent.subjectSummaries.find(s => s.group && s.group.trim() !== '')?.group || '';
  };

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
        const survey = local?.encuestaEleccionReciente;
        switch(selectedKpi) {
          case 'inscribed': return s.isInscribed;
          case 'pending': return !s.isInscribed;
          case 'pending-survey': return !local?.encuestaEleccionReciente;
          case 'indeciso': return !s.isInscribed && (local?.isIndeciso || !(survey?.yaEligioCarrera || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si'));
          case 'career-no': return !s.isInscribed && !(survey?.yaEligioCarrera || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si');
          case 'uni-no': return !s.isInscribed && !(survey?.yaEligioUniversidad || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si');
          case 'sos': return !s.isInscribed && local?.vocationalDiagnosis && local.vocationalDiagnosis.urgencyLevel >= 8;
          case 'meta-tm': return !s.isInscribed && (survey?.universidadElegida || '').toLowerCase().includes('tecmilenio');
          case 'risk': return !s.isInscribed && s.average >= 90 && s.status.toLowerCase().includes('descartado');
          case 'fake': return local?.alertaFalsaInscripcion;
          default: 
            if (selectedKpi.startsWith('career:')) {
              const careerName = selectedKpi.replace('career:', '');
              return survey?.carreraElegida === careerName || survey?.carreraElegida?.includes(careerName);
            }
            if (selectedKpi.startsWith('uni:')) {
              const uniName = selectedKpi.replace('uni:', '');
              return survey?.universidadElegida === uniName || survey?.universidadElegida?.includes(uniName);
            }
            return true;
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
    let metaTmCount = 0;
    let fakeInscribedCount = 0;
    let surveyCareerNo = 0;
    let surveyUniNo = 0;
    let surveyPendingCount = 0;

    const careersSureCounts: Record<string, number> = {};
    const careersUnsureCounts: Record<string, number> = {};
    const universitiesCounts: Record<string, number> = {};

    baseList.forEach(s => {
      const local = localStatuses[s.id];
      const survey = local?.encuestaEleccionReciente;

      if (!survey) surveyPendingCount++;
      if (local?.alertaFalsaInscripcion) fakeInscribedCount++;
      
      // Analytics based ONLY on Non-Inscribed students as requested
      if (!s.isInscribed && survey) {
        const hasDecided = (survey.yaEligioCarrera || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si');
        const hasDecidedUni = (survey.yaEligioUniversidad || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si');

        if (!hasDecided) indecisosCount++;
        if (!hasDecided) surveyCareerNo++;
        if (!hasDecidedUni) surveyUniNo++;

        if (survey.universidadElegida?.toLowerCase().includes('tecmilenio')) {
          metaTmCount++;
        }

        // Sure Report: Only if they explicitly answered "Sí"
        if (survey.carreraElegida && hasDecided) {
          const options = survey.carreraElegida.split(';').map(o => o.trim()).filter(Boolean);
          options.forEach(o => {
            careersSureCounts[o] = (careersSureCounts[o] || 0) + 1;
          });
        } 
        
        // Unsure Report: Only if they answered "No"
        if (survey.carreraElegida && !hasDecided) {
          const options = survey.carreraElegida.split(';').map(o => o.trim()).filter(Boolean);
          options.forEach(o => {
            careersUnsureCounts[o] = (careersUnsureCounts[o] || 0) + 1;
          });
        }

        if (survey.universidadElegida) {
          const u = survey.universidadElegida;
          universitiesCounts[u] = (universitiesCounts[u] || 0) + 1;
        }

        const voc = local?.vocationalDiagnosis;
        if (voc && voc.urgencyLevel >= 8) sosCount++;
      }
    });

    const statusDistribution = statuses.map(st => ({ name: st, value: baseList.filter(s => s.status === st).length })).sort((a,b) => b.value - a.value);
    
    const advisorProgress = advisors.map(adv => {
      const advStudents = baseList.filter(s => s.advisor === adv);
      return { name: adv, total: advStudents.length, inscribed: advStudents.filter(s => s.isInscribed).length };
    }).sort((a,b) => b.total - a.total);

    const careerSureReport = Object.entries(careersSureCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);

    const careerUnsureReport = Object.entries(careersUnsureCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);

    const universityReport = Object.entries(universitiesCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);

    // Percentage Calculation for Pie Charts (Non-inscribed base)
    const surveyResponders = baseList.filter(s => !s.isInscribed && localStatuses[s.id]?.encuestaEleccionReciente).length || 1;
    
    const careerDecisionData = [
      { name: 'Decididos', value: surveyResponders - surveyCareerNo },
      { name: 'Indecisos', value: surveyCareerNo }
    ];

    const uniDecisionData = [
      { name: 'Decididos', value: surveyResponders - surveyUniNo },
      { name: 'Sin Decidir', value: surveyUniNo }
    ];

    return { 
      total, inscribed, pending, talentRisk, statusDistribution, advisorProgress, 
      indecisosCount, sosCount, metaTmCount, fakeInscribedCount,
      surveyCareerNo, surveyUniNo, careerSureReport, careerUnsureReport, universityReport,
      careerDecisionData, uniDecisionData, surveyPendingCount
    };
  }, [filteredByCycleStudents, advisors, statuses, localStatuses]);

  const handleUpdateIndeciso = async (studentId: string, isIndeciso: boolean) => {
    await updateContinuityIndeciso(studentId, isIndeciso);
    setLocalStatuses(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || { comments: [] }), isIndeciso } }));
  };

  const handleUpdateWorkshopAttended = async (studentId: string, attended: boolean) => {
    await updateContinuityWorkshopAttended(studentId, attended);
    setLocalStatuses(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || { comments: [] }), workshopAttended: attended } }));
  };

  const handleUpdateTracking = async (studentId: string, info: ContinuityTrackingInfo) => {
    await updateContinuityTrackingInfo(studentId, info);
    setLocalStatuses(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || { comments: [] }), trackingInfo: info } }));
    toast({ title: "Seguimiento Guardado" });
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
          <h1 className="text-3xl font-bold mb-2">Estrategia de Continuidad</h1>
          <p className="text-muted-foreground mb-6">Carga la Base Maestra de Continuidad para visualizar las metas de inscripción.</p>
          <FileUpload onFileSelect={handleFileUpload} selectedFile={null} isLoading={isProcessing} label="Cargar Base Maestra (Continuidad)" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Continuidad Académica</h1>
          <p className="text-muted-foreground">Gestión de inscripciones y seguimiento vocacional avanzado.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-[180px] bg-primary text-white border-none font-bold rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ciclo" />
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

          <FileUpload onFileSelect={handleRiasecUpload} selectedFile={null} isLoading={isProcessingRiasec} variant="outline" label="Cargar RIASEC" icon={<FileJson className="h-4 w-4" />} />
          <FileUpload onFileSelect={handleSurveyUpload} selectedFile={null} isLoading={isProcessingSurvey} variant="secondary" label="Cargar Encuesta Reciente" icon={<MessageSquare className="h-4 w-4" />} />
          <FileUpload onFileSelect={handleVocationalUpload} selectedFile={null} isLoading={isProcessingVoc} variant="outline" label="Cargar Diagnóstico (Excel)" icon={<History className="h-4 w-4" />} />
          <FileUpload onFileSelect={handleFileUpload} selectedFile={null} isLoading={isProcessing} variant="default" label="Cargar Base Maestra" />
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-4">
        <KpiCard title="Universo" value={stats.total} icon={Users} onClick={() => handleKpiClick('all')} />
        <KpiCard title="Inscritos" value={stats.inscribed} icon={Target} color="green" onClick={() => handleKpiClick('inscribed')} />
        <KpiCard title="No Inscritos" value={stats.pending} icon={UserX} color="blue" onClick={() => handleKpiClick('pending')} />
        <KpiCard title="Pend. Encuesta" value={stats.surveyPendingCount} icon={ClipboardList} color="default" onClick={() => handleKpiClick('pending-survey')} />
        <KpiCard title="Falsa Inscrip." value={stats.fakeInscribedCount} icon={FileWarning} color="red" onClick={() => handleKpiClick('fake')} />
        <KpiCard title="Urgente SOS" value={stats.sosCount} icon={AlertTriangle} color="red" onClick={() => handleKpiClick('sos')} />
        <KpiCard title="Indecisos" value={stats.indecisosCount} icon={HelpCircle} color="purple" onClick={() => handleKpiClick('indeciso')} />
        <KpiCard title="Sin Carrera" value={stats.surveyCareerNo} icon={Sparkles} color="purple" onClick={() => handleKpiClick('career-no')} />
        <KpiCard title="Sin Uni" value={stats.surveyUniNo} icon={Landmark} color="purple" onClick={() => handleKpiClick('uni-no')} />
        <KpiCard title="Meta TM (No Insc.)" value={stats.metaTmCount} icon={CapIcon} color="blue" onClick={() => handleKpiClick('meta-tm')} />
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
              <CardHeader className="flex flex-row items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                <CardTitle>Decisión de Carrera vs Universidad</CardTitle>
                <CardDescription>Población No Inscrita</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex gap-4">
                <div className="flex-1 flex flex-col items-center">
                  <p className="text-[10px] font-black uppercase opacity-60 mb-2">Carrera</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie 
                        data={stats.careerDecisionData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        onClick={(data) => {
                          if (data.name === 'Indecisos') handleKpiClick('career-no');
                        }}
                        className="cursor-pointer"
                      >
                        {stats.careerDecisionData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#17594A' : '#F59E0B'} />)}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <p className="text-[10px] font-black uppercase opacity-60 mb-2">Universidad</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie 
                        data={stats.uniDecisionData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        onClick={(data) => {
                          if (data.name === 'Sin Decidir') handleKpiClick('uni-no');
                        }}
                        className="cursor-pointer"
                      >
                        {stats.uniDecisionData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#17594A' : '#EF4444'} />)}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Top Universidades Destino (No Inscritos)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.universityReport} layout="vertical" margin={{ left: 100, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} onClick={(data) => handleKpiClick(`uni:${data.name}`)} className="cursor-pointer">
                      <LabelList dataKey="value" position="right" className="fill-foreground font-black text-[10px]" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Top Carreras Elegidas (Decisión Única)</CardTitle>
                <CardDescription>Alumnos No Inscritos con "Sí" en elección de carrera.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {stats.careerSureReport.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.careerSureReport} margin={{ top: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} interval={0} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" fill="#17594A" radius={[4, 4, 0, 0]} onClick={(data) => handleKpiClick(`career:${data.name}`)} className="cursor-pointer">
                        <LabelList dataKey="value" position="top" className="fill-foreground font-black text-xs" />
                        {stats.careerSureReport.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No hay datos de decisiones únicas.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <ListOrdered className="h-5 w-5 text-orange-500" />
                <CardTitle>Top Carreras Contempladas (Indecisos)</CardTitle>
                <CardDescription>Alumnos No Inscritos con "No" en elección de carrera.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.careerUnsureReport} margin={{ top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} onClick={(data) => handleKpiClick(`career:${data.name}`)} className="cursor-pointer">
                      <LabelList dataKey="value" position="top" className="fill-foreground font-black text-xs" />
                      {stats.careerUnsureReport.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Avance por Asesor</CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Distribución por Estatus Oficial</CardTitle></CardHeader>
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
                <X className="mr-2 h-4 w-4" /> Limpiar: {selectedKpi.includes(':') ? selectedKpi.split(':')[1] : selectedKpi}
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
        <Button variant="outline" className="gap-2 font-bold border-primary text-primary hover:bg-primary/5 rounded-xl">
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
  const survey = localStatus?.encuestaEleccionReciente;
  const hasDecided = (survey?.yaEligioCarrera || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si');
  
  const isSOS = !student.isInscribed && vocational && vocational.urgencyLevel >= 8;
  const isIndeciso = !student.isInscribed && (localStatus?.isIndeciso || !hasDecided);
  const hasFalseInscribedAlert = localStatus?.alertaFalsaInscripcion;
  
  const universityRankingArray = useMemo(() => vocational?.universityRanking ? vocational.universityRanking.split(/[;,]/).filter(Boolean).map(u => u.trim()) : [], [vocational]);
  const tecmilenioRank = useMemo(() => {
    const idx = universityRankingArray.findIndex(u => u.toUpperCase().includes('TECMILENIO'));
    return idx !== -1 ? idx + 1 : null;
  }, [universityRankingArray]);

  const [commentText, setCommentText] = useState('');
  const { leaders, tutors } = useDashboardFilters();
  const [author, setAuthor] = useState('');
  const signatoryOptions = useMemo(() => [...new Set([...leaders, ...tutors])].sort(), [leaders, tutors]);

  return (
    <TooltipProvider>
    <Card className={cn("transition-all border-l-4", student.isInscribed ? "border-l-green-500" : "border-l-muted", (isHighValueRisk || isSOS || hasFalseInscribedAlert) && "ring-2 ring-red-500/50", isIndeciso && "border-l-purple-500 bg-purple-50/5")}>
      <div className="p-4 flex flex-col cursor-pointer hover:bg-muted/5" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm", student.isInscribed ? "bg-green-600" : "bg-muted-foreground/40")}>
              {student.isInscribed ? <CapIcon className="h-5 w-5" /> : student.id.substring(0, 2)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold flex items-center gap-2 flex-wrap text-sm sm:text-base">
                  {student.name}
                  {hasFalseInscribedAlert && (
                    <TooltipUI>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> FALSA INSCRIPCIÓN
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs font-bold">Diferencia entre encuesta y base operativa.</TooltipContent>
                    </TooltipUI>
                  )}
                  {isSOS && <Badge variant="destructive" className="animate-pulse flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> URGENTE SOS</Badge>}
                  {isHighValueRisk && <Badge variant="destructive">Alerta Fuga</Badge>}
                  {student.isInscribed && <Badge className="bg-green-100 text-green-800 border-green-200">Inscrito</Badge>}
                  {isIndeciso && <Badge className="bg-purple-100 text-purple-800 border-purple-200"><HelpCircle className="h-3 w-3 mr-1" />Indeciso</Badge>}
                  {!student.isInscribed && tecmilenioRank !== null && (
                    <Badge variant={tecmilenioRank === 1 ? 'default' : 'outline'} className={cn(tecmilenioRank === 1 ? "bg-primary" : "text-orange-600 border-orange-200 bg-orange-50")}>
                      {tecmilenioRank === 1 ? <Trophy className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                      Opción {tecmilenioRank}
                    </Badge>
                  )}
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
                <span className="flex items-center gap-1 font-mono font-bold text-foreground"><Group className="h-3 w-3 text-muted-foreground" /> {student.group || 'Sin Grupo'}</span>
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
      </div>
      {isExpanded && (
        <CardContent className="border-t bg-muted/5 pt-6 space-y-6 animate-in slide-in-from-top-2">
          {survey && (
            <div className="space-y-3">
              <Label className="text-xs uppercase font-black text-emerald-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Último Estatus Declarado (Encuesta Reciente)
              </Label>
              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-emerald-600/60 tracking-widest">
                    {hasDecided ? 'Carrera Elegida' : 'Carreras Contempladas'}
                  </p>
                  <p className="text-sm font-bold text-emerald-900">{survey.carreraElegida || 'Sin especificar'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-emerald-600/60 tracking-widest">
                    {survey.yaEligioUniversidad === 'Sí' ? 'Universidad Elegida' : 'Universidades Contempladas'}
                  </p>
                  <p className="text-sm font-bold text-emerald-900">{survey.universidadElegida || 'Sin especificar'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-emerald-600/60 tracking-widest">Etapa del Proceso</p>
                  <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-700 font-bold uppercase text-[9px]">{survey.etapaProceso}</Badge>
                </div>
                {survey.fechaEntregaResultados && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-emerald-600/60 tracking-widest">Fecha Resultados</p>
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                      <CalendarIcon className="h-3 w-3" /> {survey.fechaEntregaResultados}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="pt-6 border-t space-y-4">
            <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2"><History className="h-4 w-4" /> Bitácora de Seguimiento Sentinel</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-3">{localStatus?.comments?.length ? [...localStatus.comments].reverse().map(c => <div key={c.id} className="bg-background p-3 rounded-lg border shadow-sm text-xs"><div className="flex justify-between items-center mb-1"><span className="font-bold text-primary">{c.author}</span><span className="text-[10px] text-muted-foreground">{format(c.createdAt.toDate(), 'dd MMM, HH:mm', { locale: es })}</span></div><p className="whitespace-pre-wrap">{c.text}</p></div>) : <p className="text-xs text-muted-foreground italic text-center py-10">Sin comentarios.</p>}</div>
              </ScrollArea>
              <div className="space-y-3 bg-background p-4 rounded-xl border">
                <Select value={author} onValueChange={setAuthor}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="¿Quién firma?" /></SelectTrigger><SelectContent>{signatoryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select>
                <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Detalles de la interacción..." className="min-h-[100px] text-sm resize-none" />
                <div className="flex justify-end"><Button size="sm" onClick={() => { if (!author || !commentText.trim()) return; onAddComment(student.id, commentText, author); setCommentText(''); }} disabled={!commentText.trim() || !author}><Send className="h-4 w-4 mr-2" /> Guardar Nota</Button></div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
    </TooltipProvider>
  );
}

function KpiCard({ title, value, icon: Icon, color, onClick }: { title: string, value: number | string, icon: any, color?: string, onClick?: () => void }) {
  const colors = { red: "text-red-600 bg-red-50 border-red-100", blue: "text-blue-600 bg-blue-50 border-blue-100", green: "text-green-600 bg-green-50 border-green-100", purple: "text-purple-600 bg-purple-50 border-purple-200", default: "text-primary bg-primary/5 border-primary/10" };
  const colorClass = color ? (colors[color as keyof typeof colors] || colors.default) : colors.default;
  return (
    <Card className={cn("shadow-sm transition-all rounded-2xl", onClick && "cursor-pointer hover:shadow-md hover:scale-105 active:scale-95")} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-xl", colorClass)}><Icon className="h-4 w-4" /></div>
      </CardHeader>
      <CardContent><div className="text-2xl font-black">{value}</div></CardContent>
    </Card>
  );
}
