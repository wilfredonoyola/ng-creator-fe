"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { dejarDeSuplantar, suplantado, type Suplantado } from "@/lib/suplantar";

/**
 * A la vista en todo el panel mientras un superadmin está entrando como otra
 * persona: lo que haga queda a nombre de ella, así que no se puede olvidar.
 */
export function AvisoSuplantando() {
  const t = useTranslations("superadmin.suplantando");
  const pathname = usePathname();
  const [quien, setQuien] = useState<Suplantado | null>(null);

  // localStorage solo después del montaje, como la marca activa.
  useEffect(() => setQuien(suplantado()), [pathname]);

  if (!quien || pathname.startsWith("/superadmin")) return null;
  return (
    <div className="fixed left-1/2 top-2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-marca px-4 py-1.5 text-xs font-semibold text-ng-tinta shadow-lg">
      <span className="truncate">{t("aviso", { email: quien.email })}</span>
      <button onClick={dejarDeSuplantar} className="shrink-0 rounded-full bg-ng-tinta px-2.5 py-0.5 text-white transition hover:opacity-80">
        {t("salir")}
      </button>
    </div>
  );
}
