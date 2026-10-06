"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AJUSTAR_SUSCRIPCION, SUSCRIPCIONES_ADMIN } from "@/graphql/operations";
import { mensajeDeError } from "@/lib/nombre";
import { diasDePrueba, horasLegibles, type Plan, type PlanSuscripcion } from "@/lib/plan";
import { useSesion } from "@/lib/sesion";

interface Ajuste {
  accion: string;
  detalle: string;
  porEmail: string;
  en: string;
}

interface Fila extends Plan {
  titularId: string;
  email: string | null;
  nombre: string | null;
  marcas: number;
  lemonSuscripcionId: string | null;
  modoPrueba: boolean;
  creadaEn: string | null;
  ajustes: Ajuste[];
}

type Filtro = "todas" | "prueba" | "vencePronto" | "vencidas";
const FILTROS: Filtro[] = ["todas", "prueba", "vencePronto", "vencidas"];

/** Los planes que se pueden dar a mano (sin la prueba). */
const PLANES_A_MANO: PlanSuscripcion[] = ["STARTER", "AGENCY", "AGENCY_PRO", "CUSTOM", "INTERNO"];

function pasaFiltro(f: Fila, filtro: Filtro): boolean {
  if (filtro === "prueba") return f.plan === "PRUEBA";
  if (filtro === "vencidas") return !f.puedeSubir;
  if (filtro === "vencePronto") {
    const dias = diasDePrueba(f);
    return (dias != null && dias <= 3) || f.estado === "PAGO_PENDIENTE" || f.estado === "CANCELADA";
  }
  return true;
}

/**
 * Las suscripciones de todas las cuentas, para el equipo de Clipfine
 * (ng-creator-be#152): quien paga, que plan tiene, cuanto uso, y los ajustes
 * a mano (extender la prueba, pasar a Interno, dar un plan, devolver horas).
 * El backend lo exige ADMIN; aca solo se esconde.
 */
