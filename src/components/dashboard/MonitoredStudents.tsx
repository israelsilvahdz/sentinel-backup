"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

interface MonitoredStudentsProps {
  value: string;
  onChange: (value: string) => void;
  onUpdateIds: (ids: string[], idsString: string) => Promise<void>;
}

export function MonitoredStudents({ value, onChange, onUpdateIds }: MonitoredStudentsProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  // Update internal state when the prop changes
  if (value !== currentValue && !isSaving) {
    setCurrentValue(value);
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
    onChange(e.target.value);
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    const ids = currentValue.split(',').map(id => id.trim()).filter(Boolean);
    await onUpdateIds(ids, currentValue);
    setIsSaving(false);
  };
  
  return (
    <div className="space-y-2">
      <Label htmlFor="monitored-students-input">Matrículas de Alumnos Tutorados</Label>
      <Textarea
        id="monitored-students-input"
        value={currentValue}
        onChange={handleTextChange}
        placeholder="Pega aquí una lista de matrículas separadas por comas."
        className="min-h-[100px] bg-card"
        disabled={isSaving}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={!currentValue.trim() || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Guardando...' : 'Guardar Lista'}
        </Button>
      </div>
    </div>
  );
}
