"use client";

import { useTranslations } from "next-intl";

export type EstadoConexionMcp = "ACTIVA" | "INACTIVA" | "VENCIDA";

const CLASE: Record<EstadoConexionMcp, string> = {
  ACTIVA: "border-ng-teal/30 bg-ng-teal/10 text-ng-teal",
  INACTIVA: "border-white/15 bg-white/5 text-white/55",
  VENCIDA: "border-red-500/30 bg-red-500/10 text-red-300",
};

/**
 * Cómo está una conexión de ChatGPT o Claude (ng-creator-be#182). No hay "en
 * línea": esas apps llaman solo cuando alguien pregunta y no avisan si quitan
 * el conector; lo que se sabe es cuándo la usaron por última vez.
 */
export function EstadoConexion({ estado }: { estado: EstadoConexionMcp }) {
  const t = useTranslations("conectar.estado");
  return (
    <span
      title={t(`ayuda${estado}`)}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${CLASE[estado]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${estado === "ACTIVA" ? "bg-ng-teal" : estado === "VENCIDA" ? "bg-red-400" : "bg-white/40"}`} aria-hidden />
      {t(estado)}
    </span>
  );
}
