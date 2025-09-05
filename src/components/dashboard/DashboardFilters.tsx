

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
    professors,
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
    setGroupId,
  } = useDashboardFilters();

  if (!hasData && !isLoading) return null;
  
  if (isLoading) {
      return (
          <div className="flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-8 bg-muted rounded w-48"></div>
          </div>
      );
  }

  const options: string[] = {
    leader: leaders,
    tutor: tutors,
    subject: subjects,
    professor: professors
  }[filterType] || [];

  const handleValueChange = (value: string | null) => {
    setSelectedValue(value === 'all' ? null : value);
    setCaseType(null); // Clear case type when selecting a new value
    setSubjectRiskFilter(null);
    setGroupId(null);
  };

  const handleFilterTypeChange = (val: string) => {
    setFilterType(val as any);
    setSelectedValue(null);
    setCaseType(null); // Also clear case type here
    setSubjectRiskFilter(null);
    setGroupId(null);
  }
  
  const hasActiveComplexFilter = !!caseType || !!subjectRiskFilter;

  const clearComplexFilters = () => {
    setCaseType(null);
    setSubjectRiskFilter(null);
    setGroupId(null);
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
            <Filter size={16}/>
            <span className="text-sm">Filtrar por:</span>
        </div>
        
        <RadioGroup value={filterType} onValueChange={handleFilterTypeChange} className="flex gap-4">
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="leader" id="r-leader" />
                <Label htmlFor="r-leader" className="font-normal">Líder</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="tutor" id="r-tutor" />
                <Label htmlFor="r-tutor" className="font-normal">Tutor</Label>
            </div>
             <div className="flex items-center space-x-2">
                <RadioGroupItem value="professor" id="r-professor" />
                <Label htmlFor="r-professor" className="font-normal">Profesor</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="subject" id="r-subject" />
                <Label htmlFor="r-subject" className="font-normal">Materia</Label>
            </div>
        </RadioGroup>

        <div className="flex items-center gap-2 w-full md:w-auto">
             <Select onValueChange={handleValueChange} value={selectedValue || 'all'} disabled={hasActiveComplexFilter}>
                <SelectTrigger className='w-full md:w-[200px]'>
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
                <Button variant="ghost" size="sm" className="text-primary" onClick={clearComplexFilters}>
                    Limpiar filtro
                </Button>
            )}
        </div>
    </div>
  );
}

    

