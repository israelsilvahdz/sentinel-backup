"use client";

import React, { useMemo, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Flag,
  Flame,
  Droplets,
  Mountain,
  Send,
  Sparkles,
  Users,
  Wind,
} from "lucide-react";
import { type Change, type Student, type StudentLifeProfile, type SubjectSummary, type Team } from "@/types/student";
import { getStudentOverallRisk } from "@/lib/dataProcessor";
import { describeGraduationPeriod } from '@/lib/student-base-fields';
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "../ui/button";
import { useDashboardFilters } from "./DashboardClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { StudentSubjects } from "./StudentSubjects";
import { SubjectRiskCircles } from './SubjectRiskCircles';
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { fillNotificationTemplate, readNotificationTemplate } from '@/lib/notification-templates';

interface StudentCardProps {
  student: Student;
  teams: Team[];
  changes: Change[];
  startOpen?: boolean;
  isDialog?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (studentId: string, isSelected: boolean) => void;
}

interface CopyBadgeProps {
  value: string;
  display: string;
  title: string;
  description: string;
  className?: string;
}

function normalizeSocietyName(value: string | undefined): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getSocietyStyle(profile?: StudentLifeProfile | null) {
  const society = normalizeSocietyName(profile?.society);

  if (society.includes("fuego")) {
    return {
      label: "Fuego",
      icon: Flame,
      avatarClassName: "from-orange-500 via-orange-400 to-amber-300 text-white shadow-orange-200/80",
      chipClassName: "border-orange-200 bg-orange-50 text-orange-700",
      bannerClassName: "border-orange-200/80 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 text-white shadow-orange-200/60",
      glowClassName: "bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.30),_transparent_60%)]",
      accentTextClassName: "text-orange-700",
      accentSoftClassName: "text-orange-100/90",
    };
  }

  if (society.includes("agua")) {
    return {
      label: "Agua",
      icon: Droplets,
      avatarClassName: "from-cyan-500 via-sky-500 to-blue-500 text-white shadow-cyan-200/80",
      chipClassName: "border-cyan-200 bg-cyan-50 text-cyan-700",
      bannerClassName: "border-blue-200/80 bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-400 text-white shadow-blue-200/60",
      glowClassName: "bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.24),_transparent_60%)]",
      accentTextClassName: "text-cyan-700",
      accentSoftClassName: "text-blue-100/90",
    };
  }

  if (society.includes("tierra")) {
    return {
      label: "Tierra",
      icon: Mountain,
      avatarClassName: "from-emerald-600 via-lime-500 to-amber-500 text-white shadow-emerald-200/80",
      chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bannerClassName: "border-emerald-200/80 bg-gradient-to-r from-emerald-600 via-green-500 to-lime-400 text-white shadow-emerald-200/60",
      glowClassName: "bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.24),_transparent_60%)]",
      accentTextClassName: "text-emerald-700",
      accentSoftClassName: "text-emerald-100/90",
    };
  }

  if (society.includes("aire")) {
    return {
      label: "Aire",
      icon: Wind,
      avatarClassName: "from-violet-600 via-purple-500 to-fuchsia-400 text-white shadow-violet-200/80",
      chipClassName: "border-violet-200 bg-violet-50 text-violet-700",
      bannerClassName: "border-violet-200/80 bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-400 text-white shadow-violet-200/60",
      glowClassName: "bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.24),_transparent_60%)]",
      accentTextClassName: "text-violet-700",
      accentSoftClassName: "text-violet-100/90",
    };
  }

  return {
    label: profile?.society || "Sin sociedad",
    icon: Sparkles,
    avatarClassName: "from-primary/80 to-emerald-800 text-white shadow-primary/20",
    chipClassName: "border-primary/10 bg-primary/5 text-primary",
    bannerClassName: "border-primary/10 bg-gradient-to-r from-primary via-emerald-700 to-emerald-500 text-white shadow-primary/20",
    glowClassName: "bg-[radial-gradient(circle_at_top,_rgba(13,110,103,0.16),_transparent_60%)]",
    accentTextClassName: "text-primary",
    accentSoftClassName: "text-emerald-50/90",
  };
}

