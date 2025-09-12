
"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileText, Copy, Check } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import contactData from '@/lib/student-contacts.json';

interface StudentContact {
    nombre: string;
    telefono_alumno: string;
    telefono_papa: string;
    telefono_mama: string;
    correo_alumno: string;
    correo_papa: string;
    correo_mama: string;
}

const contactsMap = new Map<string, StudentContact>(
    Object.entries(contactData)
);


export function DirectoryGenerator() {
    const { toast } = useToast();
    const [outputText, setOutputText] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');
    const [isCopied, setIsCopied] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setFileName('');
            setOutputText('');
            return;
        }

        setFileName(file.name);
        setOutputText(`Archivo seleccionado: ${file.name}. Haz clic en "Generar Directorio" para continuar.`);

        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target?.result) {
                    throw new Error("No se pudo leer el archivo.");
                }
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    throw new Error("El archivo no tiene suficientes filas (encabezado + datos).");
                }

                let generatedText = "### Directorio de Alumnos\n\n";

                const headers: string[] = jsonData[0].map(h => String(h).trim().toUpperCase());
                const matriculaIndex = headers.indexOf('MATRÍCULA');
                const nombreIndex = headers.indexOf('NOMBRE DEL ALUMNO');

                if (matriculaIndex === -1 || nombreIndex === -1) {
                    throw new Error("El archivo debe contener las columnas 'Matrícula' y 'Nombre del alumno'.");
                }

                const rows = jsonData.slice(1);

                rows.forEach(row => {
                    const matricula = String(row[matriculaIndex] || '').trim();
                    const nombre = String(row[nombreIndex] || 'No disponible').trim();
                    
                    if (!matricula) return;

                    const contact = contactsMap.get(matricula);

                    generatedText += "---\n";
                    generatedText += `**Nombre:** ${contact ? contact.nombre : nombre}\n`;
                    generatedText += `**Matrícula:** ${matricula}\n`;
                    generatedText += `**Teléfono Alumno:** ${contact ? contact.telefono_alumno : 'No disponible'}\n`;
                    generatedText += `**Teléfono Papá:** ${contact ? contact.telefono_papa : 'No disponible'}\n`;
                    generatedText += `**Teléfono Mamá:** ${contact ? contact.telefono_mama : 'No disponible'}\n`;
                    generatedText += `**Correo Alumno:** ${contact ? contact.correo_alumno : 'No disponible'}\n`;
                    generatedText += `**Correo Papá:** ${contact ? contact.correo_papa : 'No disponible'}\n`;
                    generatedText += `**Correo Mamá:** ${contact ? contact.correo_mama : 'No disponible'}\n\n`;
                });

                setOutputText(generatedText.trim());
                 toast({
                    title: "¡Directorio Generado!",
                    description: "El texto del directorio ha sido creado y está listo para copiar.",
                });

            } catch (error: any) {
                console.error("Error al procesar el archivo:", error);
                setOutputText(`Error al procesar el archivo: ${error.message}`);
                toast({
                    variant: 'destructive',
                    title: "Error de Procesamiento",
                    description: error.message || "Hubo un problema al leer el archivo Excel.",
                });
            }
        };
        
        reader.onerror = () => {
             toast({
                variant: 'destructive',
                title: "Error de Lectura",
                description: "No se pudo leer el archivo seleccionado.",
            });
        }

        reader.readAsArrayBuffer(file);
    };

    const handleCopy = () => {
        if (!outputText) return;
        navigator.clipboard.writeText(outputText).then(() => {
            setIsCopied(true);
            toast({
                title: "¡Copiado!",
                description: "El directorio se ha copiado a tu portapapeles.",
            });
            setTimeout(() => setIsCopied(false), 2500);
        });
    };

    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Generador de Directorio</h1>
                <p className="text-muted-foreground">
                    Sube un archivo de Excel (.xlsx) con los alumnos del día para generar un directorio de contacto.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>1. Cargar Archivo</CardTitle>
                    <CardDescription>
                        Selecciona el archivo Excel que contiene la lista de alumnos. El proceso comenzará automáticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <label htmlFor="file-input" className="w-full md:w-auto">
                        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md text-sm font-medium cursor-pointer">
                            <UploadCloud className="h-4 w-4" />
                            <span>{fileName ? fileName : 'Seleccionar archivo'}</span>
                        </div>
                        <input
                            type="file"
                            id="file-input"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </label>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>2. Resultado del Directorio</CardTitle>
                            <CardDescription>
                                El texto generado aparecerá aquí. Puedes copiarlo con el botón.
                            </CardDescription>
                        </div>
                         <TooltipProvider>
                            <Tooltip open={isCopied}>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={handleCopy} disabled={!outputText}>
                                        {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isCopied ? '¡Copiado!' : 'Copiar al portapapeles'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>
                <CardContent>
                    <Textarea
                        id="output-area"
                        readOnly
                        value={outputText || 'El directorio de alumnos aparecerá aquí una vez que subas un archivo.'}
                        className="min-h-[400px] w-full font-mono text-sm bg-muted/50"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
