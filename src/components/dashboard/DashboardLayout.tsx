
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
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

import type { Student, StudentData, Change } from '@/types/student';
import { parseExcel } from '@/lib/excelParser';
import { useToast } from '@/hooks/use-toast';
import { compareData } from '@/lib/dataProcessor';
import { getStudentData, saveStudentData, deleteAllData } from '@/lib/firestore';

function parseDateFromFileName(fileName: string): Date | null {
    // Extracts date like DD.MM.YY from a string like "fileName_DD.MM.YY.xlsx"
    const match = fileName.match(/(\d{2})\.(\d{2})\.(\d{2})/);
    if (!match) return null;

    const [_, day, month, year] = match;
    // Assuming '25' means '2025'
    const fullYear = parseInt(year, 10) + 2000;
    
    // Month is 0-indexed in JavaScript Dates
    return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10));
}

function getDataKeyFromDate(date: Date): string {
    return `datos_${date.toISOString().split('T')[0]}`;
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
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterType, setFilterType] = useState<FilterType>('leader');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  
  const handleSetFilterType = (type: FilterType) => {
    setFilterType(type);
    setSelectedValue(null); // Reset selected value when type changes
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const todayKey = getDataKeyFromDate(today);
      const yesterdayKey = getDataKeyFromDate(yesterday);
      
      const [todayData, yesterdayData] = await Promise.all([
        getStudentData(todayKey),
        getStudentData(yesterdayKey)
      ]);

      setCurrentData(todayData);

      if (todayData && yesterdayData) {
        setChanges(compareData(todayData, yesterdayData));
      } else {
        setChanges([]);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error de Carga',
        description: 'No se pudieron cargar los datos iniciales desde la base de datos.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, [toast]);
  
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const fileDate = parseDateFromFileName(file.name);
      if(!fileDate) {
        toast({
          variant: 'destructive',
          title: 'Nombre de archivo inválido',
          description: 'El nombre del archivo debe contener la fecha en formato DD.MM.YY (ej. reporte_22.08.25.xlsx).',
        });
        setIsLoading(false);
        return;
      }
      
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

      const currentFileKey = getDataKeyFromDate(fileDate);
      const previousDayDate = new Date(fileDate);
      previousDayDate.setDate(fileDate.getDate() - 1);
      const previousFileKey = getDataKeyFromDate(previousDayDate);

      await saveStudentData(currentFileKey, data);
      const previousDayData = await getStudentData(previousFileKey);

      setCurrentData(data);
      
      if (previousDayData) {
        setChanges(compareData(data, previousDayData));
      } else {
        setChanges([]);
      }
      
      toast({
        title: 'Éxito',
        description: `Reporte de ${fileDate.toLocaleDateString()} cargado. Se encontraron ${Object.keys(data).length} registros.`,
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

  const handleDeleteAllData = async () => {
    if (!window.confirm('¿Estás seguro de que quieres borrar TODOS los datos de prueba? Esta acción es irreversible.')) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteAllData();
      setCurrentData(null);
      setChanges([]);
      toast({
        title: 'Datos Eliminados',
        description: 'Todos los datos de prueba han sido borrados de Firestore.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al Eliminar',
        description: 'No se pudieron borrar los datos.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const allStudents = useMemo(() => {
    if (!currentData) return [];
    return Object.values(currentData);
  }, [currentData]);

  const leaders = useMemo(() => [...new Set(allStudents.map(s => s.leader).filter(Boolean))], [allStudents]);
  const tutors = useMemo(() => [...new Set(allStudents.map(s => s.tutor).filter(Boolean))], [allStudents]);
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
                 <Button variant="destructive" size="sm" onClick={handleDeleteAllData} disabled={isLoading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Borrar Datos (Test)
                </Button>
                <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
            </header>
            <Dashboard />
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
