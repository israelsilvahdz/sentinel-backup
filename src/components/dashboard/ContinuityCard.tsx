"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider, Tooltip as TooltipUI, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { 
  Users, BookOpen, MessageSquare, GraduationCap, ChevronDown, ChevronUp, 
  ArrowUpRight, Group, CheckCircle2, History, Send, Search, MinusCircle, 
  AlertTriangle, Trophy, TrendingUp, Calendar as CalendarIcon, Clock, HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ContinuityStudent, ContinuityLocalStatus, ContinuityTrackingInfo, CareerOption, CareerType } from '@/types/student';
import { useDashboardFilters } from './DashboardClient';
import { RiasecChart } from './RiasecChart';

const UNIVERSITY_OPTIONS = [
  "TECMILENIO",
  "UANL",
  "TEC DE MONTERREY",
  "UVM",
  "UDEM",
  "OTRA"
];

interface ContinuityCardProps {
  student: ContinuityStudent;
  localStatus?: ContinuityLocalStatus;
  isExpanded: boolean;
  careerCatalog: CareerOption[];
  onToggle: () => void;
  onUpdateIndeciso: (id: string, val: boolean) => void;
  onUpdateWorkshopAttended: (id: string, val: boolean) => void;
  onUpdateTracking: (id: string, info: ContinuityTrackingInfo) => void;
  onAddComment: (id: string, text: string, author: string) => void;
  onJumpToStudent: () => void;
}

export function ContinuityCard({ 
  student, localStatus, isExpanded, careerCatalog, onToggle, onUpdateIndeciso, onUpdateWorkshopAttended, onUpdateTracking, onAddComment, onJumpToStudent
}: ContinuityCardProps) {
  const isHighValueRisk = !student.isInscribed && student.average >= 90 && student.status.toLowerCase().includes('descartado');
  const vocational = localStatus?.vocationalDiagnosis;
  const riasec = localStatus?.riasecDiagnosis;
  const tracking = localStatus?.trackingInfo || { chosenUniversity: '', chosenCareers: [], processStatus: 'Pendiente', resultDate: '' };
  const survey = localStatus?.encuestaEleccionReciente;
  const isSOS = !student.isInscribed && vocational && vocational.urgencyLevel >= 8;
  const isIndeciso = !student.isInscribed && localStatus?.isIndeciso;
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
  
  const [university, setUniversity] = useState(tracking.chosenUniversity);
  const [otherUniversity, setOtherUniversity] = useState('');
  const [procStatus, setProcStatus] = useState(tracking.processStatus);
  const [resDate, setResDate] = useState(tracking.resultDate);
  const [careers, setCareers] = useState<string[]>(tracking.chosenCareers);
  const [careerSearch, setCareerSearch] = useState('');
  const [isCareerPopoverOpen, setIsCareerPopoverOpen] = useState(false);

  const handleAddCareer = (careerName: string) => { 
    if (!careers.includes(careerName)) setCareers(prev => [...prev, careerName]); 
    setIsCareerPopoverOpen(false); 
    setCareerSearch(''); 
  };
  const handleRemoveCareer = (idx: number) => { setCareers(prev => prev.filter((_, i) => i !== idx)); };
  const handleSaveTracking = () => { onUpdateTracking(student.id, { chosenUniversity: university === 'OTRA' ? otherUniversity : university, chosenCareers: careers, processStatus: procStatus, resultDate: resDate }); };
  
  const filteredCareerOptions = useMemo(() => 
    careerSearch ? careerCatalog.filter(c => c.name.toLowerCase().includes(careerSearch.toLowerCase())) : careerCatalog, 
    [careerSearch, careerCatalog]
  );

  return (
    <TooltipProvider>
    <Card className={cn("transition-all border-l-4", student.isInscribed ? "border-l-green-500" : "border-l-muted", (isHighValueRisk || isSOS || hasFalseInscribedAlert) && "ring-2 ring-red-500/50", isIndeciso && "border-l-purple-500 bg-purple-50/5")}>
      <div className="p-4 flex flex-col cursor-pointer hover:bg-muted/5" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm", student.isInscribed ? "bg-green-600" : "bg-muted-foreground/40")}>
              {student.isInscribed ? <GraduationCap className="h-5 w-5" /> : student.id.substring(0, 2)}
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
              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-emerald-600/60 tracking-widest">Carrera Seleccionada</p>
                  <p className="text-sm font-bold text-emerald-900">{survey.carreraElegida || 'Sin especificar'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-emerald-600/60 tracking-widest">Universidad</p>
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
          {!student.isInscribed && (
            <div className="pt-4 border-t space-y-4">
              <Label className="text-xs uppercase font-bold text-primary flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Seguimiento de Decisión Final</Label>
              <div className="bg-background p-6 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Universidad Elegida</Label>
                    <Select value={UNIVERSITY_OPTIONS.includes(university) ? university : (university ? 'OTRA' : '')} onValueChange={(val) => { setUniversity(val); if (val !== 'OTRA') setOtherUniversity(''); }}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{UNIVERSITY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                    {university === 'OTRA' && <Input value={otherUniversity} onChange={e => setOtherUniversity(e.target.value)} placeholder="¿Cuál?" className="rounded-xl mt-2" />}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Carrera(s) Seleccionada(s)</Label>
                    <Popover open={isCareerPopoverOpen} onOpenChange={setIsCareerPopoverOpen}>
                      <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start rounded-xl h-10 text-muted-foreground"><Search className="mr-2 h-4 w-4" /> Buscar carrera...</Button></PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Ej. Medicina..." value={careerSearch} onValueChange={setCareerSearch} /><CommandList><CommandEmpty>No encontrada.</CommandEmpty><CommandGroup><ScrollArea className="h-[200px]">{filteredCareerOptions.map(c => <CommandItem key={c.name} onSelect={() => handleAddCareer(c.name)} className="flex items-center justify-between"><span className="text-xs font-bold">{c.name}</span><Badge className={cn("text-[8px] h-4 uppercase", c.type === 'in-campus' ? "bg-primary/10 text-primary" : c.type === 'other-campus' ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700")}>{c.type === 'in-campus' ? 'Local' : c.type === 'other-campus' ? 'Otro TM' : 'Externa'}</Badge></CommandItem>)}</ScrollArea></CommandGroup></CommandList></Command></PopoverContent>
                    </Popover>
                    <div className="flex flex-wrap gap-2 mt-3">{careers.map((c, i) => <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 rounded-lg border gap-2">{c}<button onClick={() => handleRemoveCareer(i)} className="text-destructive"><MinusCircle className="h-3.5 w-3.5" /></button></Badge>)}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-xs font-bold">Estatus</Label><Select value={procStatus} onValueChange={setProcStatus}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendiente">Pendiente</SelectItem><SelectItem value="Admitido">Admitido</SelectItem><SelectItem value="Inscrito">Inscrito en otra</SelectItem><SelectItem value="Declinado">Declinado</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-xs font-bold">Fecha Resultados</Label><Input type="date" value={resDate} onChange={e => setResDate(e.target.value)} className="rounded-xl" /></div>
                  </div>
                  <div className="pt-4 flex justify-end"><Button onClick={handleSaveTracking} className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/10"><Send className="mr-2 h-4 w-4" /> Guardar</Button></div>
                </div>
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
