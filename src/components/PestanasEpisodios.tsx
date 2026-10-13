"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const PESTANAS = [
  { href: "/episodios", clave: "episodios" },
  { href: "/clips-subidos", clave: "clipsSubidos" },
] as const;

/**
 * Episodios y los clips subidos ya editados (ng-creator-be#181) van juntos:
 * es donde se busca el contenido con el que se trabaja. Los clips de cada
 * episodio se separan adentro en "Con IA" y "Manuales".
 */
export function PestanasEpisodios() {
  const t = useTranslations("pestanasEpisodios");
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-white/10">
      {PESTANAS.map((p) => {
        const activa = pathname === p.href;
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
