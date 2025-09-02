"use client";

import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  children: ReactNode;
}

export function FileUpload({ onFileUpload, isLoading, children }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <>
      <Button 
        variant="default"
        onClick={() => fileInputRef.current?.click()} 
        disabled={isLoading}
      >
        {children}
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls"
        disabled={isLoading}
      />
    </>
  );
}
