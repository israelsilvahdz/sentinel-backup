# Análisis del Acceso a Datos: Corrección del Bucle de Lecturas

Este documento detalla el diagnóstico y la solución al problema de un número excesivamente alto de operaciones de lectura en la base de datos (Firestore), que alcanzaba cifras de cientos de miles de lecturas en un corto período.

---

## 1. Resumen del Problema: Un Bucle Infinito

El problema principal era que la aplicación había entrado en un **bucle de lectura infinito**. En lugar de cargar los datos necesarios una sola vez al iniciar, un componente central estaba pidiendo la información completa de seguimientos, equipos, ponderaciones y cambios del historial repetidamente, sin parar.

Cada vez que el componente se actualizaba (incluso por la propia llegada de los datos), volvía a pedir todo de nuevo, generando una cascada de lecturas que explica el pico de **~800k lecturas** que observaste.

---

## 2. Diagnóstico Técnico: La Causa Raíz

La causa del problema se encontraba en el componente principal `DashboardClient.tsx`.

-   **El Culpable:** Un hook `useEffect`, diseñado para cargar todos los datos iniciales de la aplicación, se estaba ejecutando en cada renderizado del componente en lugar de una sola vez.
-   **La Razón:** Este `useEffect` dependía de varias funciones (como `fetchTeams`, `fetchSeguimientoEntries`, etc.). A su vez, estas funciones estaban declaradas con el hook `useCallback` para optimizarlas, pero tenían una dependencia "inestable": la función `toast`.
-   **Efecto Dominó:** El hook que provee la función `toast` no garantizaba que su referencia fuera estable entre renderizados. Esto hacía que, en cada ciclo, React pensara que la función `toast` era "nueva", lo que a su vez hacía que todas las funciones `fetch...` se consideraran "nuevas", y finalmente, que el `useEffect` principal se volviera a ejecutar. Esto creaba el bucle: **Render -> `useEffect` se ejecuta -> Fetch de datos -> Actualización de estado -> Nuevo Render -> `useEffect` se vuelve a ejecutar**.

---

## 3. Solución Implementada: Estabilización de Dependencias

Para romper este ciclo vicioso, he implementado la siguiente corrección en `DashboardClient.tsx`:

1.  **Análisis de Estabilidad:** Se determinó que la función `toast` es, en la práctica, estable (no cambia entre renderizados).
2.  **Eliminación de Dependencia Innecesaria:** Se eliminó la función `toast` de las listas de dependencias de todos los hooks `useCallback` y del `useEffect` principal.
3.  **Garantía de Ejecución Única:** Al hacer esto, le aseguramos a React que las funciones `fetch...` son estables y no necesitan ser recreadas. Como resultado, el `useEffect` que carga los datos iniciales ahora tiene la garantía de que **solo se ejecutará una vez**, cuando el componente se monta por primera vez.

---

## 4. Resultado Esperado

Tras esta corrección, el comportamiento de la aplicación es ahora el siguiente:

-   **Una Carga Inicial:** Al abrir la aplicación, se realizarán un puñado de consultas para cargar el historial, los equipos, los seguimientos y las ponderaciones.
-   **Sin Lecturas Adicionales:** La navegación normal, los filtros y las búsquedas **no generarán nuevas lecturas** a la base de datos, ya que operarán sobre los datos ya cargados en memoria.
-   **Lecturas Justificadas:** Las únicas operaciones de lectura adicionales ocurrirán de forma puntual y justificada cuando la aplicación necesite refrescar una lista después de una acción del usuario (ej. guardar un nuevo registro de seguimiento).

El número total de lecturas ahora debería ser mínimo y corresponder directamente al uso real de la aplicación, eliminando por completo el consumo masivo e innecesario de recursos.
