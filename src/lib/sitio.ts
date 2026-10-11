/** La dirección pública del sitio (la landing): para las URLs absolutas de SEO (canonical, sitemap, Open Graph). */
export const URL_SITIO = process.env.NEXT_PUBLIC_URL_SITIO ?? "https://www.clipfine.io";

/** Dónde vive el panel: el login, el registro y todo lo que pide sesión. Ver src/middleware.ts. */
export const URL_APP = process.env.NEXT_PUBLIC_URL_APP ?? "https://app.clipfine.io";

/**
 * Prefijo de los links de la landing al panel: absoluto en producción, vacío
 * en local para no saltar de localhost al panel de producción.
 */
export const PREFIJO_APP = process.env.NODE_ENV === "production" ? URL_APP : "";

/**
 * Lo mismo al revés: prefijo de los links del panel a la landing (inicio,
 * precios, privacidad, términos). En app.clipfine.io "/" es el panel, así que
 * un link relativo a "/" nunca llegaría a la página de venta.
 */
export const PREFIJO_SITIO = process.env.NODE_ENV === "production" ? URL_SITIO : "";
