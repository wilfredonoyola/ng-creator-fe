# NG Video Creator — Frontend

Interfaz de revisión de videos. Next.js + React + Tailwind + Apollo Client.

No hay línea de tiempo ni editor. El video llega listo; el revisor aprueba o regenera con una nota.

## Requisitos

- Node 20+
- El backend corriendo en `http://localhost:4000/graphql`
- AWS Cognito configurado (mismo user pool que el backend)

## Arranque

```bash
npm install
cp .env.example .env    # y llenar los valores
npm run dev             # arranca en http://localhost:3000
```

## Configuración (.env)

- `NEXT_PUBLIC_GRAPHQL_URL` — URL del backend (default http://localhost:4000/graphql)

La autenticación pasa por el backend, no se necesitan credenciales de Cognito en el frontend.

## Pantallas

- **/login** — inicio de sesión por correo (via backend).
- **/** — la cola de revisión. Cada expediente muestra el video reproduciéndose, el guion, el checklist del validador ya marcado, y los botones: aprobar y publicar, regenerar con nota, o descartar. Se refresca sola cada 15s.

## Tipos generados (codegen)

Con el backend corriendo:

```bash
npm run codegen
```

Genera tipos TypeScript desde el schema de GraphQL en `src/generated/`. Opcional para arrancar; las operaciones en `src/graphql/operations.ts` funcionan sin ello.

## Paleta de marca

Extraída del logo, en `tailwind.config.ts`:

- `marca-verde` #0FED9D — acento único. Sobre él, el texto va en negro.
- `marca-blanco` #FCFBFC
- `marca-negro` #000000

## Estructura

```
src/
  app/
    layout.tsx       raíz + providers
    page.tsx         la cola de revisión
    login/page.tsx   login
    providers.tsx    Apollo
    globals.css      Tailwind
  components/
    TopBar.tsx        barra con marca y logout
    TarjetaRevision.tsx  video + guion + checklist + acciones
  graphql/
    operations.ts    queries y mutations
  lib/
    apollo.ts        cliente con auth
    auth.ts          Cognito (pool perezoso)
```
