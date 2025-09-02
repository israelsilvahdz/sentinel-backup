"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
} from '@/components/ui/sidebar';
import { FileUpload } from './FileUpload';
import { Dashboard } from './Dashboard';
import { DashboardFilters } from './DashboardFilters';

import type { Student, StudentData, Change } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { compareData } from '@/lib/dataProcessor';
import { getStudentData, saveStudentData } from '@/lib/firestore';

function getTodayDataKey() {
  const today = new Date();
  return `datos_${today.toISOString().split('T')[0]}`;
}

function getYesterdayDataKey() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `datos_${yesterday.toISOString().split('T')[0]}`;
}

type FilterType = 'leader' | 'tutor' | 'subject';

interface DashboardContextType {
  filteredStudents: Student[];
  allStudents: Student[];
  changes: Change[];
  isLoading: boolean;
  hasData: boolean;
  leaders: string[];
  tutors: string[];
  subjects: string[];
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  selectedValue: string | null;
  setSelectedValue: (value: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboardFilters() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardProvider');
  }
  return context;
}

export function DashboardLayout() {
  const { toast } = useToast();
  const [currentData, setCurrentData] = useState<StudentData | null>(null);
  const [previousData, setPreviousData] = useState<StudentData | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  
  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedValue(null); // Reset selected value when type changes
  };

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const todayKey = getTodayDataKey();
        const yesterdayKey = getYesterdayDataKey();
        
        const [todayData, yesterdayData] = await Promise.all([
          getStudentData(todayKey),
          getStudentData(yesterdayKey)
        ]);

        setCurrentData(todayData);
        setPreviousData(yesterdayData);

        if (todayData && yesterdayData) {
          setChanges(compareData(todayData, yesterdayData));
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error de Carga',
          description: 'No se pudieron cargar los datos desde la base de datos.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [toast]);
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await parseExcel(file);
      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Error de Formato',
          description: 'El archivo Excel no tiene el formato esperado o está vacío. Por favor, revisa las columnas.',
        });
        setIsLoading(false);
        return;
      }

      const todayKey = getTodayDataKey();
      
      const previousDayData = currentData || await getStudentData(getYesterdayDataKey());

      setCurrentData(data);
      await saveStudentData(todayKey, data);
      
      if (previousDayData) {
        setPreviousData(previousDayData);
        setChanges(compareData(data, previousDayData));
      }
      
      toast({
        title: 'Éxito',
        description: `Reporte cargado. Se encontraron ${Object.keys(data).length} registros de alumnos.`,
      });
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error al procesar',
        description: `Hubo un problema al leer el archivo Excel.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allStudents = useMemo(() => {
    if (!currentData) return [];
    return Object.values(currentData);
  }, [currentData]);

  const leaders = useMemo(() => [...new Set(allStudents.map(s => s.leader).filter(Boolean).filter(l => l !== 'N/A'))], [allStudents]);
  const tutors = useMemo(() => [...new Set(allStudents.map(s => s.tutor).filter(Boolean).filter(t => t !== 'N/A'))], [allStudents]);
  const subjects = useMemo(() => [...new Set(allStudents.flatMap(s => s.subjects.map(sub => sub.name)).filter(Boolean))], [allStudents]);

  const filteredStudents = useMemo(() => {
    if (!selectedValue) return allStudents;

    let students = allStudents;

    if (filterType === 'leader') {
      students = students.filter(s => s.leader === selectedValue);
    }
    if (filterType === 'tutor') {
      students = students.filter(s => s.tutor === selectedValue);
    }
    if (filterType === 'subject') {
      students = students.map(student => {
        const filteredSubjects = student.subjects.filter(s => s.name === selectedValue);
        return { ...student, subjects: filteredSubjects };
      }).filter(student => student.subjects.length > 0);
    }

    return students;
  }, [allStudents, filterType, selectedValue]);

  const contextValue: DashboardContextType = {
    filteredStudents,
    allStudents,
    changes,
    isLoading,
    hasData: !!currentData,
    leaders,
    tutors,
    subjects,
    filterType,
    setFilterType: handleSetFilterType,
    selectedValue,
    setSelectedValue,
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <h2 className="text-xl font-semibold">Filtros</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <DashboardFilters />
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
                 <SidebarTrigger className="md:hidden"/>
                 <div className="flex-1">
                    <h1 className="font-semibold text-lg">Academic Sentinel</h1>
                 </div>
                <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
            </header>
            <Dashboard />
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
