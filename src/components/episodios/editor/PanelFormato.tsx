"use client";

import { useTranslations } from "next-intl";
import { Plus, ScanFace, X } from "lucide-react";
import { ajustarRegion, llevaFondo, panelesDe, posicionEn, regionPorDefecto, type DisenoClip, type FondoClip, type FormatoClip, type PosicionEfectiva } from "@/lib/clip-encuadre";
import { useTiempo, type Reproductor } from "./reproductor";
import { relojFino } from "./tipos";
import { Seccion } from "./ui";

const FORMATOS = [
  { valor: "VERTICAL", etiqueta: "9:16" },
  { valor: "CUADRADO", etiqueta: "1:1" },
  { valor: "HORIZONTAL", etiqueta: "16:9" },
] as const satisfies readonly { valor: FormatoClip; etiqueta: string }[];

const DISENOS = ["UNO", "DIVIDIDO", "HORIZONTAL", "CENTRADO"] as const satisfies readonly DisenoClip[];
const FONDOS = ["DESENFOCADO", "NEGRO"] as const satisfies readonly FondoClip[];

/**
 * Formato: la proporción del clip, el diseño de cada tramo (uno, dividido…),
 * el fondo y los cambios de encuadre en el tiempo. Mientras está abierto, al
 * lado de la vista previa se ve el cuadro entero para mover los recuadros.
 *
 * Los cambios de encuadre son "posiciones": desde tal segundo del clip, estos
 * recuadros. Lo que se cambia acá es el tramo donde está parado el video.
 */
