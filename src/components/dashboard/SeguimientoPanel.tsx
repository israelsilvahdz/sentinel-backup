

"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function SeguimientoPanel() {
  return (
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <Card>
        <CardHeader>
          <CardTitle>Componente Descontinuado</CardTitle>
          <CardDescription>
            Esta sección ha sido reemplazada y su funcionalidad eliminada para optimizar costos.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
