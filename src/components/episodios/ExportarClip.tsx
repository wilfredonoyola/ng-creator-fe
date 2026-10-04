"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CloudAlert, CloudCheck, CloudUpload } from "lucide-react";

export type EstadoRender = "EN_COLA" | "RENDERIZANDO" | "LISTO" | "FALLIDO";

/**
 * Cómo está el guardado, chico y en la barra de arriba, como en los editores:
 * una nube con "Guardado", "Guardando…" o "Sin guardar". Se guarda solo; esto
 * es para que se sepa, no para que haya que hacerlo.
 *
 * "Sin guardar" es el medio segundo antes de guardar, o un tramo que espera
 * el "Guardar igual" del aviso de cruces.
 */
export function EstadoGuardado({
  guardando,
  sinGuardar,
  error,
}: {
  guardando: boolean;
  sinGuardar: boolean;
  error: boolean;
}) {
  const t = useTranslations("editorExportar");
  const { icono, texto, clase, ayuda } = error
    ? { icono: <CloudAlert size={16} aria-hidden />, texto: t("guardado.error"), clase: "text-red-400", ayuda: t("guardado.errorAyuda") }
    : guardando
      ? { icono: <CloudUpload size={16} aria-hidden className="animate-pulse" />, texto: t("guardado.guardando"), clase: "text-white/60", ayuda: t("guardado.guardandoAyuda") }
      : sinGuardar
        ? { icono: <CloudUpload size={16} aria-hidden />, texto: t("guardado.sinGuardar"), clase: "text-white/60", ayuda: t("guardado.sinGuardarAyuda") }
        : { icono: <CloudCheck size={16} aria-hidden />, texto: t("guardado.guardado"), clase: "text-ng-secundario", ayuda: t("guardado.guardadoAyuda") };
  return (
    <span role="status" title={ayuda} className={`inline-flex h-9 shrink-0 items-center gap-1.5 px-1 text-xs ${clase}`}>
      {icono}
      <span className="hidden sm:inline">{texto}</span>
    </span>
  );
}

/**
 * Bajar el MP4 con el nombre del clip. Un `<a download>` no sirve con otro
 * dominio (el CDN): el navegador ignora el nombre y lo abre en otra pestaña.
 * Por eso se baja con fetch —el CDN permite CORS— y se guarda desde un blob.
 */
export function useDescargarMp4(urlVideo: string | null | undefined, titulo: string) {
  const t = useTranslations("editorExportar");
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    if (!urlVideo) return;
    setBajando(true);
    setError(null);
    try {
      const res = await fetch(urlVideo);
      if (!res.ok) throw new Error(t("errorCdn", { status: res.status }));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nombreDeArchivo(titulo)}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorDescargar"));
    } finally {
      setBajando(false);
    }
  }

  return { descargar, bajando, error, limpiarError: () => setError(null) };
}

/**
 * En qué está el MP4, en palabras: lo que dice el menú Exportar arriba de sus
 * opciones. Antes era un panel de tres pasos debajo de la vista previa.
 */
export function estadoDelMp4(
  {
    estado,
    progreso,
    pidiendo,
    urlVideo,
    desactualizado,
    error,
  }: {
    estado: EstadoRender | string | null;
    progreso: number;
    pidiendo: boolean;
    urlVideo?: string | null;
    desactualizado: boolean;
    error?: string | null;
  },
  t: ReturnType<typeof useTranslations<"editorExportar">>,
) {
  const procesando = estado === "EN_COLA" || estado === "RENDERIZANDO" || pidiendo;
  const listo = estado === "LISTO" && Boolean(urlVideo);
  if (procesando) {
    return {
      procesando,
      listo,
      tono: "proceso" as const,
      corto: estado === "RENDERIZANDO" ? `${progreso}%` : t("mp4.enEspera"),
      etiqueta: estado === "RENDERIZANDO" ? t("mp4.procesandoEtiqueta", { progreso }) : t("mp4.enEsperaEtiqueta"),
      texto: estado === "RENDERIZANDO" ? t("mp4.procesandoTexto", { progreso }) : t("mp4.enEsperaTexto"),
      detalle: t("mp4.procesandoDetalle"),
    };
  }
  if (estado === "FALLIDO") {
    return { procesando, listo, tono: "error" as const, corto: t("mp4.fallo"), etiqueta: t("mp4.noSePudo"), texto: t("mp4.noSePudo"), detalle: error ?? t("mp4.errorDesconocido") };
  }
  if (listo && desactualizado) {
    return {
      procesando,
      listo,
      tono: "aviso" as const,
      corto: t("mp4.conCambios"),
      etiqueta: t("mp4.conCambiosSinProcesar"),
      texto: t("mp4.conCambiosSinProcesar"),
      detalle: t("mp4.conCambiosDetalle"),
    };
  }
  if (listo) return { procesando, listo, tono: "listo" as const, corto: t("mp4.listo"), etiqueta: t("mp4.mp4Listo"), texto: t("mp4.mp4Listo"), detalle: t("mp4.listoDetalle") };
  return { procesando, listo, tono: "tenue" as const, corto: t("mp4.sinProcesar"), etiqueta: t("mp4.videoSinProcesar"), texto: t("mp4.sinProcesar"), detalle: t("mp4.sinProcesarDetalle") };
}

/** "La fantasía de Bori" → "la-fantasia-de-bori". */
function nombreDeArchivo(titulo: string): string {
  const limpio = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return limpio || "clip";
}
