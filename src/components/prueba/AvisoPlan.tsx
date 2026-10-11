"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { PLAN_DE_MARCA } from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { diasDePrueba, horasLegibles, type Plan } from "@/lib/plan";

/** Donde el dueño ve y elige su plan. */
export const ENLACE_PLAN = "/plan";

/**
 * El plan de la cuenta de la marca activa: si se puede subir y por qué no.
 * Null para las marcas sin límites (las de antes del registro abierto).
 */
export function usePlanDeMarca(): { plan: Plan | null; bloqueado: boolean; refetch: () => void } {
  const { activa } = useMarcaActiva();
  const marcaId = activa?._id;
  const { data, refetch } = useQuery<{ planDeMarca: Plan | null }>(PLAN_DE_MARCA, {
    variables: { marcaId },
    skip: !marcaId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const plan = data?.planDeMarca ?? null;
  return { plan, bloqueado: Boolean(plan && !plan.puedeSubir), refetch: () => void refetch().catch(() => {}) };
}

/**
 * "Prueba gratis: 1,5 de 3 h · quedan 12 días", discreto. Con un plan pagado
 * aparece solo cuando se acerca al tope del mes. Si ya no se puede subir, dice
 * por qué. El dueño tiene el enlace a Mi plan; quien edita, que le avise.
 *
 * Al montarse (o al cambiar de marca) vuelve a pedir el plan: lo usado cambia
 * con cada video.
 */
export function AvisoPlan({ className = "" }: { className?: string }) {
  const t = useTranslations("prueba");
  const locale = useLocale();
  const { activa } = useMarcaActiva();
  const { esPropietario } = useSesion();
  const { plan, bloqueado, refetch } = usePlanDeMarca();
  const marcaId = activa?._id;

  useEffect(() => {
    if (marcaId) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de marca
  }, [marcaId]);

  if (!plan || plan.topeHoras == null) return null;
  const dias = diasDePrueba(plan);
  const cerca = plan.horasUsadas >= plan.topeHoras * 0.8;
  if (!bloqueado && dias == null && !cerca) return null;

  const usadas = horasLegibles(plan.horasUsadas, locale);
  const tope = horasLegibles(plan.topeHoras, locale);
  const dueno = esPropietario(marcaId);
  const texto = bloqueado
    ? t(`bloqueo.${plan.motivo ?? "sinHoras"}`)
    : dias != null
      ? t("prueba", { usadas, tope, dias })
      : t("mes", { usadas, tope });

  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-ng-md border px-3 py-2 text-xs ${
        bloqueado ? "border-amber-400/30 bg-amber-400/5 text-amber-200" : "border-white/10 bg-white/5 text-white/60"
      } ${className}`}
    >
      <span>{texto}</span>
      {dueno ? (
        <Link href={ENLACE_PLAN} className="font-medium text-ng-celeste hover:underline">
          {plan.plan === "PRUEBA" ? t("elegirPlan") : t("verPlan")}
        </Link>
      ) : (
        bloqueado && <span className="text-white/50">{t("avisaleAlDueno")}</span>
      )}
    </p>
  );
}
