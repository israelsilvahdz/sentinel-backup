'use client';

import { AcademicBreakdown } from './AcademicBreakdown';
import { WorkspaceHeader } from './WorkspaceHeader';
import { useDashboardFilters } from './DashboardClient';
import { SubjectTrackingPanel } from './SubjectTrackingPanel';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function AcademicPerformancePanel() {
  const { hasData } = useDashboardFilters();
  const [section, setSection] = useState<'performance' | 'subjects'>('performance');

  return <main className="workspace-page">
    <WorkspaceHeader
      eyebrow="Operación"
      title="Desempeño y seguimiento académico"
      description="Consulta promedios por docente y grupo, y da seguimiento al riesgo por materia."
    />
    {hasData ? <>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border bg-white p-1" role="group" aria-label="Sección de desempeño">
        <Button type="button" variant={section === 'performance' ? 'default' : 'ghost'} onClick={() => setSection('performance')}>Docentes y grupos</Button>
        <Button type="button" variant={section === 'subjects' ? 'default' : 'ghost'} onClick={() => setSection('subjects')}>Seguimiento por materia</Button>
      </div>
      {section === 'performance' ? <AcademicBreakdown /> : <SubjectTrackingPanel embedded />}
    </> : <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">Carga un monitoreo desde la barra superior para consultar estos indicadores.</div>}
  </main>;
}
