"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LIENZOS, type Texto } from "@/lib/clip-encuadre";
import {
  dibujarSubtitulos,
  dibujarTexto,
  GANCHO_COMO_TEXTO,
  resolverEstilo,
  type EstiloTexto,
  type EstiloTextoDef,
  type LineaSubtituloEstilo,
  type Tema,
} from "@/lib/estilos-texto";
import { useEstilosTexto } from "@/lib/use-estilos-texto";
import { CapaDibujos } from "@/components/estilos/CapaDibujos";

const LIENZO = LIENZOS.VERTICAL;

/** El gancho de muestra: lo que se ve arriba en cada miniatura. */
const GANCHO_MUESTRA: Texto = {
  contenido: "Lo que nadie te cuenta de vender",
  destacadas: ["nadie"],
  fuente: "ANTON",
  tamano: GANCHO_COMO_TEXTO.tamano,
  color: "#FFFFFF",
  colorDestacado: "#FFFFFF",
  efecto: "NINGUNO",
  colorEfecto: "#000000",
  mayusculas: false,
  centroX: GANCHO_COMO_TEXTO.centroX,
  centroY: 0.24,
  ancho: GANCHO_COMO_TEXTO.ancho,
  desdeSeg: 0,
  hastaSeg: null,
};

/** La línea de subtítulos de muestra: una palabra cada medio segundo. */
const PALABRAS_MUESTRA = ["así", "se", "ven", "tus", "subtítulos"];
const PASO = 0.5;
const LINEA_MUESTRA: LineaSubtituloEstilo = {
  desde: 0,
  hasta: PALABRAS_MUESTRA.length * PASO,
  palabras: PALABRAS_MUESTRA.map((texto, i) => ({ texto, desde: i * PASO, hasta: (i + 1) * PASO })),
};
/** La vuelta entera: la línea y un respiro con la última palabra dicha. */
const CICLO = LINEA_MUESTRA.hasta + 0.8;
/** Sin movimiento: la tercera palabra, ya asentada. */
const QUIETO = 2 * PASO + 0.4;

