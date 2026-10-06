"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PLANES } from "@/components/landing/planes";
import { INICIAR_SUSCRIPCION, MI_PLAN, PORTAL_SUSCRIPCION } from "@/graphql/operations";
import { CONTACTO } from "@/lib/legal";
import { mensajeDeError } from "@/lib/nombre";
import { diasDePrueba, horasLegibles, type PeriodoSuscripcion, type Plan, type PlanSuscripcion } from "@/lib/plan";

/** La clave de la landing (planes.ts) y el plan del backend. */
const PLAN_DE_CLAVE: Record<(typeof PLANES)[number]["clave"], PlanSuscripcion> = {
  starter: "STARTER",
  agency: "AGENCY",
  agencyPro: "AGENCY_PRO",
};

/** Lemon Squeezy avisa por webhook: al volver del pago se espera a que llegue. */
const ESPERA_PAGO_MS = 60_000;

/**
 * Mi plan: lo ve y lo paga solo el titular de la cuenta (el dueño que creó la
 * marca). Las horas de video suman todas sus marcas. Quien edita en una marca
 * no llega acá: no tiene la entrada en el menú, y el backend no le devuelve
 * el plan.
 *
 * Pagar, cambiar la tarjeta, ver las facturas o cancelar pasa en Lemon
 * Squeezy, que vende y cobra como revendedor (merchant of record).
 */
