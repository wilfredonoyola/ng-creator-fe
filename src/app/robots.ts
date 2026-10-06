import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

/** Solo lo público se indexa; el panel y todo lo que pide sesión, no. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/features", "/app", "/privacidad", "/terminos"],
      disallow: ["/panel", "/episodios", "/admin", "/analisis", "/crear", "/creators", "/grabar", "/montaje", "/perfil", "/publicados", "/revision"],
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
