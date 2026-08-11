"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  PUBLICAR_EN_FACEBOOK,
  FACEBOOK_PUBLICACIONES_DE_EXPEDIENTE,
} from "@/graphql/operations";
import { usePaginaActiva } from "@/lib/pagina-activa";
import { fechaCompleta, tiempoRelativo } from "@/lib/time";

type Formato = "REEL" | "HISTORIA_VIDEO" | "IMAGEN" | "HISTORIA_IMAGEN";

const FORMATOS: Array<{
  valor: Formato;
  label: string;
  detalle: string;
  necesitaPoster?: boolean;
}> = [
  { valor: "REEL", label: "Reel", detalle: "Al feed, vertical. 3 a 90s" },
  { valor: "HISTORIA_VIDEO", label: "Historia", detalle: "Video, expira en 24h" },
  {
    valor: "IMAGEN",
    label: "Imagen",
    detalle: "Foto al feed",
    necesitaPoster: true,
  },
  {
    valor: "HISTORIA_IMAGEN",
    label: "Historia imagen",
    detalle: "Foto, expira en 24h",
    necesitaPoster: true,
  },
];

interface Publicacion {
  _id: string;
  pageNombre?: string | null;
  formato: Formato;
  estado: string;
  postId?: string | null;
  permalink?: string | null;
  error?: string | null;
  publicadaEn?: string | null;
  publicadoPorNombre?: string | null;
}

/**
 * Publica un expediente en la página activa.
 *
 * El destino es el contexto elegido en la barra lateral, no un selector aparte:
 * si querés otra página, cambiás de contexto. Así no hay dos lugares donde
 * decidir lo mismo.
 */
export function PublicarEnFacebook({
  expedienteId,
  tienePoster,
}: {
  expedienteId: string;
  tienePoster?: boolean;
}) {
  const { activa } = usePaginaActiva();
  const [formato, setFormato] = useState<Formato>("REEL");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery(FACEBOOK_PUBLICACIONES_DE_EXPEDIENTE, {
    variables: { expedienteId },
    errorPolicy: "all",
  });
  const previas: Publicacion[] = data?.facebookPublicacionesDeExpediente ?? [];

  const [publicar, { loading }] = useMutation(PUBLICAR_EN_FACEBOOK, {
    refetchQueries: [
      {
        query: FACEBOOK_PUBLICACIONES_DE_EXPEDIENTE,
        variables: { expedienteId },
      },
    ],
  });

  const publicadas = previas.filter((p) => p.estado === "PUBLICADA");
  const yaEnEsteFormato = publicadas.some((p) => p.formato === formato);

  async function enviar() {
    setError(null);
    try {
      await publicar({
        variables: {
          expedienteId,
          pageId: activa!.pageId,
          formato,
          descripcion: descripcion.trim() || null,
        },
      });
      setDescripcion("");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo publicar");
    }
  }

  if (!activa) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-white/40">
        Sin página de Facebook habilitada. Un admin tiene que conectar una.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">
          Publicar en{" "}
          <span className="font-medium text-white/80">{activa.nombre}</span>
        </p>
        {publicadas.length > 0 && (
          <span className="rounded bg-[#0FED9D]/15 px-2 py-0.5 text-[10px] font-medium text-[#0FED9D]">
            {publicadas.length} publicada{publicadas.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Formato */}
      <div className="grid grid-cols-2 gap-2">
        {FORMATOS.map((f) => {
          const bloqueado = f.necesitaPoster && !tienePoster;
          const seleccionado = formato === f.valor;
          return (
            <button
              key={f.valor}
              onClick={() => !bloqueado && setFormato(f.valor)}
              disabled={bloqueado}
              title={
                bloqueado
                  ? "Este expediente no tiene poster; se genera al ensamblar"
                  : f.detalle
              }
              className={`rounded-lg border px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                seleccionado
                  ? "border-[#0FED9D]/50 bg-[#0FED9D]/10"
                  : "border-white/10 hover:bg-white/5"
              }`}
            >
              <span
                className={`block text-xs font-medium ${
                  seleccionado ? "text-[#0FED9D]" : "text-white/80"
                }`}
              >
                {f.label}
              </span>
              <span className="block text-[10px] text-white/35">{f.detalle}</span>
            </button>
          );
        })}
      </div>

      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={2}
        className="w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs outline-none placeholder:text-white/25 focus:border-[#0FED9D]/50"
      />

      {yaEnEsteFormato && (
        <p className="text-[11px] text-yellow-400/80">
          Ya se publicó en este formato. Publicar otra vez crea un post nuevo.
        </p>
      )}

      <button
        onClick={enviar}
        disabled={loading}
        className="w-full rounded-lg bg-[#1877F2] py-2.5 text-sm font-medium text-white transition hover:bg-[#1877F2]/90 disabled:opacity-50"
      >
        {loading ? "Publicando…" : "Publicar en Facebook"}
      </button>

      {error && (
        <p className="break-words rounded-lg bg-red-500/10 p-2 text-[11px] text-red-400">
          {error}
        </p>
      )}

      {/* Historial: los intentos fallidos tambien, que es donde se diagnostica */}
      {previas.length > 0 && (
        <div className="space-y-1.5 border-t border-white/10 pt-2.5">
          {previas.map((p) => (
            <div key={p._id} className="flex items-start gap-2 text-[11px]">
              <span
                className={
                  p.estado === "PUBLICADA"
                    ? "text-[#0FED9D]"
                    : p.estado === "FALLIDA"
                      ? "text-red-400"
                      : "text-yellow-400"
                }
              >
                {p.estado === "PUBLICADA" ? "✓" : p.estado === "FALLIDA" ? "✗" : "⋯"}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-white/60">
                  {p.formato.replace("_", " ").toLowerCase()}
                </span>
                {p.publicadaEn && (
                  <span
                    className="ml-1.5 text-white/30"
                    title={fechaCompleta(p.publicadaEn)}
                  >
                    {tiempoRelativo(p.publicadaEn)}
                  </span>
                )}
                {/* Quién la mandó. Sin autor no se escribe nada: las
                    publicaciones anteriores al registro no lo tienen. */}
                {p.publicadoPorNombre && (
                  <span className="ml-1.5 text-white/30">
                    por{" "}
                    <span className="text-white/50">
                      {p.publicadoPorNombre}
                    </span>
                  </span>
                )}
                {p.error && (
                  <span className="block break-words text-red-400/70">
                    {p.error}
                  </span>
                )}
              </div>
              {p.permalink && (
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[#0FED9D] hover:underline"
                >
                  ver
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
