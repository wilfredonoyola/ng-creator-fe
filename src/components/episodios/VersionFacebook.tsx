"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { GUARDAR_VERSION_FACEBOOK, QUITAR_VERSION_FACEBOOK } from "@/graphql/operations";

/** Lo más largo que acepta un Reel de Facebook; el backend valida lo mismo. */
export const REEL_FACEBOOK_MAX_SEG = 90;
/** Lo más corto que acepta el backend para la versión corta. */
const VERSION_MINIMA_SEG = 3;

export type EstadoRenderClip = "EN_COLA" | "RENDERIZANDO" | "LISTO" | "ERROR";

/** La versión para Facebook de un clip largo: un tramo dentro del clip, con su propio render. */
export interface VersionCortaClip {
  /** Relativos al inicio del clip, no del episodio. */
  desdeSeg: number;
  hastaSeg: number;
  estadoRender: EstadoRenderClip;
  progresoRender?: number | null;
  errorRender?: string | null;
  urlVideo?: string | null;
}

export const versionEnCurso = (v?: VersionCortaClip | null) =>
  v?.estadoRender === "EN_COLA" || v?.estadoRender === "RENDERIZANDO";

/** En el editor: el tramo pasa de 90 s y Facebook va a necesitar una versión corta. */
export function AvisoVersionFacebook({ duracion }: { duracion: number }) {
  const t = useTranslations("versionFacebook");
  if (duracion <= REEL_FACEBOOK_MAX_SEG) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-200/80">
      <Info size={14} className="mt-px shrink-0" aria-hidden />
      <span>{t("avisoEditor")}</span>
    </p>
  );
}

/**
 * "Versión para Facebook (hasta 90 s)", en la pantalla de publicar: el tramo
 * del clip que sale en Facebook, su render y su estado. Solo para clips de
 * más de 90 s; las otras redes llevan el clip entero.
 */
