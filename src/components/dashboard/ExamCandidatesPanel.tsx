
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardFilters } from './DashboardClient';
import { FileQuestion, ClipboardCopy, CheckCircle2, ShieldAlert, AlertCircle, BookOpen, Printer, X, Filter, FileSpreadsheet, UserCheck, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { isWithoutRight } from '@/lib/dataProcessor';
import { getActivityList } from '@/lib/ponderaciones';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import type { Subject, Student } from '@/types/student';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

export function ExamCandidatesPanel() {
  const { filteredStudents, allStudents, weightingSchemes } = useDashboardFilters();
  const [excludeSD, setExcludeSD] = useState(true);
  const [excludedSubjectNames, setExcludedSubjectNames] = useState<Set<string>>(new Set());
  const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'individual' | 'group'>('all');
  const { toast } = useToast();

  const toggleSubjectExclusion = (subjectName: string) => {
    setExcludedSubjectNames((prev) => {
      const next = new Set(prev);
      if (next.has(subjectName)) {
        next.delete(subjectName);
      } else {
        next.add(subjectName);
      }
      return next;
    });
  };

  // Pre-calculate max points for each group in the entire school to detect anomalies
  const groupMaxPointsMap = useMemo(() => {
    const map = new Map<string, number>(); // key: "SubjectName|Group" -> maxEvaluatedPoints
    
    allStudents.forEach(student => {
      (student.subjects || []).forEach(subject => {
        const activityList = getActivityList(subject, weightingSchemes);
        if (activityList.length === 0) return;

        let possiblePoints = 0;
        activityList.forEach(item => {
          const isGradedOrNE = typeof item.score === 'number' || (typeof item.score === 'string' && item.score.trim() !== '' && item.score.toUpperCase() !== 'SC');
          if (isGradedOrNE) possiblePoints += item.weight;
        });

        const rounded = Math.round(possiblePoints * 10) / 10;
        const key = `${subject.name}|${subject.group}`;
        const currentMax = map.get(key) || 0;
        if (rounded > currentMax) map.set(key, rounded);
      });
    });
    return map;
  }, [allStudents, weightingSchemes]);

  const allPossibleIncompleteSubjects = useMemo(() => {
    const names = new Set<string>();
    for (const student of filteredStudents) {
      for (const subject of student.subjects || []) {
        const activityList = getActivityList(subject, weightingSchemes);
        if (activityList.length === 0) continue; 

        let possiblePointsToDate = 0;
        activityList.forEach(item => {
            const isGradedOrNE = typeof item.score === 'number' || (typeof item.score === 'string' && item.score.trim() !== '' && item.score.toUpperCase() !== 'SC');
            if (isGradedOrNE) possiblePointsToDate += item.weight;
        });

        if (Math.round(possiblePointsToDate * 10) / 10 < 100) {
            names.add(subject.name);
        }
      }
    }
    return Array.from(names).sort();
  }, [filteredStudents, weightingSchemes]);

  const candidatesData = useMemo(() => {
    const results = [];
    for (const student of filteredStudents) {
      const incompleteSubjects: { subject: Subject, evaluatedPoints: number, isSD: boolean, isAnomaly: boolean, groupMax: number }[] = [];
      
      for (const subject of student.subjects || []) {
        if (excludedSubjectNames.has(subject.name)) continue;

        const activityList = getActivityList(subject, weightingSchemes);
        if (activityList.length === 0) continue; 

        let possiblePointsToDate = 0;
        activityList.forEach(item => {
            const isGradedOrNE = typeof item.score === 'number' || (typeof item.score === 'string' && item.score.trim() !== '' && item.score.toUpperCase() !== 'SC');
            if (isGradedOrNE) possiblePointsToDate += item.weight;
        });

        const roundedPossiblePoints = Math.round(possiblePointsToDate * 10) / 10;
        
        if (roundedPossiblePoints < 100) {
            const sdStatus = isWithoutRight(subject);
            if (excludeSD && sdStatus) continue;

            const groupKey = `${subject.name}|${subject.group}`;
            const groupMax = groupMaxPointsMap.get(groupKey) || 0;
            const isAnomaly = roundedPossiblePoints < groupMax;

            // Anomaly Filter Logic
            if (anomalyFilter === 'individual' && !isAnomaly) continue;
            if (anomalyFilter === 'group' && isAnomaly) continue;

            incompleteSubjects.push({
                subject,
                evaluatedPoints: roundedPossiblePoints,
                isSD: sdStatus,
                isAnomaly,
                groupMax
            });
        }
      }
      
      if (incompleteSubjects.length > 0) {
          results.push({ student, incompleteSubjects });
      }
    }
    return results.sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [filteredStudents, weightingSchemes, excludeSD, excludedSubjectNames, groupMaxPointsMap, anomalyFilter]);

  const stats = useMemo(() => {
    const subjectStats: Record<string, number> = {};
    let individualAnomalies = 0;
    let groupDelays = 0;

    candidatesData.forEach(({ incompleteSubjects }) => {
      incompleteSubjects.forEach((item) => {
        subjectStats[item.subject.name] = (subjectStats[item.subject.name] || 0) + 1;
        if (item.isAnomaly) individualAnomalies++;
        else groupDelays++;
      });
    });

    return {
      subjects: Object.entries(subjectStats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      individualAnomalies,
      groupDelays
    };
  }, [candidatesData]);

  const handleExportExcel = () => {
      if (candidatesData.length === 0) return;

      const flattenedData = candidatesData.flatMap(({ student, incompleteSubjects }) => 
          incompleteSubjects.map(item => ({
              'Nombre del Alumno': student.name,
              'Matrícula': student.id,
              'Líder': student.leader,
              'Materia': item.subject.name,
              'Grupo': item.subject.group,
              'Puntos Posibles': item.evaluatedPoints,
              'Max del Grupo': item.groupMax,
              'Tipo de Caso': item.isAnomaly ? 'ANOMALÍA INDIVIDUAL (Compañeros tienen más)' : 'RETRASO GRUPAL (Nadie tiene más)',
              'Estatus SD': item.isSD ? 'SÍ' : 'NO'
          }))
      );

      const worksheet = XLSX.utils.json_to_sheet(flattenedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Analizador de Cierre");
      XLSX.writeFile(workbook, `Reporte_Cierre_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  const handlePrint = () => {
    if (candidatesData.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const dateStr = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
    
    let htmlContent = `
      <html>
        <head>
          <title>Reporte de Cierre - ${dateStr}</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
            th { background-color: #f8fafc; font-size: 0.75rem; text-transform: uppercase; }
            .anomaly { color: #f59e0b; font-weight: bold; }
            .group-pending { color: #64748b; font-style: italic; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Reporte de Candidatos a Examen / Anomalías de Cierre</h1>
          <p>Generado: ${dateStr} | Total Alumnos: ${candidatesData.length}</p>
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Detalle de Materia</th>
                <th>Diagnóstico</th>
              </tr>
            </thead>
            <tbody>
              ${candidatesData.map(({ student, incompleteSubjects }) => `
                <tr>
                  <td><b>${student.name}</b><br><small>${student.id} | ${student.leader}</small></td>
                  <td>${incompleteSubjects.map(i => `${i.subject.name} (${i.subject.group}) - ${i.evaluatedPoints}/100 pts`).join('<br>')}</td>
                  <td>${incompleteSubjects.map(i => i.isAnomaly ? '<span class="anomaly">⚠️ Individual (Compañeros tienen más)</span>' : '<span class="group-pending">🕒 Grupal (Pendiente maestro)</span>').join('<br>')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print()</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-700">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 md:p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-white/10 shadow-inner">
              <ShieldAlert className="h-3 w-3 text-red-300" /> Auditoría de Cierre
            </div>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
              Analizador de Cierre
            </h1>
            <p className="text-sm mt-1 flex items-center gap-2 max-w-xl opacity-80 font-medium text-slate-300">
              Detecta si el retraso en la calificación es grupal (maestro pendiente) o individual (alumno no presentó o caso especial).
            </p>
          </div>
          <div className="flex flex-col items-end gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl shrink-0">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Switch id="exclude-sd" checked={excludeSD} onCheckedChange={setExcludeSD} />
                    <Label htmlFor="exclude-sd" className="text-xs font-bold">Excluir SD</Label>
                </div>
                
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold gap-2">
                            <Filter className="h-4 w-4" /> Materias
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-slate-200">
                        <ScrollArea className="h-72 p-2">
                            {allPossibleIncompleteSubjects.map(name => (
                                <div key={name} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer" onClick={() => toggleSubjectExclusion(name)}>
                                    <Checkbox checked={!excludedSubjectNames.has(name)} className="data-[state=checked]:bg-emerald-500" />
                                    <Label className="text-sm font-medium flex-1 truncate cursor-pointer">{name}</Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
             </div>
             
             <div className="flex gap-2 w-full">
                <Button variant="secondary" onClick={handleExportExcel} disabled={candidatesData.length === 0} className="flex-1 h-9 rounded-xl font-bold text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                    <FileSpreadsheet className="h-3 w-3" /> Excel
                </Button>
                <Button variant="secondary" onClick={handlePrint} disabled={candidatesData.length === 0} className="flex-1 h-9 rounded-xl font-bold text-[10px] gap-1 bg-white/10 text-white border-none">
                    <Printer className="h-3 w-3" /> Imprimir
                </Button>
             </div>
          </div>
        </div>
      </header>

      {/* Selectores de Diagnóstico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card 
            className={cn("p-4 cursor-pointer transition-all border-none shadow-sm flex items-center justify-between", anomalyFilter === 'all' ? "bg-primary text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
            onClick={() => setAnomalyFilter('all')}
          >
              <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", anomalyFilter === 'all' ? "bg-white/20" : "bg-slate-100")}><BookOpen className="h-5 w-5" /></div>
                  <div><p className="text-[10px] font-black uppercase">Todos los casos</p><p className="text-2xl font-black">{stats.individualAnomalies + stats.groupDelays}</p></div>
              </div>
          </Card>
          
          <Card 
            className={cn("p-4 cursor-pointer transition-all border-none shadow-sm flex items-center justify-between", anomalyFilter === 'individual' ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
            onClick={() => setAnomalyFilter('individual')}
          >
              <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", anomalyFilter === 'individual' ? "bg-white/20" : "bg-amber-100 text-amber-600")}><AlertCircle className="h-5 w-5" /></div>
                  <div><p className="text-[10px] font-black uppercase">Anomalías Indiv.</p><p className="text-2xl font-black">{stats.individualAnomalies}</p></div>
              </div>
              <TooltipProvider><Tooltip><TooltipTrigger><Timer className="h-4 w-4 opacity-50" /></TooltipTrigger><TooltipContent>Alumnos que tienen menos puntos que sus propios compañeros de grupo</TooltipContent></Tooltip></TooltipProvider>
          </Card>

          <Card 
            className={cn("p-4 cursor-pointer transition-all border-none shadow-sm flex items-center justify-between", anomalyFilter === 'group' ? "bg-slate-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
            onClick={() => setAnomalyFilter('group')}
          >
              <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", anomalyFilter === 'group' ? "bg-white/20" : "bg-slate-100 text-slate-600")}><Timer className="h-5 w-5" /></div>
                  <div><p className="text-[10px] font-black uppercase">Pendiente Maestro</p><p className="text-2xl font-black">{stats.groupDelays}</p></div>
              </div>
              <TooltipProvider><Tooltip><TooltipTrigger><UserCheck className="h-4 w-4 opacity-50" /></TooltipTrigger><TooltipContent>Nadie en el grupo tiene más puntos; es probable que falte subir la calificación</TooltipContent></Tooltip></TooltipProvider>
          </Card>
      </div>

      <section className="space-y-4">
        {candidatesData.length === 0 ? (
          <div className="text-center py-32 bg-white/30 rounded-3xl border-2 border-dashed border-slate-200 animate-in fade-in duration-1000">
            <CheckCircle2 className="h-20 w-20 text-emerald-500/20 mx-auto mb-6" />
            <h3 className="text-2xl font-black opacity-40 text-slate-800">Corte limpio</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">No se detectaron casos con los filtros actuales.</p>
          </div>
        ) : (
          <ScrollArea className="h-[55vh] rounded-3xl border shadow-xl bg-white/60 backdrop-blur-md">
            <div className="p-4 space-y-4">
              {candidatesData.map(({ student, incompleteSubjects }) => (
                  <Card key={student.id} className="p-5 transition-all border-none shadow-sm bg-white overflow-hidden relative">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="flex-1">
                              <h3 className="font-bold text-lg text-slate-800 leading-tight">{student.name}</h3>
                              <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase text-slate-400">
                                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono text-xs">{student.id}</span>
                                  <span>Líder: {student.leader}</span>
                              </div>
                          </div>

                          <div className="flex-1 flex flex-col gap-3 min-w-[320px]">
                              {incompleteSubjects.map((item, idx) => (
                                  <div key={idx} className={cn(
                                      "p-3 rounded-xl border flex flex-col gap-2 relative",
                                      item.isAnomaly ? "bg-amber-50/50 border-amber-100" : "bg-slate-50 border-slate-100"
                                  )}>
                                      <div className="flex justify-between items-start">
                                          <div className="min-w-0 flex-1">
                                              <p className="text-sm font-bold text-slate-700 truncate">{item.subject.name}</p>
                                              <p className="text-[10px] font-bold text-slate-400">Grupo: {item.subject.group}</p>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                              {item.isSD && <Badge variant="destructive" className="h-4 text-[8px] px-1 font-black">SD</Badge>}
                                              <Badge variant="outline" className="text-[10px] bg-white font-bold">{item.evaluatedPoints} / 100</Badge>
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-2 pt-1 border-t border-dashed">
                                          {item.isAnomaly ? (
                                              <>
                                                  <AlertCircle className="h-3 w-3 text-amber-500" />
                                                  <span className="text-[10px] font-bold text-amber-700">Anomalía Individual: Sus compañeros tienen hasta {item.groupMax} pts.</span>
                                              </>
                                          ) : (
                                              <>
                                                  <Timer className="h-3 w-3 text-slate-400" />
                                                  <span className="text-[10px] font-bold text-slate-500">Pendiente Maestro: Nadie en el grupo tiene más de {item.evaluatedPoints} pts.</span>
                                              </>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </section>
    </div>
  );
}
