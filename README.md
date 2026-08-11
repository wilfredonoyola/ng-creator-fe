# NG Video Creator — Frontend

Interfaz de operación. Next.js (App Router) + React + Tailwind + Apollo Client.

No hay línea de tiempo ni editor. El video llega listo del pipeline; la persona aprueba, corrige con una nota, o descarta.

Está pensada **primero para el teléfono**: la navegación es un cajón deslizable más una barra inferior, y recién a partir de `lg` la barra lateral queda fija. Es una PWA instalable (`public/manifest.webmanifest` + `sw.js`, registrado por `RegistrarSW`).

## Requisitos

- Node 20+
- El backend corriendo en `http://localhost:4000/graphql`

## Arranque

```bash
npm install
cp .env.example .env    # y llenar los valores
npm run dev             # arranca en http://localhost:3000
```

## Configuración (.env)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_GRAPHQL_URL` | URL del backend GraphQL | `http://localhost:4000/graphql` |

La autenticación pasa por el backend: no se necesitan credenciales de Cognito acá.

## Los dos contextos que atraviesan toda la app

Casi cualquier pantalla nueva va a necesitar estos dos. Están en `src/lib/` y se consumen con hooks.

### Página activa — `usePaginaActiva()`

Cada fan page es un **espacio de trabajo aparte**: su propia cola de revisión, su propia numeración de expedientes, su propio historial. El switch de la barra lateral define sobre cuál estás trabajando, y casi todas las consultas se filtran por su `pageId`.

```tsx
const { activa, paginas, seleccionar, cargando } = usePaginaActiva();
useQuery(MI_QUERY, { variables: { pageId: activa?.pageId }, skip: !activa });
```

La elección se guarda en `localStorage` pero **siempre se valida contra la lista del servidor**: si la página se deshabilitó o perdiste el acceso, la selección guardada se descarta en vez de dejar un contexto que ya no existe. `colorDePagina(pageId)` da un color estable por página, derivado del id, para que se vea de un golpe en qué workspace estás.

**Una pantalla nueva casi siempre tiene que manejar el caso `activa === null`** (sin páginas, o todavía cargando).

### Sesión y permisos — `useSesion()`

```tsx
const { usuario, esAdmin, accesos, rolEn, puedeOperar, esPropietario } = useSesion();
```

El permiso es **por página**, no global. Los roles son `PROPIETARIO`, `EDITOR`, `LECTOR` y `PROVEEDOR` (este último definido pero sin flujo todavía — ver el README del backend). `esAdmin` es el rol global y solo habilita sumar cuentas de Facebook nuevas al sistema.

```tsx
{puedeOperar(activa?.pageId) && <button>Publicar</button>}
```

**Esconder controles acá es comodidad, no seguridad.** Quien autoriza de verdad son `CognitoGuard` y `PaginaGuard` en el backend; si una pantalla se olvida de esconder un botón, la operación falla igual del otro lado. `ESTILO_ROL` tiene la etiqueta, el color y la explicación de cada rol, para no reescribirlos en cada pantalla.

## Pantallas

| Ruta | Qué es |
|---|---|
| `/` | Tablero: métricas y los expedientes que llevan más tiempo esperando |
| `/crear` | Wizard de ingesta: clip + nota de voz + licencia |
| `/revision` | La cola: video, guion, checklist del validador, y aprobar / regenerar / descartar |
| `/publicados` | Lo que ya salió |
| `/revival` | Historial de la fan page rankeado, y el flujo de reciclaje |
| `/creators` | Creadores y licencias |
| `/admin/equipo` | Quién trabaja en la página activa: invitar, cambiar rol, quitar acceso |
| `/admin/facebook` | Conectar cuentas, habilitar páginas, logo de marca de agua |
| `/admin/facebook/callback` | Vuelta del OAuth de Meta |
| `/login` | Ingreso, en uno o dos pasos (ver abajo) |
| `/privacidad`, `/terminos` | Públicas, sin sesión: Meta exige encontrarlas |

### El login tiene dos pasos

