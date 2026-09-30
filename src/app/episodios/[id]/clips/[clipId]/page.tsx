"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  ACTUALIZAR_CLIP_EPISODIO,
  CLIP_EPISODIO,
  EPISODIO,
  RENDERIZAR_CLIP_EPISODIO,
  TRANSCRIPCION_EPISODIO,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  EditorRecorte,
  type EstiloClip,
  type LineaSubtitulo,
} from "@/components/episodios/EditorRecorte";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import type { DisenoClip, Encuadre, FondoClip, FormatoClip, Region, Texto } from "@/lib/clip-encuadre";
import { disenosDeTexto, PanelTextos, textoNuevo } from "@/components/episodios/PanelTextos";
import { EstadoGuardado, PanelExportar } from "@/components/episodios/PanelExportar";

interface Palabra {
  texto: string;
  desde: number;
  hasta: number;
}

interface Borrador {
  desdeSeg: number;
  hastaSeg: number;
  titulo: string;
  formato: FormatoClip;
  encuadre: Encuadre;
  diseno: DisenoClip;
  fondo: FondoClip;
  posiciones: { desdeSeg: number; regiones: Region[] }[];
  subtitulosActivos: boolean;
  correcciones: { desde: number; texto: string }[];
  gancho: string;
  ganchoActivo: boolean;
  ganchoSeg: number;
  textos: Texto[];
}

/** Cuánto contexto se muestra alrededor del clip en la transcripción. */
const CONTEXTO_SEG = 30;

/**
 * El editor de un clip de episodio (ng-creator-be#69).
 *
 * La transcripción es la línea de tiempo: se toca una palabra para elegir
 * dónde empieza o termina el clip, y se afina al milisegundo con los números.
 * Todo se guarda solo, a medida que se cambia; la vista previa muestra el
 * resultado con los subtítulos que calcula el servidor, los mismos que van al
 * render.
 */
