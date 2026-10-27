"use client";

import { useEffect, useState } from "react";
import { FUENTES_ESTILO, type Tema } from "@/lib/estilos-texto";
import {
  entre,
  medirTexto,
  ventanaDeCara,
  type CapaPortada,
  type CaraDeCuadro,
  type DisenoPortada,
  type Lienzo,
  type TextoDibujado,
} from "@/lib/diseno-portada";

/**
 * El diseño de una portada dibujado en el navegador, en un SVG del tamaño del
 * lienzo (1080 de ancho): la vista en vivo del editor. Los textos se miden y
 * se parten como en el backend (diseno-portada.ts), así lo que se ve es lo
 * que sale. Los recortes y lo mejorado con IA llegan del servidor (be#255);
 * mientras tanto, y para desenfoque y sombras, los filtros son una aproximación.
 */

/** Alto/ancho de cada imagen, cuando ya cargó. */
export function useAspectos(urls: (string | null | undefined)[]): Record<string, number> {
  const [aspectos, setAspectos] = useState<Record<string, number>>({});
  const clave = Array.from(new Set(urls.filter((u): u is string => !!u))).join("\n");
  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    for (const url of clave.split("\n")) {
      if (aspectos[url]) continue;
      const img = new Image();
      img.onload = () => {
        if (vivo && img.naturalWidth) setAspectos((a) => ({ ...a, [url]: img.naturalHeight / img.naturalWidth }));
      };
      img.src = url;
    }
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cambian las urls
  }, [clave]);
  return aspectos;
}

/** Lo que necesita el dibujo además del diseño. */
export interface RecursosDibujo {
  tema: Tema;
  /** El título del clip (o uno de ejemplo): va en las capas `titulo`. */
  titulo: string;
  cuadroUrl?: string | null;
  /** La cara del cuadro, para `fondo.centrarCara` (be#249); sin ella, el cuadro entero. */
  caraCuadro?: CaraDeCuadro | null;
  logoUrl?: string | null;
  aspectos: Record<string, number>;
  /** La imagen que se ve de una capa IMAGEN (con su recorte o su mejorada con IA, si ya está). */
  srcDeCapa: (capa: CapaPortada) => string | null;
  /** La capa ya se ve con la mejorada con IA (be#255): sin el filtro aproximado. */
  capaMejorada?: (capa: CapaPortada) => boolean;
  /** El fondo mejorado con IA, si ya está (be#255): va en lugar del cuadro o la imagen, sin el filtro. */
  fondoMejorado?: string | null;
  /** Lo que se escribe donde falta el cuadro del clip (Brand Kit sin clip). */
  textoSinCuadro: string;
}

/** La caja que ocupa una capa en px del lienzo (centro, ancho y alto), para elegirla y moverla. */
export interface CajaCapa {
  cx: number;
  cy: number;
  ancho: number;
  alto: number;
}

export function cajaDeCapa(capa: CapaPortada, lienzo: Lienzo, r: RecursosDibujo): CajaCapa {
  if (capa.tipo === "TEXTO") {
    const m = medirTexto(capa, r.titulo, r.tema, lienzo);
    if (!m) return { cx: lienzo.ancho * capa.x, cy: lienzo.alto * capa.y, ancho: lienzo.ancho * 0.3, alto: lienzo.alto * 0.04 };
    return { cx: m.x, cy: m.centro, ancho: m.anchoBloque, alto: m.altoBloque };
  }
  const ancho = lienzo.ancho * entre(capa.ancho, 0.02, 2);
  if (capa.tipo === "FORMA") {
    return { cx: lienzo.ancho * capa.x, cy: lienzo.alto * capa.y, ancho, alto: lienzo.alto * entre(capa.alto ?? 0.1, 0.005, 2) };
  }
  const src = capa.tipo === "LOGO" ? r.logoUrl : r.srcDeCapa(capa);
  const aspecto = (src && r.aspectos[src]) || 1;
  return { cx: lienzo.ancho * capa.x, cy: lienzo.alto * capa.y, ancho, alto: ancho * aspecto };
}

const FILTRO_MEJORAR = "dp-mejorar";

