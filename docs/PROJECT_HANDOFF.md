# Guía de continuidad de Sentinel

Actualizada el 6 de noviembre de 2026. Esta guía está escrita para abrir el proyecto en otra computadora con Codex y publicar sin depender de esta laptop.

## 1. Obtener el código correcto

La opción recomendada es clonar la **rama limpia** `codex/portable-2026`, que tiene historial nuevo y contiene el código actualizado sin los archivos de alumnos del historial antiguo:

```powershell
git clone --branch codex/portable-2026 --single-branch https://github.com/israelsilvahdz/sentinel-backup.git Sentinel
cd Sentinel
```

Si GitHub solicita acceso, inicia sesión en esa computadora con la cuenta que puede abrir `israelsilvahdz/sentinel-backup`. No cambies a `main`: esa rama quedó atrasada y su historial incluye un monitoreo Excel y un directorio de profesores.

Para continuar el trabajo en la otra computadora, usa esta rama. Después de editar y verificar:

```powershell
git status
git add src README.md docs/PROJECT_HANDOFF.md scripts
git commit -m "Describe el cambio"
git push origin codex/portable-2026
```

Antes de `git add`, revisa `git status` y asegúrate de que no haya Excel, PDF, directorios ni credenciales. Para archivos de configuración nuevos, agrégalos por nombre tras revisarlos. La publicación no depende de `git push`: ejecuta el script de la sección 4 cuando quieras actualizar el sitio.

Como alternativa sin Git, en la computadora actual `scripts/Export-Sentinel.ps1` produce un ZIP en `.handoff/`. Ese ZIP contiene el mismo código, logo, configuraciones, scripts y esta guía. No contiene la carpeta `.git`, `node_modules`, archivos Excel, contactos JSON, cachés ni `.env`.

Si usas el ZIP, espera a que aparezca completo en OneDrive, extráelo en una carpeta de trabajo nueva —por ejemplo `C:\Projects\Sentinel`— y abre **esa carpeta extraída** en Codex. No mezcles el contenido con el clon antiguo.

El ZIP es una transferencia puntual. Para cambios posteriores, usa la rama limpia o genera un paquete nuevo. Trabaja en una computadora a la vez y evita copiar el historial antiguo a otro repositorio.

## 2. Entender la aplicación

Sentinel es una aplicación Next.js/TypeScript. La navegación está en `src/components/dashboard/DashboardClient.tsx`. Los módulos visibles son Inicio, Resumen académico, Análisis de cambios, Panel de alumnos, Desempeño y seguimiento, Horarios de profesores, Gestor de ponderaciones y Materias sin clasificar.

El usuario carga **dos archivos**: la base principal y el monitoreo `MdeA al DD.MM.AAPP.xlsx`. `src/lib/principal-base.ts` lee alumnos, contactos, correos de profesores y ponderaciones de las primeras tres hojas de la base; la hoja temporal `Listas (2)` se ignora. `src/lib/excelParser.ts` lee materias, actividades, calificaciones, faltas, NE, SC y horarios del monitoreo. `DashboardClient.tsx` combina ambos por matrícula. La base es la fuente para `Tel. Tutor`, que corresponde al número de papá o mamá.

El estado se guarda en IndexedDB mediante `src/lib/local-workspace.ts`. Las plantillas de mensajes están en `localStorage`. **Cambiar de computadora o de navegador no traslada esos datos**: hay que volver a cargar ambos Excel en el navegador nuevo. La copia de código no lleva información del alumnado. Los PDF se generan en el navegador; los botones de correo y WhatsApp abren mensajes prellenados, no confirman entrega automática.

Firebase se usa para **App Hosting**. El código activo no usa Firestore para los datos de alumnos. El script de publicación despliega solo `apphosting:sentinel-backup`; no despliega Firestore.

## 3. Ejecutar localmente

Instala Node.js 20 o superior. Abre PowerShell en la carpeta extraída:

```powershell
node --version
npm ci
npm run typecheck
npm run dev
```

Visita `http://localhost:9002/`. Para la primera prueba, usa archivos Excel autorizados y comprueba que la base y el monitoreo carguen. No incluyas esos archivos en el proyecto ni en Git. Si el puerto 9002 está ocupado, cierra el proceso anterior antes de iniciar otro.

## 4. Publicar en el sitio actual

La cuenta que use Firebase CLI debe tener permisos sobre el proyecto **`tecmilenio-mdea`** y el backend **`sentinel-backup`**. Inicia sesión en la nueva computadora sin copiar credenciales de esta laptop:

```powershell
.\node_modules\.bin\firebase.cmd login
.\node_modules\.bin\firebase.cmd projects:list
.\scripts\Publish-Sentinel.ps1
```

`Publish-Sentinel.ps1` verifica TypeScript, crea una carpeta temporal con una lista permitida de archivos, compila y ejecuta:

```text
firebase deploy --only apphosting:sentinel-backup --project tecmilenio-mdea --non-interactive
```

Espera `Rollout for backend sentinel-backup complete!` y `Deploy complete!`. Después revisa <https://sentinel-backup--tecmilenio-mdea.us-east4.hosted.app/>. También puedes consultar el estado en <https://console.firebase.google.com/project/tecmilenio-mdea/apphosting>.

Si no aparece el proyecto en `projects:list`, revisa que hayas iniciado sesión con la cuenta institucional autorizada. Si la compilación falla, no publiques: ejecuta `npm run typecheck` y corrige el error primero. El script limpia su carpeta temporal aun cuando falle.

## 5. Reglas para cambios futuros

- Trabaja en la copia extraída, valida con `npm run typecheck` y publica con el script. No copies el ZIP dentro de `src`.
- Mantén los Excel, descargas, PDF y directorios de contactos fuera del repositorio. El script excluye archivos JSON dentro de `src` para evitar incorporar directorios por accidente.
- Para transferir una versión nueva desde una computadora con el código actualizado, ejecuta `.\scripts\Export-Sentinel.ps1`. El ZIP nuevo se guarda en `.handoff/`.
- Si creas un repositorio privado nuevo, empieza desde el contenido del ZIP, sin `.git` anterior. Revisa el listado de archivos antes del primer `git push`.
- El almacenamiento del navegador puede borrarse o no estar disponible en otra máquina; conserva los Excel originales en el lugar autorizado por tu área.
