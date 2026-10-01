"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { BUSCAR_EN_EPISODIO, CREAR_CLIP_EPISODIO, TRANSCRIPCION_EPISODIO } from "@/graphql/operations";
import type { ControlReproductor } from "@/components/ReproductorEpisodio";
import type { FormatoClip } from "@/lib/clip-encuadre";
import { useSesion } from "@/lib/sesion";
import { AvisoCruces, buscarCruces, type CruceClip } from "@/components/episodios/TomarClip";

/**
 * "Crear clip" guiado, en tres pasos y con el episodio a la vista:
 * 1. el momento (buscando una frase o desde donde está el video),
 * 2. dónde empieza y termina, tocando las palabras,
 * 3. título, formato y si ya sale auto-encuadrado.
 * Lo mismo que la app (CrearClip).
 */

type Palabra = { texto: string; desde: number; hasta: number };
type Coincidencia = { desdeSeg: number; hastaSeg: number; antes: string; frase: string; despues: string };

const MAXIMO_SEG = 180;
const DURACIONES = [15, 30, 45, 60];
const FORMATOS: { valor: FormatoClip; etiqueta: string; detalle: string }[] = [
  { valor: "VERTICAL", etiqueta: "9:16", detalle: "Reels, TikTok, Shorts" },
  { valor: "CUADRADO", etiqueta: "1:1", detalle: "Feed" },
  { valor: "HORIZONTAL", etiqueta: "16:9", detalle: "YouTube" },
];

