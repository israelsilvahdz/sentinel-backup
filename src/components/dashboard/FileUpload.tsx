"use client";

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      <label className="text-sm font-medium">Reporte de Alumnos</label>
      <Button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isLoading}
        className='w-full md:w-auto'
      >
        <Upload className="mr-2 h-4 w-4" />
        {isLoading ? 'Procesando...' : 'Cargar Reporte Diario (Excel)'}
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls"
        disabled={isLoading}
      />
    </div>
  );
}
