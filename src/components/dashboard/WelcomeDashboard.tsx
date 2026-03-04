"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardFilters, type ActiveView } from './DashboardClient';
import { 
  LayoutDashboard, 
  TrendingUp, 
  ClipboardList, 
  BarChart3, 
  Map as MapIcon, 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  ArrowRight,
  Sparkles,
  Zap,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  view: ActiveView;
  color: string;
  onClick: (view: ActiveView) => void;
}

function ModuleCard({ title, description, icon: Icon, view, color, onClick }: ModuleCardProps) {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-none bg-white/50 backdrop-blur-sm hover:translate-y--1"
      onClick={() => onClick(view)}
    >
      <CardContent className="p-6">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", color)}>
          <Icon className="text-white h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">{description}</p>
        <div className="flex items-center text-primary font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          Explorar módulo <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function WelcomeDashboard() {
  const { setActiveView, hasData, allStudents, continuityStudents, teamTasks } = useDashboardFilters();

  const handleNavigate = (view: ActiveView) => {
    setActiveView(view);
  };

  const criticalCasesCount = allStudents.filter(s => 
    s.subjectSummaries?.some(sub => sub.absences >= sub.absenceLimit || sub.missedAssignments >= sub.missedAssignmentLimit)
  ).length;

  const pendingTasksCount = teamTasks.filter(t => t.status === 'pendiente').length;

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Hero Section */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-emerald-900 p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="h-3 w-3" /> Dashboard Inteligente 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Bienvenido a Sentinel
          </h1>
          <p className="text-emerald-50/80 text-lg md:text-xl leading-relaxed mb-8">
            Tu plataforma centralizada para el monitoreo académico, seguimiento vocacional y gestión estratégica de éxito estudiantil.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              variant="secondary" 
              className="font-bold shadow-lg"
              onClick={() => handleNavigate('dashboard')}
            >
              <Zap className="mr-2 h-4 w-4" /> Ver Resumen de Riesgo
            </Button>
            {!hasData && (
              <p className="text-sm text-emerald-100/60 italic flex items-center w-full mt-2">
                <AlertTriangle className="mr-2 h-4 w-4" /> Comienza cargando el reporte diario en la parte superior.
              </p>
            )}
          </div>
        </div>
        {/* Abstract background elements */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute right-20 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
      </header>

      {/* Summary Stats (Only if data exists) */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-red-50 border-red-100 border-l-4 border-l-red-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-red-800 uppercase">Casos Críticos Académicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-600">{criticalCasesCount}</div>
              <p className="text-xs text-red-700/70 mt-1 italic">Alumnos en SD o al límite de riesgo.</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100 border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-blue-800 uppercase">Pendientes de Equipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-600">{pendingTasksCount}</div>
              <p className="text-xs text-blue-700/70 mt-1 italic">Tareas activas en la ruta diaria.</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100 border-l-4 border-l-purple-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-purple-800 uppercase">Universo Continuidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-purple-600">{continuityStudents.length}</div>
              <p className="text-xs text-purple-700/70 mt-1 italic">Alumnos en proceso de inscripción a profesional.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modules Grid */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <LayoutDashboard className="text-primary h-6 w-6" /> Herramientas de Gestión
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModuleCard 
            title="Progreso Estudiantil"
            description="Analíticos avanzados de riesgo por faltas y tareas. Identifica focos rojos por materia y profesor."
            icon={LayoutDashboard}
            view="dashboard"
            color="bg-emerald-500"
            onClick={handleNavigate}
          />
          <ModuleCard 
            title="Continuidad Vocacional"
            description="La mina de oro para la retención. Ranking de universidades, carreras de interés y seguimiento SOS."
            icon={TrendingUp}
            view="continuidad"
            color="bg-purple-500"
            onClick={handleNavigate}
          />
          <ModuleCard 
            title="Ruta Diaria / Equipo"
            description="Bitácora de trabajo colaborativo para líderes y tutores. Gestiona compromisos y visitas a salón."
            icon={ClipboardList}
            view="team-work"
            color="bg-blue-500"
            onClick={handleNavigate}
          />
          <ModuleCard 
            title="Análisis de Cambios"
            description="Detecta qué alumnos han acumulado nuevas faltas o tareas NE comparando dos reportes."
            icon={BarChart3}
            view="change-stats"
            color="bg-orange-500"
            onClick={handleNavigate}
          />
          <ModuleCard 
            title="Planificador de Mapa"
            description="Simulación visual de trayectoria académica. Proyecta materias recomendadas y detecta bloqueos."
            icon={MapIcon}
            view="map-planner"
            color="bg-indigo-500"
            onClick={handleNavigate}
          />
          <ModuleCard 
            title="Equipos Rep/Cult"
            description="Gestión de alumnos en equipos representativos y notificaciones automáticas de ausencia."
            icon={ShieldCheck}
            view="teams-management"
            color="bg-pink-500"
            onClick={handleNavigate}
          />
        </div>
      </section>

      {/* Footer Info */}
      <footer className="pt-10 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Sentinel 2026 - Universidad Tecmilenio</span>
        </div>
        <div className="flex gap-6">
          <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Líderes de Generación</span>
          <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" /> Éxito Estudiantil</span>
        </div>
      </footer>
    </div>
  );
}
