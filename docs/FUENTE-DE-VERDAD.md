# Una sola fuente: funciones, ayuda, soporte y MCP

Lo que Clipfine dice de sí mismo vive en **un lugar por cosa**. Todo lo demás lee de ahí; nada se copia a mano.

| Qué | Dónde se cambia | Quién lo usa |
|---|---|---|
| Las funciones (secciones de /features y sus items) | `src/components/landing/funciones.ts` + textos en `src/messages/{es,en}/landingFunciones.json` y `features<Seccion>.json` | /features, la portada, el índice de conocimiento |
| Las guías de ayuda | `src/contenido/ayuda/{es,en}/*.md` | /ayuda, las páginas de /features ("Cómo se usa"), el índice |
| Precios, horas, prueba | `src/components/landing/planes.ts` | Precios de la landing, la wiki (`{{plan.agency.mensual}}`…), el índice |
| Correo de soporte | `CONTACTO` en `src/lib/legal.ts` | Pie, login, panel, /ayuda, la wiki (`{{soporte}}`), el índice |
| **El índice de conocimiento** | se arma solo: `GET /ayuda/indice.json?idioma=es\|en` | El chat de soporte y el MCP (ng-creator-be, `WikiAyuda`) |

## Cómo se mantienen juntas

- **Cada guía dice qué funciones explica** (`funciones: revision, equipo` en su cabecera). Con eso, cada página de /features muestra sus guías y cada guía lleva a su función.
- **Toda función tiene al menos una guía.** Si se suma una sección a `funciones.ts` sin guía, `npm run ayuda` falla (y con él `dev`, `build` y el CI).
- **Los datos no se escriben en la wiki**: van como `{{clave}}` de `src/lib/datos-producto.ts`. Una clave que no existe no compila (`DATOS_USADOS` en el índice generado).
- **es y en van juntos**: mismo archivo, misma categoría, mismas funciones; si falta uno, falla.
- **El chat y el MCP no tienen copia**: leen `/ayuda/indice.json` del sitio (guardado una hora). Un cambio publicado en la web les llega solo, sin desplegar el backend.

## Al cambiar algo

- **Una función nueva o que cambia**: `funciones.ts` + sus textos, y su guía (nueva o con `funciones:` actualizado).
- **Un precio**: solo `planes.ts`. Los términos (`legalTerminos`) y los textos de la landing que lo dicen escrito todavía van a mano.
- **El correo de soporte**: solo `CONTACTO` (y `CORREO_SOPORTE` en la app, `SOPORTE_CORREO` en el backend).
- **Una guía**: el `.md` en los dos idiomas. `npm run ayuda` regenera el índice.
