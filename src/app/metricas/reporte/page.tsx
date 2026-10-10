"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { RESUMEN_METRICAS } from "@/graphql/operations";
import { FotoMarca } from "@/components/FotoMarca";
import { BarrasGrupos } from "@/components/metricas/BarrasGrupos";
import { haySesion } from "@/lib/auth";
import { useMarcaActiva } from "@/lib/marca-activa";
import { esMotivo } from "@/lib/momentos";
import { etiquetaHora } from "@/lib/analitica";
import { REDES } from "@/lib/publicaciones";
import {
  PERIODOS_METRICAS,
  cambioPorcentual,
  compacto,
  mejorGrupo,
  numero,
  periodoDe,
  porcentaje,
  zonaDelNavegador,
  type ResumenMetricas,
} from "@/lib/metricas";

/** Cuántos clips van en el reporte: los que el cliente va a mirar de verdad. */
const CLIPS_EN_REPORTE = 5;

/**
 * El reporte para el cliente de la agencia: la misma información que
 * /metricas, en una hoja blanca que se imprime o se guarda como PDF desde el
 * navegador ("Descargar PDF" abre el diálogo de imprimir).
 *
 * Sin el menú ni nada del panel: es un documento para alguien que no usa
 * Clipfine. La app abre esta misma URL (`/metricas/reporte?dias=<n>`) para
 * compartir el reporte, así que la ruta y el parámetro no se cambian.
 * `?marca=<id>` elige otra marca de las que se ven sin cambiar la activa.
 */
export default function ReportePage() {
  return (
    // useSearchParams exige Suspense para el prerender de Next.
    <Suspense fallback={null}>
      <Reporte />
    </Suspense>
  );
}

