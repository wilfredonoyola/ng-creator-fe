"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * La portada: un cuadro del MP4 final (el mismo que sale). De entrada,
 * "Automática" (cada red elige); al elegir, el video pausado y un deslizador.
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
  const [eligiendo, setEligiendo] = useState(false);
  const [seg, setSeg] = useState(valor ?? 0);
  const max = Math.max(0, Math.floor(duracion * 10) / 10 - 0.1);

  function mover(s: number) {
    const r = Math.round(Math.min(max, Math.max(0, s)) * 10) / 10;
    setSeg(r);
    if (video.current) video.current.currentTime = r;
    onCambiar(r);
  }

  const ayuda = (
    <p className="text-[11px] text-white/35">
      {t("portada.facebook")} {t("portada.youtube")}
    </p>
  );

  if (!eligiendo) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          {valor != null ? (
            <CuadroPortada url={url} seg={valor} className="h-16 w-9" titulo={t("portada.elegida")} />
          ) : null}
          <span className="text-sm text-white/60">
            {valor != null ? t("portada.enSeg", { seg: valor.toFixed(1) }) : t("portada.automatica")}
          </span>
          <button
            type="button"
            onClick={() => {
              setEligiendo(true);
              if (valor == null) onCambiar(seg);
            }}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
          >
            {valor != null ? t("portada.cambiar") : t("portada.elegir")}
          </button>
          {valor != null ? (
            <button type="button" onClick={() => onCambiar(null)} className="text-xs text-white/45 hover:text-white/70">
              {t("portada.usarAutomatica")}
            </button>
          ) : null}
        </div>
        {ayuda}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-3">
        <video
          ref={video}
          src={url}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = seg;
          }}
          className="h-48 w-[108px] shrink-0 rounded-lg bg-black object-cover"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setEligiendo(false)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15"
          >
            {t("portada.listo")}
          </button>
          <button
            type="button"
            onClick={() => {
              onCambiar(null);
              setEligiendo(false);
            }}
            className="text-xs text-white/45 hover:text-white/70"
          >
            {t("portada.usarAutomatica")}
          </button>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={seg}
        onChange={(e) => mover(Number(e.target.value))}
        aria-label={t("portada.titulo")}
        className="w-full accent-white"
      />
      <p className="text-xs text-white/45">{t("portada.enSeg", { seg: seg.toFixed(1) })}</p>
      {ayuda}
    </div>
  );
}

/** Un cuadro quieto del video: el fragmento #t= hace que el navegador muestre ese segundo. */
export function CuadroPortada({ url, seg, className, titulo }: { url: string; seg: number; className: string; titulo: string }) {
  return (
    <video
      key={seg}
      src={`${url}#t=${seg}`}
      muted
      playsInline
      preload="metadata"
      title={titulo}
      className={`shrink-0 rounded bg-black object-cover ${className}`}
    />
  );
}
