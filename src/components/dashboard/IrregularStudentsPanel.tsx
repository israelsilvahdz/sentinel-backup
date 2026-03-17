
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { parseKardexExcel, type IrregularStudent } from '@/lib/kardexParser';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, CheckCircle2, FileUp, UserCheck, UserX, 
  GraduationCap, BookOpen, Search, TrendingUp, Info, ListChecks 
} from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';

export function IrregularStudentsPanel() {
    const { toast } = useToast();
    const [kardexFile, setKardexFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [students, setStudents] = useState<IrregularStudent[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [analysisDone, setAnalysisDone] = useState(false);

    const handleFileUpload = useCallback(async (file: File | null) => {
        if (!file) {
            setKardexFile(null);
            setAnalysisDone(false);
            setStudents([]);
            return;
        }
        setKardexFile(file);
        setIsProcessing(true);
        setAnalysisDone(false);

        try {
            const data = await parseKardexExcel(file);
            if (data) {
                setStudents(data);
                toast({
                    title: "Análisis de Egreso Completado",
                    description: `Se procesaron ${data.length} expedientes académicos.`,
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error de Formato",
                description: error.message || "Asegúrate de que el Excel contenga las columnas de Matrícula y Materia.",
            });
        } finally {
            setIsProcessing(false);
            setAnalysisDone(true);
        }
    }, [toast]);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = React.useMemo(() => {
        if (students.length === 0) return null;
        const fullyComplete = students.filter(s => s.pendingSubjects.length === 0).length;
        const withPending = students.length - fullyComplete;
        return { fullyComplete, withPending };
    }, [students]);

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-700">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-emerald-900 p-8 md:p-10 text-white shadow-2xl">
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-white/10">
                            <GraduationCap className="h-3 w-3" /> Auditoría de Graduación 2026
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Análisis de Alumnos Irregulares</h1>
                        <p className="text-emerald-50/80 max-w-xl">
                            Sube el Kardex masivo para identificar materias pendientes de tetramestres anteriores y proyecciones de egreso.
                        </p>
                    </div>
                    <FileUpload
                        onFileSelect={handleFileUpload}
                        selectedFile={kardexFile}
                        isLoading={isProcessing}
                        label="Cargar Kardex (Excel)"
                        icon={<FileUp className="h-5 w-5" />}
                        className="h-14 rounded-2xl font-black shadow-xl"
                    />
                </div>
                <div className="absolute right-[-10%] top-[-20%] w-96 h-96 bg-white/10 rounded-full blur-[100px]" />
            </header>

            {analysisDone && stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-none shadow-sm bg-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase text-primary tracking-widest">Total Analizados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-primary">{students.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-red-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase text-red-700 tracking-widest">Con Materias Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-red-600">{stats.withPending}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-emerald-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase text-emerald-700 tracking-widest">Plan Completado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-emerald-600">{stats.fullyComplete}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardHeader className="border-b bg-white/50 pb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <CardTitle className="text-xl font-black tracking-tight">Resultados del Análisis</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Escaneo de trayectoria académica total</CardDescription>
                        </div>
                        {analysisDone && (
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                                <Input 
                                    placeholder="Buscar por nombre o ID..." 
                                    className="pl-10 h-10 rounded-xl bg-white border-none shadow-inner"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {!analysisDone ? (
                         <div className="text-center py-32 space-y-4">
                            <div className="mx-auto bg-muted p-6 rounded-full w-fit">
                                <AlertCircle className="h-12 w-12 text-muted-foreground/40" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold opacity-60">Esperando archivo de Kardex</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    Sube el reporte de "Kardex por Alumno" para iniciar la auditoría automática de materias.
                                </p>
                            </div>
                        </div>
                    ) : filteredStudents.length > 0 ? (
                        <div className="p-4 md:p-6 space-y-4">
                             <Accordion type="multiple" className="w-full space-y-3">
                                {filteredStudents.map(student => (
                                    <AccordionItem value={student.id} key={student.id} className="border border-primary/5 rounded-2xl bg-white shadow-sm overflow-hidden group">
                                        <AccordionTrigger className="hover:no-underline px-6 py-4">
                                            <div className='flex flex-col md:flex-row md:items-center gap-4 flex-1 text-left'>
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                                    student.pendingSubjects.length > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {student.pendingSubjects.length > 0 ? <UserX size={20} /> : <UserCheck size={20} />}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-base tracking-tight">{student.name}</span>
                                                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-tighter opacity-60">{student.id}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 w-full max-w-md">
                                                        <Progress value={student.progressPercentage} className="h-1.5 flex-1" />
                                                        <span className="text-[10px] font-black text-primary shrink-0 uppercase tracking-widest">{student.progressPercentage}% completado</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                                                    {student.pendingSubjects.length > 0 ? (
                                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none font-bold">
                                                            {student.pendingSubjects.length} Materias Pendientes
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold">
                                                            Plan Completado
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 pt-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <h4 className='text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2'>
                                                        <ListChecks className="h-3 w-3" /> Detalle de Materias Faltantes
                                                    </h4>
                                                    {student.pendingSubjects.length > 0 ? (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {student.pendingSubjects.map((subject, index) => (
                                                                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/10 transition-all">
                                                                    <span className="text-sm font-bold text-foreground/80">{subject.name}</span>
                                                                    <Badge variant="secondary" className="text-[10px] font-black uppercase bg-primary/5 text-primary border-none">
                                                                        {subject.term}° Tetra
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200">
                                                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">No hay materias pendientes</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-4 bg-muted/20 p-6 rounded-2xl border border-dashed">
                                                    <h4 className='text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2'>
                                                        <TrendingUp className="h-3 w-3" /> Resumen de Auditoría
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground font-medium">Materias Aprobadas</span>
                                                            <span className="font-bold text-emerald-600">{student.completedCount}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground font-medium">Total Requeridas</span>
                                                            <span className="font-bold">{student.totalRequired}</span>
                                                        </div>
                                                        <div className="pt-2 border-t flex items-center gap-2">
                                                            <Info className="h-3.5 w-3.5 text-primary opacity-60" />
                                                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                                                                Este análisis solo considera materias obligatorias del plan de estudios. No incluye optativas flexibles.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                           <UserCheck className="mx-auto h-16 w-16 text-emerald-500/20" />
                            <h3 className="mt-4 text-xl font-bold opacity-60">¡Todo en orden!</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                No se encontraron alumnos con materias pendientes en este filtro.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
