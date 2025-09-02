
"use client";

import { useDashboardFilters } from './DashboardClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Filter } from 'lucide-react';
import { Button } from '../ui/button';

export function DashboardFilters() {
  const {
    leaders,
    tutors,
    subjects,
    filterType,
    setFilterType,
    selectedValue,
    setSelectedValue,
    caseType,
    setCaseType,
    hasData,
    isLoading,
    subjectRiskFilter,
    setSubjectRiskFilter,
  } = useDashboardFilters();

  if (!hasData && !isLoading) return null;
  
  if (isLoading) {
      return (
          <div className="space-y-4 p-2 group-data-[collapsible=icon]:hidden">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-muted rounded w-full mt-4"></div>
              </div>
          </div>
      );
  }

  const options: string[] = {
    leader: leaders,
    tutor: tutors,
    subject: subjects,
  }[filterType] || [];

  const handleValueChange = (value: string | null) => {
    setSelectedValue(value === 'all' ? null : value);
    setCaseType(null); // Clear case type when selecting a new value
    setSubjectRiskFilter(null);
  };

  const handleFilterTypeChange = (val: string) => {
    setFilterType(val as any);
    setSelectedValue(null);
    setCaseType(null); // Also clear case type here
    setSubjectRiskFilter(null);
  }
  
  const hasActiveComplexFilter = !!caseType || !!subjectRiskFilter;

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold px-2">
            <Filter size={16}/>
            <span className="group-data-[collapsible=icon]:hidden">Filtros</span>
        </div>
        
        <div className="px-2 group-data-[collapsible=icon]:hidden">
            <label className="text-sm font-medium">Filtrar por</label>
            <RadioGroup value={filterType} onValueChange={handleFilterTypeChange} className="mt-2">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="leader" id="r-leader" />
                    <Label htmlFor="r-leader">Líder</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tutor" id="r-tutor" />
                    <Label htmlFor="r-tutor">Tutor</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="subject" id="r-subject" />
                    <Label htmlFor="r-subject">Materia</Label>
                </div>
            </RadioGroup>
        </div>

        <div className="px-2 group-data-[collapsible=icon]:hidden">
            <label className="text-sm font-medium">Seleccionar valor</label>
             <Select onValueChange={handleValueChange} value={selectedValue || 'all'} disabled={hasActiveComplexFilter}>
                <SelectTrigger className='w-full'>
                    <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        {filterType === 'subject' ? 'Todas' : 'Todos'}
                    </SelectItem>
                    {options.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {hasActiveComplexFilter && (
                <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => { setCaseType(null); setSubjectRiskFilter(null); }}>
                    Limpiar filtro de caso
                </Button>
            )}
        </div>
    </div>
  );
}
