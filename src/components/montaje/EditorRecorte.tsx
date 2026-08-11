"use client";

import { useCallback, useRef } from "react";
import type { Recorte } from "@/lib/montaje";

type Esquina = "nw" | "ne" | "sw" | "se";

/**
 * El video original con un rectángulo de selección encima.
 *
 * El contenedor toma la proporción exacta del video, así que el rectángulo se
 * dibuja en porcentajes y las fracciones del recorte se mapean directo, sin
 * tener que descontar bandas negras ni leer el tamaño renderizado.
 *
 * El recorte se guarda en fracciones del video real y no en píxeles de
 * pantalla: el mismo dato tiene que dar el mismo encuadre en un teléfono y en
 * un monitor, y es lo que después convierte el backend a píxeles reales.
 */
export function EditorRecorte({
  src,
  recorte,
  onCambio,
  proporcion,
  aspectoFuente,
  videoRef,
  onMetadatos,
}: {
  src: string;
  recorte: Recorte;
  onCambio: (r: Recorte) => void;
  /** Proporción visual a la que se ata el rectángulo. null = libre. */
  proporcion: number | null;
  /** ancho/alto del video original. */
  aspectoFuente: number;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  onMetadatos: (datos: { ancho: number; alto: number; duracion: number }) => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{
    modo: "mover" | Esquina;
    inicioX: number;
    inicioY: number;
    original: Recorte;
  } | null>(null);

  /**
   * Alto en fracciones que le corresponde a un ancho para respetar la
   * proporción pedida. El factor `aspectoFuente` está porque una fracción de
   * ancho y una de alto no miden lo mismo en pantalla salvo que el video sea
   * cuadrado.
   */
  const altoParaAncho = useCallback(
    (ancho: number) => (proporcion ? (ancho * aspectoFuente) / proporcion : null),
    [proporcion, aspectoFuente],
  );

  const alMover = useCallback(
    (e: PointerEvent) => {
      const estado = arrastre.current;
      const rect = caja.current?.getBoundingClientRect();
      if (!estado || !rect) return;

      const dx = (e.clientX - estado.inicioX) / rect.width;
      const dy = (e.clientY - estado.inicioY) / rect.height;
      const o = estado.original;

      if (estado.modo === "mover") {
        onCambio({
          ...o,
          x: limitar(o.x + dx, 0, 1 - o.ancho),
          y: limitar(o.y + dy, 0, 1 - o.alto),
        });
        return;
      }

      // Al redimensionar, la esquina opuesta queda fija: es lo que se espera al
      // arrastrar una esquina, y evita que el rectángulo se escape del cuadro.
      const izquierda = estado.modo === "nw" || estado.modo === "sw";
      const arriba = estado.modo === "nw" || estado.modo === "ne";

      const bordeX = izquierda ? o.x + o.ancho : o.x;
      const bordeY = arriba ? o.y + o.alto : o.y;

      let ancho = limitar(
        izquierda ? o.ancho - dx : o.ancho + dx,
        0.05,
        izquierda ? bordeX : 1 - bordeX,
      );
      let alto: number;

      const atado = altoParaAncho(ancho);
      if (atado !== null) {
        alto = atado;
        // Si el alto derivado no entra, manda el alto y se recalcula el ancho.
        const disponible = arriba ? bordeY : 1 - bordeY;
        if (alto > disponible) {
          alto = disponible;
          ancho = (alto * proporcion!) / aspectoFuente;
        }
      } else {
        alto = limitar(
          arriba ? o.alto - dy : o.alto + dy,
          0.05,
          arriba ? bordeY : 1 - bordeY,
        );
      }

      onCambio({
        x: izquierda ? bordeX - ancho : bordeX,
        y: arriba ? bordeY - alto : bordeY,
        ancho,
        alto,
      });
    },
    [onCambio, altoParaAncho, proporcion, aspectoFuente],
  );

  const alSoltar = useCallback(() => {
    arrastre.current = null;
    window.removeEventListener("pointermove", alMover);
    window.removeEventListener("pointerup", alSoltar);
  }, [alMover]);

  function empezar(e: React.PointerEvent, modo: "mover" | Esquina) {
    e.preventDefault();
    e.stopPropagation();
    arrastre.current = {
      modo,
      inicioX: e.clientX,
      inicioY: e.clientY,
      original: recorte,
    };
    // En window y no en el elemento: si el puntero sale del rectángulo mientras
    // arrastrás, el gesto tiene que seguir.
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar);
  }

  const pct = (n: number) => `${(n * 100).toFixed(4)}%`;

  return (
    <div
      ref={caja}
      className="relative w-full select-none overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: `${aspectoFuente}` }}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          onMetadatos({
            ancho: v.videoWidth,
            alto: v.videoHeight,
            duracion: v.duration,
          });
        }}
        className="h-full w-full"
      />

      {/* Lo que queda afuera se oscurece: es lo que hace evidente qué se
          conserva, sin tener que imaginarlo. */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 bg-black/60"
          style={{
            clipPath: `polygon(0% 0%, 0% 100%, ${pct(recorte.x)} 100%, ${pct(
              recorte.x,
            )} ${pct(recorte.y)}, ${pct(recorte.x + recorte.ancho)} ${pct(
              recorte.y,
            )}, ${pct(recorte.x + recorte.ancho)} ${pct(
              recorte.y + recorte.alto,
            )}, ${pct(recorte.x)} ${pct(
              recorte.y + recorte.alto,
            )}, ${pct(recorte.x)} 100%, 100% 100%, 100% 0%)`,
          }}
        />
      </div>

      <div
        onPointerDown={(e) => empezar(e, "mover")}
        className="absolute cursor-move border-2 border-[#0FED9D]"
        style={{
          left: pct(recorte.x),
          top: pct(recorte.y),
          width: pct(recorte.ancho),
          height: pct(recorte.alto),
        }}
      >
        {/* Tercios: ayudan a encuadrar sin tener que ojímetro. */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-1/3 top-0 h-full w-px bg-white/60" />
          <div className="absolute left-2/3 top-0 h-full w-px bg-white/60" />
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/60" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white/60" />
        </div>

        {(["nw", "ne", "sw", "se"] as Esquina[]).map((esquina) => (
          <span
            key={esquina}
            onPointerDown={(e) => empezar(e, esquina)}
            // -inset y p-3: el objetivo real es más grande que el punto que se
            // ve, porque con el dedo un cuadradito de 12px es inagarrable.
            className={`absolute h-3 w-3 rounded-sm bg-[#0FED9D] ${
              esquina === "nw"
                ? "-left-1.5 -top-1.5 cursor-nwse-resize"
                : esquina === "ne"
                  ? "-right-1.5 -top-1.5 cursor-nesw-resize"
                  : esquina === "sw"
                    ? "-bottom-1.5 -left-1.5 cursor-nesw-resize"
                    : "-bottom-1.5 -right-1.5 cursor-nwse-resize"
            }`}
            style={{ touchAction: "none" }}
          />
        ))}
      </div>
    </div>
  );
}

function limitar(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), Math.max(min, max));
}
