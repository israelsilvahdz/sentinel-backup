
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './curriculum-map.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Progreso Estudiantil',
  description: 'Student progress monitoring dashboard.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sentinel',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#17594A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="https://i.postimg.cc/bY1FrT6m/Dise-o-sin-t-tulo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-body antialiased bg-background overflow-x-hidden selection:bg-primary/10">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
