"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import { COSTOS_SUPERADMIN } from "@/graphql/operations";

const PERIODOS = [7, 30, 90, 365] as const;

type Concepto =
  | "TRANSCRIPCION"
  | "MOMENTOS"
  | "RESUMEN"
  | "REVISION_BORDES"
  | "TITULO_CLIP"
  | "TITULOS_PORTADA"
  | "BUSQUEDA_MOMENTOS"
  | "CHAT_SOPORTE";

type CostoConcepto = { concepto: Concepto; usd: number; tokens: number; minutos: number; llamadas: number };
type Cuenta = {
  cuentaId: string | null;
  email: string | null;
  nombre: string | null;
  usd: number;
  tokens: number;
  minutos: number;
  llamadas: number;
  sinPrecio: number;
  historicoUsd: number;
  porConcepto: CostoConcepto[];
  porMarca: { marcaId: string; nombre: string; usd: number; tokens: number }[];
  porUsuario: { usuarioId: string | null; email: string | null; nombre: string | null; usd: number; llamadas: number }[];
  episodios: { episodioId: string; titulo: string; marca: string | null; usd: number }[];
};
type Costos = {
  dias: number;
  usd: number;
  tokens: number;
  minutos: number;
  llamadas: number;
  sinPrecio: number;
  historicoUsd: number;
  porConcepto: CostoConcepto[];
  cuentas: Cuenta[];
};

/**
 * Cuánto gastó en IA cada cuenta (ng-creator-be#264): quien paga, con sus
 * marcas, en qué se fue y quién lo disparó. Lo de antes del registro detallado
 * viene de lo que cada episodio tenía anotado.
 */
