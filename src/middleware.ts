import { NextResponse, type NextRequest } from "next/server";
import { URL_APP, URL_SITIO } from "@/lib/sitio";

/**
 * Un dominio para vender y otro para trabajar:
 * - clipfine.io / www.clipfine.io: solo la landing y sus páginas públicas. El
 *   resto (login, registro, panel, callbacks) se va al mismo camino en
 *   app.clipfine.io, así los links viejos de correos y callbacks siguen andando.
 * - app.clipfine.io: el panel. Su raíz lleva a /panel (que manda al login si no
 *   hay sesión) y las páginas de venta y legales vuelven a la landing.
 * Cualquier otro host (localhost, previews de Vercel) sirve todo como siempre.
 */
const HOSTS_LANDING = new Set(["clipfine.io", "www.clipfine.io"]);
const HOST_APP = new URL(URL_APP).host;

/** Lo que se muestra en la landing. */
const PUBLICAS = ["/", "/features", "/app", "/privacidad", "/terminos", "/robots.txt", "/sitemap.xml"];
/** La imagen para compartir (/opengraph-image/imagen). */
const esImagenOG = (p: string) => p.startsWith("/opengraph-image");
/**
 * Las páginas de la landing que en el panel no van: las de venta y las legales,
 * que usan la cabecera de la landing con links relativos ("/" es el panel acá).
 */
const DE_LA_LANDING = ["/features", "/app", "/privacidad", "/terminos"];

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = req.nextUrl;

  if (HOSTS_LANDING.has(host) && !PUBLICAS.includes(pathname) && !esImagenOG(pathname)) {
    return NextResponse.redirect(`${URL_APP}${pathname}${search}`, 308);
  }
  if (host === HOST_APP) {
    if (pathname === "/") return NextResponse.redirect(new URL(`/panel${search}`, req.url));
    if (DE_LA_LANDING.includes(pathname)) return NextResponse.redirect(`${URL_SITIO}${pathname}${search}`, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Fuera los archivos (con punto: íconos, manifest, sw.js) y lo interno de Next.
  matcher: ["/((?!_next/|.*\\.[^/]+$).*)", "/robots.txt", "/sitemap.xml"],
};