export function PanelFormato({
  reproductor,
  desde,
  hasta,
  formato,
  onCambiarFormato,
  fondo,
  onCambiarFondo,
  posiciones,
  onCambiarPosiciones,
  resaltar,
  onAutoEncuadre,
  puedeEditar,
}: {
  reproductor: Reproductor;
  desde: number;
  hasta: number;
  formato: FormatoClip;
  onCambiarFormato: (f: FormatoClip) => void;
  fondo: FondoClip;
  onCambiarFondo: (f: FondoClip) => void;
  posiciones: PosicionEfectiva[];
  onCambiarPosiciones: (p: PosicionEfectiva[]) => void;
  /** Cambia cuando llegan encuadres del auto-encuadre: se resaltan. */
  resaltar: number;
  onAutoEncuadre: () => void;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorRecorte");
  const th = useTranslations("editorHerramientas");
  const t = useTiempo(reproductor.reloj);
  const { fuente } = reproductor;
  const duracion = hasta - desde;
  const tc = Math.min(Math.max(0, t - desde), duracion);
  const activa = posicionEn(posiciones, tc);
  const indiceActiva = Math.max(0, posiciones.indexOf(activa));
  const conFondo = posiciones.some((p) => llevaFondo(formato, p.diseno));
  const finDe = (i: number) => (i + 1 < posiciones.length ? posiciones[i + 1].desdeSeg : duracion);

  /**
   * El diseño del tramo donde está parado el video. Con la misma cantidad de
   * recuadros, cada uno conserva su lugar; si cambia, se arranca de los de
   * siempre (en Uno, centrado en donde estaba el primero).
   */
  function cambiarDisenoTramo(d: DisenoClip) {
    if (d === activa.diseno) return;
    const nuevos = panelesDe(formato, d);
    const regiones = nuevos.map((panel, i) => {
      const previa = activa.regiones.length === nuevos.length ? activa.regiones[i] : nuevos.length === 1 ? activa.regiones[0] : null;
      return previa ? ajustarRegion(previa, fuente, panel) : regionPorDefecto(fuente, panel, i, nuevos.length);
    });
    onCambiarPosiciones(posiciones.map((p, k) => (k === indiceActiva ? { ...p, diseno: d, regiones } : p)));
  }

  /** Un cambio de encuadre donde está parado el video, copiando el actual. */
  function nuevaPosicion() {
    const seg = Math.round(tc * 100) / 100;
    if (posiciones.some((p) => Math.abs(p.desdeSeg - seg) < 0.2)) return;
    onCambiarPosiciones(
      [...posiciones, { desdeSeg: seg, diseno: activa.diseno, regiones: activa.regiones.map((r) => ({ ...r })) }].sort((a, b) => a.desdeSeg - b.desdeSeg),
    );
  }

  const opcion = (activo: boolean) =>
    `flex items-center gap-2 rounded-ng-md border-2 px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
      activo ? "border-ng-azul bg-ng-superficie text-white" : "border-transparent bg-ng-superficie text-white/70 hover:text-white"
    }`;

  return (
    <div className="space-y-6">
      <Seccion titulo={th("formato.proporcion")}>
        <div className="grid grid-cols-3 gap-2">
          {FORMATOS.map((f) => (
            <button
              key={f.valor}
              type="button"
              disabled={!puedeEditar}
              aria-pressed={formato === f.valor}
              onClick={() => f.valor !== formato && onCambiarFormato(f.valor)}
              className={`${opcion(formato === f.valor)} flex-col !items-start !gap-0.5`}
            >
              <span className="font-semibold">{f.etiqueta}</span>
              <span className="text-[11px] leading-tight text-ng-secundario">{tr(`formatos.${f.valor}`)}</span>
            </button>
          ))}
        </div>
      </Seccion>

      <Seccion titulo={posiciones.length > 1 ? th("formato.esteTramo", { desde: relojFino(activa.desdeSeg), hasta: relojFino(finDe(indiceActiva)) }) : tr("diseno")}>
        <div className="grid grid-cols-2 gap-2">
          {DISENOS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={!puedeEditar}
              aria-pressed={d === activa.diseno}
              title={tr(`disenos.${d}.titulo`)}
              onClick={() => cambiarDisenoTramo(d)}
              className={opcion(d === activa.diseno)}
            >
              <MiniDiseno diseno={d} horizontal={formato === "HORIZONTAL"} activo={d === activa.diseno} />
              <span className="min-w-0">
                <span className="block font-medium">{tr(`disenos.${d}.etiqueta`)}</span>
                <span className="block truncate text-[11px] text-ng-secundario">{tr(`disenos.${d}.titulo`)}</span>
              </span>
            </button>
          ))}
        </div>
        {puedeEditar && (
          <button
            type="button"
            onClick={onAutoEncuadre}
            className="flex w-full items-center justify-center gap-2 rounded-ng-md border border-dashed border-ng-azul/50 px-3 py-2 text-sm font-medium text-ng-azul hover:bg-ng-azul/10"
          >
            <ScanFace size={16} aria-hidden />
            {th("formato.irAuto")}
          </button>
        )}
      </Seccion>

      {conFondo && (
        <Seccion titulo={th("formato.fondo")}>
          <div className="grid grid-cols-2 gap-2">
            {FONDOS.map((f) => (
              <button
                key={f}
                type="button"
                disabled={!puedeEditar}
                aria-pressed={fondo === f}
                onClick={() => f !== fondo && onCambiarFondo(f)}
                className={`${opcion(fondo === f)} flex-col !items-start !gap-0.5`}
              >
                <span className="font-medium">{tr(`fondos.${f}.etiqueta`)}</span>
                <span className="text-[11px] leading-tight text-ng-secundario">{tr(`fondos.${f}.titulo`)}</span>
              </button>
            ))}
          </div>
        </Seccion>
      )}

      <Seccion
        titulo={tr("encuadres", { n: posiciones.length })}
        extra={
          puedeEditar ? (
            <button
              type="button"
              onClick={nuevaPosicion}
              title={tr("ayudaNuevo", { seg: tc.toFixed(1) })}
              className="flex h-7 items-center gap-1 whitespace-nowrap rounded-lg border border-white/15 px-2.5 text-xs text-white/80 hover:bg-white/5"
            >
              <Plus size={12} aria-hidden />
              {th("formato.nuevoEncuadre")}
            </button>
          ) : null
        }
      >
        <p className="text-xs text-ng-tenue">{tr("ayudaEncuadres")}</p>
        <div className="flex flex-wrap gap-1.5">
          {posiciones.map((p, i) => (
            <div
              key={`${resaltar}-${i}`}
              className={`flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-xs tabular-nums ${
                i === indiceActiva ? "border-ng-azul text-white" : "border-white/15 text-white/60"
              }`}
              style={{ animation: resaltar ? `aparecer 0.4s ease-out ${i * 0.08}s both, resaltar 2.4s ease-out ${i * 0.08}s` : undefined }}
            >
              <button type="button" onClick={() => reproductor.irAlEpisodio(desde + Math.min(p.desdeSeg, duracion - 0.05))}>
                {relojFino(p.desdeSeg)}–{relojFino(finDe(i))}
                {posiciones.some((x) => x.diseno !== posiciones[0].diseno) && (
                  <span className="ml-1 text-white/45">· {tr(`disenos.${p.diseno}.etiqueta`)}</span>
                )}
              </button>
              {puedeEditar && i > 0 && (
                <button
                  type="button"
                  onClick={() => onCambiarPosiciones(posiciones.filter((_, k) => k !== i))}
                  className="text-white/40 hover:text-red-400"
                  aria-label={tr("quitar")}
                  title={tr("quitar")}
                >
                  <X size={12} aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      </Seccion>
    </div>
  );
}

/** El dibujito del diseño en su botón, el mismo que en la app. */
function MiniDiseno({ diseno, horizontal, activo }: { diseno: DisenoClip; horizontal: boolean; activo: boolean }) {
  const borde = activo ? "border-ng-azul" : "border-white/40";
  const relleno = activo ? "bg-ng-azul/80" : "bg-white/40";
  const tamano = horizontal ? "h-6 w-10" : "h-10 w-6";
  return (
    <div className={`flex shrink-0 gap-px ${tamano} ${horizontal ? "flex-row" : "flex-col"}`}>
      {diseno === "DIVIDIDO" ? (
        [0, 1].map((i) => <div key={i} className={`flex-1 rounded-[3px] border-[1.5px] ${borde}`} />)
      ) : diseno === "UNO" ? (
        <div className={`flex-1 rounded-[3px] border-[1.5px] ${borde}`} />
      ) : (
        <div className={`flex flex-1 flex-col justify-center rounded-[3px] border-[1.5px] border-dashed ${borde}`}>
          <div className={`${relleno} ${diseno === "HORIZONTAL" ? "h-[32%]" : "h-[56%]"}`} />
        </div>
      )}
    </div>
  );
}