function Reporte() {
  const t = useTranslations("metricasReporte");
  const tMotivo = useTranslations("episodiosMotivos");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const dias = periodoDe(params.get("dias"));
  const { activa, marcas, cargando: cargandoMarca } = useMarcaActiva();
  const marca = marcas.find((m) => m._id === params.get("marca")) ?? activa;

  // No usa el DashboardLayout, así que la sesión se mira acá. Después de
  // entrar vuelve al reporte (el link de la app llega sin sesión a veces).
  useEffect(() => {
    if (!haySesion()) {
      const aca = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(`/login?volverA=${encodeURIComponent(aca)}`);
    }
  }, [router, pathname, params]);

  const { data, loading } = useQuery(RESUMEN_METRICAS, {
    variables: { marcaId: marca?._id, dias, zonaHoraria: zonaDelNavegador() },
    skip: !marca,
    errorPolicy: "all",
  });
  const r: ResumenMetricas | undefined = data?.resumenMetricas;

  // El título es el nombre que el navegador le propone al PDF.
  useEffect(() => {
    if (marca) document.title = t("tituloDocumento", { marca: marca.nombre, dias });
  }, [marca, dias, t]);

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  const nombreMotivo = (c: string) => (esMotivo(c) ? tMotivo(c) : c);
  const mejorMotivo = r ? mejorGrupo(r.porMotivo) : null;
  const mejorHora = r ? mejorGrupo(r.porHora) : null;

  return (
    <div className="min-h-screen bg-ng-fondo px-4 py-4 sm:py-8 print:bg-white print:p-0">
      {/* La barra de arriba es de la pantalla: en el PDF no sale. */}
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center gap-2 print:hidden">
        <Link href="/metricas" className="mr-auto text-sm text-white/50 hover:text-white/80">
          ← {t("volver")}
        </Link>
        {PERIODOS_METRICAS.map((p) => (
          <Link
            key={p}
            href={`/metricas/reporte?dias=${p}${params.get("marca") ? `&marca=${params.get("marca")}` : ""}`}
            replace
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              dias === p ? "bg-marca text-ng-tinta" : "border border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            {t("periodo", { n: p })}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!r}
          className="bg-marca flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
        >
          <Download size={15} strokeWidth={2} aria-hidden />
          {t("descargar")}
        </button>
      </div>

      <article className="mx-auto max-w-3xl rounded-xl bg-white p-5 text-ng-tinta sm:p-10 print:max-w-none print:rounded-none print:p-0">
        {!marca && !cargandoMarca ? (
          <p className="text-center text-sm text-black/50">{t("sinMarca")}</p>
        ) : !r ? (
          loading || !marca ? (
            <div className="h-64 animate-pulse rounded-lg bg-black/5" />
          ) : (
            <p className="text-center text-sm text-black/50">{t("error")}</p>
          )
        ) : (
          <div className="space-y-6">
            <header className="flex items-center gap-4 border-b border-black/10 pb-5">
              <FotoMarca
                nombre={marca?.nombre}
                logoUrl={marca?.logoUrl}
                pageId={marca?.paginaFacebook?.pageId}
                fotoUrl={marca?.paginaFacebook?.fotoUrl}
                className="h-14 w-14"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-black/45">{t("titulo")}</p>
                <h1 className="truncate text-2xl font-bold">{marca?.nombre}</h1>
                <p className="text-sm text-black/60">
                  {t("rango", { desde: fecha(r.desde), hasta: fecha(r.hasta), dias: r.dias })}
                </p>
              </div>
            </header>

            {r.totales.publicaciones === 0 ? (
              <p className="py-10 text-center text-sm text-black/50">{t("vacio", { dias: r.dias })}</p>
            ) : (
              <>
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Cifra
                    titulo={t("cifras.vistas")}
                    valor={compacto(r.totales.vistas, locale)}
                    cambio={cambioPorcentual(r.totales.vistas, r.anterior.vistas)}
                  />
                  <Cifra
                    titulo={t("cifras.interacciones")}
                    valor={compacto(r.totales.interacciones, locale)}
                    cambio={cambioPorcentual(r.totales.interacciones, r.anterior.interacciones)}
                  />
                  <Cifra titulo={t("cifras.tasa")} valor={porcentaje(r.totales.tasaInteraccion, locale)} />
                  <Cifra
                    titulo={t("cifras.seguidores")}
                    valor={numero(r.totales.seguidoresGanados, locale)}
                    cambio={cambioPorcentual(r.totales.seguidoresGanados, r.anterior.seguidoresGanados)}
                  />
                  <Cifra
                    titulo={t("cifras.clips")}
                    valor={numero(r.clips, locale)}
                    cambio={cambioPorcentual(r.totales.publicaciones, r.anterior.publicaciones)}
                  />
                </section>
                <p className="-mt-3 text-[11px] text-black/45">{t("vsAnterior", { dias: r.dias })}</p>

                {r.porRed.length > 0 && (
                  <section className="break-inside-avoid">
                    <h2 className="text-sm font-semibold">{t("redes.titulo")}</h2>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wider text-black/45">
                            <th className="pb-1 font-medium">{t("redes.red")}</th>
                            <th className="pb-1 text-right font-medium">{t("redes.publicaciones")}</th>
                            <th className="pb-1 text-right font-medium">{t("redes.vistas")}</th>
                            <th className="pb-1 text-right font-medium">{t("redes.interacciones")}</th>
                            <th className="pb-1 text-right font-medium">{t("redes.tasa")}</th>
                            <th className="pb-1 text-right font-medium">{t("redes.seguidores")}</th>
                          </tr>
                        </thead>
                        <tbody className="tabular-nums">
                          {r.porRed.map((red) => (
                            <tr key={red.red} className="border-t border-black/10">
                              <td className="py-1.5 font-medium">{REDES[red.red]?.nombre ?? red.red}</td>
                              <td className="py-1.5 text-right">{numero(red.totales.publicaciones, locale)}</td>
                              <td className="py-1.5 text-right">{numero(red.totales.vistas, locale)}</td>
                              <td className="py-1.5 text-right">{numero(red.totales.interacciones, locale)}</td>
                              <td className="py-1.5 text-right">{porcentaje(red.totales.tasaInteraccion, locale)}</td>
                              <td className="py-1.5 text-right">
                                {numero(red.seguidores, locale)}
                                {red.seguidoresCambio != null && red.seguidoresCambio !== 0 && (
                                  <span className="ml-1 text-black/50">
                                    ({red.seguidoresCambio > 0 ? "+" : ""}
                                    {numero(red.seguidoresCambio, locale)})
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {r.mejores.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold">{t("mejores")}</h2>
                    <ol className="mt-2 space-y-2">
                      {r.mejores.slice(0, CLIPS_EN_REPORTE).map((c, i) => (
                        <li key={c.clipId} className="flex break-inside-avoid items-center gap-3 rounded-lg border border-black/10 p-2">
                          <span className="w-4 shrink-0 text-right text-sm tabular-nums text-black/40">{i + 1}</span>
                          {c.urlPoster ? (
                            // <img> y no un fondo: los fondos no se imprimen por defecto.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.urlPoster} alt="" className="h-16 w-9 shrink-0 rounded object-cover" />
                          ) : (
                            <span className="h-16 w-9 shrink-0 rounded bg-black/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{c.titulo ?? "—"}</p>
                            <p className="text-[11px] text-black/50">
                              {[
                                c.origen !== "MANUAL" && c.motivo ? nombreMotivo(c.motivo) : null,
                                c.redes.map((red) => REDES[red]?.nombre ?? red).join(", "),
                                fecha(c.publicadoEn),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="shrink-0 text-right tabular-nums">
                            <p className="text-base font-bold">{compacto(c.totales.vistas, locale)}</p>
                            <p className="text-[11px] text-black/50">
                              {t("clipDetalle", {
                                interacciones: compacto(c.totales.interacciones, locale),
                                tasa: porcentaje(c.totales.tasaInteraccion, locale),
                              })}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {(mejorMotivo || mejorHora || r.porMotivo.length > 0) && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold">{t("queFunciona.titulo")}</h2>
                    {(mejorMotivo || mejorHora) && (
                      <ul className="space-y-1 rounded-lg border-l-4 border-ng-azul bg-black/[0.03] p-3 text-sm">
                        {mejorMotivo && (
                          <li>
                            {t.rich("queFunciona.motivo", {
                              motivo: nombreMotivo(mejorMotivo.clave),
                              vistas: compacto(mejorMotivo.vistasPromedio, locale),
                              n: mejorMotivo.clips,
                              b: (c) => <strong>{c}</strong>,
                            })}
                          </li>
                        )}
                        {mejorHora && (
                          <li>
                            {t.rich("queFunciona.hora", {
                              hora: etiquetaHora(Number(mejorHora.clave)),
                              n: mejorHora.clips,
                              b: (c) => <strong>{c}</strong>,
                            })}
                          </li>
                        )}
                      </ul>
                    )}
                    {r.porMotivo.length > 0 && (
                      <BarrasGrupos titulo={t("queFunciona.porMotivo")} grupos={r.porMotivo} etiqueta={nombreMotivo} claro />
                    )}
                  </section>
                )}
              </>
            )}

            <footer className="border-t border-black/10 pt-3 text-[11px] text-black/45">
              <p>{t("nota")}</p>
              <p className="mt-1">
                {t("pie", { fecha: new Date(r.actualizadoEn ?? r.hasta).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) })}
              </p>
            </footer>
          </div>
        )}
      </article>
    </div>
  );
}

function Cifra({ titulo, valor, cambio }: { titulo: string; valor: string; cambio?: number | null }) {
  const t = useTranslations("metricasReporte");
  const locale = useLocale();
  return (
    <div className="break-inside-avoid rounded-lg border border-black/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-black/45">{titulo}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{valor}</p>
      {cambio != null && Number.isFinite(cambio) && (
        <p className={`text-[11px] ${cambio >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          {t("cambio", {
            flecha: cambio >= 0 ? "▲" : "▼",
            valor: Math.abs(cambio).toLocaleString(locale, { maximumFractionDigits: 0 }),
          })}
        </p>
      )}
    </div>
  );
}
