"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const PESTANAS = [
  { href: "/publicados", clave: "publicados" },
  { href: "/analisis", clave: "analisis" },
] as const;

/**
 * Publicaciones es una sola sección del menú con dos pestañas: lo que salió y
 * cómo le fue. Análisis dejó de ser un destino aparte porque mirar el
 * rendimiento es parte de publicar.
 */
export function PestanasPublicaciones() {
  const t = useTranslations("publicadosPestanas");
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-white/10">
      {PESTANAS.map((p) => {
        const activa = pathname === p.href || pathname.startsWith(`${p.href}/`);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activa ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activa ? "border-ng-azul text-white" : "border-transparent text-ng-secundario hover:text-white"
            }`}
          >
            {t(p.clave)}
          </Link>
        );
      })}
    </div>
  );
}
