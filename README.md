# Sentinel

Panel de seguimiento académico de Prepa Tecmilenio. El código usa Next.js 15, React 18 y TypeScript. La aplicación se publica en Firebase App Hosting, pero los archivos de alumnos y monitoreo se procesan y conservan en el navegador del usuario.

## Continuar desde otra computadora

Lee [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md). El paquete limpio de código se genera con `scripts/Export-Sentinel.ps1`; no uses el `main` antiguo de GitHub como copia de los cambios publicados.

## Inicio rápido en Windows

Requiere Node.js 20 o superior y PowerShell. En la carpeta del proyecto:

```powershell
npm ci
npm run typecheck
npm run dev
```

Abre <http://localhost:9002/>. Carga la base principal y un monitoreo Excel desde la barra superior. Los archivos se guardan en IndexedDB de ese navegador; la edición de plantillas de mensajes se guarda en su `localStorage`.

## Publicar

El backend de producción es `sentinel-backup`, en el proyecto Firebase `tecmilenio-mdea`. Inicia sesión con una cuenta autorizada:

```powershell
.\node_modules\.bin\firebase.cmd login
.\scripts\Publish-Sentinel.ps1
```

El script comprueba tipos, crea una copia temporal que **solo contiene código y recursos permitidos**, compila y despliega únicamente App Hosting. Espera el mensaje `Rollout ... complete` antes de dar la publicación por terminada.

Sitio: <https://sentinel-backup--tecmilenio-mdea.us-east4.hosted.app/>

## Archivos principales

- `src/components/dashboard/DashboardClient.tsx`: navegación, carga de archivos y estado local.
- `src/lib/principal-base.ts`: lectura del archivo base.
- `src/lib/excelParser.ts`: lectura del monitoreo.
- `src/lib/local-workspace.ts`: persistencia en IndexedDB.
- `src/components/dashboard/StudentPanel.tsx`: panel de alumnos y PDFs.
- `src/components/dashboard/AcademicPerformancePanel.tsx`: promedios y seguimiento por materia.
- `src/lib/academic-aggregates.ts`: promedios y comparaciones.
- `src/components/dashboard/StudentSchedule.tsx`: notificaciones individuales.

No agregues archivos con datos personales, Excel, PDF ni credenciales al código o a un repositorio remoto.
