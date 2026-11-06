# Guía de la Interfaz de Usuario: Barra Lateral y Encabezado

Este documento detalla el funcionamiento y la estructura de la barra lateral (Sidebar) y el encabezado (Header) de la aplicación. El objetivo es proporcionar una guía clara para entender su diseño responsivo, efectos visuales y cómo replicar su comportamiento.

## 1. Estructura General del Layout

La arquitectura principal se basa en un patrón que separa la barra lateral del contenido principal. Esto se logra con tres componentes principales que envuelven toda la vista:

1.  **`<SidebarProvider>`**: Es el componente de más alto nivel que gestiona todo el estado de la barra lateral (si está abierta o cerrada, si la vista es móvil o de escritorio) utilizando un Contexto de React.

2.  **`<Sidebar>`**: Representa la barra lateral en sí. Su apariencia y comportamiento cambian drásticamente entre la vista de escritorio y la móvil.

3.  **`<SidebarInset>`**: Contiene todo el contenido principal de la página, incluyendo el encabezado (`header`) y el área de contenido (`main`). Este componente se ajusta automáticamente para dejar espacio a la barra lateral en la vista de escritorio.

**Ejemplo de estructura en `DashboardClient.tsx`:**

```tsx
<SidebarProvider>
  <Sidebar>
    {/* Contenido de la barra lateral: Header, Menús, Footer */}
  </Sidebar>
  <SidebarInset>
    {/* Contenido principal: Header y el resto de la página */}
  </SidebarInset>
</SidebarProvider>
```

---

## 2. Funcionamiento de la Barra Lateral (`<Sidebar>`)

La barra lateral es el componente más complejo, con varios comportamientos clave.

### a. Responsividad (Móvil vs. Escritorio)

El comportamiento de la barra lateral depende del ancho de la pantalla, gestionado por el hook `useIsMobile`.

-   **Vista de Escritorio (`width >= 768px`):**
    -   La barra lateral es visible permanentemente a la izquierda.
    -   Tiene dos estados: colapsado (solo iconos) y expandido (iconos y texto).

-   **Vista Móvil (`width < 768px`):**
    -   La barra lateral se oculta por completo.
    -   Se convierte en un menú deslizable (estilo "off-canvas") que aparece desde la izquierda cuando se toca un botón de activación (el "menú de hamburguesa").
    -   Este comportamiento se logra internamente utilizando el componente `Sheet` de `shadcn/ui`.

### b. Efecto de Colapso en Escritorio (Interacción con Hover)

En la vista de escritorio, la barra lateral tiene una interacción elegante al pasar el cursor sobre ella.

-   **Estado Colapsado (por defecto):**
    -   Muestra únicamente los iconos de las opciones del menú.
    -   Su ancho es mínimo, definido por la variable CSS `--sidebar-width-icon` (ej. `3.5rem`).
    -   Los textos y otros elementos están ocultos mediante clases de CSS que reaccionan al estado del componente padre (ej. `group-data-[collapsible=icon]:hidden`).

-   **Estado Expandido (al hacer `hover`):**
    -   Cuando el usuario pasa el cursor sobre la barra, esta se expande suavemente.
    -   Su ancho aumenta a `--sidebar-width` (ej. `16rem`).
    -   Los iconos y los textos de las opciones del menú se vuelven visibles.
    -   La animación de expansión/contracción se logra con la propiedad `transition: width` de CSS, lo que le da un acabado fluido.

### c. Tooltips Inteligentes

Para mejorar la experiencia de usuario en el estado colapsado:

-   Cada botón del menú (`SidebarMenuButton`) tiene un `Tooltip` (etiqueta emergente) asociado.
-   Este `Tooltip` está configurado para mostrarse **únicamente** cuando la barra lateral está en su estado colapsado. Esto se debe a que, en este estado, el texto no es visible y el `Tooltip` sirve como una ayuda visual.
-   Cuando la barra está expandida, los `Tooltips` se ocultan automáticamente para no ser redundantes.

---

## 3. Componentes del Menú y Acomodo Interno

La barra lateral está construida con sub-componentes modulares que permiten una gran flexibilidad.

-   **`<SidebarHeader>`**: Es el contenedor superior, destinado principalmente al logo de la aplicación.
    -   **Logo:** Se utiliza el componente `Image` de Next.js con un tamaño fijo (ej. `width={26} height={26}`) para mantener la consistencia del layout. El `<span>` con el nombre "TECMILENIO" se oculta cuando la barra se colapsa.

-   **`<SidebarContent>`**: Es el área principal que contiene los menús. Tiene `overflow: auto`, lo que permite el desplazamiento vertical si hay demasiadas opciones de menú.

-   **`<SidebarGroup>` y `<SidebarMenu>`**: Son contenedores semánticos (`<div>` y `<ul>`) que organizan las opciones del menú en listas y secciones.

-   **`<SidebarMenuItem>` y `<SidebarMenuButton>`**:
    -   El `SidebarMenuItem` es el `<li>` que envuelve cada opción.
    -   El `SidebarMenuButton` es el corazón de cada opción de menú.
        -   **Layout Interno:** Utiliza `flexbox` con un `gap` para alinear un icono (`<svg>`) y un `<span>` con el texto de la opción.
        -   **Ocultar Texto:** El `<span>` del texto se oculta con la clase `group-data-[collapsible=icon]:hidden`. Esta clase se activa cuando el ancestro (`<Sidebar>`) tiene el atributo `data-collapsible="icon"`, que se establece cuando está en estado colapsado.
        -   **Estado Activo:** El botón recibe una propiedad booleana `isActive`. Cuando es `true`, se le aplican clases que cambian su color de fondo y de texto, utilizando las variables CSS `--sidebar-primary` y `--sidebar-primary-foreground`. Esto resalta la página actual en el menú.

