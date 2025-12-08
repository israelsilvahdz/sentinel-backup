import type { Metadata } from 'next';
import './globals.css';
import './curriculum-map.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Progreso Estudiantil',
  description: 'Student progress monitoring dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className="font-body antialiased bg-background">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
