
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: "red" | "yellow" | "blue";
  onClick?: () => void;
}

export function KpiCard({ title, value, icon: Icon, color, onClick }: KpiCardProps) {
  const colorClasses = {
    red: "text-red-600 dark:text-red-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    blue: "text-blue-600 dark:text-blue-400",
  };
  
  const isClickable = !!onClick;
  
  return (
    <Card 
      onClick={onClick}
      className={cn("h-full", isClickable && "cursor-pointer hover:bg-muted/50 transition-colors")}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", color && colorClasses[color])} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", color && colorClasses[color])}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

    