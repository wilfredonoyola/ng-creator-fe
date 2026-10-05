# Idiomas: español e inglés

La interfaz está en español y en inglés, en la web y en la app. El idioma sale
del navegador (o del sistema, en la app) salvo que la persona haya elegido uno en
Perfil. Lo que no es español ni inglés va en **inglés**.

| | Web (ng-creator-fe) | App (ng-creator-app) |
|---|---|---|
| Librería | `next-intl` | `use-intl` (el núcleo de next-intl) |
| Detección | `src/i18n/request.ts`: cookie `idioma`, si no `Accept-Language` | `src/i18n/ProveedorIdioma.tsx`: SecureStore `idioma`, si no `expo-localization` |
| Elegir a mano | `components/SelectorIdioma.tsx` (Perfil) | Perfil |
| Mensajes | `src/messages/{es,en}/<namespace>.json` | igual |
| Índice | `src/messages/index.ts`, generado por `scripts/mensajes.mjs` | igual |

No hay rutas por idioma (`/en/...`): la URL es la misma y el texto cambia.

## Cómo se agrega un texto

1. Un archivo de mensajes por pantalla o componente, con el mismo nombre en
   `es/` y `en/` (camelCase: `editorRecorte.json`). Ese nombre es el
   *namespace*.
2. Las claves van en español y en camelCase, agrupadas si ayuda
   (`botones.guardar`, `errores.subir`).
3. En el componente: `const t = useTranslations("editorRecorte");` y
   `t("botones.guardar")`.
4. `npm run mensajes` arma el índice y **falla si `es` y `en` no tienen las
   mismas claves**. Con eso y `tsc`, una clave que no existe no compila.

```tsx
// Web
import { useTranslations, useLocale } from "next-intl";
// App
import { useTranslations, useLocale } from "use-intl";
```

En un server component de la web: `useTranslations` si no es `async`, o
`await getTranslations("ns")` de `next-intl/server` si lo es (y para
`generateMetadata`).

## Reglas

- **Se traduce todo lo que ve una persona**: texto de JSX, `placeholder`,
  `title`, `aria-label` / `accessibilityLabel`, `alt`, los mensajes de error
  que se ponen en un estado, `confirm()`, `Alert.alert`, los títulos de las
  pantallas y los metadatos.
- **No se traduce**: comentarios, logs, nombres de GraphQL, valores de enums,
  clases, URLs, nombres propios y de marca (Clipfine, Clipfine, Brand Kit,
  TikTok, Reels, Shorts, YouTube, Facebook, Instagram), lo que escribió el
  usuario y lo que viene del backend (sus errores llegan como llegan, por ahora
  en español).
- **El español queda igual que estaba**, con su voseo ("Elegí", "Subí").
- **El inglés**, natural y corto, de producto (US English). Mismos signos,
  emojis y "…".
- **Variables**: `"Si {correo} tiene cuenta…"` → `t("x", { correo })`.
- **Plurales**: cuando el código hacía `n === 1 ? "clip" : "clips"`, va con
  ICU en los dos idiomas: `"{n, plural, one {# clip} other {# clips}}"`.
- **Un enlace o una negrita en medio de una frase**: `t.rich`, sin cortar la
  frase en pedazos (el orden cambia entre idiomas):
  `"Se eligen en <link>Brand Kit</link>."` y
  `t.rich("x", { link: (c) => <Link href="/admin/plantilla">{c}</Link> })`.
- **Listas constantes** (opciones, pestañas, requisitos): en vez de la
  etiqueta guardan una `clave` y se traduce al dibujar:
  `t(\`formatos.${f.clave}\`)`. Ver `app/login/page.tsx` (`REQUISITOS`).
- **Fechas y números**: nada de `toLocaleString("es")` fijo. En un componente,
  `useLocale()` y pasarlo a `toLocaleString(locale, …)` / `Intl.*`, o
  `useFormatter()`. Una función de `lib/` que formatea recibe el `locale`.
- **Textos dentro de `lib/`** que se muestran: mejor que la función devuelva
  una clave (o un código) y el componente la traduzca. Si una función tira un
  `Error` cuyo mensaje se muestra tal cual, que el componente que lo atrapa
  muestre su propio texto traducido; si el mensaje lleva un dato, la función
  puede recibir `t`.
- Un hook (`useTranslations`) solo dentro del componente, como cualquier hook.
