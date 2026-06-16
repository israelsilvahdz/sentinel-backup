
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardFilters } from './DashboardClient';
import { Loader2, BookText, ChevronRight, Users, GraduationCap, ArrowLeft, X, AlertTriangle, ClipboardCopy, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calculateSubjectPotential, isWithoutRight } from '@/lib/dataProcessor';
import type { Student, Subject, SubjectSummary, WeightingScheme } from '@/types/student';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ViewState = 'subjects' | 'groups' | 'students';

interface RiskCounts {
  sdCount: number;
  criticalCount: number; // Potential < 70
  warningCount: number;  // Potential 70-75
  safeCount: number;     // Potential > 75
}

interface GroupData extends RiskCounts {
  name: string;
  averagePotential: number | null;
  totalStudents: number;
  riskPercentage: number; // (SD + Critical) / Total
  students: Student[];
  isLoadingPotential: boolean;
}

interface SubjectTrackingData extends RiskCounts {
  name: string;
  averagePotential: number | null;
  totalStudents: number;
  riskPercentage: number;
  groups: GroupData[];
  isLoadingPotential: boolean;
}

// Componente visual para la barra de distribución de riesgo
function RiskDistributionBar({ data }: { data: RiskCounts & { totalStudents: number } }) {
    if (data.totalStudents === 0) return null;
    
    const sdPct = (data.sdCount / data.totalStudents) * 100;
    const critPct = (data.criticalCount / data.totalStudents) * 100;
    const warnPct = (data.warningCount / data.totalStudents) * 100;
    const safePct = (data.safeCount / data.totalStudents) * 100;

    return (
        <div className="flex flex-col gap-1.5 w-full mt-3">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/30">
                <div style={{ width: `${sdPct}%` }} className="bg-red-700" title={`SD: ${data.sdCount}`} />
                <div style={{ width: `${critPct}%` }} className="bg-orange-500" title={`Crítico (<70): ${data.criticalCount}`} />
                <div style={{ width: `${warnPct}%` }} className="bg-yellow-400" title={`Alerta (70-75): ${data.warningCount}`} />
                <div style={{ width: `${safePct}%` }} className="bg-emerald-500" title={`Estable (>75): ${data.safeCount}`} />
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter opacity-70">
                <span className="text-red-700">{data.sdCount + data.criticalCount} Críticos</span>
                <span className="text-yellow-600">{data.warningCount} Riesgo</span>
                <span className="text-emerald-600">{data.safeCount} Bien</span>
            </div>
        </div>
    )
}

// Nueva Tarjeta de Alumno Específica y Minimizada
function SubjectStudentItem({ student, subjectName, weightingSchemes, loadStudentSubjects }: { student: Student, subjectName: string, weightingSchemes: WeightingScheme[], loadStudentSubjects: (id: string) => Promise<Subject[]> }) {
    const [subject, setSubject] = useState<Subject | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStudentSubjects(student.id).then(subs => {
            setSubject(subs.find(s => s.name === subjectName) || null);
            setIsLoading(false);
        });
    }, [student.id, subjectName, loadStudentSubjects]);

    if (isLoading) {
        return (
            <Card className="p-4 flex items-center justify-center min-h-[100px] border-none shadow-sm">
                <Loader2 className="animate-spin h-5 w-5 text-primary/30" />
            </Card>
        );
    }

    if (!subject) return null;

    const pot = calculateSubjectPotential(subject, weightingSchemes);
    const isSD = isWithoutRight(subject);

    const riskClass = isSD ? "border-l-red-600 bg-red-50/50" :
                      pot < 70 ? "border-l-orange-500 bg-orange-50/50" :
                      pot <= 75 ? "border-l-yellow-400 bg-yellow-50/50" :
                      "border-l-emerald-500 bg-emerald-50/30";

    const textClass = isSD ? "text-red-700 bg-red-100" :
                      pot < 70 ? "text-orange-700 bg-orange-100" :
                      pot <= 75 ? "text-yellow-700 bg-yellow-100" :
                      "text-emerald-700 bg-emerald-100";

    return (
        <Card className={cn("p-4 border-l-4 border-y-0 border-r-0 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all rounded-xl", riskClass)}>
            <div>
                <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm leading-tight truncate" title={student.name}>{student.name}</p>
                    <Badge variant="secondary" className={cn("font-black text-xs px-2 shrink-0 border-none", textClass)}>
                        {isSD ? 'SD' : `${pot.toFixed(1)}%`}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground bg-white/50 px-1 rounded">{student.id}</span>
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60 truncate">L: {student.leader}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-semibold bg-white/60 p-2 rounded-lg">
                 <span className={cn("flex items-center gap-1", subject.absences > subject.absenceLimit ? "text-red-600" : "text-slate-600")}>
                     Faltas: <span className="font-black">{subject.absences}/{subject.absenceLimit}</span>
                 </span>
                 <span className={cn("flex items-center gap-1", subject.missedAssignments > subject.missedAssignmentLimit ? "text-red-600" : "text-slate-600")}>
                     NE: <span className="font-black">{subject.missedAssignments}/{subject.missedAssignmentLimit}</span>
                 </span>
            </div>
        </Card>
    );
}


