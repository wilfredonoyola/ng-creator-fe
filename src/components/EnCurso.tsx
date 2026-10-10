"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";
import { faseDe, useEpisodiosEnCurso } from "@/lib/en-curso";

/**
 * El aviso global de lo que la marca tiene en proceso: una pastilla abajo a la
 * derecha en todas las pantallas del panel, que se abre en la lista (qué
 * episodio, en qué paso, cuánto va y quién lo empezó). Sin nada en marcha no
 * se muestra.
 */
export function EnCurso({ sobreNavInferior }: { sobreNavInferior: "hastaMd" | "hastaLg" }) {
  const t = useTranslations("marcoEnCurso");
  const lista = useEpisodiosEnCurso();
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  if (lista.length === 0) return null;

  // Sobre la barra inferior del teléfono, que es fija; donde no está, abajo del todo.
  const abajo =
    sobreNavInferior === "hastaMd"
      ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6"
      : "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6";

  return (
    <div ref={caja} className={`fixed right-4 z-30 flex flex-col items-end gap-2 ${abajo}`}>
      {abierto && (
        <div className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-ng-tarjeta shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <p className="text-sm font-semibold">{t("titulo")}</p>
            <button onClick={() => setAbierto(false)} aria-label={t("cerrar")} className="rounded p-1 text-white/50 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
            {lista.map((e) => {
              const { fase, progreso } = faseDe(e);
              return (
                <li key={e._id}>
                  <Link href={`/episodios/${e._id}`} className="block px-4 py-3 transition hover:bg-white/5">
                    <p className="truncate text-sm">{e.titulo}</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {t(`fases.${fase}`)}
                      {progreso != null && ` · ${progreso}%`}
                      {e.subidoPor?.nombre && ` · ${t("por", { nombre: e.subidoPor.nombre })}`}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      {progreso != null ? (
                        <div className="h-full rounded-full bg-marca transition-[width]" style={{ width: `${Math.max(3, progreso)}%` }} />
                      ) : (
                        <div className="h-full w-1/3 animate-pulse rounded-full bg-marca/60" />
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <button
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-ng-tarjeta/95 px-3.5 py-2 text-sm shadow-xl backdrop-blur transition hover:border-white/25"
      >
        <Loader2 size={15} className="animate-spin text-marca" />
        <span>{t("pastilla", { n: lista.length })}</span>
      </button>
    </div>
  );
}
