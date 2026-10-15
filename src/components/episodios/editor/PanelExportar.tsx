"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { Check, Clapperboard, Download, LoaderCircle, RefreshCw, Undo2 } from "lucide-react";
import { MARCAR_CLIP_LISTO } from "@/graphql/operations";
import { diaYHora } from "@/lib/publicaciones";
import type { CalidadClip } from "@/lib/calidad";
import { IndicadorCalidad } from "@/components/episodios/IndicadorCalidad";
import { estadoDelMp4, type EstadoRender, type useDescargarMp4 } from "@/components/episodios/ExportarClip";
import type { Autoria } from "@/components/episodios/TomarClip";
import type { ResumenPublicacionClip } from "@/components/episodios/ListoClip";

const TONOS = {
  tenue: "text-ng-secundario",
  marca: "text-ng-azul",
  aviso: "text-amber-300",
  listo: "text-ng-teal",
  error: "text-red-400",
  proceso: "text-ng-azul",
} as const;

export interface RenderClip {
  estado: EstadoRender | string | null;
  progreso: number;
  error?: string | null;
  urlVideo?: string | null;
  /** Hay cambios que el MP4 no tiene. */
  desactualizado: boolean;
  /** La medida del MP4 (null si todavía no se midió). */
  calidad?: CalidadClip | null;
  pidiendo: boolean;
}

/**
 * Lo que se abre desde "Descargar": el MP4 (exportar, cómo va, descargar) y
 * marcar el clip listo para el equipo. Programar va en su propio botón de la
 * barra: no pide exportar antes (ng-creator-be, `esperaVideo`).
 */
export function PanelExportar({
  clipId,
  marcaId,
  puedeOperar,
  listoPor,
  publicacion,
  render,
  onExportar,
  bajada,
  bajarAlTerminar,
}: {
  clipId: string;
  marcaId: string;
  puedeOperar: boolean;
  listoPor?: Autoria | null;
  publicacion?: ResumenPublicacionClip | null;
  render: RenderClip;
  onExportar: () => void | Promise<void>;
  /** La descarga vive en la barra: sigue aunque el panel se cierre. */
  bajada: ReturnType<typeof useDescargarMp4>;
  /** Se pidió "Descargar" sin el MP4 al día: baja solo cuando termina. */
  bajarAlTerminar: boolean;
}) {
  const t = useTranslations("editorHerramientas");
  const tb = useTranslations("editorBarra");
  const te = useTranslations("editorExportar");
  const locale = useLocale();
  const [marcar, { loading: marcando }] = useMutation(MARCAR_CLIP_LISTO, { refetchQueries: ["ClipsListosSinProgramar"] });
  const [error, setError] = useState<string | null>(null);
  const mp4 = estadoDelMp4(render, te);
  // Marcar listo sí pide un MP4 (el backend lo rechaza sin uno), aunque sea viejo.
  const conVideo = Boolean(render.urlVideo);

  async function terminar(listo: boolean) {
    setError(null);
    try {
      await marcar({ variables: { id: clipId, marcaId, listo } });
    } catch (e) {
      setError(e instanceof Error ? e.message : tb("errores.estado"));
    }
  }

  const { programadas = 0, publicadas = 0, fallidas = 0, proximaEn } = publicacion ?? {};
  const redes = fallidas
    ? { texto: tb("redes.fallo"), tono: "error" as const, ayuda: tb("redes.falloAyuda") }
    : programadas
      ? {
          texto: `${tb("redes.programado")}${proximaEn ? ` · ${diaYHora(new Date(proximaEn), locale)}` : ""}`,
          tono: "listo" as const,
          ayuda: programadas > 1 ? tb("redes.enCamino", { n: programadas }) : tb("redes.saleSola"),
        }
      : publicadas
        ? { texto: tb("redes.publicado", { n: publicadas }), tono: "listo" as const, ayuda: tb("redes.publicadoAyuda") }
        : null;

  const secundario =
    "flex w-full items-center justify-center gap-2 rounded-ng-md border border-white/15 px-3 py-2 text-sm text-white/90 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-4 text-sm">
      {/* ---- El MP4 ---- */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ng-secundario">{t("exportar.video")}</h2>
        <p className={`font-medium ${TONOS[mp4.tono]}`}>{mp4.texto}</p>
        <p className="break-words text-xs text-white/50">{mp4.detalle}</p>
        {bajarAlTerminar && <p className="text-xs text-ng-azul">{t("exportar.bajaAlTerminar")}</p>}
        {render.estado === "RENDERIZANDO" && (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={render.progreso} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ng-azul transition-all duration-700" style={{ width: `${Math.max(3, render.progreso)}%` }} />
          </div>
        )}
        {mp4.listo && render.calidad ? <IndicadorCalidad calidad={render.calidad} medida lado="abajo-derecha" /> : null}
        {puedeOperar && (
          <button
            type="button"
            onClick={() => void onExportar()}
            disabled={mp4.procesando}
            className="flex w-full items-center justify-center gap-2 rounded-ng-md bg-ng-azul px-3 py-2.5 font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-60"
          >
            {mp4.procesando ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden />
            ) : mp4.listo ? (
              <RefreshCw size={16} aria-hidden />
            ) : (
              <Clapperboard size={16} aria-hidden />
            )}
            {mp4.procesando ? mp4.etiqueta : render.estado === "FALLIDO" ? t("exportar.reintentar") : mp4.listo ? t("exportar.deNuevo") : t("exportar.exportar")}
          </button>
        )}
        {puedeOperar && mp4.listo && !render.desactualizado && !mp4.procesando && <p className="text-xs text-white/40">{t("exportar.alDia")}</p>}
        {mp4.listo && (
          <button type="button" onClick={() => void bajada.descargar()} disabled={bajada.bajando} className={secundario}>
            <Download size={16} aria-hidden />
            {bajada.bajando ? tb("descargar.bajando") : render.desactualizado ? tb("descargar.anterior") : tb("descargar.mp4")}
          </button>
        )}
        {bajada.error && (
          <p role="alert" className="text-xs text-red-300">
            {bajada.error}.{" "}
            {tb.rich("abrirEnPestana", {
              link: (c) => (
                <a href={render.urlVideo ?? "#"} target="_blank" rel="noreferrer" className="underline">
                  {c}
                </a>
              ),
            })}
          </p>
        )}
      </section>

      {/* ---- Listo para el equipo ---- */}
      {puedeOperar && (
        <section className="space-y-2 border-t border-white/10 pt-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ng-secundario">{t("exportar.equipo")}</h2>
          {listoPor ? (
            <>
              <p className="flex items-center gap-1.5 text-ng-teal">
                <Check size={16} aria-hidden />
                {tb("listo.por", { nombre: listoPor.nombre })}
              </p>
              <p className="text-xs text-white/45">{tb("listo.desde", { fecha: new Date(listoPor.en).toLocaleString(locale) })}</p>
              <button type="button" onClick={() => void terminar(false)} disabled={marcando} className={secundario}>
                <Undo2 size={16} aria-hidden />
                {tb("listo.volverAEditar")}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => void terminar(true)} disabled={!conVideo || marcando} className={secundario}>
                {marcando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
                {tb("listo.marcar")}
              </button>
              <p className="text-xs text-white/45">{conVideo ? tb("listo.marcarAyuda") : t("exportar.listoSinVideo")}</p>
            </>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
        </section>
      )}

      {redes && (
        <p className={`border-t border-white/10 pt-4 text-xs ${TONOS[redes.tono]}`}>
          {redes.texto}. <span className="text-white/45">{redes.ayuda}</span>
        </p>
      )}
    </div>
  );
}