export default function MiPlanPage() {
  const t = useTranslations("plan");
  const locale = useLocale();
  const formato = useFormatter();
  const { data, loading, refetch } = useQuery<{ miPlan: Plan | null; cobroConfigurado: boolean }>(MI_PLAN, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [iniciar] = useMutation(INICIAR_SUSCRIPCION);
  const [pedirPortal] = useMutation(PORTAL_SUSCRIPCION);
  const [periodo, setPeriodo] = useState<PeriodoSuscripcion>("ANUAL");
  const [eligiendo, setEligiendo] = useState<PlanSuscripcion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [esperandoPago, setEsperandoPago] = useState(false);

  const plan = data?.miPlan ?? null;
  const cobroListo = data?.cobroConfigurado ?? false;

  // Al volver del checkout (?pago=ok) se consulta hasta que llegue el webhook.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pago") !== "ok") return;
    window.history.replaceState(null, "", "/plan");
    setEsperandoPago(true);
    const desde = Date.now();
    const id = window.setInterval(() => {
      void refetch().then((r) => {
        const estado = r.data?.miPlan?.estado;
        if ((estado && estado !== "PRUEBA" && estado !== "VENCIDA") || Date.now() - desde > ESPERA_PAGO_MS) {
          window.clearInterval(id);
          setEsperandoPago(false);
        }
      });
    }, 3000);
    return () => window.clearInterval(id);
  }, [refetch]);

  useEffect(() => {
    if (plan?.periodo) setPeriodo(plan.periodo);
  }, [plan?.periodo]);

  async function elegir(p: PlanSuscripcion) {
    setError(null);
    setAviso(null);
    setEligiendo(p);
    try {
      const r = await iniciar({ variables: { plan: p, periodo } });
      const { url, cambiado } = r.data.iniciarSuscripcion as { url: string | null; cambiado: boolean };
      if (url) {
        window.location.href = url;
        return;
      }
      if (cambiado) {
        setAviso(t("cambiado"));
        await refetch();
      }
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEligiendo(null);
    }
  }

  async function abrirPortal() {
    setError(null);
    try {
      const r = await pedirPortal();
      window.open(r.data.portalSuscripcion as string, "_blank", "noopener");
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  const fecha = (iso: string | null | undefined) => (iso ? formato.dateTime(new Date(iso), { dateStyle: "long" }) : "");

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 text-white/50">{t("subtitulo")}</p>
        </div>

        {loading && !data ? (
          <p className="text-sm text-white/50">{t("cargando")}</p>
        ) : !plan ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">{t("sinPlan")}</section>
        ) : (
          <>
            {esperandoPago && (
              <p className="mb-4 rounded-ng-md border border-ng-azul/30 bg-ng-azul/5 px-4 py-3 text-sm">{t("procesandoPago")}</p>
            )}
            {aviso && <p className="mb-4 rounded-ng-md border border-ng-teal/30 bg-ng-teal/5 px-4 py-3 text-sm text-ng-teal">{aviso}</p>}
            {error && <p className="mb-4 rounded-ng-md border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">{error}</p>}

            <Actual plan={plan} fecha={fecha} locale={locale} onPortal={abrirPortal} />

            {plan.plan !== "INTERNO" && plan.plan !== "CUSTOM" && (
              <section className="mt-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{plan.plan === "PRUEBA" ? t("elegiUnPlan") : t("cambiarPlan")}</h2>
                    <p className="mt-1 text-sm text-white/50">{t("horasSuman")}</p>
                  </div>
                  <div role="group" aria-label={t("periodo")} className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
                    {(["MENSUAL", "ANUAL"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={periodo === p}
                        onClick={() => setPeriodo(p)}
                        className={`rounded-full px-4 py-1.5 font-semibold ${periodo === p ? "bg-marca text-ng-tinta" : "text-white/70 hover:text-white"}`}
                      >
                        {t(`periodos.${p}`)}
                        {p === "ANUAL" && <span className="ml-2 text-xs font-normal opacity-80">{t("ahorro")}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {PLANES.map((p) => {
                    const clave = PLAN_DE_CLAVE[p.clave];
                    const esActual = plan.plan === clave && plan.periodo === periodo && plan.estado !== "VENCIDA";
                    return (
                      <div
                        key={p.clave}
                        className={`flex flex-col gap-4 rounded-2xl border p-5 ${p.destacado ? "border-ng-azul/60 bg-ng-tarjeta" : "border-white/10 bg-white/5"}`}
                      >
                        <div>
                          <h3 className="text-lg font-bold">{t(`planes.${clave}`)}</h3>
                          <p className="mt-1 text-sm text-white/60">{t("horasMes", { n: p.horas })}</p>
                        </div>
                        <p className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">${periodo === "ANUAL" ? p.anual : p.mensual}</span>
                          <span className="text-sm text-white/50">{t("porMes")}</span>
                        </p>
                        <p className="text-xs text-white/50">{t(periodo === "ANUAL" ? "cobroAnual" : "cobroMensual", { total: p.anual * 12 })}</p>
                        <button
                          type="button"
                          disabled={esActual || !cobroListo || eligiendo !== null}
                          onClick={() => void elegir(clave)}
                          className={`mt-auto rounded-ng-md px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                            p.destacado ? "bg-marca text-ng-tinta hover:brightness-110" : "border border-white/15 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          {esActual ? t("planActual") : eligiendo === clave ? t("abriendo") : plan.pagaConLemon && plan.estado !== "VENCIDA" ? t("cambiarAEste") : t("elegir")}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {!cobroListo && <p className="mt-4 text-sm text-amber-300">{t("cobroNoListo", { correo: CONTACTO })}</p>}
                <p className="mt-4 text-sm text-white/50">
                  {t.rich("custom", {
                    correo: (c) => (
                      <a href={`mailto:${CONTACTO}?subject=Clipfine Custom`} className="text-ng-celeste hover:underline">
                        {c}
                      </a>
                    ),
                  })}
                </p>
                <p className="mt-2 text-xs text-white/40">{t("lemon")}</p>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Actual({
  plan,
  fecha,
  locale,
  onPortal,
}: {
  plan: Plan;
  fecha: (iso: string | null | undefined) => string;
  locale: string;
  onPortal: () => void;
}) {
  const t = useTranslations("plan");
  const dias = diasDePrueba(plan);
  const pct = plan.topeHoras ? Math.min(100, (plan.horasUsadas / plan.topeHoras) * 100) : 0;
  const linea =
    plan.estado === "PRUEBA"
      ? dias === 0
        ? t("estados.pruebaTermino")
        : t("estados.prueba", { fecha: fecha(plan.pruebaHasta), dias: dias ?? 0 })
      : plan.estado === "CANCELADA"
        ? t("estados.cancelada", { fecha: fecha(plan.terminaEn) })
        : plan.estado === "PAGO_PENDIENTE"
          ? t("estados.pagoPendiente")
          : plan.estado === "VENCIDA"
            ? t("estados.vencida")
            : plan.renuevaEn
              ? t("estados.renueva", { fecha: fecha(plan.renuevaEn) })
              : t("estados.activa");

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40">{t("tuPlan")}</p>
          <p className="mt-1 text-2xl font-bold">
            {t(`planes.${plan.plan}`)}
            {plan.periodo && <span className="ml-2 text-sm font-normal text-white/50">{t(`periodos.${plan.periodo}`)}</span>}
          </p>
          <p
            className={`mt-1 text-sm ${
              plan.estado === "VENCIDA" || plan.estado === "PAGO_PENDIENTE" || dias === 0 ? "text-amber-300" : "text-white/60"
            }`}
          >
            {linea}
          </p>
        </div>
        {plan.pagaConLemon && (
          <button
            type="button"
            onClick={onPortal}
            className="rounded-ng-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            {t("administrarPago")}
          </button>
        )}
      </div>

      <div className="mt-5">
        {plan.topeHoras == null ? (
          <p className="text-sm text-white/60">{t("sinLimite")}</p>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span>
                {t("uso", {
                  usadas: horasLegibles(plan.horasUsadas, locale),
                  tope: horasLegibles(plan.topeHoras, locale),
                })}
              </span>
              {plan.estado !== "PRUEBA" && <span className="text-white/50">{t("vuelveACero", { fecha: fecha(plan.cicloHasta) })}</span>}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="presentation">
              <div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-400" : "bg-marca"}`} style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
