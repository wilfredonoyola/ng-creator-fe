"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlignEndHorizontal, AlignStartHorizontal, AudioLines, LoaderCircle, Scissors, Trash2, X } from "lucide-react";
import { agregarCorte, duracionEfectiva, estaCortado, unirCortes, type Corte } from "@/lib/cortes";
import { AvisoVersionFacebook } from "@/components/episodios/VersionFacebook";
import { duracionFinal, textoVelocidad, VELOCIDADES } from "@/lib/sonidos";
import { AjusteFino, BarraDelTramo } from "./BarraDelTramo";
import { Transcripcion, type ModoTranscripcion } from "./Transcripcion";
import { BotonAccion, Seccion } from "./ui";
import { useTiempo, type Reproductor } from "./reproductor";
import { reloj, relojFino, type Palabra, type SeleccionCortes } from "./tipos";

/**
 * Editar: dónde empieza y termina el clip y qué se saca del medio.
 *
 * - Dividir parte el pedazo en el cabezal (son los puntos de la barra de
 *   cortes: no se guardan, sirven para elegir solo una parte).
 * - Quitar tramo saca el pedazo elegido en la línea de tiempo: pasa a ser un
 *   corte, y se guarda como el resto.
 * - Empieza acá / Termina acá mueven el inicio o el fin al cabezal.
 * - Velocidad: se aplica al final, sobre el clip armado (Tanda 2).
 * - Abajo, el tramo dentro del episodio (para alargarlo) y la transcripción.
 */