export function tiempo(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

function useDemorado<T>(valor: T, ms: number): T {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return v;
}

export function CrearClipGuiado({
  episodioId,
  marcaId,
  duracionEpisodio,
  reproductor,
  onCerrar,
}: {
  episodioId: string;
  marcaId: string;
  duracionEpisodio: number;
  reproductor: RefObject<ControlReproductor | null>;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [busqueda, setBusqueda] = useState("");
  const texto = useDemorado(busqueda.trim(), 350);
  const [desde, setDesde] = useState(0);
  const [hasta, setHasta] = useState(30);
  const [marcando, setMarcando] = useState<"inicio" | "fin">("inicio");
  const [titulo, setTitulo] = useState("");
  const [formato, setFormato] = useState<FormatoClip>("VERTICAL");
  const [autoEncuadre, setAutoEncuadre] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cliente = useApolloClient();
  const { usuario } = useSesion();
  // Otros clips que ya cubren este tramo (#70): se avisa antes de crear, no se frena.
  const [cruces, setCruces] = useState<CruceClip[] | null>(null);
  const [revisando, setRevisando] = useState(false);
  useEffect(() => setCruces(null), [desde, hasta]);

  const buscarQ = useQuery(BUSCAR_EN_EPISODIO, {
    variables: { id: episodioId, marcaId, texto },
    skip: texto.length < 3,
  });
  const coincidencias: Coincidencia[] = texto.length < 3 ? [] : (buscarQ.data?.buscarEnEpisodio ?? []);

  // Las palabras alrededor del clip, para marcar inicio y fin tocándolas. La
  // ventana queda fija mientras se ajusta (si no, se recargaría a cada toque) y
  // se agranda solo si el clip se sale.
  const [ventana, setVentana] = useState({ desde: 0, hasta: 0 });
  const palabrasQ = useQuery(TRANSCRIPCION_EPISODIO, {
    variables: { id: episodioId, marcaId, desdeSeg: ventana.desde, hastaSeg: ventana.hasta },
    skip: paso === 1,
  });
  const palabras: Palabra[] = useMemo(() => palabrasQ.data?.transcripcionEpisodio ?? [], [palabrasQ.data]);
  const dentro = palabras.filter((p) => p.desde >= desde - 0.05 && p.hasta <= hasta + 0.05);
  const textoDelClip = dentro.map((p) => p.texto.trim()).join(" ");

  const [crear, { loading: creando }] = useMutation(CREAR_CLIP_EPISODIO);
  const duracion = hasta - desde;

  function cubrir(d: number, h: number) {
    setVentana((v) =>
      d >= v.desde + 2 && h <= v.hasta - 2 && v.hasta > v.desde
        ? v
        : { desde: Math.max(0, d - 20), hasta: Math.min(duracionEpisodio || h + 120, h + 120) },
    );
  }
  useEffect(() => cubrir(desde, hasta), [desde, hasta]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Del paso 1 al 2: arranca un poco antes de la frase, que se entienda de qué hablan. */
  function elegir(inicio: number, fin?: number) {
    const d = Math.max(0, Math.round((inicio - 2) * 10) / 10);
    setDesde(d);
    setHasta(Math.min(duracionEpisodio || Infinity, Math.max(d + 30, (fin ?? 0) + 3)));
    setMarcando("fin");
    setPaso(2);
    reproductor.current?.reproducirTramo(d, d + 30);
  }

  function tocarPalabra(p: Palabra) {
    if (marcando === "inicio") {
      setDesde(p.desde);
      if (hasta - p.desde < 1 || hasta - p.desde > MAXIMO_SEG) setHasta(Math.min(p.desde + 30, duracionEpisodio || Infinity));
      setMarcando("fin");
    } else {
      if (p.hasta <= desde + 1) {
        setDesde(p.desde);
        return;
      }
      setHasta(Math.min(p.hasta, desde + MAXIMO_SEG));
    }
  }

  function conDuracion(seg: number) {
    // Termina al final de la última palabra que entra, no a mitad de una.
    const tope = desde + seg;
    const ultima = [...palabras].reverse().find((p) => p.hasta <= tope + 0.5 && p.hasta > desde);
    setHasta(Math.min(duracionEpisodio || Infinity, ultima && tope - ultima.hasta < 2 ? ultima.hasta : tope));
  }

  /** Antes de crear, se mira si el tramo pisa otro clip. Sin cruces, sigue directo. */
  async function revisarYCrear() {
    setError(null);
    setRevisando(true);
    const encontrados = await buscarCruces(cliente, { episodioId, marcaId, desdeSeg: desde, hastaSeg: hasta });
    setRevisando(false);
    if (encontrados.length) {
      setCruces(encontrados);
      return;
    }
    await crearYEditar();
  }

  async function crearYEditar() {
    setError(null);
    setCruces(null);
    try {
      const r = await crear({
        variables: {
          input: { marcaId, episodioId, desdeSeg: desde, hastaSeg: hasta, titulo: titulo.trim() || undefined, formato, autoEncuadre },
        },
      });
      router.push(`/episodios/${episodioId}/clips/${r.data.crearClipEpisodio._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el clip");
    }
  }

  return (
    <div className="rounded-xl border border-ng-violeta/40 bg-ng-violeta/[0.06] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Crear un clip</h2>
        <button onClick={onCerrar} className="text-white/40 hover:text-white/80" title="Cerrar">
          ✕
        </button>
      </div>

      <ol className="mb-4 flex items-center gap-2 text-xs">
        {["El momento", "Inicio y fin", "Crear"].map((nombre, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const hecho = n < paso;
          return (
            <li key={nombre} className="flex flex-1 items-center gap-2">
              <button
                disabled={n > paso}
                onClick={() => setPaso(n)}
                className={`flex items-center gap-1.5 ${n === paso ? "text-white" : hecho ? "text-white/70 hover:text-white" : "text-white/35"}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    hecho ? "bg-emerald-500" : n === paso ? "bg-ng-violeta" : "border border-white/20"
                  }`}
                >
                  {hecho ? "✓" : n}
                </span>
                {nombre}
              </button>
              {n < 3 && <span className="h-px flex-1 bg-white/10" />}
            </li>
          );
        })}
      </ol>

      {paso === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-white/70">¿Qué se dice en el momento que querés? Escribí unas palabras.</p>
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej.: no lleves mujeres a tu casa"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-ng-violeta"
          />
          {texto.length >= 3 && (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {buscarQ.loading && <p className="text-xs text-white/40">Buscando…</p>}
              {!buscarQ.loading && !coincidencias.length && (
                <p className="text-xs text-white/50">No encontré esa frase. Probá con otras palabras o elegí el momento en el video.</p>
              )}
              {coincidencias.map((c) => (
                <button
                  key={c.desdeSeg}
                  onClick={() => elegir(c.desdeSeg, c.hastaSeg)}
                  className="block w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-left text-sm hover:border-ng-violeta/60"
                >
                  <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5 text-xs tabular-nums text-white/70">{tiempo(c.desdeSeg)}</span>
                  <span className="text-white/50">…{c.antes} </span>
                  <mark className="rounded bg-ng-violeta/40 px-0.5 text-white">{c.frase}</mark>
                  <span className="text-white/50"> {c.despues}…</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 pt-1 text-xs text-white/40">
            <span className="h-px flex-1 bg-white/10" />o<span className="h-px flex-1 bg-white/10" />
          </div>
          <button
            onClick={() => elegir((reproductor.current?.tiempoActual() ?? 0) + 2)}
            className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            ▶ Empezar donde está el video ({tiempo(reproductor.current?.tiempoActual() ?? 0)})
          </button>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="tabular-nums">
              {tiempo(desde)} → {tiempo(hasta)} · <b>{duracion.toFixed(1)} s</b>
            </span>
            <button
              onClick={() => reproductor.current?.reproducirTramo(desde, hasta)}
              className="rounded-lg bg-ng-violeta px-3 py-1 text-xs font-medium text-white hover:brightness-110"
            >
              ▶ Escuchar el clip
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {DURACIONES.map((d) => (
              <button
                key={d}
                onClick={() => conDuracion(d)}
                className={`rounded-lg border px-2.5 py-1 ${Math.abs(duracion - d) < 2 ? "border-ng-violeta text-white" : "border-white/15 text-white/70 hover:bg-white/5"}`}
              >
                {d} s
              </button>
            ))}
            <button
              onClick={() => setDesde((d) => Math.max(0, Math.round((d - 5) * 10) / 10))}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-white/70 hover:bg-white/5"
              title="Arranca 5 s antes: más contexto"
            >
              ← Más contexto
            </button>
          </div>
          <div className="flex gap-2 text-xs">
            {(["inicio", "fin"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarcando(m)}
                className={`flex-1 rounded-lg border px-2 py-1.5 ${marcando === m ? "border-amber-300 bg-amber-300/10 text-white" : "border-white/15 text-white/60"}`}
              >
                Tocá la palabra donde {m === "inicio" ? "empieza" : "termina"}
              </button>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg bg-black/25 p-3 text-sm leading-7">
            {palabrasQ.loading && !palabras.length && <span className="text-white/40">Cargando la transcripción…</span>}
            {palabras.map((p) => {
              const adentro = p.desde >= desde - 0.05 && p.hasta <= hasta + 0.05;
              const borde = Math.abs(p.desde - desde) < 0.06 || Math.abs(p.hasta - hasta) < 0.06;
              return (
                <button
                  key={p.desde}
                  onClick={() => tocarPalabra(p)}
                  className={`mr-1 rounded px-0.5 ${adentro ? "bg-ng-violeta/30 text-white" : "text-white/40 hover:text-white/70"} ${borde ? "ring-1 ring-amber-300" : ""}`}
                >
                  {p.texto}
                </button>
              );
            })}
          </div>
          {duracion > MAXIMO_SEG && <p className="text-xs text-red-400">Un clip puede durar hasta 3 minutos.</p>}
          <button
            disabled={duracion < 1 || duracion > MAXIMO_SEG}
            onClick={() => {
              if (!titulo) setTitulo(textoDelClip.slice(0, 60));
              setPaso(3);
            }}
            className="w-full rounded-lg bg-ng-violeta px-3 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-white/60">Título</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-ng-violeta"
            />
          </label>
          <div>
            <span className="mb-1 block text-sm text-white/60">Formato</span>
            <div className="grid grid-cols-3 gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f.valor}
                  onClick={() => setFormato(f.valor)}
                  className={`rounded-lg border px-2 py-2 text-center ${formato === f.valor ? "border-ng-azul bg-ng-azul/10" : "border-white/10 hover:border-white/25"}`}
                >
                  <span className="block text-sm font-medium">{f.etiqueta}</span>
                  <span className="block text-[11px] text-white/45">{f.detalle}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" checked={autoEncuadre} onChange={(e) => setAutoEncuadre(e.target.checked)} className="mt-1" />
            <span>
              ✨ Auto-encuadre
              <span className="block text-xs text-white/50">Sigue al que habla. Tarda un minuto; mientras, podés editar textos y subtítulos.</span>
            </span>
          </label>
          <p className="text-xs text-white/50">
            {tiempo(desde)} → {tiempo(hasta)} ({duracion.toFixed(1)} s)
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {cruces ? (
            <AvisoCruces
              cruces={cruces}
              usuarioId={usuario?._id}
              textoSeguir={creando ? "Creando…" : "Crear igual"}
              onSeguir={() => void crearYEditar()}
              onCancelar={() => setCruces(null)}
            />
          ) : (
            <button
              onClick={() => void revisarYCrear()}
              disabled={creando || revisando}
              className="w-full rounded-lg bg-ng-violeta px-3 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              {creando ? "Creando…" : revisando ? "Revisando…" : "Crear y abrir el editor"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
