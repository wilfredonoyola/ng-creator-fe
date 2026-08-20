"use client";

import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import {
  BORRAR_MONTAJE,
  DUPLICAR_MONTAJE,
  MONTAJES_GUARDADOS,
} from "@/graphql/operations";

interface Guardado {
  _id: string;
  nombre: string;
  origenUrl?: string | null;
  updatedAt: string;
}

/**
 * Los montajes de la página: verlos, abrirlos y duplicarlos.
 *
 * Aparece cuando no hay video cargado, que es exactamente cuando uno quiere
 * retomar algo. Con un video en pantalla estorba: ahí lo que se está haciendo
 * es este video, no eligiendo entre los viejos.
 *
 * Duplicar está al lado de abrir porque es el camino más usado y no el raro:
 * la mitad del trabajo de un video nuevo es repetir el anterior con otro
 * material.
 */
export function HistorialMontajes({
  pageId,
  puede,
  onAbrir,
}: {
  pageId: string;
  puede: boolean;
  onAbrir: (id: string) => void;
}) {
  const { data, loading, refetch } = useQuery(MONTAJES_GUARDADOS, {
    variables: { pageId, limite: 30 },
    fetchPolicy: "cache-and-network",
  });
  const [duplicar] = useMutation(DUPLICAR_MONTAJE);
  const [borrar] = useMutation(BORRAR_MONTAJE);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const montajes: Guardado[] = data?.montajesGuardados ?? [];

  // Mientras carga la primera vez no se muestra nada: un bloque vacío que
  // aparece y desaparece es peor que esperar medio segundo.
  if (loading && !montajes.length) return null;
  if (!montajes.length) return null;

  return (
    <div className="mx-auto mb-6 w-full max-w-[1010px]">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
        Tus montajes
      </h2>
      <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        {montajes.map((m) => (
          <div
            key={m._id}
            className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/[0.04]"
          >
            <button
              onClick={() => onAbrir(m._id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm text-white/90">{m.nombre}</p>
              <p className="truncate text-xs text-white/35">
                {cuando(m.updatedAt)}
                {m.origenUrl ? ` · ${m.origenUrl}` : ""}
              </p>
            </button>

            {puede && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={async () => {
                    setOcupado(m._id);
                    try {
                      const { data } = await duplicar({
                        variables: { id: m._id, pageId, nombre: null },
                      });
                      await refetch();
                      // Se abre la copia y no se queda en la lista: duplicar es
                      // para trabajar sobre la copia, no para tenerla ahí.
                      const nuevo = data?.duplicarMontaje?._id;
                      if (nuevo) onAbrir(nuevo);
                    } finally {
                      setOcupado(null);
                    }
                  }}
                  disabled={ocupado === m._id}
                  className="rounded-md px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  Duplicar
                </button>

                {confirmando === m._id ? (
                  <>
                    <button
                      onClick={async () => {
                        setOcupado(m._id);
                        try {
                          await borrar({ variables: { id: m._id, pageId } });
                          await refetch();
                        } finally {
                          setOcupado(null);
                          setConfirmando(null);
                        }
                      }}
                      className="rounded-md px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmando(null)}
                      className="rounded-md px-2 py-1 text-xs text-white/40 hover:text-white/70"
                    >
                      No
                    </button>
                  </>
                ) : (
                  // Con confirmación porque no hay deshacer: el borrador es lo
                  // único que queda de un armado que puede haber llevado un rato.
                  <button
                    onClick={() => setConfirmando(m._id)}
                    className="rounded-md px-2 py-1 text-xs text-white/30 transition hover:bg-white/10 hover:text-white/70"
                  >
                    Borrar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fechas en cristiano: lo de hoy con hora, lo viejo con día. */
function cuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ahora = new Date();
  const mismoDia = d.toDateString() === ahora.toDateString();
  if (mismoDia) {
    return `Hoy ${d.toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return d.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === ahora.getFullYear() ? undefined : "numeric",
  });
}
