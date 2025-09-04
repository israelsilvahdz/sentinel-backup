
"use client";

import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { File, UploadCloud, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  isLoading: boolean;
  label: string;
  icon: ReactNode;
}

export function FileUpload({ onFileSelect, selectedFile, isLoading, label, icon }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
  }

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls"
        disabled={isLoading}
      />
      <div 
        className={cn(
            "relative w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors",
            isLoading && "cursor-not-allowed opacity-60",
            selectedFile && "border-solid border-primary bg-primary/5"
        )}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        {selectedFile ? (
            <>
                <File className="h-8 w-8 text-primary" />
                <p className="mt-2 text-sm font-semibold text-primary">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground truncate max-w-full px-4">{selectedFile.name}</p>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 rounded-full"
                    onClick={handleRemoveFile}
                    disabled={isLoading}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Quitar archivo</span>
                </Button>
            </>
        ) : (
            <>
                <div className="text-muted-foreground">{icon}</div>
                <p className="mt-2 text-sm font-semibold">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">Haz clic para seleccionar un archivo .xlsx</p>
            </>
        )}
      </div>
    </div>
  );
}

    