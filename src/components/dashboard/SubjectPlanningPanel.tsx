"use client";

import React, { useMemo, useState } from 'react';
import { useDashboardFilters } from './DashboardClient';
import { aggregateRiskBySubject } from '@/lib/dataProcessor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  BookOpen, 
  Users, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown, 
  Printer, 
  FileText,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

export function SubjectPlanningPanel() {
  const { allStudents, weightingSchemes, setActiveView, setContextualStudentIds } = useDashboardFilters();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const subjectDemands = useMemo(() => {
    return aggregateRiskBySubject(allStudents, weightingSchemes);
  }, [allStudents, weightingSchemes]);

  const filteredDemands = useMemo(() => {
    if (!searchTerm) return subjectDemands;
    return subjectDemands.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [subjectDemands, searchTerm]);

  const stats = useMemo(() => {
    const totalFailed = subjectDemands.reduce((sum, s) => sum + s.failedCount, 0);
    const totalAtRisk = subjectDemands.reduce((sum, s) => sum + s.atRiskCount, 0);
    return { totalFailed, totalAtRisk, subjectCount: subjectDemands.length };
  }, [subjectDemands]);

  const handleJumpToStudent = (studentId: string) => {
    setContextualStudentIds(new Set([studentId]));
    setActiveView('students');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Planeación de Oferta Académica 2026</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            h1 { color: #17594A; font-size: 24px; font-weight: 900; border-bottom: 3px solid #17594A; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { text-align: left; background: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; font-weight: 900; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
            .failed { color: #ef4444; font-weight: bold; }
            .at-risk { color: #f59e0b; font-weight: bold; }
            .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #94a3b8; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h1>Demanda de Materias para Grupos de Recuperación</h1>
          <p>Este reporte identifica la cantidad de alumnos que ya reprobaron o están en zona de alerta.</p>
          <table>
            <thead>
              <tr>
                <th>Materia</th>
                <th>Alumnos Reprobados (SD/<70)</th>
                <th>En Riesgo (Potencial 70-75)</th>
                <th>Demanda Total</th>
              </tr>
            </thead>
            <tbody>
              ${subjectDemands.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td class="failed">${s.failedCount}</td>
                  <td class="at-risk">${s.atRiskCount}</td>
                  <td><strong>${s.failedCount + s.atRiskCount}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Sentinel Academic Intelligence • Generado el ${new Date().toLocaleDateString()}</div>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" /> Planeación de Oferta
          </h1>
          <p className="text-muted-foreground font-medium">Identifica qué materias necesitan abrirse para grupos de recuperación.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl font-bold gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Exportar Reporte de Demanda
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-red-700 tracking-widest">Total Reprobados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">{stats.totalFailed}</div>
            <p className="text-[10px] text-red-600/60 font-bold uppercase mt-1">Requieren recursamiento u ordinario</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-orange-700 tracking-widest">En Zona de Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-600">{stats.totalAtRisk}</div>
            <p className="text-[10px] text-orange-600/60 font-bold uppercase mt-1">Potencial entre 70 y 75</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-primary tracking-widest">Materias Afectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{stats.subjectCount}</div>
            <p className="text-[10px] text-primary/60 font-bold uppercase mt-1">Asignaturas con demanda detectada</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black tracking-tight">Análisis de Demanda por Asignatura</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Ordenado por impacto total</CardDescription>
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
              <Input 
                placeholder="Filtrar materia..." 
                className="pl-10 h-10 rounded-xl bg-white/80 border-none shadow-inner" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30 border-none">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Asignatura</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase tracking-widest">Reprobados</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase tracking-widest">En Alerta</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest pr-10">Demanda Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDemands.map((s) => (
                  <React.Fragment key={s.name}>
                    <TableRow 
                      className="cursor-pointer group/row transition-all hover:bg-muted/10 border-b border-muted/20"
                      onClick={() => setExpandedSubject(expandedSubject === s.name ? null : s.name)}
                    >
                      <TableCell className="text-center">
                        <div className={cn(
                          "p-1.5 rounded-lg transition-all",
                          expandedSubject === s.name ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        )}>
                          {expandedSubject === s.name ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/5 rounded-xl"><BookOpen className="h-4 w-4 text-primary" /></div>
                          <span className="font-bold text-sm tracking-tight">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none font-black text-xs h-6 px-3">{s.failedCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none font-black text-xs h-6 px-3">{s.atRiskCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <span className="text-lg font-black text-primary tracking-tighter">{s.failedCount + s.atRiskCount}</span>
                      </TableCell>
                    </TableRow>
                    
                    {expandedSubject === s.name && (
                      <TableRow className="bg-muted/5 border-none">
                        <TableCell colSpan={5} className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase text-red-600 tracking-[0.2em] flex items-center gap-2">
                                <TrendingDown className="h-3 w-3" /> Listado de Reprobados (SD / Potencial &lt; 70)
                              </h4>
                              <div className="space-y-2">
                                {s.failedStudents.map(fs => (
                                  <div key={fs.id} className="bg-white p-3 rounded-xl border shadow-sm flex items-center justify-between group/st" onClick={() => handleJumpToStudent(fs.id)}>
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center text-[10px] font-black text-red-600">{fs.name.substring(0,1)}</div>
                                      <div>
                                        <p className="text-xs font-bold group-hover/st:text-primary transition-colors cursor-pointer">{fs.name}</p>
                                        <p className="text-[9px] font-mono text-muted-foreground">{fs.id} • {fs.reason}</p>
                                      </div>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover/st:opacity-100 transition-all" />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase text-orange-600 tracking-[0.2em] flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3" /> Listado en Alerta (Potencial 70-75)
                              </h4>
                              <div className="space-y-2">
                                {s.atRiskStudents.map(as => (
                                  <div key={as.id} className="bg-white p-3 rounded-xl border shadow-sm flex items-center justify-between group/st" onClick={() => handleJumpToStudent(as.id)}>
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center text-[10px] font-black text-orange-600">{as.name.substring(0,1)}</div>
                                      <div>
                                        <p className="text-xs font-bold group-hover/st:text-primary transition-colors cursor-pointer">{as.name}</p>
                                        <p className="text-[9px] font-mono text-muted-foreground">{as.id} • Potencial: {as.potential.toFixed(1)}</p>
                                      </div>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover/st:opacity-100 transition-all" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
