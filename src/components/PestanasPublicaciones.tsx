"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const PESTANAS = [
  { href: "/contenido", clave: "contenido" },
  { href: "/analisis", clave: "analisis" },
] as const;

/**
 * Contenido es una sola sección del menú: el contenido de cada episodio y cómo
 * le fue (Análisis). Reemplaza a la vieja Publicaciones (/publicados).
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
