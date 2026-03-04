
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: "red" | "yellow" | "blue" | "emerald";
  onClick?: () => void;
}

export function KpiCard({ title, value, icon: Icon, color, onClick }: KpiCardProps) {
  const colorClasses = {
    red: "text-red-600 bg-red-50 border-red-100",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
  };
  
  const borderClasses = {
    red: "border-l-red-500",
    yellow: "border-l-yellow-500",
    blue: "border-l-blue-500",
    emerald: "border-l-emerald-500",
  }

  const isClickable = !!onClick;
  
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "h-full border-none shadow-sm transition-all duration-300", 
        isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-1 active:scale-95",
        color && `border-l-4 ${borderClasses[color]} ${colorClasses[color].split(' ')[1]}`
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-xl", color ? colorClasses[color] : "bg-muted")}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-black tabular-nums", color && colorClasses[color].split(' ')[0])}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
