
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
  className?: string;
}

export function FileUpload({ onFileSelect, selectedFile, isLoading, label, icon, className }: FileUploadProps) {
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
    <div className={cn("w-full", className)}>
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
            "relative w-full border-2 border-dashed rounded-lg p-3 flex flex-row items-center justify-center text-center cursor-pointer hover:border-primary transition-colors min-h-[60px]",
            isLoading && "cursor-not-allowed opacity-60",
            selectedFile && "border-solid border-primary bg-primary/5"
        )}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        {selectedFile ? (
            <>
                <File className="h-6 w-6 text-primary mr-3 shrink-0" />
                <div className='text-left'>
                    <p className="text-xs font-semibold text-primary">{label}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{selectedFile.name}</p>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-5 w-5 rounded-full"
                    onClick={handleRemoveFile}
                    disabled={isLoading}
                >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Quitar archivo</span>
                </Button>
            </>
        ) : (
            <>
                <div className="text-muted-foreground mr-3 shrink-0">{icon}</div>
                <div className='text-left'>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Seleccionar un .xlsx</p>
                </div>
            </>
        )}
      </div>
    </div>
  );
}
