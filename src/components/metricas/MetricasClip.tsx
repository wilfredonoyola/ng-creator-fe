"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { ACTUALIZAR_METRICAS_DE_CLIP, METRICAS_DE_CLIP, RESUMEN_METRICAS } from "@/graphql/operations";
import { IconoRed } from "@/components/IconoRed";
import { REDES } from "@/lib/publicaciones";
import { tiempoRelativo } from "@/lib/time";
import {
  compacto,
  juntarRepartos,
  numero,
  porcentaje,
  zonaDelNavegador,
  type MetricasDeClip,
  type MetricasPublicacion,
  type PublicacionConMetricas,
  type ResumenMetricas,
} from "@/lib/metricas";
import { CurvaCrecimiento } from "./CurvaCrecimiento";
import { CurvaRetencion } from "./CurvaRetencion";
import { Reparto } from "./Reparto";

/** Los orígenes del tráfico de TikTok con nombre propio (`origenes.<clave>`); otro va tal cual. */
const ORIGENES: Record<string, string> = {
  "For You": "paraTi",
  Follow: "siguiendo",
  "Personal Profile": "perfil",
  Search: "busqueda",
  Sound: "sonido",
  "Direct Message": "mensajes",
  Others: "otros",
};
type ClaveOrigen = "paraTi" | "siguiendo" | "perfil" | "busqueda" | "sonido" | "mensajes" | "otros";

/** El público de TikTok viene en dos pares que no se suman entre sí. */
const PAR_NUEVOS = ["NEW_VIEWER", "RETURN_VIEWER"];
const PAR_SEGUIDORES = ["FOLLOWER_PERCENT", "NON_FOLLOWER_PERCENT"];
type ClavePublico = "NEW_VIEWER" | "RETURN_VIEWER" | "FOLLOWER_PERCENT" | "NON_FOLLOWER_PERCENT";
const esClavePublico = (c: string): c is ClavePublico => [...PAR_NUEVOS, ...PAR_SEGUIDORES].includes(c);

/** Una puntuación de la IA desde la que se considera que "esperaba mucho". */
const PUNTUACION_ALTA = 70;

/**
 * Cómo le fue a un clip en las redes (ng-creator-be#119): totales, cada
 * publicación con su link, cómo crecieron las vistas y lo que cada red cuenta
 * de más (la retención de TikTok, el porcentaje visto de YouTube, de dónde
 * llegó la gente).
 *
 * No se dibuja nada si el clip no salió todavía, ni si la consulta falla: va
 * metido en pantallas que tienen su propio trabajo, y un error de métricas no
 * debería ensuciarlas.
 */
