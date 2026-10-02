"use client";

import { useState } from "react";
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
  const { icono, texto, clase, ayuda } = error
    ? { icono: <CloudAlert size={16} aria-hidden />, texto: "No se pudo guardar", clase: "text-red-400", ayuda: "Revisá el aviso de abajo" }
    : guardando
      ? { icono: <CloudUpload size={16} aria-hidden className="animate-pulse" />, texto: "Guardando…", clase: "text-white/60", ayuda: "Se guarda solo" }
      : sinGuardar
        ? { icono: <CloudUpload size={16} aria-hidden />, texto: "Sin guardar", clase: "text-white/60", ayuda: "Se guarda solo en un momento" }
        : { icono: <CloudCheck size={16} aria-hidden />, texto: "Guardado", clase: "text-ng-secundario", ayuda: "Todos los cambios están guardados" };
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
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    if (!urlVideo) return;
    setBajando(true);
    setError(null);
    try {
      const res = await fetch(urlVideo);
      if (!res.ok) throw new Error(`El CDN respondió ${res.status}`);
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
      setError(e instanceof Error ? e.message : "No se pudo descargar");
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
export function estadoDelMp4({
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
}) {
  const procesando = estado === "EN_COLA" || estado === "RENDERIZANDO" || pidiendo;
  const listo = estado === "LISTO" && Boolean(urlVideo);
  if (procesando) {
    return {
      procesando,
      listo,
      tono: "proceso" as const,
      corto: estado === "RENDERIZANDO" ? `${progreso}%` : "En espera",
      etiqueta: estado === "RENDERIZANDO" ? `Procesando · ${progreso}%` : "En espera para procesar",
      texto: estado === "RENDERIZANDO" ? `Procesando el video · ${progreso}%` : "En espera para procesar…",
      detalle: "Tarda uno o dos minutos. Podés seguir en otra pantalla: se procesa igual.",
    };
  }
  if (estado === "FALLIDO") {
    return { procesando, listo, tono: "error" as const, corto: "Falló", etiqueta: "No se pudo procesar", texto: "No se pudo procesar", detalle: error ?? "Error desconocido" };
  }
  if (listo && desactualizado) {
    return {
      procesando,
      listo,
      tono: "aviso" as const,
      corto: "Con cambios",
      etiqueta: "Con cambios sin procesar",
      texto: "Con cambios sin procesar",
      detalle: "Hiciste cambios después de procesar: el MP4 no los tiene.",
    };
  }
  if (listo) return { procesando, listo, tono: "listo" as const, corto: "Listo", etiqueta: "MP4 listo", texto: "MP4 listo", detalle: "Tiene todos los cambios." };
  return { procesando, listo, tono: "tenue" as const, corto: "Sin procesar", etiqueta: "Video sin procesar", texto: "Sin procesar", detalle: "Procesalo para descargarlo o programarlo." };
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
