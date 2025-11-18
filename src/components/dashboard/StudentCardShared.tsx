
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Check, Copy } from 'lucide-react';
import { getRisk, type RiskLevel } from '@/lib/dataProcessor';

export function RiskCell({ value, limit }: { value: number; limit: number; }) {
  const { level } = getRisk(value, limit);
  
  const riskColorMapping: Record<RiskLevel, string> = {
    low: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
    medium: 'bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-300',
    high: 'bg-orange-100 dark:bg-orange-800/50 text-orange-800 dark:text-orange-300',
    sd: 'bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-300'
  };

  return (
    <div className={`px-2 py-1 rounded-md text-center font-semibold ${riskColorMapping[level]}`}>
        {level === 'sd' ? 'SD' : `${value} / ${limit}`}
    </div>
  );
}


export function CopyButton({ textToCopy, tooltipText = 'Copiar' }: { textToCopy: string, tooltipText?: string }) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <TooltipProvider>
            <Tooltip open={isCopied}>
                <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                        {isCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        <span className="sr-only">Copiar</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isCopied ? 'Copiado!' : tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
