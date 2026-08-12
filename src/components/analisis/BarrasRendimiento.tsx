"use client";

import { useId, useState } from "react";
import {
  COLOR_POCA_MUESTRA,
  COLOR_SERIE,
  esConfiable,
  umbralDeMuestra,
  type Tramo,
} from "@/lib/analitica";

/**
 * Rendimiento promedio por tramo, en barras.
 *
 * Una sola serie, así que no lleva caja de leyenda: el título dice qué mide.
 * Lo que sí lleva leyenda es el segundo estado —los tramos con poca muestra—
 * porque ahí el color significa algo y no puede quedar librado a adivinarlo.
 *
 * Esos tramos van en gris Y con rayado diagonal: el color solo no alcanza para
 * quien no lo distingue, y este es justamente el dato que no hay que leer de
 * corrido. Además quedan fuera del cálculo del mejor tramo.
 */
export function BarrasRendimiento({
  titulo,
  descripcion,
  tramos,
  etiqueta,
}: {
  titulo: string;
  descripcion: string;
  tramos: Tramo[];
  etiqueta: (clave: number) => string;
}) {
  const [encima, setEncima] = useState<number | null>(null);
  // Id propio por gráfico: en esta pantalla hay dos, y dos <pattern> con el
  // mismo id son HTML inválido y dejan el relleno a merced de cuál resuelva
  // primero el navegador.
  const idRayado = `rayado-${useId().replace(/:/g, "")}`;

  if (!tramos.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <p className="mt-6 text-center text-sm text-white/30">
          Sin publicaciones en este período
        </p>
      </section>
    );
  }

  const umbral = umbralDeMuestra(tramos);
  const maximo = Math.max(...tramos.map((t) => t.scorePromedio), 1);
  const hayPocaMuestra = tramos.some((t) => !esConfiable(t, umbral));

  /**
   * El viewBox mide SIEMPRE lo mismo y son las barras las que se acomodan.
   *
   * Al revés —ancho proporcional a la cantidad de barras— los dos gráficos de
   * esta pantalla se estirarían al mismo ancho del contenedor partiendo de
   * viewBox distintos (288 unidades para 24 horas, 84 para 7 días), y el de
   * días habría dibujado el texto casi cuatro veces más grande que el de horas.
   */
  const ANCHO = 300;
  const ALTO = 100;
  const SEPARACION = 2; // el respiro entre barras contiguas
  const paso = ANCHO / tramos.length;
  const ANCHO_BARRA = Math.max(paso - SEPARACION, 1);
  const ancho = ANCHO;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <p className="mt-0.5 text-xs text-white/35">{descripcion}</p>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${ancho} ${ALTO + 14}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={titulo}
        >
          <defs>
            <pattern
              id={idRayado}
              width="4"
              height="4"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="4" height="4" fill={COLOR_POCA_MUESTRA} opacity="0.35" />
              <line x1="0" y1="0" x2="0" y2="4" stroke={COLOR_POCA_MUESTRA} strokeWidth="2" />
            </pattern>
          </defs>

          {/* Rejilla discreta: referencia, no protagonista. */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={0}
              x2={ancho}
              y1={ALTO - ALTO * f}
              y2={ALTO - ALTO * f}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          {tramos.map((t, i) => {
            const confiable = esConfiable(t, umbral);
            const alto = Math.max((t.scorePromedio / maximo) * ALTO, 2);
            const x = i * paso + SEPARACION / 2;
            return (
              <g key={t.clave}>
                <rect
                  x={x}
                  y={ALTO - alto}
                  width={ANCHO_BARRA}
                  height={alto}
                  rx={3}
                  fill={confiable ? COLOR_SERIE : `url(#${idRayado})`}
                  opacity={encima === null || encima === t.clave ? 1 : 0.45}
                />
                {/* Zona sensible más alta que la barra: apuntar a una barra de
                    2px de alto sería imposible. */}
                <rect
                  x={x}
                  y={0}
                  width={ANCHO_BARRA}
                  height={ALTO}
                  fill="transparent"
                  onMouseEnter={() => setEncima(t.clave)}
                  onMouseLeave={() => setEncima(null)}
                  style={{ cursor: "pointer" }}
                />
                <text
                  x={x + ANCHO_BARRA / 2}
                  y={ALTO + 10}
                  textAnchor="middle"
                  fontSize="6"
                  fill="rgba(255,255,255,0.35)"
                >
                  {etiqueta(t.clave)}
                </text>
              </g>
            );
          })}
        </svg>

        {encima !== null && (
          <Globo tramo={tramos.find((t) => t.clave === encima)!} umbral={umbral} etiqueta={etiqueta} />
        )}
      </div>

      {hayPocaMuestra && (
        <p className="mt-3 flex items-center gap-2 text-[11px] text-white/40">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: COLOR_POCA_MUESTRA }}
          />
          Rayado = menos de {umbral} publicaciones. El promedio no alcanza para
          sacar conclusiones y no cuenta para el mejor tramo.
        </p>
      )}
    </section>
  );
}

function Globo({
  tramo,
  umbral,
  etiqueta,
}: {
  tramo: Tramo;
  umbral: number;
  etiqueta: (clave: number) => string;
}) {
  return (
    <div className="pointer-events-none absolute right-0 top-0 rounded-lg border border-white/15 bg-[#111] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold">{etiqueta(tramo.clave)}</p>
      <p className="mt-1 text-white/50">
        {tramo.posts} publicación{tramo.posts !== 1 ? "es" : ""}
      </p>
      <p className="text-white/50">
        Score promedio{" "}
        <span className="text-white/80">
          {Math.round(tramo.scorePromedio).toLocaleString("es")}
        </span>
      </p>
      <p className="text-white/40">
        {Math.round(tramo.reaccionesPromedio)} reacciones ·{" "}
        {Math.round(tramo.comentariosPromedio)} comentarios ·{" "}
        {Math.round(tramo.compartidosPromedio)} compartidos
      </p>
      {tramo.posts < umbral && (
        <p className="mt-1 text-amber-400/80">Pocos datos para confiar</p>
      )}
    </div>
  );
}
