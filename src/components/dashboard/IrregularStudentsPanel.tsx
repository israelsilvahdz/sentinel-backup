
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { parseKardexExcel, type IrregularStudent } from '@/lib/kardexParser';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FileUp, UserCheck, UserX } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';

export function IrregularStudentsPanel() {
    const { toast } = useToast();
    const [kardexFile, setKardexFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [irregularStudents, setIrregularStudents] = useState<IrregularStudent[]>([]);
    const [analysisDone, setAnalysisDone] = useState(false);

    const handleFileUpload = useCallback(async (file: File | null) => {
        if (!file) {
            setKardexFile(null);
            setAnalysisDone(false);
            setIrregularStudents([]);
            return;
        }
        setKardexFile(file);
        setIsProcessing(true);
        setAnalysisDone(false);

        try {
            const data = await parseKardexExcel(file);
            if (data) {
                setIrregularStudents(data);
                toast({
                    title: "Análisis de Kardex Completado",
                    description: `Se encontraron ${data.length} alumnos irregulares.`,
                });
            } else {
                throw new Error("El archivo no tiene el formato esperado o está vacío.");
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error al analizar el archivo",
                description: error.message || "No se pudo procesar el archivo Excel.",
            });
            setIrregularStudents([]);
        } finally {
            setIsProcessing(false);
            setAnalysisDone(true);
        }
    }, [toast]);

    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Análisis de Alumnos Irregulares</h1>
                    <p className="text-muted-foreground">Sube un kardex para identificar alumnos con materias pendientes de tetramestres anteriores.</p>
                </div>
                <FileUpload
                    onFileSelect={handleFileUpload}
                    selectedFile={kardexFile}
                    isLoading={isProcessing}
                    label="Cargar Kardex"
                    icon={<FileUp />}
                />
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Resultados del Análisis</CardTitle>
                </CardHeader>
                <CardContent>
                    {!analysisDone ? (
                         <div className="text-center py-12">
                            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">Esperando archivo</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Por favor, sube el archivo Excel del kardex para iniciar el análisis.
                            </p>
                        </div>
                    ) : irregularStudents.length > 0 ? (
                        <div className='space-y-4'>
                            <p className='text-sm text-muted-foreground'>
                                Se encontraron <span className='font-bold text-destructive'>{irregularStudents.length}</span> alumnos que deben materias de tetramestres pasados.
                            </p>
                             <Accordion type="multiple" className="w-full">
                                {irregularStudents.map(student => (
                                    <AccordionItem value={student.id} key={student.id}>
                                        <AccordionTrigger>
                                            <div className='flex items-center gap-4'>
                                                <UserX className='h-5 w-5 text-destructive' />
                                                <span className='font-semibold'>{student.name}</span>
                                                <Badge variant="outline">Matrícula: {student.id}</Badge>
                                                <Badge variant="secondary">Tetra Actual: {student.currentTerm}</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="pl-8">
                                                <h4 className='font-semibold mb-2'>Materias Pendientes:</h4>
                                                <ul className='list-disc list-inside space-y-1'>
                                                {student.pendingSubjects.map((subject, index) => (
                                                    <li key={index} className='text-muted-foreground'>
                                                        <span className='font-medium text-foreground'>{subject.name}</span> (del {subject.term}° tetra)
                                                    </li>
                                                ))}
                                                </ul>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                           <UserCheck className="mx-auto h-12 w-12 text-green-500" />
                            <h3 className="mt-4 text-lg font-medium">¡Todo en orden!</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                No se encontraron alumnos irregulares en el archivo analizado.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
