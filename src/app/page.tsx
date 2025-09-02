import { Dashboard } from '@/components/dashboard/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary font-headline">Monitor de Progreso Estudiantil</h1>
          <p className="text-muted-foreground mt-2">Tu panel de control para el seguimiento del progreso académico.</p>
        </header>
        <Dashboard />
      </div>
    </main>
  );
}
