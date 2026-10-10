"use client";

import { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { EPISODIOS_EN_CURSO } from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";

export type EpisodioEnCurso = {
  _id: string;
  titulo: string;
  estado: "SUBIENDO" | "PROCESANDO" | "LISTO" | "FALLIDO";
  progresoBunny?: number | null;
  estadoImportacion?: string | null;
  progresoImportacion?: number | null;
  estadoTranscripcion?: "EN_COLA" | "TRANSCRIBIENDO" | "LISTA" | "FALLIDA" | null;
  progresoTranscripcion?: number | null;
  estadoMomentos?: "EN_COLA" | "ANALIZANDO" | "LISTO" | "FALLIDO" | null;
  reimportacion?: { estado: string; progreso?: number | null } | null;
  subidoPor?: { nombre: string } | null;
};

export type Fase = "reimportando" | "importando" | "subiendo" | "transcribiendo" | "enColaTranscripcion" | "buscandoClips" | "procesando";

/**
 * El paso que más le dice al equipo, y cuánto va (0-100) si se sabe. Bunny
 * puede seguir convirtiendo el video mientras ya se transcribe, así que la
 * transcripción y los clips van antes que "procesando".
 */
export function faseDe(e: EpisodioEnCurso): { fase: Fase; progreso: number | null } {
  const vivo = (v?: string | null) => v === "EN_COLA" || v === "BAJANDO" || v === "SUBIENDO" || v === "PROCESANDO";
  if (e.reimportacion && vivo(e.reimportacion.estado)) {
    return { fase: "reimportando", progreso: e.reimportacion.progreso != null ? Math.round(e.reimportacion.progreso * 100) : null };
  }
  if (e.estadoImportacion && vivo(e.estadoImportacion)) return { fase: "importando", progreso: e.progresoImportacion ?? null };
  if (e.estado === "SUBIENDO") return { fase: "subiendo", progreso: null };
  if (e.estadoTranscripcion === "TRANSCRIBIENDO") return { fase: "transcribiendo", progreso: e.progresoTranscripcion ?? null };
  if (e.estadoTranscripcion === "EN_COLA") return { fase: "enColaTranscripcion", progreso: null };
  if (e.estadoMomentos === "EN_COLA" || e.estadoMomentos === "ANALIZANDO") return { fase: "buscandoClips", progreso: null };
  return { fase: "procesando", progreso: e.progresoBunny ?? null };
}

/** Con algo en marcha se pregunta seguido; sin nada, cada tanto por si otro empieza algo. */
const INTERVALO_ACTIVO_MS = 15_000;
const INTERVALO_QUIETO_MS = 60_000;

/**
 * Lo que la marca activa tiene en proceso, para todo el equipo: si alguien
 * sube o importa un episodio, los demás lo ven desde cualquier pantalla.
 */
export function useEpisodiosEnCurso(): EpisodioEnCurso[] {
  const { activa, cargando } = useMarcaActiva();
  const { data, startPolling, refetch } = useQuery<{ episodiosEnCurso: EpisodioEnCurso[] }>(EPISODIOS_EN_CURSO, {
    variables: { marcaId: activa?._id },
    skip: cargando || !activa?._id,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
    skipPollAttempt: () => typeof document !== "undefined" && document.hidden,
  });
  const lista = data?.episodiosEnCurso ?? [];
  const hay = lista.length > 0;

  useEffect(() => {
    if (cargando || !activa?._id) return;
    startPolling(hay ? INTERVALO_ACTIVO_MS : INTERVALO_QUIETO_MS);
  }, [hay, cargando, activa?._id, startPolling]);

  useEffect(() => {
    if (cargando || !activa?._id) return;
    const alVolver = () => {
      if (!document.hidden) refetch().catch(() => {});
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [cargando, activa?._id, refetch]);

  return lista;
}
