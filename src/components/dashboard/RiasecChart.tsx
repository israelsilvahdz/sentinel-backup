"use client";

import React, { useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';
import type { RiasecDiagnosis } from '@/types/student';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Download, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiasecChartProps {
  diagnosis: RiasecDiagnosis;
}

const TECMILENIO_KEYWORDS = [
  "NEGOCIOS", "INGENIERIA", "SISTEMAS", "ADMINISTRACION", "PSICOLOGIA", 
  "DERECHO", "COMERCIO", "DISEÑO", "MARKETING", "SALUD", "NUTRICION", 
  "GASTRONOMIA", "TURISMO"
];

export function RiasecChart({ diagnosis }: RiasecChartProps) {
  const chartData = useMemo(() => {
    const { scores } = diagnosis;
    return [
      { subject: 'Realista', A: scores.realistic, fullMark: 100 },
      { subject: 'Investigador', A: scores.investigative, fullMark: 100 },
      { subject: 'Artístico', A: scores.artistic, fullMark: 100 },
      { subject: 'Social', A: scores.social, fullMark: 100 },
      { subject: 'Emprendedor', A: scores.enterprising, fullMark: 100 },
      { subject: 'Convencional', A: scores.conventional, fullMark: 100 },
    ];
  }, [diagnosis]);

  const isTecmilenioAvailable = (career: string) => {
    const upperCareer = career.toUpperCase();
    return TECMILENIO_KEYWORDS.some(keyword => upperCareer.includes(keyword));
  };

  const handleDownload = () => {
    // In a real app, this would trigger a download from a storage bucket
    // For the prototype, we simulate the action
    window.open(`https://storage.tecmilenio.mx/vocational/${diagnosis.sourceFile}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden rounded-3xl">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-2">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Perfil RIASEC
          </CardTitle>
          <CardDescription className="text-xs uppercase font-bold tracking-widest opacity-60">
            Dimensiones de Personalidad Vocacional
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="hsl(var(--muted-foreground) / 0.2)" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: 'hsl(var(--foreground))' }} 
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                <Radar
                  name="Puntuación"
                  dataKey="A"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.4}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" className="rounded-xl font-bold h-11 border-primary/20 hover:bg-primary/5 text-primary" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Descargar Reporte Completo (PDF)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 px-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Top 5 Carreras Recomendadas
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {diagnosis.recommendedCareers.map((career, index) => {
            const isAvailable = isTecmilenioAvailable(career);
            return (
              <Card key={index} className={cn(
                "group transition-all duration-300 border-none shadow-sm hover:shadow-md",
                isAvailable ? "bg-primary/5 ring-1 ring-primary/20" : "bg-white/80"
              )}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors",
                      isAvailable ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white"
                    )}>
                      {index + 1}
                    </div>
                    <p className={cn("font-bold text-sm leading-tight truncate", isAvailable ? "text-primary" : "text-foreground")}>
                      {career}
                    </p>
                  </div>
                  {isAvailable && (
                    <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase tracking-tighter h-5 whitespace-nowrap shadow-sm">
                      Disponible en Campus
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-[10px] italic text-muted-foreground px-2 pt-2">
          * Los resultados se basan en el algoritmo RIASEC. Las carreras marcadas coinciden con nuestra oferta educativa vigente.
        </p>
      </div>
    </div>
  );
}
