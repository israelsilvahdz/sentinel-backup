# Análisis de "Academic Sentinel": Estado Actual y Visión a Futuro

Este documento proporciona un análisis profundo de las capacidades actuales de la aplicación y presenta una serie de recomendaciones estratégicas para futuras mejoras.

---

## 1. Lo que Tenemos: Un Ecosistema de Gestión Académica Robusto

La aplicación actual es una plataforma multifacética que se destaca en cuatro pilares fundamentales:

### a. Diagnóstico de Riesgo Cuantitativo
La aplicación es excelente para medir el **"qué"** y el **"cuánto"** del riesgo académico. Ofrece una fotografía precisa e instantánea del estado del alumnado basada en datos duros.

-   **Capacidades Clave:**
    -   **Medición de Riesgo:** Calcula niveles de riesgo (Bajo, Observación, Crítico, SD) basados en faltas y tareas no entregadas (NE).
    -   **Análisis Comparativo:** La herramienta de "Análisis de Cambios" detecta deltas entre dos reportes, identificando exactamente qué alumnos han acumulado nuevas faltas o NEs.
    -   **Visualización de Datos:** Los KPIs y gráficos en el Dashboard Principal ofrecen una vista macro de la salud académica del campus.
-   **Herramientas Involucradas:** `Dashboard Principal`, `Análisis de Cambios`, `Panel de Alumnos`.

### b. Planificación Académica y Curricular
Contamos con herramientas visuales de primer nivel para la planificación estratégica, tanto a nivel de malla curricular como de horario semestral.

-   **Capacidades Clave:**
    -   **Simulación de Trayectoria:** El "Planificador por Mapa" permite simular el avance de un alumno, visualizando cómo las materias reprobadas bloquean su progreso futuro.
    -   **Validación de Horarios:** El "Planificador de Horarios" utiliza la oferta académica real para construir horarios simulados, detectando automáticamente empalmes y conflictos.
    -   **Guía Centralizada:** La "Guía de Ponderación" sirve como una referencia rápida y fiable sobre los esquemas de evaluación.
-   **Herramientas Involucradas:** `Planificador por Mapa`, `Planificador de Horarios`, `Guía de Ponderación`.

### c. Gestión de Intervenciones y Seguimiento
La plataforma centraliza el **"quién"**, **"cuándo"** y **"cómo"** de las intervenciones, creando un expediente digital completo y auditable para cada estudiante.

-   **Capacidades Clave:**
    -   **Vista Unificada:** El "Tablero de Seguimiento" (estilo Kanban) presenta todos los casos de riesgo, pendientes y reportes en una sola interfaz.
    -   **Registro Detallado:** La "Bitácora de Casos" y los formularios de seguimiento permiten documentar cada interacción, acuerdo y nota relevante.
    -   **Historial Completo:** El "Expediente del Alumno" consolida todos los eventos (cambios académicos, seguimientos, tareas) en una línea de tiempo cronológica.
-   **Herramientas Involucradas:** `Tablero de Seguimiento`, `Bitácora de Casos`, `Expediente del Alumno`.

### d. Comunicación y Reportes
Hemos integrado funcionalidades que agilizan y profesionalizan la comunicación con alumnos y profesores.

-   **Capacidades Clave:**
    -   **Notificaciones Rápidas:** El sistema de notificaciones por WhatsApp permite enviar recordatorios personalizados con un solo clic.
    -   **Reportes Visuales:** Es posible generar imágenes de alta calidad del estado académico de un alumno, listas para ser pegadas en correos o chats.
    -   **Comunicación con Profesores:** El generador de correos para ausencias de atletas recopila la información necesaria y prepara un borrador de correo.
-   **Herramientas Involucradas:** `Notificaciones de WhatsApp`, `Generador de Reportes`, `Impresión de Listas`.

---

## 2. Lo que Mejoraríamos: La Transición de Reactivo a Proactivo

El siguiente paso evolutivo es transformar la aplicación para que no solo describa lo que *está pasando*, sino que **anticipe lo que va a pasar** y **automatice las tareas repetitivas**.

A continuación, se presenta una tabla que resume las áreas de mejora y las herramientas propuestas:

| Área de Mejora                | Cambio Propuesto: **De...**                                     | A... **(Nueva Herramienta o Mejora)**                                                                                               | **Beneficio Clave**                                        |
| :---------------------------- | :-------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| **1. Entrada de Datos**       | Carga manual de archivos con riesgo de error de formato.        | **Asistente de Carga Inteligente:** Una interfaz que valida los archivos *antes* de procesarlos, muestra un resumen y detecta inconsistencias. | **Fiabilidad y Automatización.** Datos limpios y correctos desde el inicio, menos errores manuales. |
| **2. Análisis de Riesgo**     | Reactivo: Muestra el riesgo que ya existe hoy.                  | **Módulo de Proyecciones:** Un sistema que analiza tendencias históricas para predecir qué alumnos *estarán* en riesgo en el futuro. | **Anticipación y Proactividad.** Permite intervenir *antes* de que el alumno falle.                 |
| **3. Comunicación**           | Uno a uno, con mensajes generados al momento.                   | **Consola de Comunicación Centralizada:** Un gestor de plantillas para diferentes escenarios (riesgo, felicitación, etc.) y la capacidad de enviar comunicaciones masivas personalizadas. | **Eficiencia y Consistencia.** Ahorra horas de trabajo en comunicaciones repetitivas y mantiene un tono uniforme. |
| **4. Gestión de Tareas**      | Asignación manual de tareas a tutores o líderes.                | **Sistema de Reglas de Asignación Automática:** Permite configurar reglas como "Si un alumno de primer tetra tiene >3 faltas en Matemáticas, crear automáticamente una tarea para su Tutor". | **Automatización y Respuesta Rápida.** Asegura que ningún caso se quede sin atender y estandariza los protocolos de acción. |

### Detalle de las Mejoras Propuestas

#### a. Asistente de Carga Inteligente (ACI)
-   **Validación de Formato:** Escaneo del archivo para verificar columnas y tipos de datos.
-   **Resumen Pre-Carga:** Muestra un resumen (`X` alumnos, `Y` materias nuevas) antes de confirmar.
-   **Comparación Automática:** Opción para designar una carga como "reporte anterior" y ejecutar el `Análisis de Cambios` de forma automática, llevando al usuario directamente a las alertas.

#### b. Módulo de Proyecciones de Riesgo
-   **Detector de Tendencias:** Analiza el historial de cambios para identificar patrones (ej. "Acumula 1 falta por semana en 'Cálculo'").
-   **Proyección a Futuro:** Basado en la tendencia, proyecta cuándo un alumno alcanzará un umbral crítico.
-   **Dashboard de "Riesgo Futuro":** Una nueva vista que muestra a los alumnos cuya trayectoria es preocupante, aunque su estado actual no sea crítico.

#### c. Consola de Comunicación Centralizada
-   **Gestor de Plantillas:** Interfaz para crear, editar y guardar plantillas de mensajes para distintos canales (Email, WhatsApp).
-   **Envío Masivo Personalizado:** Seleccionar un grupo de alumnos, una plantilla, y generar borradores masivos donde cada mensaje se personaliza con los datos del alumno.
-   **Registro Unificado:** Cada comunicación enviada a través de la consola se registraría automáticamente en el expediente del alumno.
