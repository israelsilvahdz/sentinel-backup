import type { ReactNode } from 'react';

export function WorkspaceHeader({ title, description, eyebrow = 'Espacio académico', children }: { title: ReactNode; description: ReactNode; eyebrow?: string; children?: ReactNode }) {
  return <header className="workspace-heading">
    <div className="min-w-0 flex-[1_1_20rem]">
      <p className="workspace-eyebrow"><span aria-hidden="true" />{eyebrow}</p>
      <h1 className="workspace-title">{title}</h1>
      <div className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</div>
    </div>
    {children && <div className="flex max-w-full flex-wrap items-center gap-2">{children}</div>}
  </header>;
}
