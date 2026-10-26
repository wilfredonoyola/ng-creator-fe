"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Film } from "lucide-react";
import { Fila, Opcion, Segundos } from "@/components/episodios/PanelTextos";
import { Interruptor } from "@/components/episodios/editor/ui";
import { relojFino } from "@/components/episodios/editor/tipos";
import {
  EXTENSIONES_VIDEO_CLIP,
  FORMATOS_VIDEO_CLIP,
  MAXIMO_VIDEOS,
  TOPE_VIDEO_CLIP_MB,
  VIDEO_ANCHO_MAX,
  VIDEO_ANCHO_MIN,
  VOLUMEN_VIDEO_MAX,
  esVertical,
  finDeVideo,
  type SonidoVideoClip,
  type VideoClip,
} from "@/lib/videos-clip";

const SONIDOS: SonidoVideoClip[] = ["SIN_SONIDO", "MEZCLADO", "SOLO_VIDEO"];
const decimas = (n: number) => Math.round(n * 10) / 10;

/**
 * Los videos del clip (be#246): hasta tres, como las imágenes. Se mueven y se
 * agrandan en la vista previa (o cubren todo con Pantalla completa), tienen su
 * tramo de tiempo, el segundo del archivo desde donde arrancan y su sonido.
 */
export function PanelVideos({
  videos,
  onCambiar,
  elegido,
  onElegir,
  onSubir,
  duracion,
  deshabilitado,
}: {
  videos: VideoClip[];
  onCambiar: (videos: VideoClip[]) => void;
  elegido: number | null;
  onElegir: (i: number | null) => void;
  /** Sube el archivo y agrega el video; rechaza con el error para mostrar. */
  onSubir: (file: File, onAvance: (porcentaje: number) => void) => Promise<void>;
  /** Del clip, en segundos. */
  duracion: number;
  deshabilitado?: boolean;
}) {
  const tr = useTranslations("editorVideos");
  const input = useRef<HTMLInputElement>(null);
  const [avance, setAvance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);
  const subiendo = avance !== null;
  const llenos = videos.length >= MAXIMO_VIDEOS;
  const puedeAgregar = !deshabilitado && !llenos && !subiendo;

  async function subir(file: File | undefined) {
    if (!file || !puedeAgregar) return;
    setError(null);
    setAvance(0);
    try {
      await onSubir(file, setAvance);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("errorSubir"));
    } finally {
      setAvance(null);
    }
  }

  function cambiar(i: number, parcial: Partial<VideoClip>) {
    onCambiar(videos.map((v, k) => (k === i ? { ...v, ...parcial } : v)));
  }

  function quitar(i: number) {
    onCambiar(videos.filter((_, k) => k !== i));
    onElegir(null);
  }

  const v = elegido !== null ? videos[elegido] : null;

  return (
    <div
      onDragOver={(e) => {
        if (!puedeAgregar || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setEncima(true);
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => {
        setEncima(false);
        if (!puedeAgregar) return;
        e.preventDefault();
        void subir(e.dataTransfer.files[0]);
      }}
      className={`rounded-lg ${encima ? "outline-dashed outline-1 outline-ng-azul" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{tr("titulo", { n: videos.length, max: MAXIMO_VIDEOS })}</p>
        {!deshabilitado && (
          <button
            onClick={() => input.current?.click()}
            disabled={!puedeAgregar}
            title={llenos ? tr("maximo", { max: MAXIMO_VIDEOS }) : tr("ayudaAgregar", { mb: TOPE_VIDEO_CLIP_MB })}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-40"
          >
            <Film className="h-3.5 w-3.5" />
            {subiendo ? tr("subiendo", { n: avance }) : tr("agregar")}
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept={[...FORMATOS_VIDEO_CLIP, ...EXTENSIONES_VIDEO_CLIP.map((x) => `.${x}`)].join(",")}
          className="hidden"
          onChange={(e) => {
            void subir(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {subiendo && (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-ng-azul transition-[width]" style={{ width: `${avance}%` }} />
        </div>
      )}
      {subiendo && avance === 100 && <p className="mb-2 text-xs text-white/45">{tr("midiendo")}</p>}
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {/* ---- La lista ---- */}
      <div className="mb-3 flex flex-wrap gap-2">
        {videos.map((x, i) => (
          <button
            key={x.id}
            onClick={() => onElegir(elegido === i ? null : i)}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs ${
              elegido === i ? "border-ng-azul text-white" : "border-white/15 text-white/60"
            }`}
          >
            <Film className="h-3.5 w-3.5" aria-hidden />
            {tr("nombre", { n: i + 1 })}
            <span className="text-white/40">· {relojFino(x.duracionSeg)}</span>
          </button>
        ))}
        {videos.length === 0 && <p className="text-xs text-white/40">{deshabilitado ? tr("sinVideos") : tr("vacio")}</p>}
      </div>

      {/* ---- El elegido ---- */}
      {v && elegido !== null && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <Interruptor
            etiqueta={tr("pantallaCompleta")}
            ayuda={esVertical(v) && !v.pantallaCompleta ? tr("pantallaCompletaVertical") : tr("pantallaCompletaAyuda")}
            valor={v.pantallaCompleta}
            onCambio={(pantallaCompleta) => cambiar(elegido, { pantallaCompleta })}
            deshabilitado={deshabilitado}
          />

          {!v.pantallaCompleta && (
            <>
              <label className="block text-xs text-white/50">
                {tr("tamano", { n: Math.round(v.ancho * 100) })}
                <input
                  type="range"
                  min={VIDEO_ANCHO_MIN}
                  max={VIDEO_ANCHO_MAX}
                  step={0.01}
                  value={v.ancho}
                  disabled={deshabilitado}
                  onChange={(e) => cambiar(elegido, { ancho: parseFloat(e.target.value) })}
                  className="mt-1 block w-full"
                />
              </label>
              <p className="text-[11px] text-white/35">{tr("oArrastralo")}</p>
            </>
          )}

          <Fila etiqueta={tr("cuando")}>
            <Opcion
              activa={!v.hastaSeg && v.desdeSeg === 0}
              onClick={() => cambiar(elegido, { desdeSeg: 0, hastaSeg: null })}
              deshabilitado={deshabilitado}
            >
              {tr("desdeElPrincipio")}
            </Opcion>
            <span className="flex items-center gap-1 text-[11px] text-white/50">
              {tr("de")}
              <Segundos
                valor={v.desdeSeg}
                max={Math.max(0, duracion - 0.3)}
                onCambio={(desdeSeg) => cambiar(elegido, { desdeSeg: decimas(desdeSeg), hastaSeg: v.hastaSeg && v.hastaSeg <= desdeSeg + 0.1 ? null : v.hastaSeg })}
                deshabilitado={deshabilitado}
              />
              {tr("a")}
              <Segundos
                valor={finDeVideo(v, duracion)}
                max={duracion}
                onCambio={(h) => {
                  // Hasta donde llega solo (el final del archivo o del clip): sin tope propio.
                  const natural = finDeVideo({ ...v, hastaSeg: null }, duracion);
                  cambiar(elegido, { hastaSeg: h >= natural - 0.05 || h <= v.desdeSeg + 0.1 ? null : decimas(h) });
                }}
                deshabilitado={deshabilitado}
              />
              s
            </span>
          </Fila>
          <p className="text-[11px] text-white/35">{tr("sinLoop")}</p>

          <Fila etiqueta={tr("empiezaEn")}>
            <span className="flex items-center gap-1 text-[11px] text-white/50">
              <Segundos
                valor={v.inicioSeg}
                max={Math.max(0, decimas(v.duracionSeg - 0.1))}
                onCambio={(inicioSeg) => cambiar(elegido, { inicioSeg: decimas(inicioSeg) })}
                deshabilitado={deshabilitado}
              />
              {tr("delVideo", { dura: relojFino(v.duracionSeg) })}
            </span>
          </Fila>

          <div className="space-y-2">
            <p className="text-xs text-white/50">{tr("sonido")}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr("sonido")}>
              {SONIDOS.map((s) => {
                const bloqueado = deshabilitado || (s === "MEZCLADO" && !v.tieneAudio);
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={v.sonido === s}
                    disabled={bloqueado}
                    onClick={() => cambiar(elegido, { sonido: s })}
                    className={`rounded-md px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                      v.sonido === s ? "bg-white text-black" : "border border-white/15 text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {tr(`sonidos.${s}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-white/35">{tr(`sonidosAyuda.${v.sonido}`)}</p>
            {!v.tieneAudio && <p className="text-[11px] text-amber-300/80">{tr("sinAudio")}</p>}
            {v.sonido !== "SIN_SONIDO" && v.tieneAudio && (
              <label className="block text-xs text-white/50">
                {tr("volumen", { n: Math.round(v.volumen * 100) })}
                <input
                  type="range"
                  min={0}
                  max={VOLUMEN_VIDEO_MAX}
                  step={0.05}
                  value={v.volumen}
                  disabled={deshabilitado}
                  onChange={(e) => cambiar(elegido, { volumen: parseFloat(e.target.value) })}
                  className="mt-1 block w-full"
                />
              </label>
            )}
          </div>

          {!deshabilitado && (
            <button onClick={() => quitar(elegido)} className="text-xs text-red-400/80 hover:text-red-400">
              {tr("eliminar")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