export function SubjectTrackingPanel() {
  const { allStudents, allStudentsMap, leaders, weightingSchemes, isLoading, loadStudentSubjects, setFilterType, setSelectedValue, setGroupId } = useDashboardFilters();
  const [selectedLeader, setSelectedLeader] = useState<string | 'all'>('all');
  const [viewState, setViewState] = useState<ViewState>('subjects');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
  const [aggregatedSubjectData, setAggregatedSubjectData] = useState<SubjectTrackingData[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const { toast } = useToast();

  const filteredStudentsByLeader = useMemo(() => {
    if (selectedLeader === 'all') {
      return allStudents;
    }
    return allStudents.filter(s => s.leader === selectedLeader);
  }, [allStudents, selectedLeader]);

  useEffect(() => {
    const calculateAggregatedData = async () => {
      setIsLoadingSubjects(true);
      if (filteredStudentsByLeader.length === 0) {
        setAggregatedSubjectData([]);
        setIsLoadingSubjects(false);
        return;
      }

      const subjectMap = new Map<string, {
        totalPotential: number;
        studentCount: number;
        sdCount: number;
        criticalCount: number;
        warningCount: number;
        safeCount: number;
        groups: Map<string, {
          totalGroupPotential: number;
          groupStudentCount: number;
          groupSdCount: number;
          groupCriticalCount: number;
          groupWarningCount: number;
          groupSafeCount: number;
          students: Student[]
        }>
      }>();
      const studentSubjectCache = new Map<string, Subject[]>();

      for (const student of filteredStudentsByLeader) {
        let studentFullSubjects = studentSubjectCache.get(student.id);
        if (!studentFullSubjects) {
          studentFullSubjects = await loadStudentSubjects(student.id);
          studentSubjectCache.set(student.id, studentFullSubjects);
        }

        studentFullSubjects.forEach(fullSubject => {
          if (!subjectMap.has(fullSubject.name)) {
            subjectMap.set(fullSubject.name, { 
                totalPotential: 0, studentCount: 0, 
                sdCount: 0, criticalCount: 0, warningCount: 0, safeCount: 0, 
                groups: new Map() 
            });
          }
          const subjectEntry = subjectMap.get(fullSubject.name)!;

          const subjectPotential = calculateSubjectPotential(fullSubject, weightingSchemes);
          const isSD = isWithoutRight(fullSubject);

          subjectEntry.totalPotential += subjectPotential;
          subjectEntry.studentCount++;
          
          if (isSD) subjectEntry.sdCount++;
          else if (subjectPotential < 70) subjectEntry.criticalCount++;
          else if (subjectPotential <= 75) subjectEntry.warningCount++;
          else subjectEntry.safeCount++;

          const groupName = fullSubject.group || 'Sin Grupo';
          if (!subjectEntry.groups.has(groupName)) {
            subjectEntry.groups.set(groupName, { 
                totalGroupPotential: 0, groupStudentCount: 0, 
                groupSdCount: 0, groupCriticalCount: 0, groupWarningCount: 0, groupSafeCount: 0, 
                students: [] 
            });
          }
          const groupEntry = subjectEntry.groups.get(groupName)!;
          
          groupEntry.totalGroupPotential += subjectPotential;
          groupEntry.groupStudentCount++;
          
          if (isSD) groupEntry.groupSdCount++;
          else if (subjectPotential < 70) groupEntry.groupCriticalCount++;
          else if (subjectPotential <= 75) groupEntry.groupWarningCount++;
          else groupEntry.groupSafeCount++;

          groupEntry.students.push(student);
        });
      }

      const result = Array.from(subjectMap.entries()).map(([name, data]) => {
        const riskPercentage = data.studentCount > 0 ? ((data.sdCount + data.criticalCount) / data.studentCount) * 100 : 0;
        
        return {
            name,
            averagePotential: data.studentCount > 0 ? data.totalPotential / data.studentCount : null,
            totalStudents: data.studentCount,
            sdCount: data.sdCount,
            criticalCount: data.criticalCount,
            warningCount: data.warningCount,
            safeCount: data.safeCount,
            riskPercentage,
            isLoadingPotential: false,
            groups: Array.from(data.groups.entries()).map(([groupName, groupData]) => {
                const groupRiskPercentage = groupData.groupStudentCount > 0 ? ((groupData.groupSdCount + groupData.groupCriticalCount) / groupData.groupStudentCount) * 100 : 0;
                return {
                    name: groupName,
                    averagePotential: groupData.groupStudentCount > 0 ? groupData.totalGroupPotential / groupData.groupStudentCount : null,
                    totalStudents: groupData.groupStudentCount,
                    sdCount: groupData.groupSdCount,
                    criticalCount: groupData.groupCriticalCount,
                    warningCount: groupData.groupWarningCount,
                    safeCount: groupData.groupSafeCount,
                    riskPercentage: groupRiskPercentage,
                    students: groupData.students.sort((a,b) => a.name.localeCompare(b.name)), // Order students alphabetically
                    isLoadingPotential: false,
                };
            }).sort((a,b) => b.riskPercentage - a.riskPercentage), // ORDENAR GRUPOS: Más críticos primero
        };
      }).sort((a, b) => b.riskPercentage - a.riskPercentage); // ORDENAR MATERIAS: Más críticas primero

      setAggregatedSubjectData(result);
      setIsLoadingSubjects(false);
    };

    calculateAggregatedData();
  }, [filteredStudentsByLeader, weightingSchemes, loadStudentSubjects]);

  const selectedSubjectData = useMemo(() => {
    return aggregatedSubjectData.find(s => s.name === selectedSubjectName);
  }, [aggregatedSubjectData, selectedSubjectName]);

  const selectedGroupData = useMemo(() => {
    return selectedSubjectData?.groups.find(g => g.name === selectedGroupName);
  }, [selectedSubjectData, selectedGroupName]);

  const handleSubjectClick = (subjectName: string) => {
    setSelectedSubjectName(subjectName);
    setViewState('groups');
    setFilterType('subject');
    setSelectedValue(subjectName);
    setGroupId(null); 
  };

  const handleGroupClick = (groupName: string) => {
    setSelectedGroupName(groupName);
    setViewState('students');
    if (selectedSubjectName) {
        setFilterType('subject'); 
        setSelectedValue(selectedSubjectName); 
        setGroupId(groupName); 
    }
  };

  const handleBack = () => {
    if (viewState === 'students') {
      setViewState('groups');
      setSelectedGroupName(null);
      if (selectedSubjectName) {
        setFilterType('subject');
        setSelectedValue(selectedSubjectName);
        setGroupId(null);
      }
    } else if (viewState === 'groups') {
      setViewState('subjects');
      setSelectedSubjectName(null);
      setFilterType('leader'); 
      setSelectedValue(selectedLeader === 'all' ? null : selectedLeader);
      setGroupId(null);
    }
  };

  const copyRiskList = async (e: React.MouseEvent, type: 'subject' | 'group', name: string, students: Student[]) => {
      e.stopPropagation();
      let reportText = `🚨 Reporte de Riesgo Crítico - ${type === 'subject' ? 'Materia' : 'Grupo'}: ${name}\n\n`;
      let count = 0;

      setIsLoadingSubjects(true);
      try {
          for (const student of students) {
              const fullSubjects = await loadStudentSubjects(student.id);
              const subjectData = fullSubjects.find(s => s.name === (type === 'subject' ? name : selectedSubjectName));
              
              if (!subjectData) continue;

              const pot = calculateSubjectPotential(subjectData, weightingSchemes);
              const isSD = isWithoutRight(subjectData);

              if (isSD || pot < 70) {
                  count++;
                  let reason = isSD ? `SD (F: ${subjectData.absences}, NE: ${subjectData.missedAssignments})` : `Potencial: ${pot.toFixed(1)}%`;
                  reportText += `- ${student.name} (${student.id}) | Riesgo: ${reason} | Líder: ${student.leader}\n`;
              }
          }

          if (count === 0) {
              toast({ title: "Sin alumnos críticos", description: "No hay alumnos en SD o con potencial menor a 70 en esta selección." });
              return;
          }

          await navigator.clipboard.writeText(reportText);
          toast({ title: "¡Lista Copiada!", description: `Se copiaron ${count} alumnos críticos al portapapeles.` });
      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Error", description: "No se pudo generar la lista." });
      } finally {
          setIsLoadingSubjects(false);
      }
  };


  const panelTitle = useMemo(() => {
    switch (viewState) {
      case 'subjects': return 'Atención por Materia';
      case 'groups': return `Análisis: ${selectedSubjectName}`;
      case 'students': return `Grupo ${selectedGroupName} - ${selectedSubjectName}`;
      default: return 'Seguimiento';
    }
  }, [viewState, selectedSubjectName, selectedGroupName]);

  if (isLoading || isLoadingSubjects) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-primary to-emerald-900 p-8 md:p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-white/10 shadow-inner">
              <AlertTriangle className="h-3 w-3 text-emerald-300" /> Triage Académico
            </div>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
              {panelTitle}
            </h1>
            <p className="text-sm mt-1 flex items-center gap-2 max-w-xl opacity-80 font-medium">
              Priorizado automáticamente. Las materias y grupos con mayor índice de reprobación y SD aparecen primero.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl">
            {(viewState === 'groups' || viewState === 'students') && (
              <Button variant="secondary" size="sm" onClick={handleBack} className="h-10 rounded-xl font-bold text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border-none px-4 shadow-none">
                <ArrowLeft className="h-4 w-4 text-emerald-300" /> Atrás
              </Button>
            )}
            <Select value={selectedLeader} onValueChange={setSelectedLeader}>
              <SelectTrigger id="leader-select" className="h-10 rounded-xl font-bold text-xs gap-2 bg-white/10 hover:bg-white/20 text-white border-none px-4 max-w-[200px] shadow-none">
                <Users className="h-4 w-4 text-emerald-300" />
                <SelectValue placeholder="Filtrar por Líder..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos los Líderes</SelectItem>
                {leaders.map(leader => (
                  <SelectItem key={leader} value={leader}>{leader}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLeader !== 'all' && (
              <Button variant="secondary" size="sm" onClick={() => setSelectedLeader('all')} className="h-10 px-3 text-[10px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 text-white border-none rounded-full transition-all shadow-none">
                <X className="mr-1.5 h-3.5 w-3.5"/> Quitar filtro
              </Button>
            )}
          </div>
        </div>
        <div className="absolute right-[-5%] top-[-20%] w-96 h-96 bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute left-[-5%] bottom-[-20%] w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px]" />
      </header>

      <section className="space-y-4">
        {filteredStudentsByLeader.length === 0 ? (
          <div className="text-center py-32 bg-white/30 rounded-3xl border-2 border-dashed border-primary/10 animate-in fade-in duration-1000">
            <CheckCircle2 className="h-20 w-20 text-emerald-500/20 mx-auto mb-6" />
            <h3 className="text-2xl font-black opacity-40">Todo despejado</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">
              No hay datos para mostrar con los filtros actuales.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[65vh] rounded-3xl border shadow-xl bg-white/60 backdrop-blur-md pb-10">
            <div className="p-4 space-y-4">
              
              {/* VISTA DE MATERIAS */}
              {viewState === 'subjects' && (
                <>
                  <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                    <AlertTriangle className="h-3 w-3" /> Ordenado por mayor % de riesgo crítico
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aggregatedSubjectData.map(subject => (
                      <Card key={subject.name} className={cn(
                          "flex flex-col p-5 transition-all cursor-pointer rounded-2xl shadow-sm border-l-4",
                          subject.riskPercentage >= 20 ? "border-l-red-500 hover:shadow-md hover:border-l-red-600 bg-red-50/30" : 
                          subject.riskPercentage > 0 ? "border-l-orange-400 hover:shadow-md bg-orange-50/10" : 
                          "border-l-emerald-500 hover:shadow-md"
                      )} onClick={() => handleSubjectClick(subject.name)}>
                        
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col min-w-0 flex-1">
                            <p className="font-bold text-lg leading-tight truncate">{subject.name}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                                {subject.groups.length} Grupos • {subject.totalStudents} Alumnos
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end shrink-0 gap-2">
                            <Badge variant="outline" className={cn(
                              "font-black text-xs px-2 py-0.5 rounded-md",
                              subject.averagePotential !== null && subject.averagePotential >= 90 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                              subject.averagePotential !== null && subject.averagePotential >= 80 ? "bg-blue-100 text-blue-700 border-blue-200" :
                              subject.averagePotential !== null && subject.averagePotential >= 70 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                              subject.averagePotential !== null ? "bg-red-100 text-red-700 border-red-200" : ""
                            )}>
                              {subject.averagePotential === null ? '--' : `Prom: ${subject.averagePotential.toFixed(1)}`}
                            </Badge>
                            
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="secondary" 
                                            size="icon" 
                                            className="h-7 w-7 rounded-lg bg-white/50 hover:bg-white shadow-sm"
                                            onClick={(e) => copyRiskList(e, 'subject', subject.name, subject.groups.flatMap(g => g.students))}
                                        >
                                            <ClipboardCopy className="h-3.5 w-3.5 text-slate-600" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copiar lista de alumnos en riesgo crítico</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        <RiskDistributionBar data={subject} />

                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* VISTA DE GRUPOS */}
              {viewState === 'groups' && selectedSubjectData && (
                <div className="space-y-4">
                  {/* Boton Contextual de Regreso */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b pb-4 mb-2 bg-white/50 p-4 rounded-2xl sticky top-0 z-10 backdrop-blur-sm">
                     <Button variant="outline" size="sm" onClick={handleBack} className="rounded-xl w-fit shrink-0">
                       <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Materias
                     </Button>
                     <div>
                       <h3 className="font-black text-xl text-slate-800 leading-tight">{selectedSubjectData.name}</h3>
                       <p className="text-xs text-muted-foreground font-medium">Selecciona un grupo para ver a los alumnos</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedSubjectData.groups.map(group => (
                      <Card key={group.name} className={cn(
                        "flex flex-col p-5 transition-all cursor-pointer rounded-2xl shadow-sm border-l-4",
                        group.riskPercentage >= 20 ? "border-l-red-500 hover:shadow-md bg-red-50/30" : 
                        group.riskPercentage > 0 ? "border-l-orange-400 hover:shadow-md bg-orange-50/10" : 
                        "border-l-emerald-500 hover:shadow-md"
                      )} onClick={() => handleGroupClick(group.name)}>
                        
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col">
                            <p className="font-bold text-xl">{group.name}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                                {group.totalStudents} Alumnos
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                             <Badge variant="outline" className={cn(
                                "font-black text-xs px-2 py-0.5 rounded-md",
                                group.averagePotential !== null && group.averagePotential >= 90 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                group.averagePotential !== null && group.averagePotential >= 80 ? "bg-blue-100 text-blue-700 border-blue-200" :
                                group.averagePotential !== null && group.averagePotential >= 70 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                group.averagePotential !== null ? "bg-red-100 text-red-700 border-red-200" : ""
                              )}>
                                {group.averagePotential === null ? '--' : `Prom: ${group.averagePotential.toFixed(1)}`}
                              </Badge>

                              <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="secondary" 
                                            size="icon" 
                                            className="h-7 w-7 rounded-lg bg-white/50 hover:bg-white shadow-sm"
                                            onClick={(e) => copyRiskList(e, 'group', group.name, group.students)}
                                        >
                                            <ClipboardCopy className="h-3.5 w-3.5 text-slate-600" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copiar lista de alumnos críticos del grupo</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        <RiskDistributionBar data={group} />

                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* VISTA DE ALUMNOS */}
              {viewState === 'students' && selectedGroupData && selectedSubjectName && (
                <div className="space-y-4">
                   {/* Boton Contextual de Regreso */}
                   <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b pb-4 mb-2 bg-white/50 p-4 rounded-2xl sticky top-0 z-10 backdrop-blur-sm">
                     <Button variant="outline" size="sm" onClick={handleBack} className="rounded-xl w-fit shrink-0">
                       <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Grupos
                     </Button>
                     <div>
                       <h3 className="font-black text-xl text-slate-800 leading-tight">Grupo {selectedGroupData.name}</h3>
                       <p className="text-xs text-muted-foreground font-medium">{selectedSubjectName} • {selectedGroupData.students.length} alumnos</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedGroupData.students.map(student => (
                      <SubjectStudentItem 
                        key={student.id} 
                        student={student} 
                        subjectName={selectedSubjectName} 
                        weightingSchemes={weightingSchemes}
                        loadStudentSubjects={loadStudentSubjects}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </section>
    </div>
  );
}
