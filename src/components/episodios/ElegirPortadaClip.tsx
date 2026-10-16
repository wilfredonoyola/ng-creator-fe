"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";

/**
 * La portada: un cuadro del MP4 final (el mismo que sale). Dos opciones bien
 * marcadas, "Automática" (cada red elige) o "Elegir un cuadro"; con la segunda,
 * el video pausado y un deslizador, con un aviso mientras carga el cuadro y un
 * ✓ cuando ya quedó.
 */
export function ElegirPortadaClip({
  url,
  duracion,
  valor,
  onCambiar,
}: {
  url: string;
  duracion: number;
  valor: number | null;
  onCambiar: (seg: number | null) => void;
}) {
  const t = useTranslations("publicarClip");
  const video = useRef<HTMLVideoElement>(null);
  const [seg, setSeg] = useState(valor ?? 0);
  // Hasta que el video muestra el cuadro pedido (al abrir y en cada salto).
  const [cargando, setCargando] = useState(true);
  const max = Math.max(0, Math.floor(duracion * 10) / 10 - 0.1);
  const eligiendo = valor != null;

  function mover(s: number) {
    const r = Math.round(Math.min(max, Math.max(0, s)) * 10) / 10;
    setSeg(r);
    if (video.current) video.current.currentTime = r;
    onCambiar(r);
  }

  const opcion = (on: boolean, titulo: string, detalle: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex flex-1 items-start gap-2.5 rounded-xl border p-3 text-left transition ${
        on ? "border-marca bg-marca/10" : "border-dashed border-white/15 hover:border-white/30"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          on ? "bg-marca text-ng-tinta" : "border border-white/30"
        }`}
      >
        {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span>
        <span className={`block text-sm ${on ? "text-white" : "text-white/60"}`}>{titulo}</span>
        <span className="block text-xs text-white/40">{detalle}</span>
      </span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {opcion(!eligiendo, t("portada.automatica"), t("portada.automaticaDetalle"), () => onCambiar(null))}
        {opcion(eligiendo, t("portada.elegirCuadro"), t("portada.elegirCuadroDetalle"), () => {
          if (!eligiendo) onCambiar(seg);
        })}
      </div>

      {eligiendo ? (
        <div className="space-y-2">
          <div className="flex items-end gap-4">
            <div className="relative h-48 w-[108px] shrink-0 overflow-hidden rounded-lg bg-black ring-2 ring-marca">
              <video
                ref={video}
                src={url}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  e.currentTarget.currentTime = seg;
                }}
                onSeeking={() => setCargando(true)}
                onSeeked={() => setCargando(false)}
                className="h-full w-full object-cover"
              />
              {cargando ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 text-[11px] text-white/70">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t("portada.cargando")}
                </div>
              ) : null}
            </div>
            <p className={`flex items-center gap-1.5 text-sm ${cargando ? "text-white/45" : "text-white"}`} aria-live="polite">
              {cargando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-marca text-ng-tinta">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              {cargando ? t("portada.cargando") : t("portada.elegidaEn", { seg: seg.toFixed(1) })}
            </p>
          </div>
          <input
            type="range"
            min={0}
            max={max}
            step={0.1}
            value={seg}
            onChange={(e) => mover(Number(e.target.value))}
            aria-label={t("portada.titulo")}
            className="w-full accent-[#FFD400]"
          />
          <p className="text-xs text-white/45">{t("portada.moverAyuda")}</p>
        </div>
      ) : null}

      <p className="text-[11px] text-white/35">
        {t("portada.facebook")} {t("portada.youtube")}
      </p>
    </div>
  );
}

/**
 * Un cuadro quieto del video. Un solo <video> que salta al segundo pedido: al
 * cambiar la portada se mueve en lo ya cargado, en vez de volver a bajar el
 * video (antes se rearmaba en cada movimiento del deslizador y tardaba).
 * Hasta tener el cuadro gira un cargando.
 */
export function CuadroPortada({ url, seg, className, titulo }: { url: string; seg: number; className: string; titulo: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const v = video.current;
    // Sin metadatos todavía, el salto lo hace onLoadedMetadata.
    if (v && v.readyState >= 1 && Math.abs(v.currentTime - seg) > 0.05) v.currentTime = seg;
  }, [seg]);
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded bg-black ${className}`} title={titulo}>
      <video
        ref={video}
        src={url}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          e.currentTarget.currentTime = seg;
        }}
        onSeeking={() => setListo(false)}
        onSeeked={() => setListo(true)}
        className="h-full w-full object-cover"
      />
      {!listo ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />
        </span>
      ) : null}
    </span>
  );
}
