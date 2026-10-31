"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { METRICAS_SUPERADMIN } from "@/graphql/operations";

type Dia = { fecha: string; episodios: number; horas: number; costoUsd: number; registros: number };

type Metricas = {
  clientes: number;
  clientesNuevos: number;
  clientesActivos: number;
  usuariosActivos: number;
  registros: number;
  episodios: number;
  horasProcesadas: number;
  costoUsd: number;
  tokensIa: number;
  enPrueba: number;
  pruebasAgotadas: number;
  ticketsAbiertos: number;
  porDia: Dia[];
};

const PERIODOS = [7, 30, 90] as const;
const SERIES = ["episodios", "horas", "costoUsd", "registros"] as const;
type Serie = (typeof SERIES)[number];

/**
 * El inicio de /superadmin: cómo va Clipfine en los últimos 7, 30 o 90 días.
 * Para revisarlo juntos: clientes, uso, lo que cuesta, pruebas y soporte.
 */
export default function SuperadminInicio() {
  const t = useTranslations("superadmin.metricas");
  const locale = useLocale();
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [serie, setSerie] = useState<Serie>("episodios");
  const { data, loading, error } = useQuery<{ metricasSuperadmin: Metricas }>(METRICAS_SUPERADMIN, {
    variables: { dias },
    fetchPolicy: "cache-and-network",
  });
  const m = data?.metricasSuperadmin;

  const numero = (n: number) => n.toLocaleString(locale);
  const formato = (s: Serie, n: number) =>
    s === "costoUsd" ? `$${n.toFixed(2)}` : s === "horas" ? n.toFixed(1) : numero(n);

  const tarjetas: {
    clave:
      | "clientes" | "clientesNuevos" | "clientesActivos" | "usuariosActivos" | "registros" | "episodios"
      | "horas" | "gasto" | "tokens" | "enPrueba" | "pruebasAgotadas" | "ticketsAbiertos";
    valor: string;
    href?: string;
    destacar?: boolean;
  }[] = m
    ? [
        { clave: "clientes", valor: numero(m.clientes), href: "/superadmin/clientes" },
        { clave: "clientesNuevos", valor: numero(m.clientesNuevos) },
        { clave: "clientesActivos", valor: numero(m.clientesActivos) },
        { clave: "usuariosActivos", valor: numero(m.usuariosActivos), href: "/superadmin/usuarios" },
        { clave: "registros", valor: numero(m.registros) },
        { clave: "episodios", valor: numero(m.episodios) },
        { clave: "horas", valor: m.horasProcesadas.toFixed(1) },
        { clave: "gasto", valor: `$${m.costoUsd.toFixed(2)}` },
        { clave: "tokens", valor: numero(m.tokensIa) },
        { clave: "enPrueba", valor: numero(m.enPrueba), href: "/superadmin/clientes" },
        { clave: "pruebasAgotadas", valor: numero(m.pruebasAgotadas), href: "/superadmin/clientes" },
        { clave: "ticketsAbiertos", valor: numero(m.ticketsAbiertos), href: "/superadmin/soporte", destacar: m.ticketsAbiertos > 0 },
      ]
    : [];

  const porDia = m?.porDia ?? [];
  const maximo = Math.max(0, ...porDia.map((d) => d[serie]));
  const total = porDia.reduce((s, d) => s + d[serie], 0);
  const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 max-w-2xl text-white/50">{t("subtitulo")}</p>
        </div>
        <div className="ml-auto flex gap-1.5" role="group" aria-label={t("periodo")}>
          {PERIODOS.map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              aria-pressed={dias === d}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                dias === d ? "border-marca bg-marca/15 text-white" : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {t("dias", { n: d })}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      {loading && !m ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : m ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tarjetas.map((c) => {
              const contenido = (
                <>
                  <p className="text-xs text-white/50">{t(`tarjetas.${c.clave}`)}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${c.destacar ? "text-marca" : ""}`}>{c.valor}</p>
                </>
              );
              const clase = "block rounded-xl border border-white/10 bg-white/[0.03] p-4";
              return c.href ? (
                <Link key={c.clave} href={c.href} className={`${clase} transition hover:border-white/25`}>
                  {contenido}
                </Link>
              ) : (
                <div key={c.clave} className={clase}>
                  {contenido}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-white/35">{t("notaPeriodo", { n: dias })}</p>

          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="font-semibold">{t("porDia")}</h2>
              <div className="flex flex-wrap gap-1.5">
                {SERIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSerie(s)}
                    aria-pressed={serie === s}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      serie === s ? "border-marca bg-marca/15 text-white" : "border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {t(`series.${s}`)}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-sm text-white/60">{t("total", { valor: formato(serie, total) })}</span>
            </div>

            {porDia.length === 0 ? (
              <p className="text-sm text-white/40">{t("sinDatos")}</p>
            ) : (
              <>
                <div className="flex h-40 items-end gap-px" role="img" aria-label={t("porDia")}>
                  {porDia.map((d) => {
                    const v = d[serie];
                    const alto = maximo > 0 ? Math.max(v > 0 ? 3 : 0, (v / maximo) * 100) : 0;
                    return (
                      <div key={d.fecha} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${fechaCorta(d.fecha)}: ${formato(serie, v)}`}>
                        <div className="w-full rounded-t-sm bg-marca transition group-hover:brightness-125" style={{ height: `${alto}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-white/40">
                  <span>{fechaCorta(porDia[0].fecha)}</span>
                  <span>{t("maximo", { valor: formato(serie, maximo) })}</span>
                  <span>{fechaCorta(porDia[porDia.length - 1].fecha)}</span>
                </div>
              </>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