function getSocietyDescriptor(label: string): string {
  if (label === "Fuego") return "Impulso, energia y presencia";
  if (label === "Agua") return "Sensibilidad, fluidez y empatia";
  if (label === "Tierra") return "Constancia, estructura y fuerza";
  if (label === "Aire") return "Ideas, movimiento y vision";
  return "Perfil simbolico del alumno";
}

function SocietyBannerEffects({ society }: { society: string }) {
  if (society === "Agua") {
    return (
      <>
        <div className="absolute left-14 top-4 h-10 w-10 rounded-full border border-white/20 bg-white/10" />
        <div className="absolute left-44 top-7 h-5 w-5 rounded-full border border-white/20 bg-white/10" />
        <div className="absolute right-36 top-5 h-8 w-8 rounded-full border border-white/15 bg-white/10" />
        <div className="absolute bottom-3 left-24 h-2 w-28 rounded-full bg-white/10 blur-sm" />
        <div className="absolute bottom-4 right-48 h-2 w-20 rounded-full bg-white/10 blur-sm" />
      </>
    );
  }

  if (society === "Fuego") {
    return (
      <>
        <div className="absolute bottom-0 left-16 h-10 w-6 rounded-t-full bg-white/10 blur-sm" />
        <div className="absolute bottom-0 left-24 h-14 w-8 rounded-t-full bg-white/15 blur-sm" />
        <div className="absolute bottom-0 right-28 h-12 w-7 rounded-t-full bg-white/10 blur-sm" />
        <div className="absolute top-4 right-40 h-6 w-6 rounded-full bg-amber-200/15 blur-md" />
      </>
    );
  }

  if (society === "Aire") {
    return (
      <>
        <div className="absolute left-20 top-5 h-px w-20 bg-white/25" />
        <div className="absolute left-28 top-8 h-px w-14 bg-white/20" />
        <div className="absolute right-24 top-6 h-px w-24 bg-white/25" />
        <div className="absolute right-32 top-10 h-px w-12 bg-white/20" />
        <div className="absolute top-3 left-1/2 h-2 w-2 rounded-full bg-white/20 blur-[1px]" />
      </>
    );
  }

  if (society === "Tierra") {
    return (
      <>
        <div className="absolute bottom-0 left-10 h-4 w-28 rounded-t-3xl bg-black/10" />
        <div className="absolute bottom-0 right-20 h-5 w-32 rounded-t-3xl bg-black/10" />
        <div className="absolute top-5 right-36 h-3 w-3 rounded-full bg-lime-100/20" />
        <div className="absolute top-8 right-28 h-2 w-2 rounded-full bg-lime-100/20" />
      </>
    );
  }

  return null;
}

function OverallRiskBadge({ student, subjects }: { student: Student; subjects: SubjectSummary[] }) {
  const { overallRisk } = getStudentOverallRisk(student, subjects);
  if (overallRisk === "low") {
    return (
      <Badge variant="outline" className="ml-2 h-5 border-emerald-100 bg-emerald-50 text-[10px] font-black uppercase tracking-tighter text-emerald-700">
        Estable
      </Badge>
    );
  }

  const config: Record<string, { text: string; className: string }> = {
    medium: { text: "En observacion", className: "bg-yellow-50 text-yellow-700 border-yellow-100" },
    high: { text: "Critico", className: "bg-orange-50 text-orange-700 border-orange-100" },
    at_limit: { text: "Al limite", className: "bg-orange-50 text-orange-700 border-orange-100" },
    sd: { text: "Sin derecho", className: "bg-red-600 text-white border-none" },
  };

  const riskConfig = config[overallRisk];
  if (!riskConfig) return null;

  return (
    <Badge variant="outline" className={cn("ml-2 h-5 text-[10px] font-black uppercase tracking-tighter", riskConfig.className)}>
      {riskConfig.text}
    </Badge>
  );
}