---

## 4. Encabezado Principal (`Header`)

El encabezado, que forma parte de `<SidebarInset>`, también tiene un diseño responsivo.

-   **Posición Fija (`sticky`):** El `header` se mantiene fijo en la parte superior de la ventana al hacer scroll, gracias a la clase `sticky top-0`.
-   **Layout Flexible:** Utiliza `flexbox` con `justify-between` para alinear su contenido en dos extremos:
    -   **Izquierda:** Contiene el logo grande de Tecmilenio y los componentes de filtro (`DashboardFilters`).
    -   **Derecha:** Contiene los botones de acción principales (Cargar Reporte, Recargar, Borrar Datos).
-   **Responsividad del Header:**
    -   **Envoltura (`flex-wrap`):** En pantallas más pequeñas, los elementos se envuelven a la siguiente línea si no caben, evitando que el layout se rompa.
    -   **Logo:** El logo de Tecmilenio (`Image` de Next.js) tiene un tamaño base (`width={180}`), pero se controla su altura con `h-8` y su ancho se ajusta automáticamente (`w-auto`) para mantener la proporción sin deformarse.
    -   **Filtros en Móvil:** En la vista móvil, los filtros se mueven a una línea separada debajo de los logos y botones para optimizar el espacio.

Este diseño modular y basado en estados de CSS (atributos `data-*`) hace que la interfaz sea robusta, fácil de mantener y estilizar.

---

## 5. Arquitectura del Planificador por Mapa (`MapPlanner`)

El planificador por mapa es una simulación visual e interactiva del avance académico de un alumno. Su funcionamiento se basa en la interacción de cuatro pilares: la **Estructura de Datos**, la **Gestión de Estado**, la **Lógica de Simulación** y la **Visualización Reactiva**.

### a. Estructura de Datos (El ADN del Plan)

-   **Archivo:** `src/lib/curriculum.ts`
-   **Funcionamiento:** La malla curricular se define como un array de `CurriculumTerm` (períodos). Cada período contiene un array de `CurriculumCourse` (materias). La propiedad clave es `prerequisite`, que establece una dependencia directa entre materias y forma la base para toda la lógica de bloqueo y recomendación.

### b. Gestión de Estado (El Cerebro de la Simulación)

El componente `MapPlanner` utiliza varios `useState` para registrar las acciones del usuario y simular diferentes escenarios:

-   `selectedTermIndex`: Almacena el período "actual" del alumno simulado.
-   `pendingCourses`: Guarda un `Set` con los nombres de las materias que el usuario marca manualmente como "pendientes" (reprobadas).
-   `activeTerms`: Un `Set` que define qué períodos (o generaciones) están activos. Esto simula la oferta académica real.
-   `manuallyApprovedCourses`: Permite al usuario forzar una materia a estado "aprobado".

### c. Lógica de Simulación y "Energías" (El Motor)

Esta es la parte central del componente. En lugar de estados fijos, el estado de cada materia se calcula en tiempo real cada vez que cambia una de las variables de estado anteriores. Este cálculo se realiza de forma eficiente dentro de un hook `useMemo`.

La lógica sigue una cascada de prioridades para determinar el estado final de cada materia:

1.  **Cursos Bloqueados (`lockedCourses` - Energía Negativa):** Es el estado de mayor prioridad. Un curso se bloquea si su prerrequisito está en la lista de `pendingCourses` o si también está bloqueado. Esta lógica se ejecuta en un bucle hasta que no se puedan bloquear más materias, creando un efecto dominó.
2.  **Cursos Aprobados (`approvedCourses` - Energía Positiva):** Todas las materias de períodos *anteriores* al `selectedTermIndex` se consideran aprobadas, a menos que estén marcadas como `pendingCourses`. Las materias en `manuallyApprovedCourses` también se incluyen aquí.
3.  **Cursos Críticos (`criticalCourses` - ¡Alerta Máxima!):** Una materia se considera "crítica" si es de alta prioridad y no hay una generación "N-1" que la vaya a cursar en el próximo ciclo. Simula un riesgo real de atraso.
4.  **Cursos Recomendados (`recommendedCourses` - El Camino a Seguir):** Es el estado de acción. Se recomienda una materia si:
    *   Es una materia pendiente de un período anterior que no está bloqueada.
    *   Pertenece al período actual y sus prerrequisitos ya están aprobados.

### d. Visualización Reactiva (La Interfaz)

-   **Clases CSS Dinámicas:** El estado final calculado (`locked`, `approved`, `critical`, etc.) se asigna como una clase CSS a la tarjeta de la materia (ej. `course-cell.critical`). Estas clases modifican colores, bordes e incluso aplican animaciones, como el pulso rojo de las materias críticas.
-   **Indicadores Visuales:**
    -   El **círculo de estado** en cada materia permite al usuario cambiar su estado (pendiente/aprobado).
    -   La **letra "F"** indica que una materia es "Flexible" (no pertenece a la lista de alta prioridad).
-   **Conectores SVG:** Las líneas que conectan las materias son `path` de SVG. Sus coordenadas de inicio y fin se actualizan cuando cambia el layout. La clase CSS del conector también es dinámica: si el prerrequisito está pendiente, la línea se vuelve roja y punteada, mostrando visualmente el "flujo de energía" bloqueado.

En resumen, el planificador es un sistema reactivo: **Interacción del usuario (cambio de estado) ➞ Recálculo de estados de todas las materias (`useMemo`) ➞ Actualización de clases CSS y SVG (la vista)**. Es un ciclo que proporciona retroalimentación visual instantánea sobre el impacto de cada decisión.
