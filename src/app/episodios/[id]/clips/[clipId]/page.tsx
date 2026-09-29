"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  VistaPreviaClip,
  type EstiloClip,
  type LineaSubtitulo,
} from "@/components/episodios/VistaPreviaClip";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { ZOOM_MAXIMO, type Encuadre, type FormatoClip } from "@/lib/clip-encuadre";

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
  subtitulosActivos: boolean;
  correcciones: { desde: number; texto: string }[];
  gancho: string;
  ganchoActivo: boolean;
  ganchoSeg: number;
}

const FORMATOS: { valor: FormatoClip; etiqueta: string; para: string }[] = [
  { valor: "VERTICAL", etiqueta: "9:16", para: "Reels, TikTok, Shorts" },
  { valor: "CUADRADO", etiqueta: "1:1", para: "Feed" },
  { valor: "HORIZONTAL", etiqueta: "16:9", para: "YouTube" },
];

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

  // El borrador arranca del clip UNA vez. Después manda lo que se edita acá:
  // pisarlo con cada respuesta del servidor borraría lo que se está tipeando.
  useEffect(() => {
    if (!clip || b) return;
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
      subtitulosActivos: clip.subtitulosActivos,
      correcciones: clip.correcciones.map((c: { desde: number; texto: string }) => ({
        desde: c.desde,
        texto: c.texto,
      })),
      gancho: clip.gancho ?? "",
      ganchoActivo: clip.ganchoActivo,
      ganchoSeg: clip.ganchoSeg,
    });
  }, [clip, b]);

  // Guardado automático, medio segundo después del último cambio.
  const primera = useRef(true);
  useEffect(() => {
    if (!b || !marcaId || !opera) return;
    if (primera.current) {
      primera.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setGuardando(true);
      setError(null);
      try {
        await actualizar({
          variables: {
            id: clipId,
            marcaId,
            input: {
              desdeSeg: b.desdeSeg,
              hastaSeg: b.hastaSeg,
              titulo: b.titulo,
              formato: b.formato,
              encuadre: b.encuadre,
              subtitulosActivos: b.subtitulosActivos,
              correcciones: b.correcciones,
              gancho: b.gancho,
              ganchoActivo: b.ganchoActivo,
              ganchoSeg: b.ganchoSeg,
            },
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      } finally {
        setGuardando(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [b, marcaId, opera, clipId, actualizar]);

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

  function tocarPalabra(p: Palabra) {
    if (!b || !opera) return;
    if (modo === "inicio") {
      cambiar({ desdeSeg: p.desde, hastaSeg: Math.max(b.hastaSeg, p.desde + 1) });
    } else if (modo === "fin") {
      cambiar({ hastaSeg: p.hasta, desdeSeg: Math.min(b.desdeSeg, p.hasta - 1) });
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
      await renderizar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo pedir el render");
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
        <span className="text-xs text-white/40">
          {guardando ? "Guardando…" : error ? "" : "Guardado"}
        </span>
      </div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* ---- Vista previa y render ---- */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {ep.urlReproduccion && (
            <VistaPreviaClip
              url={ep.urlReproduccion}
              desde={b.desdeSeg}
              hasta={b.hastaSeg}
              formato={b.formato}
              encuadre={b.encuadre}
              lineas={lineas}
              gancho={{ texto: b.gancho, activo: b.ganchoActivo, seg: b.ganchoSeg }}
              estilo={estilo}
            />
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                {estadoRender === "LISTO" && <span className="text-[#0FED9D]">MP4 listo</span>}
                {estadoRender === "EN_COLA" && <span className="text-sky-300">En la fila de renders…</span>}
                {estadoRender === "RENDERIZANDO" && (
                  <span className="text-sky-300">Renderizando · {clip.progresoRender ?? 0}%</span>
                )}
                {estadoRender === "FALLIDO" && <span className="text-red-400">El render falló</span>}
                {!estadoRender && <span className="text-white/50">Todavía no se renderizó</span>}
              </div>
              {opera && (
                <button
                  onClick={() => void pedirRender()}
                  disabled={renderEnCurso || pidiendoRender || guardando}
                  className="rounded-lg bg-[#0FED9D] px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
                >
                  {estadoRender === "LISTO" ? "Renderizar de nuevo" : "Renderizar MP4"}
                </button>
              )}
            </div>
            {estadoRender === "FALLIDO" && clip.errorRender && (
              <p className="mt-2 text-xs text-red-400">{clip.errorRender}</p>
            )}
            {estadoRender === "LISTO" && clip.urlVideo && (
              <div className="mt-3 space-y-2">
                {clip.editadoEn &&
                  clip.renderizadoEn &&
                  new Date(clip.editadoEn) > new Date(clip.renderizadoEn) && (
                    <p className="text-xs text-amber-300">
                      Cambiaste el clip después del último render: el MP4 no tiene esos cambios.
                    </p>
                  )}
                <video
                  src={clip.urlVideo}
                  poster={clip.urlPoster ?? undefined}
                  controls
                  className="max-h-[50vh] w-full rounded-lg bg-black"
                />
                <a href={clip.urlVideo} target="_blank" rel="noreferrer" className="text-xs text-[#0FED9D]">
                  Abrir el MP4
                </a>
              </div>
            )}
          </div>
        </div>

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
                      dentro ? "bg-[#0FED9D]/20 text-white" : "text-white/35"
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
                onCambio={(v) => cambiar({ desdeSeg: redondo(Math.min(v, b.hastaSeg - 1)) })}
                disabled={!opera}
              />
              <AjusteFino
                etiqueta="Termina"
                valor={b.hastaSeg}
                onCambio={(v) => cambiar({ hastaSeg: redondo(Math.max(v, b.desdeSeg + 1)) })}
                disabled={!opera}
              />
            </div>
            <p className="mt-2 text-xs text-white/45">Dura {duracion.toFixed(2)} s</p>
          </Seccion>

          <Seccion titulo="Formato y encuadre">
            <div className="mb-3 flex flex-wrap gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f.valor}
                  onClick={() => cambiar({ formato: f.valor })}
                  disabled={!opera}
                  className={`rounded-lg px-3 py-1.5 text-left text-xs ${
                    b.formato === f.valor ? "bg-white text-black" : "border border-white/15 text-white/70"
                  }`}
                >
                  <span className="font-semibold">{f.etiqueta}</span> · {f.para}
                </button>
              ))}
            </div>
            <Deslizador
              etiqueta="Izquierda ↔ derecha"
              valor={b.encuadre.centroX}
              min={0}
              max={1}
              onCambio={(v) => cambiar({ encuadre: { ...b.encuadre, centroX: v } })}
              disabled={!opera}
            />
            <Deslizador
              etiqueta="Arriba ↕ abajo"
              valor={b.encuadre.centroY}
              min={0}
              max={1}
              onCambio={(v) => cambiar({ encuadre: { ...b.encuadre, centroY: v } })}
              disabled={!opera}
            />
            <Deslizador
              etiqueta={`Zoom ${b.encuadre.zoom.toFixed(2)}×`}
              valor={b.encuadre.zoom}
              min={1}
              max={ZOOM_MAXIMO}
              onCambio={(v) => cambiar({ encuadre: { ...b.encuadre, zoom: v } })}
              disabled={!opera}
            />
            <p className="mt-1 text-xs text-white/40">
              El encuadre es fijo durante todo el clip. Que siga solo a quien habla viene después.
            </p>
          </Seccion>

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

          <Seccion titulo="Gancho">
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={b.ganchoActivo}
                onChange={(e) => cambiar({ ganchoActivo: e.target.checked })}
                disabled={!opera}
              />
              Texto en pantalla al principio
            </label>
            <input
              value={b.gancho}
              onChange={(e) => cambiar({ gancho: e.target.value })}
              placeholder="Lo que tiene que leer quien pasa deslizando"
              maxLength={140}
              disabled={!opera}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <Deslizador
              etiqueta={`Dura ${b.ganchoSeg.toFixed(1)} s`}
              valor={b.ganchoSeg}
              min={0.5}
              max={10}
              paso={0.5}
              onCambio={(v) => cambiar({ ganchoSeg: v })}
              disabled={!opera}
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

function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  paso = 0.01,
  onCambio,
  disabled,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  onCambio: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="mt-2 block text-xs text-white/60">
      {etiqueta}
      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        disabled={disabled}
        onChange={(e) => onCambio(parseFloat(e.target.value))}
        className="mt-1 block w-full"
      />
    </label>
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
