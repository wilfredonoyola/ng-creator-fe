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
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

const LIENZO = LIENZOS.VERTICAL;

/**
 * El gancho de muestra: lo que se ve arriba en cada miniatura. Es solo de
 * vista previa (no va al render), así que va en el idioma de la interfaz.
 */
const ganchoMuestra = (contenido: string, destacada: string): Texto => ({
  contenido,
  destacadas: [destacada],
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
});

/**
 * La línea de subtítulos de muestra: una palabra cada medio segundo. Las
 * palabras salen de los mensajes ("así se ven tus subtítulos"); en todos los
 * idiomas son cinco, para que la vuelta dure lo mismo.
 */
const CANTIDAD_PALABRAS = 5;
const PASO = 0.5;
const HASTA_LINEA = CANTIDAD_PALABRAS * PASO;
const lineaMuestra = (frase: string): LineaSubtituloEstilo => {
  const palabras = frase.split(" ").slice(0, CANTIDAD_PALABRAS);
  return {
    desde: 0,
    hasta: HASTA_LINEA,
    palabras: palabras.map((texto, i) => ({ texto, desde: i * PASO, hasta: (i + 1) * PASO })),
  };
};
/** La vuelta entera: la línea y un respiro con la última palabra dicha. */
const CICLO = HASTA_LINEA + 0.8;
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
  /** En px. Sin ancho, llena el de su caja (para una grilla que se reparte el panel). */
  ancho?: number;
  children?: ReactNode;
}) {
  const tr = useTranslations("estilosGaleria");
  const frase = tr("muestra.subtitulos");
  const linea = useMemo(() => lineaMuestra(frase), [frase]);
  const gancho = useMemo(() => ganchoMuestra(tr("muestra.gancho"), tr("muestra.destacada")), [tr]);
  const estilo = useMemo(() => resolverEstilo(def, tema), [def, tema]);
  const dibujos = useMemo(() => {
    const opciones = { duracionSeg: CICLO, nombreMarca };
    return [
      dibujarSubtitulos(linea, Math.min(t, linea.hasta - 0.01), LIENZO, "UNO", estilo.subtitulos),
      dibujarTexto(gancho, estilo.gancho, LIENZO, opciones),
    ];
  }, [estilo, t, nombreMarca, linea, gancho]);
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-gradient-to-b from-[#3A3935] via-[#262624] to-[#0A0A0A]"
      style={ancho ? { width: ancho, height: (ancho * LIENZO.alto) / LIENZO.ancho } : { width: "100%", aspectRatio: `${LIENZO.ancho} / ${LIENZO.alto}` }}
    >
      {/* Alguien hablando, para que el texto se vea sobre algo. */}
      <div className="absolute inset-x-0 bottom-[30%] flex flex-col items-center opacity-60">
        <div className="aspect-square w-[30%] rounded-full bg-teal-300/50" />
        <div className="mt-[3%] w-[52%] rounded-t-full bg-teal-300/30" style={{ aspectRatio: "0.52 / 0.4" }} />
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
 * fila compacta con la opción de quedarse con el de la marca). `enPanel` es
 * para un panel angosto (el inspector del editor): "Como la marca" en una
 * fila arriba y las miniaturas en tres columnas que llenan el ancho.
 */
export function GaleriaEstilos({
  tema,
  valor,
  onElegir,
  nombreMarca,
  compacta = false,
  enPanel = false,
  deLaMarca,
  deshabilitado = false,
}: {
  tema: Tema;
  /** null = el de la marca (solo con `deLaMarca`). */
  valor: EstiloTexto | null;
  onElegir: (e: EstiloTexto | null) => void;
  nombreMarca?: string;
  compacta?: boolean;
  enPanel?: boolean;
  /** El estilo de la marca: suma la opción "Como la marca (…)", que es null. */
  deLaMarca?: EstiloTexto;
  deshabilitado?: boolean;
}) {
  const tr = useTranslations("estilosGaleria");
  const tn = useTranslations("estilosNombres");
  const { estilos, porEstilo, cargando, error } = useEstilosTexto();
  const t = useRelojMuestra();
  const ancho = compacta ? 64 : 104;

  if (error) return <p className="text-xs text-red-400">{tr("errorCargar", { error: error.message })}</p>;
  if (cargando && !estilos.length) return <div className={`${compacta ? "h-32" : "h-64"} animate-pulse rounded-xl bg-white/5`} />;

  const grupos = [
    { titulo: tr("virales"), items: estilos.filter((e) => e.categoria === "VIRAL") },
    { titulo: tr("profesionales"), items: estilos.filter((e) => e.categoria === "PROFESIONAL") },
  ];
  const marca = deLaMarca ? porEstilo.get(deLaMarca) : undefined;
  const nombre = (def: EstiloTextoDef) => tn(`nombres.${def.estilo}`);
  const descripcion = (def: EstiloTextoDef) => tn(`descripciones.${def.estilo}`);

  const tarjeta = (def: EstiloTextoDef, elegido: boolean, etiqueta: string, alElegir: () => void, clave: string) => (
    <button
      key={clave}
      type="button"
      onClick={alElegir}
      disabled={deshabilitado}
      aria-pressed={elegido}
      title={descripcion(def)}
      className={`group shrink-0 rounded-xl p-1 text-left transition disabled:cursor-not-allowed ${
        elegido ? "bg-ng-azul/20 ring-2 ring-ng-azul" : "hover:bg-white/5"
      } ${deshabilitado && !elegido ? "opacity-60" : ""}`}
      style={{ width: ancho + 8 }}
    >
      <MuestraEstilo def={def} tema={tema} t={t} nombreMarca={nombreMarca} ancho={ancho} />
      <span className={`mt-1 block truncate px-0.5 text-[11px] ${elegido ? "font-semibold text-white" : "text-white/70"}`}>{etiqueta}</span>
    </button>
  );

  if (enPanel) {
    const elegidoMarca = valor === null;
    return (
      <div className="space-y-3">
        {marca && (
          <button
            type="button"
            onClick={() => onElegir(null)}
            disabled={deshabilitado}
            aria-pressed={elegidoMarca}
            title={descripcion(marca)}
            className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition disabled:cursor-not-allowed ${
              elegidoMarca ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/10 text-white/75 hover:bg-white/5"
            }`}
          >
            <MuestraEstilo def={marca} tema={tema} t={t} nombreMarca={nombreMarca} ancho={22} />
            <span className="min-w-0 flex-1 truncate">
              {tr.rich("comoLaMarcaRico", {
                nombre: nombre(marca),
                g: (c) => <span className="text-white/45">{c}</span>,
              })}
            </span>
            {elegidoMarca && <Check size={16} className="shrink-0 text-ng-celeste" aria-hidden />}
          </button>
        )}
        {grupos.map((g) => (
          <div key={g.titulo}>
            <p className="mb-1.5 text-xs text-white/35">{g.titulo}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {g.items.map((def) => {
                const elegido = valor === def.estilo;
                return (
                  <button
                    key={def.estilo}
                    type="button"
                    onClick={() => onElegir(def.estilo)}
                    disabled={deshabilitado}
                    aria-pressed={elegido}
                    title={descripcion(def)}
                    className={`min-w-0 rounded-lg p-1 text-left transition disabled:cursor-not-allowed ${
                      elegido ? "bg-ng-azul/20 ring-2 ring-ng-azul" : "hover:bg-white/5"
                    } ${deshabilitado && !elegido ? "opacity-60" : ""}`}
                  >
                    <MuestraEstilo def={def} tema={tema} t={t} nombreMarca={nombreMarca} />
                    <span className={`mt-1 block truncate px-0.5 text-xs ${elegido ? "font-semibold text-white" : "text-white/70"}`}>
                      {nombre(def)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (compacta) {
    return (
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {marca &&
          tarjeta(marca, valor === null, tr("comoLaMarca", { nombre: nombre(marca) }), () => onElegir(null), "marca")}
        {grupos.map((g) => (
          <div key={g.titulo} className="flex shrink-0 items-start gap-1 border-l border-white/10 pl-1">
            <span className="mt-1 w-3 shrink-0 text-[9px] font-medium uppercase tracking-wider text-white/35 [writing-mode:vertical-rl]">
              {g.titulo}
            </span>
            {g.items.map((def) => tarjeta(def, valor === def.estilo, nombre(def), () => onElegir(def.estilo), def.estilo))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {marca && (
        <div className="flex flex-wrap gap-2">{tarjeta(marca, valor === null, tr("comoLaMarca", { nombre: nombre(marca) }), () => onElegir(null), "marca")}</div>
      )}
      {grupos.map((g) => (
        <div key={g.titulo}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">{g.titulo}</p>
          <div className="flex flex-wrap gap-2">
            {g.items.map((def) => tarjeta(def, valor === def.estilo, nombre(def), () => onElegir(def.estilo), def.estilo))}
          </div>
        </div>
      ))}
    </div>
  );
}
