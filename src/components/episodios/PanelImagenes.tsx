"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus } from "lucide-react";
import { Fila, Opcion, Segundos } from "@/components/episodios/PanelTextos";
import { FORMATOS_IMAGEN_CLIP } from "@/lib/upload";
import { MAXIMO_IMAGENES, type EstadoRecorte, type ImagenClip } from "@/lib/clip-encuadre";

/** Un id corto para una imagen nueva: lo pone el cliente (el contrato del backend). */
function idCorto(): string {
  const c = globalThis.crypto;
  return c?.randomUUID ? c.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
}

/**
 * Dónde va una imagen nueva. Con el diseño Horizontal (el video 16:9 en el
 * medio), la franja de abajo: la primera a la izquierda y la segunda al lado,
 * para poner a las dos personas recortadas. Si no, apiladas en el centro.
 */
export function imagenNueva(url: string, existentes: ImagenClip[], horizontal: boolean): ImagenClip {
  const lugares = horizontal
    ? [
        { centroX: 0.26, centroY: 0.82, ancho: 0.45 },
        { centroX: 0.74, centroY: 0.82, ancho: 0.45 },
        { centroX: 0.5, centroY: 0.18, ancho: 0.45 },
      ]
    : [
        { centroX: 0.5, centroY: 0.35, ancho: 0.5 },
        { centroX: 0.5, centroY: 0.6, ancho: 0.5 },
        { centroX: 0.5, centroY: 0.8, ancho: 0.5 },
      ];
  // El primer lugar libre: así, si se borró la de la izquierda, la nueva va ahí.
  const libre =
    lugares.find((l) => !existentes.some((im) => Math.abs(im.centroX - l.centroX) < 0.1 && Math.abs(im.centroY - l.centroY) < 0.1)) ??
    lugares[existentes.length % lugares.length];
  return { id: idCorto(), url, sinFondo: false, contorno: false, ...libre, desdeSeg: 0, hastaSeg: null };
}

/**
 * Las imágenes del clip: hasta tres, cada una con "Quitar fondo" y "Contorno
 * blanco" (el efecto sticker). Como los textos: se mueven arrastrándolas en la
 * vista previa, se agrandan desde la esquina y tienen su tramo de tiempo.
 */
export function PanelImagenes({
  imagenes,
  estados,
  onCambiar,
  elegida,
  onElegir,
  onSubir,
  duracion,
  deshabilitado,
}: {
  imagenes: ImagenClip[];
  /** El estado del recorte de cada una, en el mismo orden (vistaDeImagen). */
  estados: (EstadoRecorte | null)[];
  onCambiar: (imagenes: ImagenClip[]) => void;
  elegida: number | null;
  onElegir: (i: number | null) => void;
  /** Sube el archivo y agrega la imagen; rechaza con el error para mostrar. */
  onSubir: (file: File) => Promise<void>;
  /** Del clip, en segundos. */
  duracion: number;
  deshabilitado?: boolean;
}) {
  const tr = useTranslations("editorImagenes");
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);
  const llenas = imagenes.length >= MAXIMO_IMAGENES;
  const puedeAgregar = !deshabilitado && !llenas && !subiendo;

  async function subir(file: File | undefined) {
    if (!file || !puedeAgregar) return;
    setError(null);
    setSubiendo(true);
    try {
      await onSubir(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("errorSubir"));
    } finally {
      setSubiendo(false);
    }
  }

  function cambiar(i: number, parcial: Partial<ImagenClip>) {
    onCambiar(imagenes.map((im, k) => (k === i ? { ...im, ...parcial } : im)));
  }

  function quitar(i: number) {
    onCambiar(imagenes.filter((_, k) => k !== i));
    onElegir(null);
  }

  const im = elegida !== null ? imagenes[elegida] : null;

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
        <p className="text-sm font-medium">{tr("titulo", { n: imagenes.length, max: MAXIMO_IMAGENES })}</p>
        {!deshabilitado && (
          <button
            onClick={() => input.current?.click()}
            disabled={!puedeAgregar}
            title={llenas ? tr("maximo", { max: MAXIMO_IMAGENES }) : tr("ayudaAgregar")}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-40"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {subiendo ? tr("subiendo") : tr("agregar")}
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept={FORMATOS_IMAGEN_CLIP.join(",")}
          className="hidden"
          onChange={(e) => {
            void subir(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {/* ---- La lista ---- */}
      <div className="mb-3 flex flex-wrap gap-2">
        {imagenes.map((x, i) => (
          <button
            key={x.id}
            onClick={() => onElegir(elegida === i ? null : i)}
            className={`flex items-center gap-1.5 rounded-lg border p-1 pr-2 text-xs ${
              elegida === i ? "border-ng-azul text-white" : "border-white/15 text-white/60"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- la imagen viene del CDN, tal cual va al render */}
            <img src={x.url} alt="" className="h-7 w-7 rounded object-cover" />
            {i + 1}
            {estados[i] === "PENDIENTE" && <span className="text-white/40">· {tr("estados.PENDIENTE")}</span>}
            {estados[i] === "FALLIDO" && <span className="text-red-400/80">· {tr("estados.FALLIDOCorto")}</span>}
          </button>
        ))}
        {imagenes.length === 0 && <p className="text-xs text-white/40">{deshabilitado ? tr("sinImagenes") : tr("vacio")}</p>}
      </div>

      {/* ---- La elegida ---- */}
      {im && elegida !== null && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={im.sinFondo}
              disabled={deshabilitado}
              onChange={(e) => cambiar(elegida, { sinFondo: e.target.checked })}
            />
            {tr("quitarFondo")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={im.contorno}
              disabled={deshabilitado}
              onChange={(e) => cambiar(elegida, { contorno: e.target.checked })}
            />
            {tr("contorno")}
          </label>
          {estados[elegida] === "PENDIENTE" && <p className="text-xs text-white/45">{tr("ayudaPendiente")}</p>}
          {estados[elegida] === "FALLIDO" && <p className="text-xs text-red-400/80">{tr("estados.FALLIDO")}</p>}

          <label className="block text-xs text-white/50">
            {tr("tamano", { n: Math.round(im.ancho * 100) })}
            <input type="range" min={0.05} max={1} step={0.01} value={im.ancho} disabled={deshabilitado}
              onChange={(e) => cambiar(elegida, { ancho: parseFloat(e.target.value) })} className="mt-1 block w-full" />
          </label>
          <p className="text-[11px] text-white/35">{tr("oArrastrala")}</p>

          <Fila etiqueta={tr("cuando")}>
            <Opcion activa={!im.hastaSeg && im.desdeSeg === 0} onClick={() => cambiar(elegida, { desdeSeg: 0, hastaSeg: null })} deshabilitado={deshabilitado}>
              {tr("todoElClip")}
            </Opcion>
            <span className="flex items-center gap-1 text-[11px] text-white/50">
              {tr("de")}
              <Segundos valor={im.desdeSeg} max={duracion} onCambio={(desdeSeg) => cambiar(elegida, { desdeSeg })} deshabilitado={deshabilitado} />
              {tr("a")}
              <Segundos valor={im.hastaSeg ?? duracion} max={duracion}
                onCambio={(v) => cambiar(elegida, { hastaSeg: v >= duracion - 0.05 ? null : v })} deshabilitado={deshabilitado} />
              s
            </span>
          </Fila>

          {!deshabilitado && (
            <button onClick={() => quitar(elegida)} className="text-xs text-red-400/80 hover:text-red-400">
              {tr("eliminar")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