/** Si la persona pidió menos movimiento en su sistema. */
function useMenosMovimiento() {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenos(mq.matches);
    const cambio = (e: MediaQueryListEvent) => setMenos(e.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return menos;
}

/**
 * El segundo de la muestra, que da vueltas: uno solo para toda la galería,
 * así todas las miniaturas dicen la misma palabra a la vez. Con
 * prefers-reduced-motion queda quieto.
 */
export function useRelojMuestra(): number {
  const menos = useMenosMovimiento();
  const [t, setT] = useState(QUIETO);
  useEffect(() => {
    if (menos) {
      setT(QUIETO);
      return;
    }
    let id = 0;
    let ultimo = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      // ~30 cuadros por segundo alcanzan para el pop y ahorran trabajo.
      if (ahora - ultimo > 33) {
        ultimo = ahora;
        setT(((ahora - inicio) / 1000) % CICLO);
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [menos]);
  return t;
}

/**
 * Un clip 9:16 de muestra con un estilo y el tema de la marca: el gancho
 * arriba y una línea de subtítulos con la palabra que se dice animada, como
 * sale en el render. `children` va encima (el logo, la llamada a la acción).
 */
export function MuestraEstilo({
  def,
  tema,
  t,
  nombreMarca,
  ancho,
  children,
}: {
  def: EstiloTextoDef;
  tema: Tema;
  t: number;
  nombreMarca?: string;
  ancho: number;
  children?: ReactNode;
}) {
  const estilo = useMemo(() => resolverEstilo(def, tema), [def, tema]);
  const dibujos = useMemo(() => {
    const opciones = { duracionSeg: CICLO, nombreMarca };
    return [
      dibujarSubtitulos(LINEA_MUESTRA, Math.min(t, LINEA_MUESTRA.hasta - 0.01), LIENZO, "UNO", estilo.subtitulos),
      dibujarTexto(GANCHO_MUESTRA, estilo.gancho, LIENZO, opciones),
    ];
  }, [estilo, t, nombreMarca]);
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-gradient-to-b from-[#334155] via-[#1e293b] to-[#0b0f1a]"
      style={{ width: ancho, height: (ancho * LIENZO.alto) / LIENZO.ancho }}
    >
      {/* Alguien hablando, para que el texto se vea sobre algo. */}
      <div className="absolute inset-x-0 bottom-[30%] flex justify-center opacity-60">
        <div className="flex flex-col items-center">
          <div className="rounded-full bg-teal-300/50" style={{ width: ancho * 0.3, height: ancho * 0.3 }} />
          <div className="mt-[3%] rounded-t-full bg-teal-300/30" style={{ width: ancho * 0.52, height: ancho * 0.4 }} />
        </div>
      </div>
      <CapaDibujos lienzo={LIENZO} dibujos={dibujos} />
      {children}
    </div>
  );
}

/**
 * La galería de estilos de texto: una miniatura 9:16 por estilo, con el tema
 * de la marca, agrupadas en virales y profesionales. Sirve para el estilo por
 * defecto de la marca (la plantilla) y para el de cada clip (el editor, en una
 * fila compacta con la opción de quedarse con el de la marca).
 */
export function GaleriaEstilos({
  tema,
  valor,
  onElegir,
  nombreMarca,
  compacta = false,
  deLaMarca,
  deshabilitado = false,
}: {
  tema: Tema;
  /** null = el de la marca (solo con `deLaMarca`). */
  valor: EstiloTexto | null;
  onElegir: (e: EstiloTexto | null) => void;
  nombreMarca?: string;
  compacta?: boolean;
  /** El estilo de la marca: suma la opción "Como la marca (…)", que es null. */
  deLaMarca?: EstiloTexto;
  deshabilitado?: boolean;
}) {
  const { estilos, porEstilo, cargando, error } = useEstilosTexto();
  const t = useRelojMuestra();
  const ancho = compacta ? 64 : 104;

  if (error) return <p className="text-xs text-red-400">No se pudieron cargar los estilos: {error.message}</p>;
  if (cargando && !estilos.length) return <div className={`${compacta ? "h-32" : "h-64"} animate-pulse rounded-xl bg-white/5`} />;

  const grupos = [
    { titulo: "Virales", items: estilos.filter((e) => e.categoria === "VIRAL") },
    { titulo: "Profesionales", items: estilos.filter((e) => e.categoria === "PROFESIONAL") },
  ];
  const marca = deLaMarca ? porEstilo.get(deLaMarca) : undefined;

  const tarjeta = (def: EstiloTextoDef, elegido: boolean, etiqueta: string, alElegir: () => void, clave: string) => (
    <button
      key={clave}
      type="button"
      onClick={alElegir}
      disabled={deshabilitado}
      aria-pressed={elegido}
      title={def.descripcion}
      className={`group shrink-0 rounded-xl p-1 text-left transition disabled:cursor-not-allowed ${
        elegido ? "bg-ng-azul/20 ring-2 ring-ng-azul" : "hover:bg-white/5"
      } ${deshabilitado && !elegido ? "opacity-60" : ""}`}
      style={{ width: ancho + 8 }}
    >
      <MuestraEstilo def={def} tema={tema} t={t} nombreMarca={nombreMarca} ancho={ancho} />
      <span className={`mt-1 block truncate px-0.5 text-[11px] ${elegido ? "font-semibold text-white" : "text-white/70"}`}>{etiqueta}</span>
    </button>
  );

  if (compacta) {
    return (
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {marca &&
          tarjeta(marca, valor === null, `Como la marca (${marca.nombre})`, () => onElegir(null), "marca")}
        {grupos.map((g) => (
          <div key={g.titulo} className="flex shrink-0 items-start gap-1 border-l border-white/10 pl-1">
            <span className="mt-1 w-3 shrink-0 text-[9px] font-medium uppercase tracking-wider text-white/35 [writing-mode:vertical-rl]">
              {g.titulo}
            </span>
            {g.items.map((def) => tarjeta(def, valor === def.estilo, def.nombre, () => onElegir(def.estilo), def.estilo))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {marca && (
        <div className="flex flex-wrap gap-2">{tarjeta(marca, valor === null, `Como la marca (${marca.nombre})`, () => onElegir(null), "marca")}</div>
      )}
      {grupos.map((g) => (
        <div key={g.titulo}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">{g.titulo}</p>
          <div className="flex flex-wrap gap-2">
            {g.items.map((def) => tarjeta(def, valor === def.estilo, def.nombre, () => onElegir(def.estilo), def.estilo))}
          </div>
        </div>
      ))}
    </div>
  );
}
