"use client";

import { useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import { uploadPortada } from "@/lib/upload";
import {
  ELEGIR_PORTADA,
  PUBLICATIONS,
  USAR_PORTADA_SUBIDA,
} from "@/graphql/operations";

type Modo = "cuadro" | "imagen";

/**
 * Elige qué imagen va a ser la portada del video, de dos maneras.
 *
 * **Un cuadro del video:** se busca moviendo un deslizador sobre el propio
 * video. El navegador lo muestra al instante, sin pedirle nada al servidor, y
 * lo que se ve ES exactamente el cuadro que después extrae ffmpeg. Un selector
 * que pidiera imágenes al servidor haría una llamada por cada movimiento del
 * dedo para mostrar algo que el navegador ya tiene decodificado.
 *
 * **Una imagen propia:** para cuando la portada se diseñó por fuera y no está
 * en ningún cuadro del video.
 *
 * La portada importa más de lo que parece: es la cubierta con la que sale el
 * Reel y es lo que se publica cuando el formato es imagen o historia de imagen.
 */
export function ElegirPortada({
  expedienteId,
  videoUrl,
  posterUrl,
}: {
  expedienteId: string;
  videoUrl: string;
  posterUrl?: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>("cuadro");
  const [segundo, setSegundo] = useState(1.5);
  const [duracion, setDuracion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  const refrescar = { refetchQueries: [{ query: PUBLICATIONS }] };
  const [elegirCuadro, { loading: guardando }] = useMutation(
    ELEGIR_PORTADA,
    refrescar,
  );
  const [usarSubida] = useMutation(USAR_PORTADA_SUBIDA, refrescar);

  function mover(valor: number) {
    setSegundo(valor);
    setListo(false);
    // Mover el tiempo del <video> ES la vista previa.
    if (video.current) video.current.currentTime = valor;
  }

  async function confirmarCuadro() {
    setError(null);
    try {
      await elegirCuadro({ variables: { id: expedienteId, segundo } });
      setListo(true);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo guardar la portada");
    }
  }

  async function subirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setListo(false);
    setSubiendo(true);
    try {
      const r = await uploadPortada(file, expedienteId);
      // Se manda la RUTA, no la URL: la pública la arma el servidor. Aceptar
      // una URL del cliente dejaría apuntar la portada a cualquier sitio.
      await usarSubida({
        variables: { id: expedienteId, storagePath: r.storagePath },
      });
      setListo(true);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-sm text-white/60 transition hover:bg-white/5"
      >
        🖼️ {posterUrl ? "Cambiar portada" : "Elegir portada"}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white/70">Portada</span>
        <button
          onClick={() => setAbierto(false)}
          className="text-xs text-white/40 transition hover:text-white"
        >
          Cerrar
        </button>
      </div>

      <div className="mb-3 flex gap-1.5">
        <Pestana activa={modo === "cuadro"} onClick={() => setModo("cuadro")}>
          Un cuadro del video
        </Pestana>
        <Pestana activa={modo === "imagen"} onClick={() => setModo("imagen")}>
          Subir imagen
        </Pestana>
      </div>

      {modo === "cuadro" ? (
        <>
          <video
            ref={video}
            src={videoUrl}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setDuracion(v.duration);
              v.currentTime = Math.min(segundo, v.duration);
            }}
            className="w-full rounded-lg bg-black"
          />

          <label className="mt-2 block">
            <span className="flex items-center justify-between text-[11px] text-white/40">
              Buscá el cuadro
              <span className="text-white/60">{segundo.toFixed(1)}s</span>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(duracion, 0.1)}
              step={0.1}
              value={segundo}
              onChange={(e) => mover(Number(e.target.value))}
              className="mt-1 w-full accent-[#0FED9D]"
            />
          </label>

          <button
            onClick={confirmarCuadro}
            disabled={guardando || listo}
            className="mt-2 w-full rounded-lg bg-[#0FED9D] py-2 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {guardando
              ? "Guardando…"
              : listo
                ? "✓ Portada guardada"
                : "Usar este cuadro"}
          </button>
        </>
      ) : (
        <>
          {/* La portada actual, para poder comparar antes de reemplazarla. */}
          {posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt="Portada actual"
              className="w-full rounded-lg bg-black object-contain"
            />
          )}

          <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-white/20 px-3 py-4 text-center transition hover:border-[#0FED9D]/50 hover:bg-white/5">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={subirImagen}
              disabled={subiendo}
            />
            <span className="text-xs text-white/60">
              {subiendo
                ? "Subiendo…"
                : listo
                  ? "✓ Portada guardada · subir otra"
                  : "Elegí una imagen de tu computadora"}
            </span>
            <span className="mt-1 block text-[10px] text-white/30">
              JPG, PNG o WEBP · hasta 10MB
            </span>
          </label>

          <p className="mt-2 text-[10px] text-white/30">
            Usá la misma proporción que el video (9:16 en un Reel), o Meta la
            recorta por su cuenta.
          </p>
        </>
      )}

      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}

      <p className="mt-2 text-[10px] text-white/30">
        Es la cubierta del Reel y lo que se publica si elegís formato de imagen.
      </p>
    </div>
  );
}

function Pestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
        activa
          ? "bg-[#0FED9D] text-black"
          : "border border-white/10 text-white/50 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