export function DibujoDiseno({
  diseno,
  lienzo,
  recursos,
  className,
}: {
  diseno: DisenoPortada;
  lienzo: Lienzo;
  recursos: RecursosDibujo;
  className?: string;
}) {
  const { fondo } = diseno;
  const { tema } = recursos;
  const W = lienzo.ancho;
  const H = lienzo.alto;
  const original = fondo.tipo === "CUADRO" ? recursos.cuadroUrl : fondo.tipo === "IMAGEN" ? fondo.url : null;
  const fondoUrl = original && fondo.mejorar && recursos.fondoMejorado ? recursos.fondoMejorado : original;
  // Ya mejorado con IA no lleva el filtro aproximado (como en el backend).
  const mejorarFondo = !!fondo.mejorar && fondoUrl === original;
  const desenfoque = entre(fondo.desenfoque ?? 0, 0, 1);
  const oscurecer = entre(fondo.oscurecer ?? 0, 0, 0.7);
  const filtroFondo = fondoUrl && (desenfoque > 0 || mejorarFondo) ? "dp-fondo" : undefined;
  // Centrar en la cara: la ventana del cuadro (en px de la imagen) estirada al lienzo, como el backend.
  const aspectoCuadro = recursos.cuadroUrl ? recursos.aspectos[recursos.cuadroUrl] : undefined;
  const ventana =
    fondo.tipo === "CUADRO" && fondo.centrarCara && recursos.caraCuadro && aspectoCuadro ? ventanaDeCara(recursos.caraCuadro) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id={FILTRO_MEJORAR}>
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.12" intercept="-0.04" />
            <feFuncG type="linear" slope="1.12" intercept="-0.04" />
            <feFuncB type="linear" slope="1.12" intercept="-0.04" />
          </feComponentTransfer>
          <feColorMatrix type="saturate" values="1.15" />
        </filter>
        {filtroFondo && (
          <filter id="dp-fondo" x="0" y="0" width="100%" height="100%">
            {mejorarFondo ? (
              <>
                <feComponentTransfer result="niveles">
                  <feFuncR type="linear" slope="1.12" intercept="-0.04" />
                  <feFuncG type="linear" slope="1.12" intercept="-0.04" />
                  <feFuncB type="linear" slope="1.12" intercept="-0.04" />
                </feComponentTransfer>
                <feColorMatrix type="saturate" values="1.15" result="mejorado" />
              </>
            ) : null}
            {desenfoque > 0 && <feGaussianBlur stdDeviation={0.3 + desenfoque * 40} edgeMode="duplicate" />}
          </filter>
        )}
      </defs>

      {/* El fondo */}
      {fondoUrl && ventana && aspectoCuadro ? (
        <g filter={filtroFondo ? `url(#${filtroFondo})` : undefined}>
          <svg
            x={0}
            y={0}
            width={W}
            height={H}
            viewBox={`${ventana.x * 1000} ${ventana.y * 1000 * aspectoCuadro} ${ventana.ancho * 1000} ${ventana.alto * 1000 * aspectoCuadro}`}
            preserveAspectRatio="xMidYMid slice"
          >
            <image href={fondoUrl} x={0} y={0} width={1000} height={1000 * aspectoCuadro} />
          </svg>
        </g>
      ) : fondoUrl ? (
        <image href={fondoUrl} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" filter={filtroFondo ? `url(#${filtroFondo})` : undefined} />
      ) : fondo.tipo === "CUADRO" ? (
        <SinCuadro x={0} y={0} ancho={W} alto={H} texto={recursos.textoSinCuadro} />
      ) : (
        <rect x={0} y={0} width={W} height={H} fill={(fondo.color && /^#[0-9a-fA-F]{6}$/.test(fondo.color) ? fondo.color : null) ?? tema.colorFondo} />
      )}
      {oscurecer > 0 && <rect x={0} y={0} width={W} height={H} fill="#000" opacity={oscurecer} />}

      {diseno.capas.map((capa) => (
        <Capa key={capa.id} capa={capa} lienzo={lienzo} recursos={recursos} />
      ))}
    </svg>
  );
}

function SinCuadro({ x, y, ancho, alto, texto }: { x: number; y: number; ancho: number; alto: number; texto: string }) {
  return (
    <g>
      <defs>
        <linearGradient id="dp-sin-cuadro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2d36" />
          <stop offset="1" stopColor="#14161c" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={ancho} height={alto} fill="url(#dp-sin-cuadro)" />
      <text
        x={x + ancho / 2}
        y={y + alto / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        opacity={0.35}
        fontSize={Math.max(14, Math.min(ancho, alto) * 0.06)}
        fontFamily="Inter Tight, sans-serif"
      >
        {texto}
      </text>
    </g>
  );
}

function Capa({ capa, lienzo, recursos }: { capa: CapaPortada; lienzo: Lienzo; recursos: RecursosDibujo }) {
  if (capa.tipo === "TEXTO") {
    const m = medirTexto(capa, recursos.titulo, recursos.tema, lienzo);
    return m ? <TextoSvg id={capa.id} m={m} rotacion={capa.rotacion} /> : null;
  }
  const caja = cajaDeCapa(capa, lienzo, recursos);
  const opacidad = entre(capa.opacidad ?? 1, 0, 1);
  const giro = capa.rotacion ? `rotate(${capa.rotacion} ${caja.cx} ${caja.cy})` : undefined;
  const x = caja.cx - caja.ancho / 2;
  const y = caja.cy - caja.alto / 2;
  if (capa.tipo === "FORMA") {
    const radio = Math.min(caja.ancho, caja.alto) * entre(capa.radio ?? 0, 0, 0.5);
    const color = capa.color && /^#[0-9a-fA-F]{6}$/.test(capa.color) ? capa.color : recursos.tema.colorPrimario;
    return <rect x={x} y={y} width={caja.ancho} height={caja.alto} rx={radio} ry={radio} fill={color} opacity={opacidad} transform={giro} />;
  }
  const src = capa.tipo === "LOGO" ? recursos.logoUrl : recursos.srcDeCapa(capa);
  if (!src) {
    return capa.tipo === "IMAGEN" && capa.cuadro ? (
      <g transform={giro} opacity={opacidad}>
        <SinCuadro x={x} y={y} ancho={caja.ancho} alto={caja.alto} texto={recursos.textoSinCuadro} />
      </g>
    ) : null;
  }
  // Un cuadro tal cual (sin recortar) con contorno: el servidor le pone un marco
  // blanco. Si ya llegó su recorte (cuadro limpio, be#255), el marco viene en él.
  const marco = capa.tipo === "IMAGEN" && capa.contorno && !capa.sinFondo && capa.cuadro && src === recursos.cuadroUrl;
  return (
    <g transform={giro} opacity={opacidad}>
      <image
        href={src}
        x={x}
        y={y}
        width={caja.ancho}
        height={caja.alto}
        preserveAspectRatio="none"
        filter={capa.tipo === "IMAGEN" && capa.mejorar && !recursos.capaMejorada?.(capa) ? `url(#${FILTRO_MEJORAR})` : undefined}
      />
      {marco && (
        <rect x={x} y={y} width={caja.ancho} height={caja.alto} fill="none" stroke="#fff" strokeWidth={Math.max(4, caja.ancho * 0.02)} />
      )}
    </g>
  );
}

function TextoSvg({ id, m, rotacion }: { id: string; m: TextoDibujado; rotacion: number }) {
  const def = FUENTES_ESTILO[m.fuente] ?? FUENTES_ESTILO.ANTON;
  const letra = {
    fontFamily: `"${def.familiaCss}", sans-serif`,
    fontWeight: def.peso,
    fontStyle: def.italica ? "italic" : "normal",
    fontSize: m.cuerpo * def.factorCss,
  } as const;
  const giro = rotacion ? `rotate(${rotacion} ${m.x} ${m.centro})` : undefined;
  const caja = m.estilo === "CAJA";
  const filtro = `dp-sombra-${id}`;
  return (
    <g transform={giro}>
      {!caja && (
        <defs>
          <filter id={filtro} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={m.desenfoqueSombra * 0.6} />
          </filter>
        </defs>
      )}
      {m.renglones.map((r, i) => {
        if (caja) {
          const ancho = r.ancho + m.altoLetra * 0.8;
          const alto = m.altoLetra + m.relleno * 2;
          return (
            <g key={i} opacity={m.opacidad}>
              <rect x={m.x - ancho / 2} y={r.y - alto / 2} width={ancho} height={alto} rx={alto * 0.18} fill={m.colorCaja} />
              <text x={m.x} y={r.base} textAnchor="middle" fill={r.color} style={{ ...letra, whiteSpace: "pre" }}>
                {r.texto}
              </text>
            </g>
          );
        }
        return (
          <g key={i}>
            <text
              x={m.x}
              y={r.base}
              textAnchor="middle"
              fill="#000"
              stroke={m.contornoSombra ? "#000" : "none"}
              strokeWidth={m.contornoSombra * 2}
              strokeLinejoin="round"
              opacity={m.opacidadSombra}
              filter={`url(#${filtro})`}
              style={{ ...letra, whiteSpace: "pre", paintOrder: "stroke" }}
            >
              {r.texto}
            </text>
            <text
              x={m.x}
              y={r.base}
              textAnchor="middle"
              fill={r.color}
              stroke={m.contorno ? "#000" : "none"}
              strokeWidth={m.contorno * 2}
              strokeLinejoin="round"
              opacity={m.opacidad}
              style={{ ...letra, whiteSpace: "pre", paintOrder: "stroke" }}
            >
              {r.texto}
            </text>
          </g>
        );
      })}
    </g>
  );
}
