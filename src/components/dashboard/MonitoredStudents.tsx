"use client";

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

interface MonitoredStudentsProps {
  value: string;
  onChange: (value: string) => void;
  onUpdateIds: (ids: string[]) => void;
}

export function MonitoredStudents({ value, onChange, onUpdateIds }: MonitoredStudentsProps) {
  const { toast } = useToast();

  const handleSave = () => {
    const ids = value.split(',').map(id => id.trim()).filter(Boolean);
    onUpdateIds(ids);
    toast({
        title: 'Lista Guardada',
        description: 'La lista de matrículas de alumnos ha sido guardada.',
    })
  };
  
  return (
    <div className="space-y-2">
      <Label htmlFor="monitored-students-input">Matrículas de Alumnos Tutorados</Label>
      <Textarea
        id="monitored-students-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pega aquí una lista de matrículas separadas por comas."
        className="min-h-[100px] bg-card"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={!value.trim()}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Lista
        </Button>
      </div>
    </div>
  );
}
