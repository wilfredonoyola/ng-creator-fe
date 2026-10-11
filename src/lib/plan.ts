/** El plan de una cuenta (ng-creator-be#94), como llega de `miPlan` o `planDeMarca`. */
export type PlanSuscripcion = "PRUEBA" | "STARTER" | "AGENCY" | "AGENCY_PRO" | "CUSTOM" | "INTERNO";
export type PeriodoSuscripcion = "MENSUAL" | "ANUAL";
export type EstadoSuscripcion = "PRUEBA" | "ACTIVA" | "PAGO_PENDIENTE" | "CANCELADA" | "VENCIDA";
export type MotivoBloqueo = "pruebaVencida" | "suscripcionVencida" | "sinHoras";

export interface Plan {
  plan: PlanSuscripcion;
  periodo: PeriodoSuscripcion | null;
  estado: EstadoSuscripcion;
  pruebaHasta: string | null;
  topeHoras: number | null;
  horasUsadas: number;
  cicloHasta: string;
  renuevaEn: string | null;
  terminaEn: string | null;
  puedeSubir: boolean;
  motivo: MotivoBloqueo | null;
  pagaConLemon: boolean;
}

/** Días que le quedan a la prueba (redondeado para arriba), o null si no está en prueba. */
export function diasDePrueba(p: Plan, ahora = Date.now()): number | null {
  if (p.plan !== "PRUEBA" || !p.pruebaHasta) return null;
  return Math.max(0, Math.ceil((new Date(p.pruebaHasta).getTime() - ahora) / 86_400_000));
}

/** "1,5" / "1.5": horas con un decimal como mucho, en el idioma de la página. */
export function horasLegibles(horas: number, locale: string): string {
  return horas.toLocaleString(locale, { maximumFractionDigits: 1 });
}
