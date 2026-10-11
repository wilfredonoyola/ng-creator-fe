import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";
import { SECCIONES } from "@/components/landing/funciones";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_SITIO}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${URL_SITIO}/features`, changeFrequency: "monthly", priority: 0.9 },
    ...SECCIONES.map((s) => ({ url: `${URL_SITIO}/features/${s.id}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${URL_SITIO}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${URL_SITIO}/terminos`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
