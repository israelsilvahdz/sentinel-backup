
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
  UserX, Loader2, Trash2, Globe, Save, ArrowUpRight, Group, FileWarning, PieChart, ClipboardList, Printer, FileText,
  Building2, GraduationCap, MapPin, Star
} from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart as RePieChart, Pie, LabelList } from 'recharts';
import { useDashboardFilters } from './DashboardClient';
import { getAllContinuityStatuses, updateContinuityIndeciso, updateContinuityWorkshopAttended, addContinuityComment, bulkUpdateContinuityVocational, bulkUpdateRiasecDiagnoses, updateContinuityTrackingInfo, getCareerCatalog, updateCareerCatalog, bulkUpdateCareerSurvey, getContinuityLocalStatus } from '@/lib/firebase-services';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Textarea } from '../ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TooltipProvider, Tooltip as TooltipUI, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const COLORS = ['#17594A', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#10B981', '#6366F1', '#EC4899'];

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
        toast({ title: "Encuesta Reciente Guardada", description: `Se actualizaron ${Object.keys(surveys).length} respuestas.` });
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
        const yaEligioNormalizado = (survey?.yaEligioCarrera || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const yaEligioUniNormalizado = (survey?.yaEligioUniversidad || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        if (selectedKpi !== 'inscribed' && s.isInscribed) return false;

        switch(selectedKpi) {
          case 'inscribed': return s.isInscribed;
          case 'pending': return !s.isInscribed;
          case 'pending-survey': return !local?.encuestaEleccionReciente;
          case 'indeciso': 
          case 'career-no': return yaEligioNormalizado.includes('no');
          case 'career-yes': return yaEligioNormalizado.includes('si');
          case 'uni-no': return yaEligioUniNormalizado.includes('no');
          case 'uni-yes': return yaEligioUniNormalizado.includes('si');
          case 'sos': return local?.vocationalDiagnosis && local.vocationalDiagnosis.urgencyLevel >= 8;
          case 'meta-tm': return (survey?.universidadElegida || '').toLowerCase().includes('tecmilenio');
          case 'risk': return s.average >= 90 && s.status.toLowerCase().includes('descartado');
          case 'fake': return local?.alertaFalsaInscripcion;
          default: 
            if (selectedKpi.startsWith('career-sure:')) {
              const careerName = selectedKpi.replace('career-sure:', '');
              const hasDecided = yaEligioNormalizado.includes('si');
              return hasDecided && (survey?.carreraElegida === careerName || survey?.carreraElegida?.split(';').map(c => c.trim()).includes(careerName));
            }
            if (selectedKpi.startsWith('career-unsure:')) {
              const careerName = selectedKpi.replace('career-unsure:', '');
              const hasDecided = yaEligioNormalizado.includes('si');
              return !hasDecided && (survey?.carreraElegida === careerName || survey?.carreraElegida?.split(';').map(c => c.trim()).includes(careerName));
            }
            if (selectedKpi.startsWith('uni:')) {
              const uniName = selectedKpi.replace('uni:', '');
              return survey?.universidadElegida === uniName || survey?.universidadElegida?.split(';').map(u => u.trim()).includes(uniName);
            }
            return false;
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

      if (!s.isInscribed && !survey) surveyPendingCount++;
      if (!s.isInscribed && local?.alertaFalsaInscripcion) fakeInscribedCount++;
      
      if (!s.isInscribed && survey) {
        const hasDecided = (survey.yaEligioCarrera || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si');
        const hasDecidedUni = (survey.yaEligioUniversidad || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si');

        if (!hasDecided) indecisosCount++;
        if (!hasDecided) surveyCareerNo++;
        if (!hasDecidedUni) surveyUniNo++;

        if (survey.universidadElegida?.toLowerCase().includes('tecmilenio')) {
          metaTmCount++;
        }

        if (survey.carreraElegida && hasDecided) {
          const options = survey.carreraElegida.split(';').map(o => o.trim()).filter(Boolean);
          options.forEach(o => {
            careersSureCounts[o] = (careersSureCounts[o] || 0) + 1;
          });
        } 
        
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

    const respondersList = baseList.filter(s => !s.isInscribed && localStatuses[s.id]?.encuestaEleccionReciente);
    const surveyRespondersCount = respondersList.length || 1;
    
    const careerDecisionData = [
      { name: 'Decididos', value: surveyRespondersCount - surveyCareerNo },
      { name: 'Indecisos', value: surveyCareerNo }
    ];

    const uniDecisionData = [
      { name: 'Decididos', value: surveyRespondersCount - surveyUniNo },
      { name: 'Sin Decidir', value: surveyUniNo }
    ];

    return { 
      total, inscribed, pending, talentRisk, statusDistribution, advisorProgress, 
      indecisosCount, sosCount, metaTmCount, fakeInscribedCount,
      surveyCareerNo, surveyUniNo, careerSureReport, careerUnsureReport, universityReport,
      careerDecisionData, uniDecisionData, surveyPendingCount, surveyRespondersCount
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

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const kpiItems = [
      { label: 'Universo', value: stats.total, color: '#64748b' },
      { label: 'Inscritos', value: stats.inscribed, color: '#10b981' },
      { label: 'No Inscritos', value: stats.pending, color: '#3b82f6' },
      { label: 'Urgente SOS', value: stats.sosCount, color: '#ef4444' },
      { label: 'Meta TM', value: stats.metaTmCount, color: '#17594A' },
      { label: 'Falsa Insc.', value: stats.fakeInscribedCount, color: '#f43f5e' },
    ];

    const kpisHtml = kpiItems.map(k => `
      <div class="kpi-card" style="border-left: 4px solid ${k.color}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value" style="color: ${k.color}">${k.value}</div>
      </div>
    `).join('');

    const careerDecPct = Math.round((stats.careerDecisionData[0].value / stats.surveyRespondersCount) * 100);
    const uniDecPct = Math.round((stats.uniDecisionData[0].value / stats.surveyRespondersCount) * 100);

    const generateBarRows = (data: {name: string, value: number}[], max: number, color: string, isVertical = false) => {
      if (data.length === 0) return '<p class="empty-msg">No hay datos suficientes.</p>';
      
      if (isVertical) {
        return `
          <div class="vertical-bars-container">
            ${data.map((item, i) => `
              <div class="v-bar-wrapper">
                <div class="v-bar-value">${item.value}</div>
                <div class="v-bar" style="height: ${(item.value / max) * 100}%; background-color: ${COLORS[i % COLORS.length]};"></div>
                <div class="v-bar-label">${item.name}</div>
              </div>
            `).join('')}
          </div>
        `;
      }

      return data.map(item => `
        <div class="h-bar-row">
          <div class="h-bar-label">${item.name}</div>
          <div class="h-bar-container">
            <div class="h-bar" style="width: ${(item.value / max) * 100}%; background-color: ${color};"></div>
            <span class="h-bar-value">${item.value}</span>
          </div>
        </div>
      `).join('');
    };

    const maxUni = Math.max(...stats.universityReport.map(u => u.value), 1);
    const maxCareerSure = Math.max(...stats.careerSureReport.map(c => c.value), 1);
    const maxCareerUnsure = Math.max(...stats.careerUnsureReport.map(c => c.value), 1);

    printWindow.document.write(`
      <html>
        <head>
          <title>Análisis Estratégico Continuidad - ${selectedCycle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            body { 
              font-family: 'Inter', -apple-system, sans-serif; 
              color: #1e293b; 
              padding: 40px; 
              background-color: #fff;
              line-height: 1.4;
            }
            .no-print-btn {
              position: fixed; top: 20px; right: 20px;
              padding: 12px 24px; background: #17594A; color: white;
              border: none; border-radius: 12px; cursor: pointer; font-weight: 800;
              z-index: 100; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
              text-transform: uppercase; letter-spacing: 0.05em;
            }
            .header { 
              display: flex; justify-content: space-between; align-items: center; 
              border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; margin-bottom: 40px; 
            }
            .header-info h1 { margin: 0; color: #17594A; font-size: 32px; font-weight: 900; letter-spacing: -0.04em; }
            .header-info p { margin: 4px 0 0; color: #64748b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
            
            .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 40px; }
            .kpi-card { background: #f8fafc; padding: 20px 10px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; }
            .kpi-label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; margin-bottom: 8px; }
            .kpi-value { font-size: 28px; font-weight: 900; }

            .analitica-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 24px; 
              margin-bottom: 40px;
            }
            .chart-card { 
              background: #fff; border: 1px solid #f1f5f9; border-radius: 24px; padding: 24px; 
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }
            .chart-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #f8fafc; padding-bottom: 12px; }
            .chart-title { font-size: 13px; font-weight: 900; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; }
            .chart-subtitle { font-size: 10px; font-weight: 600; color: #94a3b8; }

            /* Donut Styles */
            .donuts-container { display: flex; justify-content: space-around; align-items: center; height: 180px; }
            .donut-item { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 50%; }
            .donut-label { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; }
            .donut-graphic { 
              position: relative; width: 100px; height: 100px; border-radius: 50%; 
              display: flex; align-items: center; justify-content: center;
            }
            .donut-inner { width: 70px; height: 70px; background: #fff; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
            .donut-pct { font-size: 18px; font-weight: 900; color: #17594A; }
            .donut-val { font-size: 9px; font-weight: 700; color: #94a3b8; }

            /* Horizontal Bars */
            .h-bar-row { margin-bottom: 10px; }
            .h-bar-label { font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 4px; }
            .h-bar-container { display: flex; align-items: center; gap: 12px; }
            .h-bar { height: 14px; border-radius: 7px; min-width: 2px; }
            .h-bar-value { font-size: 10px; font-weight: 900; color: #64748b; }

            /* Vertical Bars */
            .vertical-bars-container { display: flex; align-items: flex-end; justify-content: space-between; height: 180px; padding-top: 20px; }
            .v-bar-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; gap: 8px; }
            .v-bar { width: 12px; border-radius: 6px 6px 0 0; min-height: 2px; }
            .v-bar-value { font-size: 9px; font-weight: 900; color: #1e293b; }
            .v-bar-label { font-size: 8px; font-weight: 700; color: #94a3b8; transform: rotate(-45deg); text-align: right; width: 40px; white-space: nowrap; margin-top: 10px; }

            .data-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 40px; border: 1px solid #f1f5f9; border-radius: 20px; overflow: hidden; page-break-before: always; }
            .data-table th { background: #f8fafc; color: #475569; font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 16px; text-align: left; }
            .data-table td { padding: 14px 16px; font-size: 11px; border-bottom: 1px solid #f8fafc; color: #334155; }
            .badge { padding: 4px 10px; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; display: inline-block; background: #f1f5f9; color: #475569; }
            .badge-primary { background: #17594A15; color: #17594A; }
            .badge-risk { background: #ef4444; color: #fff; }

            .footer { margin-top: 60px; padding-top: 30px; border-top: 2px solid #f1f5f9; font-size: 10px; text-align: center; color: #cbd5e1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
            .empty-msg { font-size: 11px; color: #94a3b8; font-style: italic; text-align: center; padding: 40px 0; }

            @media print {
              .no-print-btn { display: none; }
              body { padding: 0; }
              .chart-card { break-inside: avoid; }
              .data-table { break-inside: auto; }
              .data-table tr { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <button class="no-print-btn" onclick="window.print()">Descargar PDF</button>
          
          <div class="header">
            <div class="header-info">
              <h1>Resumen Analítico de Continuidad</h1>
              <p>Ciclo Académico: ${selectedCycle} • Generado el ${format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</p>
            </div>
            <img src="https://edukapp.com.mx/Vistas/img/ImgLogo/tecmilenio_Logo.png" height="40" />
          </div>

          <div class="kpi-grid">${kpisHtml}</div>

          <div class="analitica-grid">
            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">Decisión de Carrera vs Universidad</div>
              </div>
              <div class="chart-subtitle" style="margin-bottom: 20px;">Población No Inscrita (${stats.surveyRespondersCount} encuestados)</div>
              <div class="donuts-container">
                <div class="donut-item">
                  <div class="donut-label">Carrera</div>
                  <div class="donut-graphic" style="background: conic-gradient(#17594A ${careerDecPct}%, #f59e0b 0);">
                    <div class="donut-inner">
                      <div class="donut-pct">${careerDecPct}%</div>
                      <div class="donut-val">${stats.surveyRespondersCount - stats.surveyCareerNo} alumnos</div>
                    </div>
                  </div>
                </div>
                <div class="donut-item">
                  <div class="donut-label">Universidad</div>
                  <div class="donut-graphic" style="background: conic-gradient(#17594A ${uniDecPct}%, #ef4444 0);">
                    <div class="donut-inner">
                      <div class="donut-pct">${uniDecPct}%</div>
                      <div class="donut-val">${stats.surveyRespondersCount - stats.surveyUniNo} alumnos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">Top Universidades Destino (No Inscritos)</div>
              </div>
              <div style="margin-top: 10px;">
                ${generateBarRows(stats.universityReport, maxUni, '#3b82f6')}
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">Top Carreras Elegidas (Decisión Única)</div>
              </div>
              <div class="chart-subtitle">Alumnos con "Sí" en elección de carrera.</div>
              ${generateBarRows(stats.careerSureReport, maxCareerSure, '', true)}
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">Top Carreras Contempladas (Indecisos)</div>
              </div>
              <div class="chart-subtitle">Alumnos con "No" en elección de carrera.</div>
              ${generateBarRows(stats.careerUnsureReport, maxCareerUnsure, '', true)}
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre del Prospecto</th>
                <th>Carrera Declarada</th>
                <th>Universidad Destino</th>
                <th>Etapa</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents.map(s => {
                const survey = localStatuses[s.id]?.encuestaEleccionReciente;
                const isSOS = !s.isInscribed && (localStatuses[s.id]?.vocationalDiagnosis?.urgencyLevel || 0) >= 8;
                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #64748b;">${s.id}</td>
                    <td style="font-weight: 800;">
                      ${s.name}
                      ${isSOS ? '<span class="badge badge-risk" style="margin-left: 8px;">SOS</span>' : ''}
                    </td>
                    <td><span class="badge badge-primary">${survey?.carreraElegida || 'N/D'}</span></td>
                    <td style="font-weight: 700;">${survey?.universidadElegida || 'N/D'}</td>
                    <td style="font-weight: 600; color: #64748b;">${survey?.etapaProceso || 'N/D'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            Sentinel Academic Intelligence • Estrategia de Retención y Cierre • Universidad Tecmilenio
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  const kpiLabels: Record<string, string> = {
    'all': 'Todos los Alumnos',
    'inscribed': 'Inscritos Oficiales',
    'pending': 'Prospectos No Inscritos',
    'pending-survey': 'Pendientes de Encuesta',
    'fake': 'Falsa Inscripción Detectada',
    'sos': 'Casos Urgentes SOS',
    'indeciso': 'Alumnos Indecisos',
    'career-no': 'Indecisos de Carrera',
    'career-yes': 'Decididos de Carrera',
    'uni-no': 'Sin Universidad Definida',
    'uni-yes': 'Con Universidad Definida',
    'meta-tm': 'Meta Tecmilenio (No Inscritos)',
    'risk': 'Alumnos con Riesgo de Fuga'
  };

  const getKpiTitle = () => {
    if (!selectedKpi) return null;
    if (selectedKpi.includes(':')) {
      const [type, value] = selectedKpi.split(':');
      return { 
        type: type === 'uni' ? 'Universidad Destino' : (type.includes('sure') ? 'Decisión Única' : 'Contemplada'),
        value 
      };
    }
    return { type: 'Filtro Activo', value: kpiLabels[selectedKpi] || selectedKpi };
  };

  const activeKpi = getKpiTitle();

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Continuidad Académica</h1>
          <p className="text-muted-foreground">Gestión de inscripciones y seguimiento vocacional avanzado.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-[180px] bg-primary text-white border-none font-bold rounded-xl shadow-lg">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Ciclos</SelectItem>
              <SelectItem value="Enero 26">Enero 26</SelectItem>
              <SelectItem value="Agosto 26">Agosto 26</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" className="gap-2 font-bold border-primary text-primary hover:bg-primary/5 rounded-xl shadow-sm" onClick={handlePrintReport}>
            <FileText className="h-4 w-4" /> Generar Reporte PDF
          </Button>

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
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-12 p-1 bg-white/50 backdrop-blur-sm border rounded-2xl shadow-sm mb-8">
          <TabsTrigger value="stats" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all"><BarChart3 className="mr-2 h-4 w-4" /> Analíticos</TabsTrigger>
          <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all"><Filter className="mr-2 h-4 w-4" /> Base Operativa</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-2 border-b border-muted/50 pb-4">
                <PieChart className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <CardTitle className="text-base font-black">Decisión de Carrera vs Universidad</CardTitle>
                  <CardDescription className="text-[10px] uppercase tracking-widest font-bold opacity-60">Población No Inscrita (${stats.surveyRespondersCount} encuestados)</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-[300px] flex gap-4 pt-6">
                <div className="flex-1 flex flex-col items-center">
                  <p className="text-[9px] font-black uppercase opacity-40 mb-2 tracking-tighter">Carrera</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie 
                        data={stats.careerDecisionData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                        label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                        onClick={(data) => {
                          if (data.name === 'Indecisos') handleKpiClick('career-no');
                          else handleKpiClick('career-yes');
                        }}
                        className="cursor-pointer"
                      >
                        {stats.careerDecisionData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#17594A' : '#F59E0B'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <p className="text-[9px] font-black uppercase opacity-40 mb-2 tracking-tighter">Universidad</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie 
                        data={stats.uniDecisionData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                        label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                        onClick={(data) => {
                          if (data.name === 'Sin Decidir') handleKpiClick('uni-no');
                          else handleKpiClick('uni-yes');
                        }}
                        className="cursor-pointer"
                      >
                        {stats.uniDecisionData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#17594A' : '#EF4444'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-2 border-b border-muted/50 pb-4">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black">Top Universidades Destino (No Inscritos)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.universityReport} layout="vertical" margin={{ left: 100, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                    <Bar dataKey="value" fill="#3B82F6" radius={[0, 10, 10, 0]} onClick={(data) => handleKpiClick(`uni:${data.name}`)} className="cursor-pointer" barSize={16}>
                      <LabelList dataKey="value" position="right" className="fill-foreground font-black text-[10px]" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-2 border-b border-muted/50 pb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <CardTitle className="text-base font-black">Top Carreras Elegidas (Decisión Única)</CardTitle>
                  <CardDescription className="text-[10px] uppercase tracking-widest font-bold opacity-60">Alumnos No Inscritos con "Sí" en elección de carrera.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-[350px] pt-6">
                {stats.careerSureReport.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.careerSureReport} margin={{ top: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} angle={-45} textAnchor="end" height={80} interval={0} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                      <Bar dataKey="value" fill="#17594A" radius={[10, 10, 0, 0]} onClick={(data) => handleKpiClick(`career-sure:${data.name}`)} className="cursor-pointer" barSize={30}>
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

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-2 border-b border-muted/50 pb-4">
                <ListOrdered className="h-5 w-5 text-orange-500" />
                <div className="flex flex-col">
                  <CardTitle className="text-base font-black">Top Carreras Contempladas (Indecisos)</CardTitle>
                  <CardDescription className="text-[10px] uppercase tracking-widest font-bold opacity-60">Alumnos No Inscritos con "No" en elección de carrera.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-[350px] pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.careerUnsureReport} margin={{ top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} angle={-45} textAnchor="end" height={80} interval={0} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                    <Bar dataKey="value" fill="#F59E0B" radius={[10, 10, 0, 0]} onClick={(data) => handleKpiClick(`career-unsure:${data.name}`)} className="cursor-pointer" barSize={30}>
                      <LabelList dataKey="value" position="top" className="fill-foreground font-black text-xs" />
                      {stats.careerUnsureReport.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
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
          </div>

          {activeKpi && (
            <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-3xl border border-primary/10 shadow-inner flex flex-col sm:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <Star className="h-6 w-6 text-primary fill-primary/20" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">{activeKpi.type}</p>
                  <h2 className="text-2xl font-black text-primary tracking-tight">{activeKpi.value}</h2>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-white/50 border-primary/20 text-primary font-black px-4 py-1.5 rounded-full shadow-sm">
                  {filteredStudents.length} Alumnos Encontrados
                </Badge>
                <Button variant="ghost" onClick={() => setSelectedKpi(null)} className="h-10 text-destructive hover:bg-destructive/5 font-bold gap-2">
                  <X className="h-4 w-4" /> Limpiar Filtro Analítico
                </Button>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] pointer-events-none">
                <TrendingUp className="h-40 w-40" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredStudents.length > 0 ? filteredStudents.map(student => (
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
            )) : (
              <div className="py-20 text-center bg-white/30 rounded-3xl border-2 border-dashed border-muted">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No se encontraron prospectos para esta búsqueda o segmento.</p>
              </div>
            )}
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
        <Button variant="outline" className="gap-2 font-bold border-primary text-primary hover:bg-primary/5 rounded-xl shadow-sm">
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
  const vocational = localStatus?.vocationalDiagnosis;
  const survey = localStatus?.encuestaEleccionReciente;
  const hasDecided = (survey?.yaEligioCarrera || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('si');
  
  const isHighValueRisk = !student.isInscribed && student.average >= 90 && student.status.toLowerCase().includes('descartado');
  const isSOS = !student.isInscribed && vocational && vocational.urgencyLevel >= 8;
  const isIndeciso = !student.isInscribed && !hasDecided;
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
    <Card className={cn(
      "transition-all duration-300 border-l-4 shadow-sm hover:shadow-xl rounded-2xl overflow-hidden", 
      student.isInscribed ? "border-l-green-500 bg-green-50/5" : "border-l-muted", 
      (isHighValueRisk || isSOS || hasFalseInscribedAlert) && "ring-2 ring-red-500/50", 
      isIndeciso && "border-l-purple-500 bg-purple-50/5",
      isExpanded && "shadow-2xl ring-1 ring-primary/5"
    )}>
      <div className="p-5 flex flex-col cursor-pointer group/card" onClick={onToggle}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-1 overflow-hidden">
            <div className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white shadow-inner shrink-0 transition-transform duration-500 group-hover/card:scale-110", 
              student.isInscribed ? "bg-green-600" : "bg-muted-foreground/20"
            )}>
              {student.isInscribed ? <CapIcon className="h-6 w-6" /> : student.id.substring(0, 2)}
            </div>
            <div className="space-y-1 overflow-hidden">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-black text-base tracking-tight truncate group-hover/card:text-primary transition-colors">
                  {student.name}
                </h3>
                {survey?.universidadElegida && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 gap-1.5 h-6 font-black uppercase text-[10px] tracking-tighter">
                    <Building2 className="h-3 w-3" /> {survey.universidadElegida}
                  </Badge>
                )}
                {hasFalseInscribedAlert && (
                  <Badge variant="destructive" className="animate-pulse gap-1.5 h-6 font-black uppercase text-[10px] tracking-tighter">
                    <AlertTriangle className="h-3 w-3" /> FALSA INSCRIPCIÓN
                  </Badge>
                )}
                {isSOS && <Badge variant="destructive" className="animate-pulse gap-1.5 h-6 font-black uppercase text-[10px] tracking-tighter"><AlertTriangle className="h-3 w-3" /> SOS</Badge>}
                {student.isInscribed && <Badge className="bg-green-600 text-white font-black h-6 uppercase text-[10px] tracking-tighter shadow-sm">Inscrito</Badge>}
                {isIndeciso && <Badge className="bg-purple-100 text-purple-800 border-purple-200 gap-1.5 h-6 font-black uppercase text-[10px] tracking-tighter"><HelpCircle className="h-3 w-3" />Indeciso</Badge>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs text-muted-foreground font-bold">
                <span className="flex items-center gap-1.5 text-primary"><Users className="h-3.5 w-3.5" /> {student.advisor}</span>
                <span className="flex items-center gap-1.5"><Group className="h-3.5 w-3.5 text-muted-foreground/60" /> {student.group || 'Sin Grupo'}</span>
                {survey?.carreraElegida && (
                  <span className="flex items-center gap-1.5 text-foreground/80 bg-muted px-2 py-0.5 rounded-lg"><GraduationCap className="h-3.5 w-3.5" /> {survey.carreraElegida}</span>
                )}
                <span className="font-mono text-muted-foreground/60">{student.id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden lg:flex flex-col items-end mr-4">
              <span className="text-[9px] font-black uppercase opacity-40 leading-none mb-1">Promedio</span>
              <span className="text-xl font-black text-primary leading-none tabular-nums">{student.average}</span>
            </div>
            <TooltipUI>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all" onClick={(e) => { e.stopPropagation(); onJumpToStudent(); }}>
                  <ArrowUpRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-bold">Ver Expediente Completo</TooltipContent>
            </TooltipUI>
            <div className={cn(
              "p-2 rounded-xl transition-all duration-300",
              isExpanded ? "bg-primary/10 text-primary rotate-180" : "bg-muted text-muted-foreground"
            )}>
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
      {isExpanded && (
        <CardContent className="border-t bg-muted/5 pt-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
          {survey && (
            <div className="space-y-4">
              <Label className="text-[10px] uppercase font-black text-emerald-700 flex items-center gap-2 opacity-70 tracking-widest">
                <MessageSquare className="h-4 w-4" /> Último Estatus Declarado (Encuesta Reciente)
              </Label>
              <div className="bg-white border border-emerald-100 p-6 rounded-3xl shadow-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">
                    {hasDecided ? 'Decisión Única' : 'Carreras Contempladas'}
                  </p>
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0"><GraduationCap className="h-4 w-4 text-emerald-600" /></div>
                    <p className="text-sm font-black text-emerald-950 leading-tight">{survey.carreraElegida || 'Sin especificar'}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">
                    {survey.yaEligioUniversidad === 'Sí' ? 'Universidad Destino' : 'Universidades en Mira'}
                  </p>
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg shrink-0"><Building2 className="h-4 w-4 text-blue-600" /></div>
                    <p className="text-sm font-black text-blue-950 leading-tight">{survey.universidadElegida || 'Sin especificar'}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Etapa de Admisión</p>
                  <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-black uppercase text-[10px] h-7 px-4 rounded-xl shadow-sm">{survey.etapaProceso}</Badge>
                </div>
                {survey.fechaEntregaResultados && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Fecha de Resultados</p>
                    <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                      <div className="p-1.5 bg-emerald-50 rounded-lg"><CalendarIcon className="h-4 w-4 text-emerald-600" /></div>
                      {survey.fechaEntregaResultados}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="pt-8 border-t space-y-4">
            <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-2 opacity-70 tracking-widest">
              <History className="h-4 w-4" /> Bitácora Estratégica de Seguimiento
            </Label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-4">
                  {localStatus?.comments?.length ? [...localStatus.comments].reverse().map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-2xl border border-muted shadow-sm space-y-2 relative group/comment">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary uppercase">
                            {c.author.substring(0, 1)}
                          </div>
                          <span className="font-black text-xs text-primary">{c.author}</span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-50">{format(c.toDate ? c.toDate() : c.createdAt.toDate(), 'dd MMM, HH:mm', { locale: es })}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground/80 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                    </div>
                  )) : (
                    <div className="py-12 text-center bg-white/50 rounded-2xl border border-dashed">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-40">Sin notas registradas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="space-y-4 bg-white p-6 rounded-3xl border shadow-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <Select value={author} onValueChange={setAuthor}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-muted/30 border-none shadow-inner"><SelectValue placeholder="¿Quién realiza el seguimiento?" /></SelectTrigger>
                    <SelectContent className="rounded-xl">{signatoryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                  <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Registra acuerdos, miedos del alumno o próximos pasos..." className="min-h-[120px] text-sm rounded-2xl resize-none border-muted focus:ring-primary/20" />
                </div>
                <div className="flex justify-end pt-2">
                  <Button className="rounded-xl font-black h-11 px-8 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" onClick={() => { if (!author || !commentText.trim()) return; onAddComment(student.id, commentText, author); setCommentText(''); }} disabled={!commentText.trim() || !author}>
                    <Send className="h-4 w-4 mr-2" /> Guardar Nota Estratégica
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

function KpiCard({ title, value, icon: Icon, color, onClick }: { title: string, value: number | string, icon: any, color?: string, onClick?: () => void }) {
  const themes = {
    red: "from-red-50 to-white border-red-100 text-red-600 shadow-red-500/5",
    blue: "from-blue-50 to-white border-blue-100 text-blue-600 shadow-blue-500/5",
    green: "from-emerald-50 to-white border-emerald-100 text-emerald-600 shadow-emerald-500/5",
    purple: "from-purple-50 to-white border-purple-100 text-purple-600 shadow-purple-500/5",
    default: "from-slate-50 to-white border-slate-100 text-slate-600 shadow-slate-500/5",
  };

  const iconBg = {
    red: "bg-red-500/10 text-red-600",
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-emerald-500/10 text-emerald-600",
    purple: "bg-purple-500/10 text-purple-600",
    default: "bg-slate-500/10 text-slate-600",
  }

  const themeClass = color ? (themes[color as keyof typeof themes] || themes.default) : themes.default;
  const iconClass = color ? (iconBg[color as keyof typeof iconBg] || iconBg.default) : iconBg.default;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden group transition-all duration-500 border border-transparent bg-gradient-to-br shadow-sm rounded-2xl",
        themeClass,
        onClick && "cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-95 hover:border-current/20"
      )}
      onClick={onClick}
    >
      <div className="absolute -right-2 -bottom-2 opacity-[0.04] transition-transform group-hover:scale-125 group-hover:rotate-12 duration-700 pointer-events-none">
        <Icon className="h-20 w-20" />
      </div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-4 relative z-10">
        <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] opacity-70 leading-none">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-xl transition-all duration-500 group-hover:scale-110 shadow-inner", iconClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 relative z-10">
        <div className="text-3xl font-black tracking-tighter tabular-nums mb-1">
          {value}
        </div>
        <div className="h-1 w-8 rounded-full bg-current/20 transition-all duration-500 group-hover:w-full" />
      </CardContent>
    </Card>
  );
}
