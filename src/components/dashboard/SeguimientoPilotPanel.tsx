

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDashboardFilters } from './DashboardClient';
import { useToast } from '@/hooks/use-toast';
import { addSeguimientoEntry } from '@/lib/firebase-services';
import type { TeamTask } from '@/types/student';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, FileWarning, User } from 'lucide-react';
import { StudentSearchPopover } from './BitacoraPanel'; 
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// This component is no longer used and will be replaced by the new SeguimientoPanel Kanban view.
// It is kept in the codebase for reference but is not actively displayed.

const pilotSchema = z.object({
  studentId: z.string().min(1, "Se requiere seleccionar un alumno."),
  studentName: z.string(),
  attendedBy: z.string().min(1, "El campo 'Atendido por' es requerido."),
  topic: z.string().min(1, "El campo 'Tema' es requerido."),
  notes: z.string().optional(),
  parentsContacted: z.boolean().default(false),
});

type PilotFormValues = z.infer<typeof pilotSchema>;

export function SeguimientoPilotPanel() {
  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Componente Descontinuado</CardTitle>
          <CardDescription>
            Esta sección ha sido reemplazada por el nuevo tablero de "Seguimientos".
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
