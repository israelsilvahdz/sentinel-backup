"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function BitacoraPanel() {
  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Componente Descontinuado</CardTitle>
          <CardDescription>
            Esta sección ha sido eliminada para optimizar costos y simplificar la aplicación.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export function StudentSearchPopover() {
    return null;
}