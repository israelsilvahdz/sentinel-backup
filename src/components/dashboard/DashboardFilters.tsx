"use client";

import { useDashboardFilters } from './DashboardLayout';
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

export function DashboardFilters() {
  const {
    leaders,
    tutors,
    subjects,
    filterType,
    setFilterType,
    selectedValue,
    setSelectedValue,
    hasData,
  } = useDashboardFilters();

  if (!hasData) return null;

  const options: string[] = {
    leader: leaders,
    tutor: tutors,
    subject: subjects,
  }[filterType] || [];

  const handleValueChange = (value: string | null) => {
    setSelectedValue(value === 'all' ? null : value);
  };
  
  return (
    <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
            <Filter size={16}/>
            <span>Filtros</span>
        </div>
        
        <div>
            <label className="text-sm font-medium">Filtrar por</label>
            <RadioGroup value={filterType} onValueChange={(val) => setFilterType(val as any)} className="mt-2">
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

        <div>
            <label className="text-sm font-medium">Seleccionar valor</label>
             <Select onValueChange={handleValueChange} value={selectedValue || 'all'}>
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
        </div>
    </div>
  );
}
