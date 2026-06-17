# Sentinel

Proyecto web basado en Next.js y Firebase, preparado para trabajarse localmente con Codex.

## Requisitos

- Node.js 20 o superior
- npm
- Git

## Instalacion

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo de entorno local a partir del ejemplo:

```bash
cp .env.example .env.local
```

En PowerShell tambien puedes usar:

```powershell
Copy-Item .env.example .env.local
```

3. Verifica o ajusta los valores de Firebase en `.env.local`.

## Variables de entorno

El frontend usa estas variables publicas de Firebase:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Desarrollo local

Para iniciar el proyecto:

```bash
npm run dev
```

La app corre en:

- [http://localhost:9002](http://localhost:9002)

## Scripts disponibles

- `npm run dev`: inicia el servidor local en el puerto 9002
- `npm run build`: genera el build de produccion
- `npm run start`: sirve el build de produccion
- `npm run typecheck`: ejecuta TypeScript sin emitir archivos

## Flujo recomendado con Codex

1. Clona o abre este repo localmente en Codex.
2. Instala dependencias con `npm install`.
3. Crea `.env.local` desde `.env.example`.
4. Ejecuta `npm run dev`.
5. Haz cambios, valida y luego usa Git para guardar y subir tu trabajo.

## Nota sobre TypeScript

Si `npm run typecheck` falla, es posible que existan errores previos del proyecto que no necesariamente bloquean el arranque local. Podemos corregirlos despues por partes.