export default function CostosSuperadmin() {
  const t = useTranslations("costosSuperadmin");
  const locale = useLocale();
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [abierta, setAbierta] = useState<string | null>(null);
  const { data, loading, error } = useQuery<{ costosSuperadmin: Costos }>(COSTOS_SUPERADMIN, {
    variables: { dias },
    fetchPolicy: "cache-and-network",
  });
  const c = data?.costosSuperadmin;

  // Una llamada de chat cuesta milésimas: con menos de un centavo, cuatro decimales.
  const usd = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: n > 0 && n < 0.01 ? 4 : 2,
    }).format(n);
  const numero = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  const nombreCuenta = (cu: Cuenta) =>
    cu.cuentaId ? cu.nombre || cu.email || cu.cuentaId : cu.nombre ? t("cuentas.sinTitular", { marca: cu.nombre }) : t("cuentas.visitantes");
  const claveCuenta = (cu: Cuenta) => cu.cuentaId ?? `sin:${cu.nombre ?? ""}`;

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

      {loading && !c ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : !c ? null : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(
              [
                ["usd", usd(c.usd)],
                ["tokens", numero(c.tokens)],
                ["minutos", numero(c.minutos)],
                ["llamadas", numero(c.llamadas)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/50">{t(`totales.${k}`)}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <div className="mb-8 space-y-1 text-xs text-white/40">
            {c.historicoUsd > 0 && <p>{t("notaHistorico", { usd: usd(c.historicoUsd) })}</p>}
            {c.sinPrecio > 0 && <p>{t("notaSinPrecio", { n: c.sinPrecio })}</p>}
          </div>

          {c.cuentas.length === 0 ? (
            <p className="text-sm text-white/40">{t("vacio")}</p>
          ) : (
            <>
              <section className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="mb-4 font-semibold">{t("porConcepto")}</h2>
                <Barras filas={c.porConcepto.map((p) => ({ clave: p.concepto, etiqueta: t(`conceptos.${p.concepto}`), usd: p.usd }))} total={c.usd} usd={usd} />
              </section>

              <section>
                <h2 className="mb-3 font-semibold">{t("cuentas.titulo")}</h2>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-white/[0.03] text-left text-xs text-white/50">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">{t("cuentas.cuenta")}</th>
                        <th className="px-4 py-2.5 text-right font-medium">{t("cuentas.usd")}</th>
                        <th className="px-4 py-2.5 text-right font-medium">{t("cuentas.tokens")}</th>
                        <th className="w-40 px-4 py-2.5 font-medium">{t("cuentas.parte")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {c.cuentas.map((cu) => {
                        const clave = claveCuenta(cu);
                        const abiertaEsta = abierta === clave;
                        return (
                          <Fragment key={clave}>
                            <tr
                              onClick={() => setAbierta(abiertaEsta ? null : clave)}
                              className="cursor-pointer transition hover:bg-white/[0.03]"
                              aria-expanded={abiertaEsta}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {abiertaEsta ? (
                                    <ChevronDown size={14} className="shrink-0 text-white/40" aria-label={t("cuentas.ocultar")} />
                                  ) : (
                                    <ChevronRight size={14} className="shrink-0 text-white/40" aria-label={t("cuentas.ver")} />
                                  )}
                                  <div className="min-w-0">
                                    <p className="truncate">{nombreCuenta(cu)}</p>
                                    <p className="truncate text-xs text-white/40">
                                      {[cu.nombre && cu.email ? cu.email : null, cu.porMarca.length ? t("cuentas.marcas", { n: cu.porMarca.length }) : null]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium tabular-nums">{usd(cu.usd)}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-white/60">{numero(cu.tokens)}</td>
                              <td className="px-4 py-3">
                                <span className="block h-2 overflow-hidden rounded-full bg-white/5">
                                  <span className="block h-full rounded-full bg-marca" style={{ width: `${c.usd > 0 ? (cu.usd / c.usd) * 100 : 0}%` }} />
                                </span>
                              </td>
                            </tr>
                            {abiertaEsta && (
                              <tr className="bg-white/[0.02]">
                                <td colSpan={4} className="px-4 py-4">
                                  <Detalle cuenta={cu} usd={usd} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}

function Barras({
  filas,
  total,
  usd,
}: {
  filas: { clave: string; etiqueta: string; usd: number; detalle?: string }[];
  total: number;
  usd: (n: number) => string;
}) {
  const maximo = Math.max(total, ...filas.map((f) => f.usd), 0.000001);
  return (
    <ul className="space-y-2.5">
      {filas.map((f) => (
        <li key={f.clave} className="grid grid-cols-[minmax(0,9rem)_1fr_5.5rem] items-center gap-3 text-sm sm:grid-cols-[minmax(0,13rem)_1fr_6rem]">
          <span className="min-w-0">
            <span className="block truncate text-white/80">{f.etiqueta}</span>
            {f.detalle && <span className="block truncate text-xs text-white/40">{f.detalle}</span>}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
            <span className="block h-full rounded-full bg-marca" style={{ width: `${(f.usd / maximo) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-white/60">{usd(f.usd)}</span>
        </li>
      ))}
    </ul>
  );
}

function Detalle({ cuenta, usd }: { cuenta: Cuenta; usd: (n: number) => string }) {
  const t = useTranslations("costosSuperadmin");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">{t("detalle.conceptos")}</h3>
        <Barras
          filas={cuenta.porConcepto.map((p) => ({
            clave: p.concepto,
            etiqueta: t(`conceptos.${p.concepto}`),
            usd: p.usd,
            detalle: p.llamadas ? t("detalle.llamadas", { n: p.llamadas }) : undefined,
          }))}
          total={cuenta.usd}
          usd={usd}
        />
        {cuenta.historicoUsd > 0 && <p className="mt-2 text-xs text-white/35">{t("detalle.historico", { usd: usd(cuenta.historicoUsd) })}</p>}
      </div>
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">{t("detalle.personas")}</h3>
        <Barras
          filas={cuenta.porUsuario.map((u) => ({
            clave: u.usuarioId ?? "nadie",
            etiqueta: u.usuarioId ? u.nombre || u.email || u.usuarioId : t("detalle.sinPersona"),
            usd: u.usd,
            detalle: u.nombre && u.email ? u.email : undefined,
          }))}
          total={cuenta.usd}
          usd={usd}
        />
      </div>
      {cuenta.porMarca.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">{t("detalle.marcas")}</h3>
          <Barras filas={cuenta.porMarca.map((m) => ({ clave: m.marcaId, etiqueta: m.nombre, usd: m.usd }))} total={cuenta.usd} usd={usd} />
        </div>
      )}
      {cuenta.episodios.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/50">{t("detalle.episodios")}</h3>
          <Barras
            filas={cuenta.episodios.map((e) => ({ clave: e.episodioId, etiqueta: e.titulo, usd: e.usd, detalle: e.marca ?? undefined }))}
            total={cuenta.usd}
            usd={usd}
          />
        </div>
      )}
    </div>
  );
}
