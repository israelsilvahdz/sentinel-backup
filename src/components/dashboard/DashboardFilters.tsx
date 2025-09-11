

"use client";

import { useDashboardFilters, type FilterType } from './DashboardClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Group } from 'lucide-react';
import { Button } from '../ui/button';
import { useMemo } from 'react';

export function DashboardFilters() {
  const {
    leaders,
    tutors,
    subjects,
    professors,
    groupsForSubject,
    filterType,
    setFilterType,
    selectedValue,
    setSelectedValue,
    groupId,
    setGroupId,
    caseType,
    setCaseType,
    hasData,
    isLoading,
    subjectRiskFilter,
    setSubjectRiskFilter,
  } = useDashboardFilters();
  
  const groupOptions = useMemo(() => groupsForSubject(selectedValue), [selectedValue, groupsForSubject]);

  if (!hasData && !isLoading) return null;
  
  if (isLoading) {
      return (
          <div className="flex items-center gap-4 animate-pulse">
              <div className="h-8 bg-muted rounded w-32"></div>
              <div className="h-8 bg-muted rounded w-48"></div>
          </div>
      );
  }

  const options: string[] = {
    leader: leaders,
    tutor: tutors,
    subject: subjects,
    professor: professors,
  }[filterType] || [];


  const handleValueChange = (value: string | null) => {
    setSelectedValue(value === 'all' ? null : value);
    setCaseType(null);
    setSubjectRiskFilter(null);
    setGroupId(null); // Reset group when main selection changes
  };

  const handleGroupChange = (value: string | null) => {
    setGroupId(value === 'all' ? null : value);
  };

  const handleFilterTypeChange = (val: string) => {
    setFilterType(val as FilterType);
    // No reseteamos selectedValue aquí para que el usuario pueda cambiar de categoría y volver.
  }
  
  const hasActiveComplexFilter = !!caseType || !!subjectRiskFilter;

  const clearComplexFilters = () => {
    setCaseType(null);
    setSubjectRiskFilter(null);
  }

  const filterTypeOptions: { value: FilterType; label: string }[] = [
    { value: 'leader', label: 'Líder' },
    { value: 'tutor', label: 'Tutor' },
    { value: 'professor', label: 'Profesor' },
    { value: 'subject', label: 'Materia' },
  ];

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
            <Filter size={16}/>
            <span className="text-sm">Filtrar por:</span>
        </div>
        
        <Select onValueChange={(value) => handleFilterTypeChange(value)} value={filterType}>
            <SelectTrigger className='w-full md:w-[140px]'>
                <SelectValue placeholder="Categoría..." />
            </SelectTrigger>
            <SelectContent>
                {filterTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>

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

            {filterType === 'subject' && selectedValue && groupOptions.length > 0 && (
                <Select onValueChange={handleGroupChange} value={groupId || 'all'}>
                    <SelectTrigger className="w-full md:w-[120px]">
                        <Group className="h-4 w-4 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="Grupo..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {groupOptions.map(group => (
                            <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {hasActiveComplexFilter && (
                <Button variant="ghost" size="sm" className="text-primary" onClick={clearComplexFilters}>
                    Limpiar filtro
                </Button>
            )}
        </div>
    </div>
  );
}
