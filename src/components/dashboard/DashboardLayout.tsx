
'use client';

import { DashboardClient } from './DashboardClient';

export function DashboardLayout() {
  // We pass empty initial students because data will now be fetched client-side
  // via server actions, ensuring security and proper permissions.
  return <DashboardClient initialStudents={[]} />;
}