Quien ya tiene cuenta entra directo. A quien **fue invitado**, Cognito le manda una contraseña temporal y exige elegir la definitiva antes de dar la sesión: `iniciarSesion()` devuelve `{ tipo: "nueva-password", sesion }` en vez de abrir sesión, y ese segundo paso se resuelve en la misma pantalla con `establecerPassword()`.

No hay registro abierto: la única puerta de entrada es una invitación.

## Quién hizo qué

Las acciones que dejan rastro guardan autor, y se muestra al pie de la tarjeta con `<SelloDeAutoria accion="programado" autoria={post.publicadoPor} />`.

No dibuja nada cuando no hay autor — todo lo anterior a esa función no lo tiene, y poner "desconocido" sería ensuciar cada tarjeta vieja para no decir nada. Si agregás una acción atribuible, pedí el campo en la query (`{ nombre en }`) y usá el mismo componente.

## Estructura

```
src/
  app/
    layout.tsx           raíz, metadata y PWA
    providers.tsx        Apollo + SesionProvider + PaginaActivaProvider
    page.tsx             tablero
    crear/ revision/ publicados/ revival/ creators/
    admin/equipo/        equipo de la página activa
    admin/facebook/      integración con Meta (+ callback/)
    login/ privacidad/ terminos/
  components/
    DashboardLayout.tsx  estructura: cajón en móvil, lateral fija en lg
    Sidebar.tsx          navegación, filtrada por rol en la página activa
    NavInferior.tsx      barra inferior de móvil
    PageSwitcher.tsx     switch de espacio de trabajo
    TarjetaRevision.tsx  video + guion + checklist + acciones
    TarjetaRevival.tsx   tarjeta de la galería de reciclaje
    PanelRevival.tsx     flujo de reciclaje de un post
    PublicarEnFacebook.tsx  destino, formato e historial de intentos
    CreateVideoWizard.tsx / SubirClip.tsx / VoiceRecorder.tsx  ingesta
    SelloDeAutoria.tsx   "programado por Camilo, hace 2 días"
    StatsCard.tsx VideoCard.tsx TopBar.tsx LegalLayout.tsx RegistrarSW.tsx
  graphql/
    operations.ts        todas las queries y mutations, en un solo archivo
  lib/
    apollo.ts            cliente con el header de auth
    auth.ts              login (dos pasos), refresh automático, logout
    sesion.tsx           usuario, roles globales y acceso por página
    pagina-activa.tsx    espacio de trabajo activo y su color
    upload.ts            subidas de archivos al backend (que las guarda en Bunny)
    time.ts              `tiempoRelativo` y `fechaCompleta`
    message-templates.ts plantillas para pedirle permiso de uso a un creador
  generated/             tipos del schema (npm run codegen)
```

## Convenciones

- **Las operaciones GraphQL viven todas en `src/graphql/operations.ts`**, no repartidas por componente. Si agregás una, va ahí.
- **Los comentarios explican por qué, no qué.** Si una decisión tiene una razón que no se ve en el código (un caso raro de Meta, un problema de móvil), va escrita.
- **El acento visual es uno solo:** `marca-verde` `#0FED9D`. Sobre él, el texto va en negro. La paleta está en `tailwind.config.ts` (`marca-verde`, `marca-blanco`, `marca-negro`), extraída del logo.
- Fondo `#0a0a0a`, bordes `border-white/10`, tarjetas `rounded-2xl`.
- Los objetivos táctiles van cómodos (`py-2.5` o más): a dos columnas en un teléfono, una tarjeta mide ~170px.

## Tipos generados (codegen)

Con el backend corriendo:

```bash
npm run codegen
```

Genera tipos TypeScript desde el schema en `src/generated/`. Opcional: las operaciones de `src/graphql/operations.ts` funcionan sin ello.

## Despliegue

Vercel, automático al mergear a `main`.

**Cuando un cambio toca el contrato con el backend, el backend va primero.** Vercel tarda ~1 minuto y el droplet del backend ~5, así que mergear los dos PR juntos deja una ventana con el frontend nuevo pidiendo campos que el backend viejo no tiene, y las pantallas fallan enteras con `Cannot query field`. El orden es: mergear y desplegar el backend, confirmar, y recién ahí el frontend.
