"use client";

import { useEffect, useRef, useState } from "react";
import { FotoMarca } from "./FotoMarca";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { colorDeMarca, useMarcaActiva, type Marca } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";

/**
 * Selector de marca. Define sobre qué marca se está trabajando: su cola, su
 * equipo, sus borradores, y a qué cuentas va lo que se publique.
 *
 * Hasta #58 elegía una página de Facebook. Hoy cada marca tiene una sola
 * cuenta —su página—, así que se ve igual que antes: mismo nombre, misma foto,
 * mismo color.
 */
export function SelectorDeMarca() {
  const t = useTranslations("marcoSelectorDeMarca");
  const { marcas, activa, seleccionar, cargando } = useMarcaActiva();
  const { esAdmin } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera.
  useEffect(() => {
    if (!abierto) return;
    function alClic(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alClic);
    return () => document.removeEventListener("mousedown", alClic);
  }, [abierto]);

  if (cargando) {
    return (
      <div className="mx-3 mb-3 h-[52px] animate-pulse rounded-lg bg-white/5" />
    );
  }

  // Sin marcas habilitadas no hay contexto que elegir. Al admin se le ofrece
  // el camino para resolverlo; a un miembro solo se le informa.
  if (!marcas.length) {
    return (
      <div className="mx-3 mb-3 rounded-lg border border-dashed border-white/15 px-3 py-2.5">
        <p className="text-xs text-white/40">{t("sinPagina")}</p>
        {esAdmin ? (
          <Link
            href="/admin/facebook"
            className="mt-0.5 inline-block text-xs font-medium text-ng-teal hover:underline"
          >
            {t("conectarFacebook")}
          </Link>
        ) : (
          <p className="mt-0.5 text-xs text-white/30">
            {t("pedile")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={contenedor} className="relative mx-3 mb-3">
      <button
        onClick={() => setAbierto(!abierto)}
        // La franja de color a la izquierda es el ancla visual del workspace:
        // cambia con la marca, asi que un vistazo basta para saber donde estas.
        style={
          activa ? { borderLeftColor: colorDeMarca(activa) } : undefined
        }
        className="flex w-full items-center gap-2.5 rounded-lg border border-l-4 border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/10"
      >
        <Avatar marca={activa} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wider text-white/35">
            {t("trabajandoEn")}
          </span>
          <span className="block truncate text-sm font-medium">
            {activa?.nombre}
          </span>
        </span>
        <span className="text-xs text-white/40">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#111] shadow-xl">
          {marcas.map((m) => {
            const esActiva = m._id === activa?._id;
            return (
              <button
                key={m._id}
                onClick={() => {
                  seleccionar(m._id);
                  setAbierto(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
                  esActiva ? "bg-ng-teal/10" : "hover:bg-white/5"
                }`}
              >
                <span
                  aria-hidden
                  className="h-7 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: colorDeMarca(m) }}
                />
                <Avatar marca={m} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      esActiva ? "font-medium text-ng-teal" : "text-white/80"
                    }`}
                  >
                    {m.nombre}
                  </span>
                  <span className="block text-[10px] text-white/30">
                    {t("espacioPropio")}
                  </span>
                </span>
                {esActiva && <span className="text-xs text-ng-teal">✓</span>}
              </button>
            );
          })}

          {esAdmin && (
            <Link
              href="/admin/facebook"
              onClick={() => setAbierto(false)}
              className="block border-t border-white/10 px-3 py-2.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
            >
              {t("administrar")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** El logo de la marca, o la foto de su página de Facebook. */
function Avatar({ marca }: { marca: Marca | null }) {
  return (
    <FotoMarca
      nombre={marca?.nombre}
      logoUrl={marca?.logoUrl}
      pageId={marca?.paginaFacebook?.pageId}
      fotoUrl={marca?.paginaFacebook?.fotoUrl}
    />
  );
}
