"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ajustarRegion, panelesDe, type FormatoClip, type PosicionEfectiva, type Region } from "@/lib/clip-encuadre";
import type { Reproductor } from "./reproductor";

/** Colores de los recuadros, uno por panel, como en la vista previa. */
const COLORES = ["#FFD400", "#FFFFFF"];

/**
 * El cuadro entero del episodio con los recuadros del recorte encima, que se
 * arrastran y se agrandan. Acá vive el único `<video>` del editor: la vista
 * previa no es otro video sincronizado —que se desfasaría—, es un canvas que
 * copia cada recuadro de este mismo video.
 *
 * Fuera de Formato y Auto-encuadre el cuadro no se ve, pero el `<video>` sigue
 * montado en el mismo lugar (escondido, no desmontado): si se desmontara, el
 * HLS arrancaría de cero cada vez que se cambia de herramienta.
 */
export function CuadroRecorte({
  reproductor,
  mostrar,
  formato,
  posiciones,
  indiceActiva,
  onCambiarPosiciones,
  puedeEditar,
}: {
  reproductor: Reproductor;
  mostrar: boolean;
  formato: FormatoClip;
  posiciones: PosicionEfectiva[];
  /** El tramo donde está parado el video: sus recuadros son los que se mueven. */
  indiceActiva: number;
  onCambiarPosiciones: (p: PosicionEfectiva[]) => void;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorRecorte");
  const cuadro = useRef<HTMLDivElement>(null);
  const { fuente } = reproductor;
  const activa = posiciones[indiceActiva] ?? posiciones[0];
  const paneles = panelesDe(formato, activa.diseno);

  function cambiarRegion(i: number, r: Region) {
    onCambiarPosiciones(
      posiciones.map((p, k) =>
        k === indiceActiva ? { ...p, regiones: p.regiones.map((x, j) => (j === i ? ajustarRegion(r, fuente, paneles[i]) : x)) } : p,
      ),
    );
  }

  /**
   * Arrastrar solo mueve el recuadro: el tamaño no se toca acá (con todo el
   * alto, solo se corre de costado). El zoom, si se quiere, está en Formato.
   */
  function empezarArrastre(e: React.PointerEvent, i: number) {
    if (!puedeEditar) return;
    e.preventDefault();
    e.stopPropagation();
    const caja = cuadro.current?.getBoundingClientRect();
    if (!caja) return;
    const inicial = activa.regiones[i];
    const x0 = e.clientX;
    const y0 = e.clientY;

    const mover = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / caja.width;
      const dy = (ev.clientY - y0) / caja.height;
      cambiarRegion(i, { ...inicial, x: inicial.x + dx, y: inicial.y + dy });
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  return (
    <div
      className={
        mostrar
          ? "flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center"
          : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      }
      aria-hidden={!mostrar}
    >
      <div
        ref={cuadro}
        className="relative w-full touch-none select-none overflow-hidden rounded-lg bg-black"
        style={{
          aspectRatio: `${fuente.ancho} / ${fuente.alto}`,
          maxHeight: "var(--alto-escenario)",
          maxWidth: `calc(var(--alto-escenario) * ${fuente.ancho / fuente.alto})`,
        }}
      >
        <video ref={reproductor.video} playsInline {...reproductor.eventos} className="absolute inset-0 h-full w-full" />
        {mostrar && (
          <>
            {/* Lo que queda afuera, oscurecido: una máscara con un agujero por recuadro. */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
              <defs>
                <mask id="fuera-del-recorte">
                  <rect x="0" y="0" width="1" height="1" fill="white" />
                  {activa.regiones.map((r, i) => (
                    <rect key={i} x={r.x} y={r.y} width={r.ancho} height={r.alto} fill="black" />
                  ))}
                </mask>
              </defs>
              <rect x="0" y="0" width="1" height="1" fill="rgba(0,0,0,0.6)" mask="url(#fuera-del-recorte)" />
            </svg>
            {activa.regiones.map((r, i) => (
              <div
                key={i}
                onPointerDown={(e) => empezarArrastre(e, i)}
                className={`absolute ${puedeEditar ? "cursor-move" : ""}`}
                style={{
                  left: `${r.x * 100}%`,
                  top: `${r.y * 100}%`,
                  width: `${r.ancho * 100}%`,
                  height: `${r.alto * 100}%`,
                  border: `2px solid ${COLORES[i]}`,
                }}
              >
                <span className="absolute left-1 top-1 rounded px-1 text-xs font-semibold text-ng-tinta" style={{ background: COLORES[i] }}>
                  {paneles.length > 1
                    ? paneles[i].y > 0 || paneles[i].x > 0
                      ? tr("abajo")
                      : tr("arriba")
                    : formato === "VERTICAL"
                      ? "9:16"
                      : formato === "CUADRADO"
                        ? "1:1"
                        : "16:9"}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
      {mostrar && puedeEditar && <p className="mt-2 text-center text-xs text-ng-tenue">{tr("ayudaRecuadro")}</p>}
    </div>
  );
}
