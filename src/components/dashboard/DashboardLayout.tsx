
'use client';

import { DashboardClient } from './DashboardClient';

export function DashboardLayout() {
  // We no longer pass initial students. Data is fetched entirely on the client
  // via server actions to ensure it reflects the live database state.
  return <DashboardClient />;
}

    