export function MetricasClip({
  marcaId,
  clipId,
  puntuacion,
}: {
  marcaId: string;
  clipId: string;
  /** Lo que predijo la IA, para compararlo con lo que pasó. Sin ella (clip a mano) no se compara. */
  puntuacion?: number | null;
}) {
  const t = useTranslations("metricasClip");
  const locale = useLocale();
  const [aviso, setAviso] = useState<string | null>(null);

  const { data, loading } = useQuery(METRICAS_DE_CLIP, {
    variables: { marcaId, clipId },
    skip: !marcaId || !clipId,
    errorPolicy: "all",
  });
  // El promedio de la marca, para decir si a este le fue mejor o peor que al resto.
  const resumenQ = useQuery(RESUMEN_METRICAS, {
    variables: { marcaId, dias: 90, zonaHoraria: zonaDelNavegador() },
    skip: !marcaId || puntuacion == null,
    errorPolicy: "all",
  });
  const [actualizar, { loading: actualizando }] = useMutation(ACTUALIZAR_METRICAS_DE_CLIP);

  const m: MetricasDeClip | undefined = data?.metricasDeClip;
  if (loading && !m) return <div className="h-40 animate-pulse rounded-2xl bg-white/5" />;
  if (!m || !m.publicaciones.length) return null;

  async function releer() {
    setAviso(null);
    try {
      // Devuelve el mismo tipo con el mismo id: Apollo actualiza la consulta solo.
      await actualizar({ variables: { marcaId, clipId } });
    } catch {
      setAviso(t("errorActualizar"));
    }
  }

  const resumen: ResumenMetricas | undefined = resumenQ.data?.resumenMetricas;
  const promedioMarca =
    resumen && resumen.clips > 0 && resumen.totales.vistas != null ? resumen.totales.vistas / resumen.clips : null;
  const tot = m.totales;

  const tiktok = m.publicaciones.find((p) => p.red === "TIKTOK" && p.metricas?.retencion?.length);
  const youtube = m.publicaciones.find((p) => p.red === "YOUTUBE" && p.metricas?.fraccionVista != null);
  const reparto = (campo: "origenes" | "paises" | "publico") =>
    juntarRepartos(m.publicaciones.map((p) => ({ reparto: p.metricas?.[campo], vistas: p.metricas?.vistas })));
  const origenes = reparto("origenes");
  const paises = reparto("paises");
  const publico = reparto("publico");
  const nuevos = publico.filter((p) => PAR_NUEVOS.includes(p.clave));
  const seguidores = publico.filter((p) => PAR_SEGUIDORES.includes(p.clave));
  const hayRepartos = origenes.length + paises.length + nuevos.length + seguidores.length > 0;

  const nombrePais = (() => {
    try {
      const d = new Intl.DisplayNames([locale], { type: "region" });
      return (c: string) => d.of(c.toUpperCase()) ?? c;
    } catch {
      return (c: string) => c;
    }
  })();
  const nombreOrigen = (c: string) => (ORIGENES[c] ? t(`origenes.${ORIGENES[c] as ClaveOrigen}`) : c);
  const nombrePublico = (c: string) => (esClavePublico(c) ? t(`publico.${c}`) : c);

  return (
    <section id="metricas" className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("titulo")}</h2>
          <p className="mt-0.5 text-xs text-white/40">
            {m.actualizadoEn
              ? t("actualizado", { cuando: tiempoRelativo(m.actualizadoEn, undefined, locale) })
              : t("sinLecturas")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void releer()}
          disabled={actualizando}
          title={t("actualizarAyuda")}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw size={13} strokeWidth={1.8} className={actualizando ? "animate-spin" : ""} aria-hidden />
          {actualizando ? t("actualizando") : t("actualizar")}
        </button>
      </div>
      {aviso && <p className="text-xs text-red-400">{aviso}</p>}

      {/* Lo que se viene a buscar: cuánto lo vieron y cuánto reaccionaron. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Dato titulo={t("totales.vistas")} valor={compacto(tot.vistas, locale)} />
        <Dato titulo={t("totales.interacciones")} valor={compacto(tot.interacciones, locale)} />
        <Dato titulo={t("totales.tasa")} valor={porcentaje(tot.tasaInteraccion, locale)} />
        <Dato titulo={t("totales.seguidores")} valor={numero(tot.seguidoresGanados, locale)} />
      </div>
      <p className="text-xs text-white/45">
        {t("detalleTotales", {
          likes: numero(tot.likes, locale),
          comentarios: numero(tot.comentarios, locale),
          compartidos: numero(tot.compartidos, locale),
          guardados: numero(tot.guardados, locale),
        })}
      </p>

      {puntuacion != null && (
        <IaVsRealidad puntuacion={puntuacion} vistas={tot.vistas} promedioMarca={promedioMarca} />
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">{t("porRed")}</h3>
        {m.publicaciones.map((p) => (
          <FilaRed key={p._id} p={p} />
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">{t("crecimiento")}</h3>
        <CurvaCrecimiento curva={m.curva} publicaciones={m.publicaciones} />
      </div>

      {tiktok?.metricas?.retencion && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">{t("retencion")}</h3>
          <CurvaRetencion retencion={tiktok.metricas.retencion} fraccionCompleta={tiktok.metricas.fraccionCompleta} />
        </div>
      )}

      {youtube?.metricas && (
        <p className="text-sm text-white/70">
          {t.rich("youtubeVisto", {
            pct: porcentaje(youtube.metricas.fraccionVista, locale, 0),
            b: (c) => <strong className="text-white">{c}</strong>,
          })}
          {youtube.metricas.tiempoMedioSeg != null &&
            ` ${t("tiempoMedio", { seg: Math.round(youtube.metricas.tiempoMedioSeg) })}`}
        </p>
      )}

      {hayRepartos && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Reparto titulo={t("origenesTitulo")} partes={origenes} etiqueta={nombreOrigen} />
          <Reparto titulo={t("paisesTitulo")} partes={paises} etiqueta={nombrePais} />
          <Reparto titulo={t("nuevosTitulo")} partes={nuevos} etiqueta={nombrePublico} />
          <Reparto titulo={t("seguidoresTitulo")} partes={seguidores} etiqueta={nombrePublico} />
        </div>
      )}
    </section>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wider text-white/35">{titulo}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{valor}</p>
    </div>
  );
}

/**
 * Lo que la IA esperaba contra lo que pasó. Es la forma de saber si la
 * puntuación sirve para elegir qué clips sacar.
 */
function IaVsRealidad({
  puntuacion,
  vistas,
  promedioMarca,
}: {
  puntuacion: number;
  vistas?: number | null;
  promedioMarca: number | null;
}) {
  const t = useTranslations("metricasClip");
  const locale = useLocale();
  const veces = vistas != null && promedioMarca ? vistas / promedioMarca : null;
  const esperaba = puntuacion >= PUNTUACION_ALTA;
  const veredicto =
    veces == null ? null : veces >= 1 ? (esperaba ? "acerto" : "sorpresa") : esperaba ? "esperabaMas" : "acertoBajo";
  return (
    <div className="rounded-xl border border-ng-azul/25 p-3 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span>
          {t.rich("ia.puntuacion", { n: puntuacion, b: (c) => <strong className="texto-marca">{c}</strong> })}
        </span>
        <span>
          {t.rich("ia.resultado", { vistas: compacto(vistas, locale), b: (c) => <strong>{c}</strong> })}
        </span>
        {veces != null && (
          <span className="text-white/55">
            {t("ia.veces", { veces: veces.toLocaleString(locale, { maximumFractionDigits: 1 }) })}
          </span>
        )}
      </p>
      {veredicto && <p className="mt-1 text-xs text-white/50">{t(`ia.${veredicto}`)}</p>}
    </div>
  );
}

function FilaRed({ p }: { p: PublicacionConMetricas }) {
  const t = useTranslations("metricasClip");
  const locale = useLocale();
  const mt: MetricasPublicacion = p.metricas ?? {};
  const inter = sumarPresentes([mt.likes, mt.comentarios, mt.compartidos, mt.guardados]);
  const tasa = inter != null && mt.vistas ? inter / mt.vistas : null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        <IconoRed red={p.red} chico />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {REDES[p.red]?.nombre ?? p.red}
          {p.cuentaNombre ? ` · ${p.cuentaNombre}` : ""}
        </p>
        {p.permalink && (
          <a href={p.permalink} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-ng-celeste hover:underline">
            {t("verPublicacion")}
          </a>
        )}
      </div>
      {p.metricas ? (
        <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs sm:grid-cols-6">
          <Par titulo={t("totales.vistas")} valor={compacto(mt.vistas, locale)} />
          <Par titulo={t("totales.likes")} valor={numero(mt.likes, locale)} />
          <Par titulo={t("totales.comentarios")} valor={numero(mt.comentarios, locale)} />
          <Par titulo={t("totales.compartidos")} valor={numero(mt.compartidos, locale)} />
          <Par titulo={t("totales.guardados")} valor={numero(mt.guardados, locale)} />
          <Par titulo={t("totales.tasa")} valor={porcentaje(tasa, locale)} />
        </dl>
      ) : (
        <p className="mt-1 text-xs text-white/40">{t("todaviaNoLeida")}</p>
      )}
      {p.metricasEn && (
        <p className="mt-1.5 text-[11px] text-white/30">
          {t("leida", { cuando: tiempoRelativo(p.metricasEn, undefined, locale) })}
        </p>
      )}
    </div>
  );
}

function Par({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-white/35">{titulo}</dt>
      <dd className="tabular-nums text-white/85">{valor}</dd>
    </div>
  );
}

/** La suma de lo que la red informa; null si no informa nada. */
function sumarPresentes(valores: (number | null | undefined)[]): number | null {
  const hay = valores.filter((v): v is number => v != null);
  return hay.length ? hay.reduce((a, b) => a + b, 0) : null;
}
