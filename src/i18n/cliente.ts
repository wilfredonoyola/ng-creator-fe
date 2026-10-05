/**
 * El idioma en el navegador, para lo que no es un componente (el cliente de
 * Apollo, los fetch de lib/) y para los selectores. Sin `next/headers`: se
 * puede importar desde el cliente.
 */
import { COOKIE_IDIOMA, SIN_IDIOMA_PEDIDO, esIdioma, type Idioma } from "./idiomas";

/** La cabecera con la que el backend traduce sus errores y guarda el idioma de la persona. */
export const CABECERA_IDIOMA = "x-idioma";

/**
 * El idioma con que está pintada la interfaz: el `lang` del `<html>` (lo pone
 * el layout y lo mantiene al día `Providers` al cambiarlo). 'es' si no hay document.
 */
export function idiomaActual(): Idioma {
  if (typeof document === "undefined") return SIN_IDIOMA_PEDIDO;
  const lang = document.documentElement.lang;
  return esIdioma(lang) ? lang : SIN_IDIOMA_PEDIDO;
}

/** `{ "x-idioma": … }`, para sumar a las cabeceras de un fetch al backend. */
export function cabeceraIdioma(): Record<string, string> {
  return { [CABECERA_IDIOMA]: idiomaActual() };
}

/** Lo elegido a mano (cookie), o null = automático (el del navegador). Solo en el navegador. */
export function idiomaElegido(): Idioma | null {
  if (typeof document === "undefined") return null;
  const v = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_IDIOMA}=`))?.split("=")[1];
  return esIdioma(v) ? v : null;
}

/**
 * Guarda el idioma elegido en la cookie (un año) que lee i18n/request.ts, o la
 * borra (null = automático). Después hay que hacer `router.refresh()` para que
 * el servidor vuelva a pintar la página en el idioma nuevo.
 */
export function guardarIdiomaElegido(nuevo: Idioma | null) {
  document.cookie = nuevo
    ? `${COOKIE_IDIOMA}=${nuevo}; path=/; max-age=31536000; samesite=lax`
    : `${COOKIE_IDIOMA}=; path=/; max-age=0; samesite=lax`;
}
