
import { getAllStudents } from '@/lib/server/firestore';
import { DashboardClient } from './DashboardClient';

export async function DashboardLayout() {
  const initialStudents = await getAllStudents();

  return <DashboardClient initialStudents={initialStudents} />;
}