export function PanelEditar({
  reproductor,
  desde,
  hasta,
  cortes,
  onCambiarCortes,
  onCambiarTramo,
  seleccion,
  onSeleccion,
  onSugerirSilencios,
  duracionEpisodio,
  palabras,
  correcciones,
  onCambiarCorrecciones,
  modo,
  onModo,
  velocidad,
  onVelocidad,
  puedeEditar,
}: {
  reproductor: Reproductor;
  desde: number;
  hasta: number;
  cortes: Corte[];
  onCambiarCortes: (c: Corte[]) => void;
  onCambiarTramo: (desde: number, hasta: number) => void;
  seleccion: SeleccionCortes;
  onSeleccion: (s: SeleccionCortes) => void;
  onSugerirSilencios: () => Promise<Corte[]>;
  duracionEpisodio: number;
  palabras: Palabra[];
  correcciones: { desde: number; texto: string }[];
  onCambiarCorrecciones: (c: { desde: number; texto: string }[]) => void;
  modo: ModoTranscripcion;
  onModo: (m: ModoTranscripcion) => void;
  velocidad: number;
  onVelocidad: (v: number) => void;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorHerramientas");
  const tc = useTranslations("editorCortes");
  const tClip = useTranslations("editorClip");
  const t = useTiempo(reproductor.reloj);
  const [aviso, setAviso] = useState<string | null>(null);
  const [silencios, setSilencios] = useState<{ n: number; seg: number; antes: Corte[] } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const efectiva = duracionEfectiva(desde, hasta, cortes);
  // Lo que dura el MP4: con los cortes y la velocidad.
  const final = duracionFinal(efectiva, velocidad);
  const dentro = t > desde + 0.1 && t < hasta - 0.1;
  const enCorte = Boolean(estaCortado(t, cortes));

  function dividir() {
    setAviso(null);
    if (!dentro || enCorte) return;
    onSeleccion({ puntos: [...seleccion.puntos.filter((p) => Math.abs(p - t) > 0.05), Math.round(t * 1000) / 1000], elegido: null });
  }

  function quitarTramo() {
    if (!seleccion.elegido) return;
    const r = agregarCorte(cortes, seleccion.elegido, desde, hasta);
    if (!r) {
      setAviso(tc("noQuitarTodo"));
      return;
    }
    setAviso(null);
    onSeleccion({ ...seleccion, elegido: null });
    onCambiarCortes(r);
  }

  async function quitarSilencios() {
    setAviso(null);
    setSilencios(null);
    setBuscando(true);
    try {
      const sugeridos = await onSugerirSilencios();
      const unidos = unirCortes(cortes, sugeridos, desde, hasta);
      const seg = efectiva - duracionEfectiva(desde, hasta, unidos);
      if (seg < 0.05) {
        setAviso(tc("sinSilencios"));
        return;
      }
      setSilencios({ n: sugeridos.length, seg, antes: cortes });
      onSeleccion({ ...seleccion, elegido: null });
      onCambiarCortes(unidos);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : tc("errorSilencios"));
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-ng-secundario">
        {tr("editar.resumen", { dura: reloj(final), cortes: cortes.length, inicio: reloj(desde) })}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
        <BotonAccion icono={<Scissors size={18} aria-hidden />} onClick={dividir} deshabilitado={!puedeEditar || !dentro || enCorte} titulo={tc("ayudaCortarAca")}>
          {tr("editar.dividir")}
        </BotonAccion>
        <BotonAccion
          icono={<Trash2 size={18} aria-hidden />}
          onClick={quitarTramo}
          deshabilitado={!puedeEditar || !seleccion.elegido}
          titulo={seleccion.elegido ? undefined : tr("editar.elegiTramo")}
        >
          {tr("editar.quitarTramo")}
        </BotonAccion>
        <BotonAccion
          icono={<AlignStartHorizontal size={18} aria-hidden />}
          onClick={() => onCambiarTramo(t, Math.max(hasta, t + 1))}
          deshabilitado={!puedeEditar || !dentro}
        >
          {tr("editar.empiezaAca")}
        </BotonAccion>
        <BotonAccion
          icono={<AlignEndHorizontal size={18} aria-hidden />}
          onClick={() => onCambiarTramo(Math.min(desde, t - 1), t)}
          deshabilitado={!puedeEditar || !dentro}
        >
          {tr("editar.terminaAca")}
        </BotonAccion>
      </div>

      <button
        type="button"
        onClick={() => void quitarSilencios()}
        disabled={!puedeEditar || buscando}
        title={tc("ayudaSilencios")}
        className="flex w-full items-center justify-center gap-2 rounded-ng-md border border-white/15 px-3 py-2 text-sm text-white/85 hover:bg-white/5 disabled:opacity-40"
      >
        {buscando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <AudioLines size={16} aria-hidden />}
        {tc("quitarSilencios")}
      </button>

      {silencios && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ng-azul/30 bg-ng-azul/10 px-3 py-2 text-xs text-white/85">
          <span className="flex-1">{tc("silenciosMarcados", { n: silencios.n, seg: silencios.seg.toFixed(1) })}</span>
          <button
            type="button"
            onClick={() => {
              onCambiarCortes(silencios.antes);
              setSilencios(null);
            }}
            className="font-medium text-ng-celeste hover:underline"
          >
            {tc("deshacer")}
          </button>
          <button type="button" onClick={() => setSilencios(null)} aria-label={tc("cerrar")} className="text-white/40 hover:text-white">
            <X size={14} aria-hidden />
          </button>
        </div>
      )}
      {aviso && <p className="text-xs text-amber-300">{aviso}</p>}

      {cortes.length > 0 && (
        <Seccion titulo={tr("editar.cortes", { n: cortes.length })}>
          <div className="flex flex-wrap gap-1.5">
            {cortes.map((c) => (
              <span
                key={`${c.desdeSeg}-${c.hastaSeg}`}
                className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-red-400/30 px-2 py-0.5 text-xs tabular-nums text-white/60"
              >
                <button type="button" onClick={() => reproductor.irAlEpisodio(Math.max(desde, c.desdeSeg - 1))} className="line-through decoration-red-400/70">
                  {relojFino(c.desdeSeg - desde)}–{relojFino(c.hastaSeg - desde)}
                </button>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={() => onCambiarCortes(cortes.filter((x) => x !== c))}
                    aria-label={tc("deshacerCorte", { desde: relojFino(c.desdeSeg - desde), hasta: relojFino(c.hastaSeg - desde) })}
                    className="text-white/40 hover:text-red-400"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        </Seccion>
      )}

      <p className="text-xs text-ng-tenue">{tr("editar.ayuda")}</p>

      <Seccion titulo={tr("editar.velocidad")}>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr("editar.velocidad")}>
          {VELOCIDADES.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={velocidad === v}
              onClick={() => onVelocidad(v)}
              disabled={!puedeEditar}
              className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums transition disabled:opacity-40 ${
                velocidad === v ? "bg-ng-azul text-ng-tinta" : "bg-ng-superficie text-white hover:bg-ng-elevada"
              }`}
            >
              {textoVelocidad(v)}
            </button>
          ))}
        </div>
        <p className="text-xs text-ng-secundario">
          {velocidad === 1
            ? tr("editar.duraIgual", { dura: reloj(efectiva) })
            : tr("editar.duraFinal", { antes: reloj(efectiva), despues: reloj(final), velocidad: textoVelocidad(velocidad) })}
        </p>
        {velocidad !== 1 && <p className="text-xs text-ng-tenue">{tr("editar.velocidadAyuda")}</p>}
      </Seccion>

      <Seccion titulo={tr("editar.enElEpisodio")}>
        <BarraDelTramo desde={desde} hasta={hasta} t={t} duracionEpisodio={duracionEpisodio} onCambiar={onCambiarTramo} deshabilitado={!puedeEditar} />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
          <AjusteFino etiqueta={tClip("empieza")} valor={desde} onCambio={(v) => onCambiarTramo(Math.min(v, hasta - 1), hasta)} disabled={!puedeEditar} />
          <AjusteFino etiqueta={tClip("termina")} valor={hasta} onCambio={(v) => onCambiarTramo(desde, Math.max(v, desde + 1))} disabled={!puedeEditar} />
        </div>
        {/* Facebook recibe el clip ya cortado y con la velocidad. */}
        <AvisoVersionFacebook duracion={final} />
      </Seccion>

      <Seccion titulo={tClip("pestanas.transcripcion.titulo")}>
        <Transcripcion
          palabras={palabras}
          desde={desde}
          hasta={hasta}
          cortes={cortes}
          correcciones={correcciones}
          modo={modo}
          onModo={onModo}
          onCambiarTramo={onCambiarTramo}
          onCambiarCortes={onCambiarCortes}
          onCambiarCorrecciones={onCambiarCorrecciones}
          puedeEditar={puedeEditar}
        />
      </Seccion>
    </div>
  );
}
