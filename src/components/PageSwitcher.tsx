"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { colorDePagina, usePaginaActiva } from "@/lib/pagina-activa";
import { useSesion } from "@/lib/sesion";

/**
 * Switch de pagina de Facebook. Define sobre que pagina se esta trabajando y a
 * donde va lo que se publique.
 */
export function PageSwitcher() {
  const { paginas, activa, seleccionar, cargando } = usePaginaActiva();
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

  // Sin paginas habilitadas no hay contexto que elegir. Al admin se le ofrece
  // el camino para resolverlo; a un miembro solo se le informa.
  if (!paginas.length) {
    return (
      <div className="mx-3 mb-3 rounded-lg border border-dashed border-white/15 px-3 py-2.5">
        <p className="text-xs text-white/40">Sin página conectada</p>
        {esAdmin ? (
          <Link
            href="/admin/facebook"
            className="mt-0.5 inline-block text-xs font-medium text-[#0FED9D] hover:underline"
          >
            Conectar Facebook →
          </Link>
        ) : (
          <p className="mt-0.5 text-xs text-white/30">
            Pedile a un admin que conecte una
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
        // cambia con la pagina, asi que un vistazo basta para saber donde estas.
        style={
          activa
            ? { borderLeftColor: colorDePagina(activa.pageId) }
            : undefined
        }
        className="flex w-full items-center gap-2.5 rounded-lg border border-l-4 border-white/10 bg-white/5 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/10"
      >
        <Avatar pagina={activa} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wider text-white/35">
            Trabajando en
          </span>
          <span className="block truncate text-sm font-medium">
            {activa?.nombre}
          </span>
        </span>
        <span className="text-xs text-white/40">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#111] shadow-xl">
          {paginas.map((p) => {
            const esActiva = p.pageId === activa?.pageId;
            return (
              <button
                key={p.pageId}
                onClick={() => {
                  seleccionar(p.pageId);
                  setAbierto(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
                  esActiva ? "bg-[#0FED9D]/10" : "hover:bg-white/5"
                }`}
              >
                <span
                  aria-hidden
                  className="h-7 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: colorDePagina(p.pageId) }}
                />
                <Avatar pagina={p} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      esActiva ? "font-medium text-[#0FED9D]" : "text-white/80"
                    }`}
                  >
                    {p.nombre}
                  </span>
                  <span className="block text-[10px] text-white/30">
                    Espacio de trabajo propio
                  </span>
                </span>
                {esActiva && <span className="text-xs text-[#0FED9D]">✓</span>}
              </button>
            );
          })}

          {esAdmin && (
            <Link
              href="/admin/facebook"
              onClick={() => setAbierto(false)}
              className="block border-t border-white/10 px-3 py-2.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
            >
              ⚙ Administrar páginas
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Avatar({ pagina }: { pagina: { fotoUrl?: string | null; nombre: string } | null }) {
  if (pagina?.fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={pagina.fotoUrl}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold">
      {pagina?.nombre?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
