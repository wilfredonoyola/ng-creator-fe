"use client";

import { useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import { ELEGIR_PORTADA, PUBLICATIONS } from "@/graphql/operations";

/**
 * Elige qué cuadro del video va a ser la portada.
 *
 * El cuadro se busca moviendo el deslizador sobre el propio video: el navegador
 * lo muestra al instante, sin pedirle nada al servidor. Recién al confirmar se
 * manda el segundo elegido y el backend extrae ese cuadro exacto con ffmpeg.
 *
 * Un selector que pidiera imágenes al servidor mientras se arrastra haría una
 * llamada por cada movimiento del dedo para mostrar algo que el navegador ya
 * tiene decodificado.
 *
 * La portada importa más de lo que parece: es lo que se sube como cubierta del
 * Reel y lo que se publica cuando el formato es imagen o historia de imagen.
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
  const [segundo, setSegundo] = useState(1.5);
  const [duracion, setDuracion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  const [elegir, { loading }] = useMutation(ELEGIR_PORTADA, {
    refetchQueries: [{ query: PUBLICATIONS }],
  });

  function mover(valor: number) {
    setSegundo(valor);
    setListo(false);
    // Mover el tiempo del <video> ES la vista previa: lo que se ve acá es
    // exactamente el cuadro que después va a extraer ffmpeg.
    if (video.current) video.current.currentTime = valor;
  }

  async function confirmar() {
    setError(null);
    try {
      await elegir({ variables: { id: expedienteId, segundo } });
      setListo(true);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo guardar la portada");
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

      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}

      <button
        onClick={confirmar}
        disabled={loading || listo}
        className="mt-2 w-full rounded-lg bg-[#0FED9D] py-2 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
      >
        {loading
          ? "Guardando…"
          : listo
            ? "✓ Portada guardada"
            : "Usar este cuadro"}
      </button>

      <p className="mt-2 text-[10px] text-white/30">
        Es la cubierta del Reel y lo que se publica si elegís formato de imagen.
      </p>
    </div>
  );
}
