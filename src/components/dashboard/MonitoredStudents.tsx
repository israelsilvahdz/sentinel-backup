"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateListOfMonitoredStudents } from '@/ai/flows/generate-list-of-monitored-students';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

interface MonitoredStudentsProps {
  value: string;
  onChange: (value: string) => void;
  onUpdateIds: (ids: string[]) => void;
}

export function MonitoredStudents({ value, onChange, onUpdateIds }: MonitoredStudentsProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (prompt: string) => {
    setIsAiLoading(true);
    try {
      const result = await generateListOfMonitoredStudents({ studentIds: prompt });
      if (result.studentIds) {
        const ids = result.studentIds.map(id => id.trim()).filter(Boolean);
        const idsString = ids.join(', ');
        onChange(idsString);
        onUpdateIds(ids);
        toast({
            title: 'Lista Actualizada',
            description: 'La lista de alumnos ha sido procesada y guardada.',
        })
      }
    } catch (error) {
      console.error('Error with AI processing student IDs:', error);
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: 'No se pudo procesar la lista de matrículas.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };
  
  const handleBlur = () => {
    if (value.trim()) {
        handleGenerate(value);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="monitored-students-input">Matrículas de Alumnos Tutorados</Label>
      <Textarea
        id="monitored-students-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Pega aquí una lista de matrículas separadas por comas, o pide a la IA que genere ejemplos."
        className="min-h-[100px] bg-card"
        disabled={isAiLoading}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => handleGenerate(value)} disabled={isAiLoading || !value.trim()}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isAiLoading ? 'Procesando...' : 'Validar y Guardar Lista'}
        </Button>
        <Button variant="secondary" onClick={() => handleGenerate('Generar 5 matrículas de ejemplo')} disabled={isAiLoading}>
            Generar Ejemplos
        </Button>
      </div>
    </div>
  );
}
