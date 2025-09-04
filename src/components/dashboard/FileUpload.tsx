
"use client";

import { useRef, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { File, UploadCloud, X, Loader2 } from 'lucide-react';

interface FileUploadProps extends ButtonProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  isLoading: boolean;
  label?: string;
  icon?: ReactNode;
}

export function FileUpload({ 
  onFileSelect, 
  selectedFile, 
  isLoading, 
  className,
  label = 'Cargar Reporte',
  icon = <UploadCloud className="mr-2 h-4 w-4" />,
  ...props
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    if (isLoading) return;
    if (selectedFile) {
      onFileSelect(null);
    } else {
      fileInputRef.current?.click();
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls"
        disabled={isLoading}
      />
      <Button
        onClick={handleButtonClick}
        disabled={isLoading}
        className={cn("min-w-[180px]", className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Procesando...</span>
          </>
        ) : selectedFile ? (
          <>
            <File className="mr-2 h-4 w-4" />
            <span className="truncate max-w-[120px]">{selectedFile.name}</span>
            <X className="ml-2 h-3 w-3" />
          </>
        ) : (
          <>
            {icon}
            <span>{label}</span>
          </>
        )}
      </Button>
    </>
  );
}

    