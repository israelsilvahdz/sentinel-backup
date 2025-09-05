
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { academicEvents, type AcademicEventCategory } from '@/lib/calendarEvents';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays, Coffee, FilePen, GraduationCap, Hand, Lock, Pencil, School, TestTube, UserRoundX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Day, type DayProps } from 'react-day-picker';
import { cn } from '@/lib/utils';


const ICONS: Record<AcademicEventCategory, React.ReactElement> = {
    'Inscripciones': <Pencil className="h-4 w-4" />,
    'Clases': <School className="h-4 w-4" />,
    'Límite': <Hand className="h-4 w-4" />,
    'Asueto': <Coffee className="h-4 w-4" />,
    'Exámenes': <FilePen className="h-4 w-4" />,
    'Receso': <GraduationCap className="h-4 w-4" />,
    'Cierre': <Lock className="h-4 w-4" />,
    'Extraordinario': <TestTube className="h-4 w-4" />,
    'Bajas': <UserRoundX className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<AcademicEventCategory, string> = {
    'Inscripciones': 'bg-blue-500',
    'Clases': 'bg-green-500',
    'Límite': 'bg-red-500',
    'Asueto': 'bg-purple-500',
    'Exámenes': 'bg-yellow-500',
    'Receso': 'bg-indigo-500',
    'Cierre': 'bg-gray-500',
    'Extraordinario': 'bg-orange-500',
    'Bajas': 'bg-pink-500',
};

const CATEGORY_BG_TEXT_COLORS: Record<AcademicEventCategory, string> = {
    'Inscripciones': 'bg-blue-100 text-blue-800',
    'Clases': 'bg-green-100 text-green-800',
    'Límite': 'bg-red-100 text-red-800',
    'Asueto': 'bg-purple-100 text-purple-800',
    'Exámenes': 'bg-yellow-100 text-yellow-800',
    'Receso': 'bg-indigo-100 text-indigo-800',
    'Cierre': 'bg-gray-100 text-gray-800',
    'Extraordinario': 'bg-orange-100 text-orange-800',
    'Bajas': 'bg-pink-100 text-pink-800',
};


const eventsByDate = academicEvents.reduce((acc, event) => {
    const dateKey = format(event.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
        acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
}, {} as Record<string, typeof academicEvents>);

function DayWithTooltip(props: DayProps) {
    const dateKey = format(props.date, 'yyyy-MM-dd');
    const eventsForDay = eventsByDate[dateKey] || [];
    
    if (eventsForDay.length === 0) {
        return <Day {...props} />;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="relative">
                    <Day {...props} />
                    <div className="event-dots-container">
                        {eventsForDay.slice(0, 4).map((event, i) => (
                             <div key={i} className={cn('event-dot', CATEGORY_COLORS[event.category])} />
                        ))}
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <ul className="space-y-1">
                    {eventsForDay.map((event, i) => (
                        <li key={i} className="text-sm font-semibold">{event.title}</li>
                    ))}
                </ul>
            </TooltipContent>
        </Tooltip>
    );
}

export function AcademicCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 0, 12));

  const eventsByDay = useMemo(() => {
    if (!date) return [];
    return academicEvents.filter(event => isSameDay(event.date, date));
  }, [date]);


  return (
   <TooltipProvider>
    <div className="space-y-8 p-4 md:p-8 pt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Calendario Académico 2026</h1>
        <p className="text-muted-foreground">
          Consulta las fechas importantes del ciclo escolar. Selecciona un día para ver los detalles.
        </p>
      </header>
       <Card>
        <CardHeader>
          <CardTitle>Código de Colores</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-3">
          {Object.entries(CATEGORY_COLORS).map(([category, colorClass]) => (
            <div key={category} className="flex items-center gap-2">
              <div className={cn("h-4 w-4 rounded-full", colorClass)} />
              <span className="text-sm font-medium">{category}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              locale={es}
              numberOfMonths={2}
              defaultMonth={new Date(2026, 0, 1)}
              components={{ Day: DayWithTooltip }}
            />
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Eventos del Día
                    </CardTitle>
                    <CardDescription>
                        {date ? format(date, "EEEE, d 'de' LLLL 'de' yyyy", { locale: es }) : 'Selecciona una fecha'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[280px] pr-4">
                        {eventsByDay.length > 0 ? (
                            <ul className="space-y-3">
                            {eventsByDay.map((event, index) => (
                                <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                    <span className={`p-2 rounded-full ${CATEGORY_BG_TEXT_COLORS[event.category]}`}>
                                        {ICONS[event.category]}
                                    </span>
                                    <div>
                                        <p className="font-semibold">{event.title}</p>
                                        <Badge variant="secondary" className={CATEGORY_BG_TEXT_COLORS[event.category]}>{event.category}</Badge>
                                    </div>
                                </li>
                            ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center pt-10">No hay eventos para este día.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
    </div>
    </TooltipProvider>
  );
}
