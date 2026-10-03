"use client";

import { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { CalendarClock, Hand, Send, Sparkles, type LucideIcon } from "lucide-react";
import { NOTIFICACIONES_SIN_LEER } from "@/graphql/operations";

/**
 * Los avisos al equipo de una marca (ng-creator-be#134). Llegan a todos los
 * que tienen acceso a la marca menos a quien hizo la acción: la campanita los
 * junta acá, y cada uno elige en Perfil por dónde quiere cada tipo.
 */
export type TipoNotificacion = "CLIPS_LISTOS" | "CLIP_TOMADO" | "CLIP_PROGRAMADO" | "CLIP_PUBLICADO";

export interface Notificacion {
  _id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  createdAt: string;
  marcaId: string;
  marcaNombre?: string | null;
  actor?: { nombre: string } | null;
  enlace: {
    episodioId: string;
    clipId?: string | null;
    publicadas?: { red: string; url?: string | null }[] | null;
  };
}

export interface PreferenciaNotificacion {
  tipo: TipoNotificacion;
  enApp: boolean;
  push: boolean;
  correo: boolean;
}

/** El orden en que se muestran, que es el del trabajo: del episodio a la red. */
export const TIPOS_NOTIFICACION: TipoNotificacion[] = ["CLIPS_LISTOS", "CLIP_TOMADO", "CLIP_PROGRAMADO", "CLIP_PUBLICADO"];

/** Cómo se llama cada tipo en Perfil, y con qué ícono y color sale en la lista. */
export const ESTILO_NOTIFICACION: Record<TipoNotificacion, { etiqueta: string; icono: LucideIcon; clase: string }> = {
  CLIPS_LISTOS: { etiqueta: "Clips listos para editar", icono: Sparkles, clase: "bg-ng-azul/15 text-ng-celeste" },
  CLIP_TOMADO: { etiqueta: "Alguien tomó un clip", icono: Hand, clase: "bg-amber-400/15 text-amber-300" },
  CLIP_PROGRAMADO: { etiqueta: "Alguien programó un clip", icono: CalendarClock, clase: "bg-indigo-400/15 text-indigo-300" },
  CLIP_PUBLICADO: { etiqueta: "Un clip se publicó", icono: Send, clase: "bg-ng-teal/15 text-ng-teal" },
};

/** Adónde lleva un aviso: al editor del clip si hay uno, si no al episodio. */
export function rutaDeNotificacion(n: Notificacion): string {
  const { episodioId, clipId } = n.enlace;
  return clipId ? `/episodios/${episodioId}/clips/${clipId}` : `/episodios/${episodioId}`;
}

/** Cada cuánto se pregunta por avisos nuevos. No hay suscripción: alcanza con esto. */
const INTERVALO_MS = 60_000;

/**
 * Cuántos avisos sin leer hay, en todas las marcas de la persona: el mismo
 * número que el push le pone al ícono de la app en el teléfono.
 *
 * Una sola consulta para toda la pantalla (la hace DashboardLayout y la pasa a
 * cada campanita): si cada campanita preguntara por su cuenta, serían dos
 * relojes pidiendo lo mismo. Se repite cada minuto mientras la pestaña está a
 * la vista, y al volver a ella, que es cuando más importa estar al día.
 */
export function useNotificacionesSinLeer(): { sinLeer: number; refrescar: () => void } {
  const { data, refetch } = useQuery(NOTIFICACIONES_SIN_LEER, {
    pollInterval: INTERVALO_MS,
    skipPollAttempt: () => typeof document !== "undefined" && document.hidden,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  useEffect(() => {
    const alVolver = () => {
      if (!document.hidden) refetch().catch(() => {});
    };
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [refetch]);

  return {
    sinLeer: data?.notificacionesSinLeer ?? 0,
    // Un fallo acá no merece un error en pantalla: el próximo intento lo corrige.
    refrescar: () => {
      refetch().catch(() => {});
    },
  };
}
