
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, FileText, Award } from 'lucide-react';
import { type Student, type SubjectSummary, type Team } from "@/types/student";
import { getStudentOverallRisk, type RiskLevel } from '@/lib/dataProcessor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '../ui/button';
import { useDashboardFilters } from './DashboardClient';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { ChangeHistory } from './ChangeHistory';
import { StudentSubjects } from './StudentSubjects';


interface StudentCardProps {
  student: Student;
  teams: Team[];
  startOpen?: boolean;
  isDialog?: boolean;
}

function OverallRiskBadge({ student, subjects }: { student: Student, subjects: (SubjectSummary[]) }) {
    const { overallRisk } = getStudentOverallRisk(student, subjects);

    if (overallRisk === 'low') return null;

    const config: Record<string, { text: string; className: string; }> = {
        medium: { text: 'En Observación', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
        high: { text: 'Crítico', className: 'bg-red-100 text-red-800 border-red-300' },
    };

    const riskConfig = config[overallRisk];
    if (!riskConfig) return null;

    return <Badge variant="outline" className={`ml-2 ${riskConfig.className}`}>{riskConfig.text}</Badge>;
}

export function StudentCard({ student, teams, startOpen = false, isDialog = false }: StudentCardProps) {
  const [isOpen, setIsOpen] = useState(startOpen);
  
  const teamName = useMemo(() => {
    if (!teams || teams.length === 0) return null;
    const studentTeam = teams.find(team => 
        Array.isArray(team.members) && team.members.some(member => member.id === student.id)
    );
    return studentTeam?.name;
  }, [teams, student.id]);


  const cardTitleContent = (
    <div className="flex items-center">
      {student.name}
      {teamName && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-2">
                <Award className="h-5 w-5 text-blue-600" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Equipo: {teamName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {student.subjectSummaries && <OverallRiskBadge student={student} subjects={student.subjectSummaries} />}
    </div>
  );

  if (isDialog) {
    // Render content directly without collapsible for Dialog view
    return (
      <Card className="h-full flex flex-col border-none shadow-none">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="flex items-center text-lg">
                      {cardTitleContent}
                    </CardTitle>
                    <CardDescription>Matrícula: {student.id} | Líder: {student.leader} | Tutor: {student.tutor}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <ScrollArea className="flex-1 pr-6 -mr-6">
            <StudentSubjects student={student} isOpen={true} />
        </ScrollArea>
      </Card>
    )
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="flex items-center text-lg">
                      {cardTitleContent}
                    </CardTitle>
                    <CardDescription>Matrícula: {student.id} | Líder: {student.leader} | Tutor: {student.tutor}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>EXPEDIENTE</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                             <DialogHeader>
                                <DialogTitle className="flex items-center text-2xl gap-3">
                                    <FileText />
                                    Expediente del Alumno
                                </DialogTitle>
                                <DialogDescription>
                                  {student.name} ({student.id}) | Líder: {student.leader} | Tutor: {student.tutor}
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="pr-6 flex-1">
                                <ChangeHistory studentId={student.id} />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>
        </CardHeader>
        <CollapsibleContent>
          <StudentSubjects student={student} isOpen={isOpen} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