export default function SuscripcionesAdminPage() {
  const t = useTranslations("adminSuscripciones");
  const tp = useTranslations("plan");
  const locale = useLocale();
  const formato = useFormatter();
  const { esAdmin, cargando } = useSesion();
  const { data, loading, refetch } = useQuery<{ suscripcionesAdmin: Fila[] }>(SUSCRIPCIONES_ADMIN, {
    skip: !esAdmin,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [abierta, setAbierta] = useState<string | null>(null);

  const filas = useMemo(() => (data?.suscripcionesAdmin ?? []).filter((f) => pasaFiltro(f, filtro)), [data, filtro]);
  const fecha = (iso: string | null | undefined) => (iso ? formato.dateTime(new Date(iso), { dateStyle: "medium" }) : "—");

  if (!cargando && !esAdmin) {
    return (
      <DashboardLayout>
        <p className="text-sm text-white/60">{t("soloAdmin")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 text-white/50">{t("subtitulo")}</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              className={`rounded-full border px-3 py-1 text-xs ${filtro === f ? "border-ng-azul/60 bg-ng-azul/10 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
            >
              {t(`filtros.${f}`)}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <p className="text-sm text-white/50">{t("cargando")}</p>
        ) : filas.length === 0 ? (
          <p className="text-sm text-white/50">{t("vacio")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/5 text-xs text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("col.cuenta")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.plan")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.estado")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.horas")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.fecha")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.marcas")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <FilaSuscripcion
                    key={f.titularId}
                    f={f}
                    abierta={abierta === f.titularId}
                    onAbrir={() => setAbierta(abierta === f.titularId ? null : f.titularId)}
                    onCambio={() => void refetch()}
                    fecha={fecha}
                    locale={locale}
                    nombrePlan={(p) => tp(`planes.${p}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function FilaSuscripcion({
  f,
  abierta,
  onAbrir,
  onCambio,
  fecha,
  locale,
  nombrePlan,
}: {
  f: Fila;
  abierta: boolean;
  onAbrir: () => void;
  onCambio: () => void;
  fecha: (iso: string | null | undefined) => string;
  locale: string;
  nombrePlan: (p: PlanSuscripcion) => string;
}) {
  const t = useTranslations("adminSuscripciones");
  const dias = diasDePrueba(f);
  const fechaClave = f.plan === "PRUEBA" ? f.pruebaHasta : f.estado === "CANCELADA" ? f.terminaEn : f.renuevaEn;
  return (
    <>
      <tr className="border-t border-white/5 align-top">
        <td className="px-4 py-3">
          <p className="font-medium">{f.nombre || f.email || f.titularId}</p>
          {f.nombre && <p className="text-xs text-white/50">{f.email}</p>}
        </td>
        <td className="px-4 py-3">
          {nombrePlan(f.plan)}
          {f.periodo && <span className="ml-1 text-xs text-white/40">{t(`periodo.${f.periodo}`)}</span>}
          {f.modoPrueba && <span className="ml-2 rounded bg-amber-400/10 px-1.5 text-[10px] text-amber-300">test</span>}
        </td>
        <td className={`px-4 py-3 ${f.puedeSubir ? "text-white/70" : "text-amber-300"}`}>
          {t(`estado.${f.estado}`)}
          {dias != null && <span className="block text-xs text-white/40">{t("diasRestan", { dias })}</span>}
        </td>
        <td className="px-4 py-3">
          {f.topeHoras == null
            ? `${horasLegibles(f.horasUsadas, locale)} h · ∞`
            : `${horasLegibles(f.horasUsadas, locale)} / ${horasLegibles(f.topeHoras, locale)} h`}
        </td>
        <td className="px-4 py-3 text-white/70">{fecha(fechaClave)}</td>
        <td className="px-4 py-3">{f.marcas}</td>
        <td className="px-4 py-3 text-right">
          <button type="button" onClick={onAbrir} aria-expanded={abierta} className="text-xs text-ng-celeste hover:underline">
            {abierta ? t("cerrar") : t("ajustar")}
          </button>
        </td>
      </tr>
      {abierta && (
        <tr className="border-t border-white/5 bg-white/[0.02]">
          <td colSpan={7} className="px-4 py-4">
            <Ajustes f={f} onCambio={onCambio} nombrePlan={nombrePlan} fecha={fecha} />
          </td>
        </tr>
      )}
    </>
  );
}

function Ajustes({
  f,
  onCambio,
  nombrePlan,
  fecha,
}: {
  f: Fila;
  onCambio: () => void;
  nombrePlan: (p: PlanSuscripcion) => string;
  fecha: (iso: string | null | undefined) => string;
}) {
  const t = useTranslations("adminSuscripciones");
  const [ajustar, { loading }] = useMutation(AJUSTAR_SUSCRIPCION);
  const [dias, setDias] = useState("7");
  const [horas, setHoras] = useState("");
  const [plan, setPlan] = useState<PlanSuscripcion>("CUSTOM");
  const [error, setError] = useState<string | null>(null);

  async function hacer(accion: string, extra: Record<string, unknown>) {
    setError(null);
    try {
      await ajustar({ variables: { input: { titularId: f.titularId, accion, ...extra } } });
      onCambio();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }
  const num = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : undefined);
  const campo = "w-20 rounded-ng-md border border-white/15 bg-black/30 px-2 py-1.5 text-sm";
  const boton = "rounded-ng-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-50";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-white/60">
            {t("dias")} <input className={campo} inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} />
          </label>
          <label className="text-white/60">
            {t("horas")} <input className={campo} inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="—" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={boton} disabled={loading} onClick={() => void hacer("EXTENDER_PRUEBA", { dias: num(dias), horas: num(horas) })}>
            {t("acciones.EXTENDER_PRUEBA")}
          </button>
          <button className={boton} disabled={loading || !num(horas)} onClick={() => void hacer("DEVOLVER_HORAS", { horas: num(horas) })}>
            {t("acciones.DEVOLVER_HORAS")}
          </button>
          <button className={boton} disabled={loading} onClick={() => void hacer("PASAR_A_INTERNO", {})}>
            {t("acciones.PASAR_A_INTERNO")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={plan} onChange={(e) => setPlan(e.target.value as PlanSuscripcion)} className="rounded-ng-md border border-white/15 bg-black/30 px-2 py-1.5 text-sm">
            {PLANES_A_MANO.map((p) => (
              <option key={p} value={p}>
                {nombrePlan(p)}
              </option>
            ))}
          </select>
          <button className={boton} disabled={loading} onClick={() => void hacer("DAR_PLAN", { plan, horas: num(horas) })}>
            {t("acciones.DAR_PLAN")}
          </button>
        </div>
        <p className="text-xs text-white/40">{t("ayuda")}</p>
        {f.lemonSuscripcionId && (
          <p className="text-xs text-white/50">
            Lemon Squeezy: <span className="font-mono">{f.lemonSuscripcionId}</span>
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-white/40">{t("historial")}</p>
        {f.ajustes.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">{t("sinAjustes")}</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {f.ajustes.map((a, i) => (
              <li key={i} className="text-white/70">
                {a.detalle}
                <span className="block text-xs text-white/40">
                  {a.porEmail} · {fecha(a.en)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