function CopyBadge({ value, display, title, description, className }: CopyBadgeProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useDashboardFilters();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      toast({ title, description });
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <TooltipProvider>
      <Tooltip open={isCopied}>
        <TooltipTrigger asChild>
          <span
            onClick={handleCopy}
            className={cn(
              "group/copy-id inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-bold tracking-tight transition-colors",
              className
            )}
          >
            {display}
            <span className="opacity-0 transition-opacity group-hover/copy-id:opacity-100">
              {isCopied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-2.5 w-2.5" />}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-bold">Copiado</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MatriculaCopy({ studentId, inverted = false }: { studentId: string; inverted?: boolean }) {
  return (
    <CopyBadge
      value={studentId}
      display={studentId}
      title="Matrícula copiada"
      description={`Se copió la matrícula ${studentId}.`}
      className={cn(
        "font-mono uppercase",
        inverted ? "bg-white/20 text-white hover:bg-white/30" : "bg-muted/30 text-slate-700 hover:bg-muted"
      )}
    />
  );
}

function StudentNameCopy({ studentName, inverted = false }: { studentName: string; inverted?: boolean }) {
  return (
    <CopyBadge
      value={studentName}
      display="Copiar nombre"
      title="Nombre copiado"
      description={`Se copió el nombre ${studentName}.`}
      className={cn(
        inverted ? "bg-white/15 text-white/95 hover:bg-white/25" : "bg-muted/20 text-slate-600 hover:bg-muted/40"
      )}
    />
  );
}

function StudentNameAndIdCopy({ studentName, studentId, inverted = false }: { studentName: string; studentId: string; inverted?: boolean }) {
  return (
    <CopyBadge
      value={`${studentName} - ${studentId}`}
      display="Nombre + matrícula"
      title="Datos copiados"
      description={`Se copió ${studentName} con la matrícula ${studentId}.`}
      className={cn(
        inverted ? "bg-white/15 text-white/95 hover:bg-white/25" : "bg-muted/20 text-slate-600 hover:bg-muted/40"
      )}
    />
  );
}

export function StudentCard({
  student,
  teams,
  changes,
  startOpen = false,
  isDialog = false,
  isSelected = false,
  onSelectionChange = () => {},
}: StudentCardProps) {
  const [isOpen, setIsOpen] = useState(startOpen);
  const {
    studentContacts,
    studentLifeProfiles,
    toast,
    priorityCases,
    togglePriorityCase,
  } = useDashboardFilters();

  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [priorityTopic, setPriorityTopic] = useState(priorityCases[student.id]?.topic || "");

  const isPriority = !!priorityCases[student.id];

  const formatWhatsAppNumber = (phone: string): string => {
    if (!phone) return "";
    const clean = phone.replace(/\D/g, "");
    return `52${clean.slice(-10)}`;
  };

  const generateMessage = (recipient: "student" | "parent"): string => {
    const increaseChangesBySubject: Record<string, { absences: boolean; missed: boolean }> = {};

    (changes || []).forEach((change) => {
      if (change.fieldName === "absences" || change.fieldName === "missedAssignments") {
        const subject = student.subjectSummaries?.find((s) => s.id === change.subjectId);
        if (subject && change.changeType === "increase") {
          if (!increaseChangesBySubject[subject.name]) {
            increaseChangesBySubject[subject.name] = { absences: false, missed: false };
          }
          if (change.fieldName === "absences") increaseChangesBySubject[subject.name].absences = true;
          if (change.fieldName === "missedAssignments") increaseChangesBySubject[subject.name].missed = true;
        }
      }
    });

    const firstName = student.name.split(",")[1]?.trim().split(" ")[0] || student.name.split(" ")[0];
    let message = "";

    if (Object.keys(increaseChangesBySubject).length > 0) {
      for (const subName in increaseChangesBySubject) {
        const info = student.subjectSummaries?.find((s) => s.name === subName);
        if (!info) continue;
        const details = [];
        if (increaseChangesBySubject[subName].absences) details.push(`Faltas: ${info.absences}/${info.absenceLimit}`);
        if (increaseChangesBySubject[subName].missed) details.push(`Tareas NE: ${info.missedAssignments}/${info.missedAssignmentLimit}`);
        message += `• *${subName}*: ${details.join(" y ")}.\n`;
      }
    }
    const key = recipient === "student" ? 'studentFollowUp' : 'parentFollowUp';
    const template = readNotificationTemplate(key);
    return fillNotificationTemplate(template.body, {
      alumno: student.name,
      nombre: firstName,
      riesgo: message ? `Se registraron cambios recientes que conviene revisar:\n${message}\n` : '',
    });
  };

  const handleSend = (e: React.MouseEvent, recipient: "student" | "parent") => {
    e.stopPropagation();
    const contact = studentContacts[student.id];
    const phoneNumber = recipient === "student" ? contact?.studentPhone : contact?.tutorPhone || contact?.momPhone || contact?.dadPhone;

    if (!phoneNumber) {
      toast({ variant: "destructive", title: "Teléfono no encontrado", description: recipient === "parent" ? "Falta Tel. Tutor en el archivo base para este alumno." : "Falta el celular del alumno en el archivo base." });
      return;
    }

    const message = generateMessage(recipient);
    const whatsappUrl = `https://wa.me/${formatWhatsAppNumber(phoneNumber)}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handlePriorityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPriority) togglePriorityCase(student.id, false);
    else setIsPriorityModalOpen(true);
  };

  const handleSavePriority = () => {
    togglePriorityCase(student.id, true, priorityTopic);
    setIsPriorityModalOpen(false);
  };

  const initials = useMemo(() => {
    const parts = student.name.split(",").reverse().join(" ").trim().split(" ").filter(Boolean);
    return (parts[0]?.charAt(0) || "") + (parts[1]?.charAt(0) || "");
  }, [student.name]);

  const lifeProfile = studentLifeProfiles[student.id];
  const graduation = describeGraduationPeriod(student.graduationPeriod || '');
  const societyStyle = getSocietyStyle(lifeProfile);
  const SocietyIcon = societyStyle.icon;
  const hasSociety = !!lifeProfile?.society;

  if (isDialog) {
    return (
      <Card className="flex h-full flex-col border-none shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4">
            <div className={cn("relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br shadow-inner", societyStyle.avatarClassName)}>
              <div className={cn("absolute inset-0 opacity-90", societyStyle.glowClassName)} />
              <div className="relative z-10 flex h-full w-full items-center justify-center font-black text-lg">
                {hasSociety ? <SocietyIcon className="h-6 w-6" /> : initials}
              </div>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                {student.name}
                {lifeProfile?.society && (
                  <Badge variant="outline" className={cn("gap-1 text-[10px] font-black uppercase tracking-widest", societyStyle.chipClassName)}>
                    <SocietyIcon className="h-3 w-3" /> {societyStyle.label}
                  </Badge>
                )}
                {student.subjectSummaries && <OverallRiskBadge student={student} subjects={student.subjectSummaries} />}
                {graduation && <span
                  className={cn('rounded-md px-2 py-1 text-xs font-semibold', graduation.atRiskOfPeriodChange ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600')}
                  title={`${graduation.months} ${graduation.year} · ${graduation.plan}${graduation.atRiskOfPeriodChange ? '. Al límite: si reprueba una materia más, cambiará de periodo de graduación.' : ''}`}
                >Graduación {graduation.raw}{graduation.atRiskOfPeriodChange ? ' · Al límite' : ''}</span>}
              </CardTitle>
              <CardDescription className="mt-0.5 flex flex-wrap items-center gap-2">
                <MatriculaCopy studentId={student.id} />
                <StudentNameCopy studentName={student.name} />
                <StudentNameAndIdCopy studentName={student.name} studentId={student.id} />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">• Lider: {student.leader}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1 -mr-6 pr-6">
          <StudentSubjects student={student} isOpen={true} />
        </ScrollArea>
      </Card>
    );
  }

  return (
    <Card className={cn("group/student overflow-hidden border-none shadow-sm transition-all duration-300 hover:shadow-md", isSelected ? "ring-2 ring-primary" : "", isOpen && "shadow-lg ring-1 ring-primary/5")}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn("grid grid-cols-[minmax(0,1fr)_80px_auto] sm:grid-cols-[minmax(0,1fr)_128px_auto] cursor-pointer items-center gap-2 px-4 py-3 transition-colors", "")}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative z-10 flex shrink-0 items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectionChange(student.id, !!checked)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "h-5 w-5 rounded-md shadow-sm",
                  "border-primary/20 data-[state=checked]:bg-primary"
                )}
              />
              <div className={cn("relative h-10 w-10 overflow-hidden rounded-xl bg-gradient-to-br shadow-inner", societyStyle.avatarClassName)}>
                <div className={cn("absolute inset-0 opacity-90", societyStyle.glowClassName)} />
                <div className="relative z-10 flex h-full w-full items-center justify-center font-black text-sm uppercase">
                  {hasSociety ? <SocietyIcon className="h-5 w-5" /> : <span>{initials}</span>}
                </div>
              </div>
            </div>

            <div className="relative z-10 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={cn("break-words text-base font-bold tracking-tight", isOpen ? "text-primary" : "")}>
                  {student.name}
                </h3>
                {isPriority && (
                  <Badge className="h-5 gap-1 border-none bg-amber-100 text-[9px] font-black uppercase text-amber-700 shadow-sm hover:bg-amber-100">
                    <Flag className="h-2.5 w-2.5 fill-current" /> {priorityCases[student.id].topic}
                  </Badge>
                )}
                {student.subjectSummaries && <OverallRiskBadge student={student} subjects={student.subjectSummaries} />}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MatriculaCopy studentId={student.id} />
                <StudentNameCopy studentName={student.name} />
                <StudentNameAndIdCopy studentName={student.name} studentId={student.id} />
                <span className={cn("hidden text-[10px] font-black uppercase tracking-widest sm:inline", "text-muted-foreground/50")}>
                  Lider: {student.leader}
                </span>
                {lifeProfile?.purpose && (
                  <span className={cn("hidden text-[10px] font-black uppercase tracking-widest md:inline", societyStyle.accentTextClassName)}>
                    Proposito cargado
                  </span>
                )}
                
              </div>
            </div>
          </div>

          <div className="relative z-10 min-w-0">
            <SubjectRiskCircles student={student} />
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover/student:opacity-100">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-8 w-8 rounded-lg", "text-emerald-600 hover:bg-emerald-50")}
                      onClick={(e) => handleSend(e, "student")}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="font-bold">Notificar alumno</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-8 w-8 rounded-lg", "text-blue-600 hover:bg-blue-50")}
                      onClick={(e) => handleSend(e, "parent")}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="font-bold">Notificar padres</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg",
                        isPriority
                            ? "bg-amber-50 text-amber-600"
                            : "text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
                      )}
                      onClick={handlePriorityToggle}
                    >
                      <Flag className={cn("h-4 w-4", isPriority && "fill-current")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="font-bold">Marcar seguimiento</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className={cn("rounded-full p-1 transition-colors", isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="rounded-b-3xl border-t border-muted/50 bg-muted/5 p-2 sm:p-4">
            <StudentSubjects student={student} isOpen={isOpen} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={isPriorityModalOpen} onOpenChange={setIsPriorityModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-black">Seguimiento prioritario</DialogTitle>
            <DialogDescription className="text-xs font-bold">Escribe el tema o motivo de seguimiento para este alumno.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Ej. Faltas por salud, riesgo de baja..."
              value={priorityTopic}
              onChange={(e) => setPriorityTopic(e.target.value)}
              className="rounded-xl font-bold"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPriorityModalOpen(false)} className="rounded-xl font-bold">
              Cancelar
            </Button>
            <Button onClick={handleSavePriority} className="rounded-xl font-bold shadow-lg shadow-primary/20">
              Guardar marcado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