export function SeccionVersionFacebook({
  clipId,
  marcaId,
  duracionClip,
  urlVideoClip,
  version,
}: {
  clipId: string;
  marcaId: string;
  duracionClip: number;
  urlVideoClip: string;
  version?: VersionCortaClip | null;
}) {
  const t = useTranslations("versionFacebook");
  const [desde, setDesde] = useState(() => version?.desdeSeg ?? 0);
  const [hasta, setHasta] = useState(() => version?.hastaSeg ?? Math.min(REEL_FACEBOOK_MAX_SEG, duracionClip));
  const [error, setError] = useState<string | null>(null);
  const [guardar, { loading: pidiendo }] = useMutation(GUARDAR_VERSION_FACEBOOK);
  const [quitar, { loading: quitando }] = useMutation(QUITAR_VERSION_FACEBOOK);

  // Si la versión cambia desde afuera (otra persona, o se quitó), el tramo la sigue.
  const guardadoDesde = version?.desdeSeg;
  const guardadoHasta = version?.hastaSeg;
  useEffect(() => {
    if (guardadoDesde == null || guardadoHasta == null) return;
    setDesde(guardadoDesde);
    setHasta(guardadoHasta);
  }, [guardadoDesde, guardadoHasta]);

  const elegida = hasta - desde;
  const cambiado = !version || Math.abs(version.desdeSeg - desde) > 0.05 || Math.abs(version.hastaSeg - hasta) > 0.05;
  const enCurso = versionEnCurso(version);

  async function procesar() {
    setError(null);
    try {
      await guardar({ variables: { id: clipId, marcaId, desdeSeg: desde, hastaSeg: hasta } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("noSePudo"));
    }
  }

  async function quitarla() {
    if (!window.confirm(t("confirmarQuitar"))) return;
    setError(null);
    try {
      await quitar({ variables: { id: clipId, marcaId } });
      setDesde(0);
      setHasta(Math.min(REEL_FACEBOOK_MAX_SEG, duracionClip));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("noSePudo"));
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/45">{t("titulo")}</h2>
        <p className="mt-1 text-xs text-white/50">{t("explicacion", { seg: Math.round(duracionClip) })}</p>
      </div>

      <VistaPreviaTramo url={urlVideoClip} desde={desde} hasta={hasta} etiqueta={t("vistaPrevia")} />

      <SelectorTramo
        duracion={duracionClip}
        desde={desde}
        hasta={hasta}
        deshabilitado={enCurso || pidiendo}
        onCambiar={(d, h) => {
          setDesde(d);
          setHasta(h);
        }}
      />

      {version && !enCurso && version.estadoRender === "LISTO" && !cambiado && version.urlVideo ? (
        <div className="space-y-1.5">
          <p className="text-xs text-ng-teal">
            {t("lista", { desde: reloj(version.desdeSeg), hasta: reloj(version.hastaSeg) })}
          </p>
          <video
            src={version.urlVideo}
            controls
            playsInline
            preload="metadata"
            aria-label={t("verVersion")}
            className="max-h-80 w-full rounded-lg bg-black"
          />
        </div>
      ) : null}
      {version?.estadoRender === "EN_COLA" ? <p className="text-xs text-white/55">{t("enCola")}</p> : null}
      {version?.estadoRender === "RENDERIZANDO" ? (
        <div className="space-y-1">
          <p className="text-xs text-white/55">
            {t("renderizando", { progreso: Math.round(version.progresoRender ?? 0) })}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-marca transition-all"
              style={{ width: `${Math.min(100, Math.max(0, version.progresoRender ?? 0))}%` }}
            />
          </div>
        </div>
      ) : null}
      {version?.estadoRender === "ERROR" && !cambiado ? (
        <p className="break-words text-xs text-red-400">{version.errorRender || t("error")}</p>
      ) : null}
      {version && !enCurso && cambiado ? <p className="text-xs text-amber-300">{t("tramoCambiado")}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        {(!version || cambiado || version.estadoRender === "ERROR") && (
          <button
            type="button"
            onClick={() => void procesar()}
            disabled={pidiendo || enCurso || elegida < VERSION_MINIMA_SEG || elegida > REEL_FACEBOOK_MAX_SEG}
            className="rounded-xl bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-50"
          >
            {pidiendo ? t("pidiendo") : enCurso ? t("procesando") : version ? t("reprocesar") : t("procesar")}
          </button>
        )}
        {version && (
          <button
            type="button"
            onClick={() => void quitarla()}
            disabled={quitando || pidiendo}
            className="text-xs text-red-400/80 hover:text-red-400 disabled:opacity-50"
          >
            {quitando ? t("quitando") : t("quitar")}
          </button>
        )}
      </div>
      {error ? <p className="break-words text-xs text-red-400">{error}</p> : null}
    </section>
  );
}

/** El video del clip, que salta al inicio del tramo cuando cambia y no sale de él. */
function VistaPreviaTramo({ url, desde, hasta, etiqueta }: { url: string; desde: number; hasta: number; etiqueta: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const tramo = useRef({ desde, hasta });
  tramo.current = { desde, hasta };

  useEffect(() => {
    const v = video.current;
    if (v && v.readyState > 0) v.currentTime = desde;
  }, [desde]);

  return (
    <video
      ref={video}
      src={url}
      controls
      playsInline
      preload="metadata"
      aria-label={etiqueta}
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = tramo.current.desde;
      }}
      onTimeUpdate={(e) => {
        const v = e.currentTarget;
        const { desde: d, hasta: h } = tramo.current;
        if (!v.paused && (v.currentTime >= h || v.currentTime < d - 0.5)) v.currentTime = d;
      }}
      className="max-h-80 w-full rounded-lg bg-black"
    />
  );
}

/**
 * El tramo dentro del clip: dos bordes para arrastrar, el medio para correrlo
 * entero y botones de a 1 s. Nunca pasa de 90 s ni baja de 3.
 */
function SelectorTramo({
  duracion,
  desde,
  hasta,
  deshabilitado,
  onCambiar,
}: {
  duracion: number;
  desde: number;
  hasta: number;
  deshabilitado?: boolean;
  onCambiar: (desde: number, hasta: number) => void;
}) {
  const t = useTranslations("versionFacebook");
  const barra = useRef<HTMLDivElement>(null);
  const largo = Math.max(1, duracion);
  const pct = (seg: number) => (seg / largo) * 100;

  /** Deja el tramo dentro del clip y entre 3 y 90 s, moviendo el borde que no se tocó. */
  const acotar = (d: number, h: number, fijo: "desde" | "hasta" | "largo") => {
    const r = (n: number) => Math.round(n * 10) / 10;
    let a = r(d);
    let b = r(h);
    if (fijo === "largo") {
      const l = b - a;
      a = Math.min(Math.max(0, a), Math.max(0, duracion - l));
      return [r(a), r(Math.min(duracion, a + l))] as const;
    }
    a = Math.max(0, a);
    b = Math.min(duracion, b);
    if (fijo === "desde") {
      b = Math.min(Math.max(b, a + VERSION_MINIMA_SEG), a + REEL_FACEBOOK_MAX_SEG, duracion);
      a = Math.min(a, b - VERSION_MINIMA_SEG);
    } else {
      a = Math.max(Math.min(a, b - VERSION_MINIMA_SEG), b - REEL_FACEBOOK_MAX_SEG, 0);
      b = Math.max(b, a + VERSION_MINIMA_SEG);
    }
    return [r(a), r(b)] as const;
  };

  function arrastrar(e: React.PointerEvent, que: "desde" | "hasta" | "tramo") {
    if (deshabilitado) return;
    e.preventDefault();
    e.stopPropagation();
    const caja = barra.current?.getBoundingClientRect();
    if (!caja) return;
    const inicio = { x: e.clientX, desde, hasta };
    const mover = (ev: PointerEvent) => {
      const seg = ((ev.clientX - caja.left) / caja.width) * duracion;
      if (que === "desde") onCambiar(...acotar(seg, inicio.hasta, "hasta"));
      else if (que === "hasta") onCambiar(...acotar(inicio.desde, seg, "desde"));
      else {
        const delta = ((ev.clientX - inicio.x) / caja.width) * duracion;
        onCambiar(...acotar(inicio.desde + delta, inicio.hasta + delta, "largo"));
      }
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  const boton =
    "whitespace-nowrap rounded border border-white/15 px-1.5 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-40";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-white/45">
        <span className="font-medium uppercase tracking-wide text-white/50">{t("tramo")}</span>
        <span className="whitespace-nowrap tabular-nums">
          {reloj(desde)} – {reloj(hasta)} · {t("duracionElegida", { seg: (hasta - desde).toFixed(1) })}
        </span>
      </div>
      <div
        ref={barra}
        className={`relative h-9 touch-none select-none rounded-md bg-white/[0.06] ${deshabilitado ? "opacity-50" : ""}`}
      >
        <div
          onPointerDown={(e) => arrastrar(e, "tramo")}
          title={t("arrastraTramo")}
          className="absolute inset-y-0 cursor-grab rounded-md border-2 border-ng-azul bg-ng-teal/15"
          style={{ left: `${pct(desde)}%`, width: `${pct(hasta) - pct(desde)}%` }}
        >
          <div
            onPointerDown={(e) => arrastrar(e, "desde")}
            className="absolute -left-1.5 inset-y-0 w-3 cursor-ew-resize rounded-sm bg-marca"
            title={t("arrastraInicio")}
          />
          <div
            onPointerDown={(e) => arrastrar(e, "hasta")}
            className="absolute -right-1.5 inset-y-0 w-3 cursor-ew-resize rounded-sm bg-marca"
            title={t("arrastraFinal")}
          />
        </div>
        <span className="pointer-events-none absolute bottom-0.5 left-1 text-xs leading-none tabular-nums text-white/30">
          0:00
        </span>
        <span className="pointer-events-none absolute bottom-0.5 right-1 text-xs leading-none tabular-nums text-white/30">
          {reloj(duracion)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/40">{t("inicio")}</span>
          <button type="button" className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde - 1, hasta, "hasta"))} title={t("inicioAntes")}>
            ←1s
          </button>
          <button type="button" className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde + 1, hasta, "hasta"))} title={t("inicioDespues")}>
            1s→
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/40">{t("final")}</span>
          <button type="button" className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde, hasta - 1, "desde"))} title={t("finalAntes")}>
            ←1s
          </button>
          <button type="button" className={boton} disabled={deshabilitado} onClick={() => onCambiar(...acotar(desde, hasta + 1, "desde"))} title={t("finalDespues")}>
            1s→
          </button>
        </div>
      </div>
    </div>
  );
}

/** 95.4 → "1:35". */
function reloj(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
