"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AtSign } from "lucide-react";

/** En Redes conectadas, donde antes estaban las personas: ahora viven en Etiquetas. */
export function AvisoEtiquetas() {
  const t = useTranslations("etiquetas.enRedes");
  return (
    <section className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marca/15 text-marca">
        <AtSign size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{t("titulo")}</h2>
        <p className="text-sm text-white/50">{t("texto")}</p>
      </div>
      <Link href="/etiquetas" className="rounded-lg bg-marca px-4 py-2 text-sm font-bold text-ng-tinta hover:brightness-105">
        {t("ir")}
      </Link>
    </section>
  );
}
