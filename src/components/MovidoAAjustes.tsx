"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";

/**
 * Donde antes estaba un ajuste de la marca (Redes conectadas, Equipo): una
 * fila que lleva a su lugar en Ajustes, para que nadie lo busque de más.
 */
export function MovidoAAjustes({ seccion }: { seccion: "por-defecto" | "revision" }) {
  const t = useTranslations("ajustesMarca.movido");
  return (
    <Link
      href={`/admin/ajustes#${seccion}`}
      className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm transition hover:bg-white/10"
    >
      <Settings size={16} className="shrink-0 text-white/40" aria-hidden />
      <span className="min-w-0 flex-1 text-white/70">{t(seccion)}</span>
      <span className="shrink-0 text-ng-celeste">{t("ir")}</span>
    </Link>
  );
}
