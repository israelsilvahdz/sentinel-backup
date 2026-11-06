"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ProjectionsPanel() {
    return (
        <div className="space-y-8 p-4 md:p-8 pt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Función Desactivada</CardTitle>
                    <CardDescription>
                        El panel de proyecciones ha sido desactivado.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
