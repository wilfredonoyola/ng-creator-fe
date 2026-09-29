"use client";

import { useState } from "react";

type EstadoRender = "EN_COLA" | "RENDERIZANDO" | "LISTO" | "FALLIDO";

/**
 * Cómo está el guardado, arriba al lado del título. Se guarda solo; esto es
 * para que se sepa, no para que haya que hacerlo.
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
  if (error) {
    return <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-400">No se pudo guardar</span>;
  }
  if (guardando || sinGuardar) {
    return <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/60">Guardando…</span>;
  }
  return <span className="rounded-full bg-ng-teal/10 px-2.5 py-1 text-xs text-ng-teal">✓ Cambios guardados</span>;
}

/**
 * Sacar el clip como MP4, en tres pasos que se ven: guardado, procesar,
 * descargar.
 *
 * Antes era un botón "Renderizar" y, al terminar, un link chico "Abrir el
 * MP4": no quedaba claro si los cambios estaban guardados, qué pasaba mientras
 * se procesaba, ni cómo bajarlo. Tampoco se notaba cuando el MP4 había quedado
 * viejo por cambios posteriores: ahora eso cambia el paso 3 entero.
 */
export function PanelExportar({
  titulo,
  estado,
  progreso,
  error,
  urlVideo,
  urlPoster,
  desactualizado,
  guardando,
  pidiendo,
  puedeProcesar,
  onProcesar,
}: {
  titulo: string;
  estado: EstadoRender | string | null;
  progreso: number;
  error?: string | null;
  urlVideo?: string | null;
  urlPoster?: string | null;
  desactualizado: boolean;
  guardando: boolean;
  pidiendo: boolean;
  puedeProcesar: boolean;
  onProcesar: () => void;
}) {
  const [verVideo, setVerVideo] = useState(false);
  const [bajando, setBajando] = useState(false);
  const [errorBajada, setErrorBajada] = useState<string | null>(null);

  const procesando = estado === "EN_COLA" || estado === "RENDERIZANDO" || pidiendo;
  const listo = estado === "LISTO" && Boolean(urlVideo);

  /**
   * Bajar el MP4 con el nombre del clip. Un `<a download>` no sirve con otro
   * dominio (el CDN): el navegador ignora el nombre y lo abre en otra
   * pestaña. Por eso se baja con fetch —el CDN permite CORS— y se guarda
   * desde un blob.
   */
  async function descargar() {
    if (!urlVideo) return;
    setBajando(true);
    setErrorBajada(null);
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
      setErrorBajada(e instanceof Error ? e.message : "No se pudo descargar");
    } finally {
      setBajando(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-sm font-medium">Exportar video</p>
      <ol className="space-y-3">
        {/* 1. Guardado */}
        <Paso numero={1} hecho={!guardando} titulo={guardando ? "Guardando los cambios…" : "Cambios guardados"}>
          <p className="text-xs text-white/40">Se guarda solo mientras editás.</p>
        </Paso>

        {/* 2. Procesar */}
        <Paso
          numero={2}
          hecho={listo && !desactualizado}
          activo={!listo || desactualizado || procesando}
          titulo={
            procesando
              ? estado === "RENDERIZANDO"
                ? `Procesando el video · ${progreso}%`
                : "En espera para procesar…"
              : listo && !desactualizado
                ? "Video procesado"
                : "Procesar el video"
          }
        >
          {procesando ? (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full bg-marca transition-[width] duration-700 ${estado === "EN_COLA" || pidiendo ? "animate-pulse" : ""}`}
                  style={{ width: `${estado === "RENDERIZANDO" ? Math.max(3, progreso) : 3}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-white/40">
                Tarda uno o dos minutos. Podés seguir en otra pantalla: se procesa igual.
              </p>
            </div>
          ) : (
            <>
              {estado === "FALLIDO" && (
                <p className="mb-2 text-xs text-red-400">No se pudo procesar: {error ?? "error desconocido"}</p>
              )}
              {listo && desactualizado && (
                <p className="mb-2 text-xs text-amber-300">
                  Hiciste cambios después de procesar. El MP4 de abajo no los tiene: procesalo de nuevo.
                </p>
              )}
              {(!listo || desactualizado) && puedeProcesar && (
                <button
                  onClick={onProcesar}
                  disabled={pidiendo}
                  className="w-full rounded-lg bg-marca px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {estado === "FALLIDO" ? "Intentar de nuevo" : listo ? "Procesar de nuevo con los cambios" : "Procesar video"}
                </button>
              )}
              {!puedeProcesar && !listo && <p className="text-xs text-white/40">Tu rol puede ver, no procesar.</p>}
            </>
          )}
        </Paso>

        {/* 3. Descargar */}
        <Paso numero={3} hecho={false} activo={listo} titulo="Descargar">
          {listo ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => void descargar()}
                  disabled={bajando}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                    desactualizado ? "border border-white/20 text-white/80" : "bg-white text-black"
                  }`}
                >
                  {bajando ? "Descargando…" : desactualizado ? "Descargar el anterior" : "⬇ Descargar MP4"}
                </button>
                <button
                  onClick={() => setVerVideo((v) => !v)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                >
                  {verVideo ? "Ocultar" : "Ver"}
                </button>
              </div>
              {errorBajada && (
                <p className="text-xs text-red-400">
                  {errorBajada}.{" "}
                  <a href={urlVideo!} target="_blank" rel="noreferrer" className="underline">
                    Abrilo en otra pestaña
                  </a>{" "}
                  y guardalo desde ahí.
                </p>
              )}
              {verVideo && (
                <video src={urlVideo!} poster={urlPoster ?? undefined} controls className="max-h-[50vh] w-full rounded-lg bg-black" />
              )}
            </div>
          ) : (
            <p className="text-xs text-white/40">Cuando termine de procesarse, se descarga desde acá.</p>
          )}
        </Paso>
      </ol>
    </div>
  );
}

function Paso({
  numero,
  hecho,
  activo = true,
  titulo,
  children,
}: {
  numero: number;
  hecho: boolean;
  activo?: boolean;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <li className={`flex gap-3 ${activo || hecho ? "" : "opacity-45"}`}>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          hecho ? "bg-marca text-white" : "border border-white/25 text-white/70"
        }`}
      >
        {hecho ? "✓" : numero}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-sm">{titulo}</p>
        {children}
      </div>
    </li>
  );
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