export default function EditorClipPage({
  params,
}: {
  // Objeto plano, no promesa: ver publicados/[id].
  params: { id: string; clipId: string };
}) {
  const { id: episodioId, clipId } = params;
  const { activa } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const marcaId = activa?._id ?? null;
  const opera = puedeOperar(marcaId);

  const clipQ = useQuery(CLIP_EPISODIO, {
    variables: { id: clipId, marcaId: marcaId ?? "" },
    skip: !marcaId,
  });
  const episodioQ = useQuery(EPISODIO, {
    variables: { id: episodioId, marcaId: marcaId ?? "" },
    skip: !marcaId,
  });
  const [actualizar] = useMutation(ACTUALIZAR_CLIP_EPISODIO);
  const [renderizar, { loading: pidiendoRender }] = useMutation(RENDERIZAR_CLIP_EPISODIO);

  const clip = clipQ.data?.clipEpisodio;
  const estilo: EstiloClip | undefined = clipQ.data?.estiloClipMarca;
  const ep = episodioQ.data?.episodio;

  const [b, setB] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<"inicio" | "fin" | "corregir">("inicio");
  const [corrigiendo, setCorrigiendo] = useState<Palabra | null>(null);
  const [textoElegido, setTextoElegido] = useState<number | null>(null);

  // El borrador arranca del clip UNA vez. Después manda lo que se edita acá:
  // pisarlo con cada respuesta del servidor borraría lo que se está tipeando.
  useEffect(() => {
    if (!clip || b || !estilo) return;
    const textos: Texto[] = (clip.textos ?? []).map((t: Texto) => ({
      contenido: t.contenido,
      destacadas: [...t.destacadas],
      fuente: t.fuente,
      tamano: t.tamano,
      color: t.color,
      colorDestacado: t.colorDestacado,
      efecto: t.efecto,
      colorEfecto: t.colorEfecto,
      mayusculas: t.mayusculas,
      centroX: t.centroX,
      centroY: t.centroY,
      ancho: t.ancho,
      desdeSeg: t.desdeSeg,
      hastaSeg: t.hastaSeg ?? null,
    }));
    // El gancho de la primera versión pasa a ser el primer texto, con el
    // diseño "Impacto": desde acá, todo texto sobre el clip es uno de estos.
    if (!textos.length && clip.ganchoActivo && clip.gancho?.trim()) {
      textos.push({
        ...textoNuevo(disenosDeTexto(estilo.colorResaltado)[0].estilo, clip.gancho.trim(), 0.15),
        hastaSeg: clip.ganchoSeg ?? 3,
      });
    }
    setB({
      desdeSeg: clip.desdeSeg,
      hastaSeg: clip.hastaSeg,
      titulo: clip.titulo,
      formato: clip.formato,
      encuadre: {
        centroX: clip.encuadre.centroX,
        centroY: clip.encuadre.centroY,
        zoom: clip.encuadre.zoom,
      },
      diseno: clip.diseno,
      fondo: clip.fondo ?? "DESENFOCADO",
      posiciones: clip.posiciones.map((p: { desdeSeg: number; regiones: Region[] }) => ({
        desdeSeg: p.desdeSeg,
        regiones: p.regiones.map(({ x, y, ancho, alto }) => ({ x, y, ancho, alto })),
      })),
      subtitulosActivos: clip.subtitulosActivos,
      correcciones: clip.correcciones.map((c: { desde: number; texto: string }) => ({
        desde: c.desde,
        texto: c.texto,
      })),
      gancho: clip.gancho ?? "",
      ganchoActivo: clip.ganchoActivo,
      ganchoSeg: clip.ganchoSeg,
      textos,
    });
  }, [clip, b, estilo]);

  // Guardado automático, medio segundo después del último cambio.
  //
  // El guardado vive en una función aparte para poder forzarlo: "Procesar
  // video" guarda lo pendiente ANTES de pedir el render. Sin eso, un cambio
  // hecho medio segundo antes de tocar el botón salía del render sin estar.
  const [sinGuardar, setSinGuardar] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef<Borrador | null>(null);
  const guardar = useCallback(
    async (borrador: Borrador) => {
      if (!marcaId) return;
      setGuardando(true);
      setError(null);
      try {
        await actualizar({
          variables: {
            id: clipId,
            marcaId,
            input: {
              desdeSeg: borrador.desdeSeg,
              hastaSeg: borrador.hastaSeg,
              titulo: borrador.titulo,
              formato: borrador.formato,
              encuadre: borrador.encuadre,
              diseno: borrador.diseno,
              fondo: borrador.fondo,
              posiciones: borrador.posiciones,
              subtitulosActivos: borrador.subtitulosActivos,
              correcciones: borrador.correcciones,
              gancho: borrador.gancho,
              // Los textos reemplazan al gancho viejo: si no, borrar todos los
              // textos haría reaparecer el gancho en el render.
              ganchoActivo: false,
              ganchoSeg: borrador.ganchoSeg,
              textos: borrador.textos.map((t) => ({ ...t, hastaSeg: t.hastaSeg ?? null })),
            },
          },
        });
        if (ultimo.current === borrador) setSinGuardar(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
        throw e;
      } finally {
        setGuardando(false);
      }
    },
    [marcaId, clipId, actualizar],
  );

  const primera = useRef(true);
  useEffect(() => {
    if (!b || !marcaId || !opera) return;
    if (primera.current) {
      primera.current = false;
      return;
    }
    ultimo.current = b;
    setSinGuardar(true);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      void guardar(b).catch(() => undefined);
    }, 500);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [b, marcaId, opera, guardar]);

  /** Guarda ya lo que esté pendiente, sin esperar el medio segundo. */
  async function guardarAhora() {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    if (sinGuardar && ultimo.current) await guardar(ultimo.current);
  }

  // La transcripción alrededor del clip. Se vuelve a pedir cuando el tramo se
  // corre fuera de la ventana que ya se tiene.
  const [ventana, setVentana] = useState<{ desde: number; hasta: number } | null>(null);
  useEffect(() => {
    if (!b) return;
    if (!ventana || b.desdeSeg < ventana.desde + 5 || b.hastaSeg > ventana.hasta - 5) {
      setVentana({
        desde: Math.max(0, b.desdeSeg - CONTEXTO_SEG),
        hasta: b.hastaSeg + CONTEXTO_SEG,
      });
    }
  }, [b, ventana]);
  const transcripcionQ = useQuery(TRANSCRIPCION_EPISODIO, {
    variables: {
      id: episodioId,
      marcaId: marcaId ?? "",
      desdeSeg: ventana?.desde,
      hastaSeg: ventana?.hasta,
    },
    skip: !marcaId || !ventana,
  });
  const palabras: Palabra[] = transcripcionQ.data?.transcripcionEpisodio ?? [];

  // Mientras renderiza, a mirar el progreso.
  const estadoRender = clip?.estadoRender as string | null | undefined;
  const renderEnCurso = estadoRender === "EN_COLA" || estadoRender === "RENDERIZANDO";
  const { startPolling, stopPolling } = clipQ;
  useEffect(() => {
    if (renderEnCurso) startPolling(4000);
    else stopPolling();
    return () => stopPolling();
  }, [renderEnCurso, startPolling, stopPolling]);

  const correccionDe = useMemo(() => {
    const m = new Map<number, string>();
    b?.correcciones.forEach((c) => m.set(Math.round(c.desde * 1000), c.texto));
    return m;
  }, [b?.correcciones]);

  if (!clip || !b || !ep || !estilo) {
    return (
      <DashboardLayout>
        {clipQ.error ? (
          <p className="text-red-400">{clipQ.error.message}</p>
        ) : (
          <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        )}
      </DashboardLayout>
    );
  }

  const cambiar = (parcial: Partial<Borrador>) => setB((prev) => (prev ? { ...prev, ...parcial } : prev));
  const duracion = b.hastaSeg - b.desdeSeg;
  const redondo = (n: number) => Math.round(n * 1000) / 1000;

  /**
   * Cambia el tramo del clip. Las posiciones del recorte están en segundos DEL
   * CLIP: si el inicio se corre, se corren al revés para seguir cayendo en el
   * mismo momento del video. Sin esto, extender el inicio 5 s adelantaría 5 s
   * cada cambio de encuadre.
   */
  function cambiarTramo(desde: number, hasta: number) {
    if (!b) return;
    const delta = desde - b.desdeSeg;
    let posiciones = b.posiciones;
    if (delta !== 0 && posiciones.length > 1) {
      const corridas = posiciones.map((p) => ({ ...p, desdeSeg: redondo(p.desdeSeg - delta) }));
      // La que queda rigiendo al principio pasa a ser la primera, en el 0.
      const antes = corridas.filter((p) => p.desdeSeg <= 0);
      const primera = antes.length ? antes[antes.length - 1] : corridas[0];
      posiciones = [
        { ...primera, desdeSeg: 0 },
        ...corridas.filter((p) => p.desdeSeg > 0 && p.desdeSeg < hasta - desde),
      ];
    }
    cambiar({ desdeSeg: redondo(desde), hastaSeg: redondo(hasta), posiciones });
  }

  function cambiarDiseno(d: DisenoClip) {
    if (!b || d === b.diseno) return;
    // Otro diseño tiene otra cantidad de recuadros: se arranca de cero.
    if (b.posiciones.length > 1 && !window.confirm("Cambiar el diseño borra los cambios de encuadre. ¿Seguir?")) {
      return;
    }
    cambiar({ diseno: d, posiciones: [] });
  }

  function tocarPalabra(p: Palabra) {
    if (!b || !opera) return;
    if (modo === "inicio") {
      cambiarTramo(p.desde, Math.max(b.hastaSeg, p.desde + 1));
    } else if (modo === "fin") {
      cambiarTramo(Math.min(b.desdeSeg, p.hasta - 1), p.hasta);
    } else {
      setCorrigiendo(p);
    }
  }

  function corregir(p: Palabra, texto: string | null) {
    if (!b) return;
    const clave = Math.round(p.desde * 1000);
    const resto = b.correcciones.filter((c) => Math.round(c.desde * 1000) !== clave);
    cambiar({ correcciones: texto === null ? resto : [...resto, { desde: p.desde, texto }] });
    setCorrigiendo(null);
  }

  async function pedirRender() {
    if (!marcaId) return;
    setError(null);
    try {
      await guardarAhora();
      await renderizar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar el video");
    }
  }

  const lineas: LineaSubtitulo[] = clip.lineasSubtitulo ?? [];

  return (
    <DashboardLayout>
      <Link href={`/episodios/${episodioId}`} className="text-sm text-white/50 hover:text-white/80">
        ← {ep.titulo}
      </Link>

      <div className="mb-5 mt-2 flex flex-wrap items-center justify-between gap-3">
        <input
          value={b.titulo}
          onChange={(e) => cambiar({ titulo: e.target.value })}
          disabled={!opera}
          className="min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none focus:underline"
        />
        <EstadoGuardado guardando={guardando} sinGuardar={sinGuardar} error={Boolean(error)} />
      </div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {ep.urlReproduccion ? (
        <EditorRecorte
          url={ep.urlReproduccion}
          desde={b.desdeSeg}
          hasta={b.hastaSeg}
          formato={b.formato}
          diseno={b.diseno}
          fondo={b.fondo}
          onCambiarFondo={(fondo) => cambiar({ fondo })}
          encuadre={b.encuadre}
          posicionesGuardadas={b.posiciones}
          onCambiarPosiciones={(posiciones) => cambiar({ posiciones })}
          lineas={lineas}
          textos={b.textos}
          onCambiarTextos={(textos) => cambiar({ textos })}
          textoElegido={textoElegido}
          onElegirTexto={setTextoElegido}
          estilo={estilo}
          puedeEditar={opera}
          duracionEpisodio={ep.duracionSeg ?? 0}
          onCambiarTramo={cambiarTramo}
          onCambiarFormato={(formato) => cambiar({ formato })}
          onCambiarDiseno={cambiarDiseno}
          debajoDeLaVista={
            <PanelExportar
              titulo={b.titulo}
              estado={estadoRender ?? null}
              progreso={clip.progresoRender ?? 0}
              error={clip.errorRender}
              urlVideo={clip.urlVideo}
              urlPoster={clip.urlPoster}
              // Hay cambios que el MP4 no tiene: sin guardar todavía, o
              // guardados después del último render.
              desactualizado={
                estadoRender === "LISTO" &&
                (sinGuardar ||
                  Boolean(clip.editadoEn && clip.renderizadoEn && new Date(clip.editadoEn) > new Date(clip.renderizadoEn)))
              }
              guardando={guardando || sinGuardar}
              pidiendo={pidiendoRender}
              puedeProcesar={opera}
              onProcesar={() => void pedirRender()}
            />
          }
        />
      ) : (
        <p className="text-sm text-white/50">El video todavía no está listo en Bunny.</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ---- Controles ---- */}
        <div className="space-y-5">
          <Seccion titulo="Tramo">
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  ["inicio", "Tocar = inicio"],
                  ["fin", "Tocar = fin"],
                  ["corregir", "Tocar = corregir palabra"],
                ] as const
              ).map(([m, texto]) => (
                <button
                  key={m}
                  onClick={() => setModo(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    modo === m ? "bg-white text-black" : "border border-white/15 text-white/70"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg bg-black/30 p-3 text-[15px] leading-8">
              {palabras.map((p) => {
                const mitad = (p.desde + p.hasta) / 2;
                const dentro = mitad >= b.desdeSeg && mitad <= b.hastaSeg;
                const corregida = correccionDe.get(Math.round(p.desde * 1000));
                return (
                  <button
                    key={p.desde}
                    onClick={() => tocarPalabra(p)}
                    title={`${p.desde.toFixed(2)} s`}
                    className={`mr-1 rounded px-0.5 transition ${
                      dentro ? "bg-ng-teal/20 text-white" : "text-white/35"
                    } hover:bg-white/20 ${corregida !== undefined ? "underline decoration-amber-400" : ""}`}
                  >
                    {corregida !== undefined ? corregida || "∅" : p.texto}
                  </button>
                );
              })}
            </div>
            {corrigiendo && (
              <Correccion
                palabra={corrigiendo}
                actual={correccionDe.get(Math.round(corrigiendo.desde * 1000))}
                onGuardar={(texto) => corregir(corrigiendo, texto)}
                onCancelar={() => setCorrigiendo(null)}
              />
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <AjusteFino
                etiqueta="Empieza"
                valor={b.desdeSeg}
                onCambio={(v) => cambiarTramo(Math.min(v, b.hastaSeg - 1), b.hastaSeg)}
                disabled={!opera}
              />
              <AjusteFino
                etiqueta="Termina"
                valor={b.hastaSeg}
                onCambio={(v) => cambiarTramo(b.desdeSeg, Math.max(v, b.desdeSeg + 1))}
                disabled={!opera}
              />
            </div>
            <p className="mt-2 text-xs text-white/45">Dura {duracion.toFixed(2)} s</p>
          </Seccion>
        </div>

        <div className="space-y-5">

          <Seccion titulo="Subtítulos">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={b.subtitulosActivos}
                onChange={(e) => cambiar({ subtitulosActivos: e.target.checked })}
                disabled={!opera}
              />
              Subtítulos con la palabra resaltada
            </label>
            <p className="mt-1 text-xs text-white/40">
              Para arreglar una palabra mal transcrita: “Tocar = corregir palabra” y tocala en el
              texto. Cambia el subtítulo, no el tiempo.
              {b.correcciones.length > 0 && ` ${b.correcciones.length} corregida(s).`}
            </p>
          </Seccion>

          <Seccion titulo="Textos">
            <PanelTextos
              textos={b.textos}
              onCambiar={(textos) => cambiar({ textos })}
              elegido={textoElegido}
              onElegir={setTextoElegido}
              duracion={duracion}
              colorMarca={estilo.colorResaltado}
              deshabilitado={!opera}
            />
          </Seccion>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">{titulo}</h2>
      {children}
    </section>
  );
}

/** Un tiempo con ajuste fino: ±50 ms con los botones, o al milisegundo tipeando. */
function AjusteFino({
  etiqueta,
  valor,
  onCambio,
  disabled,
}: {
  etiqueta: string;
  valor: number;
  onCambio: (v: number) => void;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState(valor.toFixed(3));
  useEffect(() => setTexto(valor.toFixed(3)), [valor]);
  return (
    <div>
      <p className="mb-1 text-xs text-white/50">{etiqueta} (s del episodio)</p>
      <div className="flex items-center gap-1">
        <button disabled={disabled} onClick={() => onCambio(valor - 0.05)} className="rounded border border-white/15 px-2 py-1 text-xs">
          −50ms
        </button>
        <input
          value={texto}
          disabled={disabled}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const n = parseFloat(texto.replace(",", "."));
            if (Number.isFinite(n)) onCambio(n);
            else setTexto(valor.toFixed(3));
          }}
          className="w-24 rounded border border-white/15 bg-black/30 px-2 py-1 text-center text-xs tabular-nums"
        />
        <button disabled={disabled} onClick={() => onCambio(valor + 0.05)} className="rounded border border-white/15 px-2 py-1 text-xs">
          +50ms
        </button>
      </div>
    </div>
  );
}

function Correccion({
  palabra,
  actual,
  onGuardar,
  onCancelar,
}: {
  palabra: Palabra;
  actual?: string;
  onGuardar: (texto: string | null) => void;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(actual ?? palabra.texto);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm">
      <span className="text-white/50">
        “{palabra.texto}” en {palabra.desde.toFixed(2)} s →
      </span>
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onGuardar(texto.trim() === palabra.texto ? null : texto)}
        maxLength={60}
        className="rounded border border-white/15 bg-black/30 px-2 py-1"
      />
      <button onClick={() => onGuardar(texto.trim() === palabra.texto ? null : texto)} className="rounded bg-white px-2 py-1 text-xs text-black">
        Guardar
      </button>
      <button onClick={() => onGuardar("")} className="rounded border border-white/15 px-2 py-1 text-xs">
        Quitar del subtítulo
      </button>
      {actual !== undefined && (
        <button onClick={() => onGuardar(null)} className="rounded border border-white/15 px-2 py-1 text-xs">
          Volver al original
        </button>
      )}
      <button onClick={onCancelar} className="text-xs text-white/40">
        Cancelar
      </button>
    </div>
  );
}
