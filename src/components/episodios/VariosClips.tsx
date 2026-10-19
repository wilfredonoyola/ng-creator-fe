"use client";

import { useMemo, useState, type RefObject } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLazyQuery, useMutation } from "@apollo/client";
import { BUSCAR_MOMENTOS_EPISODIO, CREAR_CLIPS_EPISODIO } from "@/graphql/operations";
import type { ControlReproductor } from "@/components/ReproductorEpisodio";
import type { FormatoClip } from "@/lib/clip-encuadre";
import { leerTiempo, tiempo } from "@/components/episodios/CrearClipGuiado";
import { EtiquetaBeta } from "@/components/episodios/editor/ui";

/**
 * "Varios clips" (#221): sacar de una vez varios clips de un episodio, por
 * ejemplo de un webinar.
 * - Con la IA: la persona dice qué busca ("un clip por cada tema"), la IA
 *   propone momentos y se eligen cuáles crear.
 * - Con una lista: se pegan los tramos, uno por línea (los que manda el
 *   cliente, o los que marcó alguien mirando el video).
 * Se crean todos juntos, a nombre de quien los pide, y quedan en "Manuales".
 * Lo mismo que la app (VariosClips).
 */

type Momento = {
  desdeSeg: number;
  hastaSeg: number;
  puntuacion: number;
  titulo: string;
  explicacion: string;
  gancho: string | null;
  texto: string;
  clipId: string | null;
};

export const MAXIMO_CLIPS = 20;
const MAXIMO_SEG = 180;
const EJEMPLOS = ["porTema", "consejos", "preguntas", "frases"] as const;
const FORMATOS: { valor: FormatoClip; etiqueta: string }[] = [
  { valor: "VERTICAL", etiqueta: "9:16" },
  { valor: "CUADRADO", etiqueta: "1:1" },
  { valor: "HORIZONTAL", etiqueta: "16:9" },
];

export type LineaTramo =
  | { n: number; tramo: { desdeSeg: number; hastaSeg: number; titulo?: string } }
  | { n: number; error: "formato" | "alReves" | "largo" | "fuera" };

const TIEMPO = String.raw`\d+(?::\d{1,2}){0,2}(?:[.,]\d+)?`;
const LINEA = new RegExp(
  String.raw`^(?:[-•*]\s*|\d+[.)]\s+)?(${TIEMPO})(?:\s*[-–—→]\s*|\s+(?:a|to|hasta)\s+|\s+)(${TIEMPO})\s*(?:[-–—:|]\s*)?(.*)$`,
  "i",
);

/**
 * Los tramos pegados, uno por línea: "1:02:30 - 1:03:40 Título", también con
 * "–", "a", "to" o solo un espacio, y con viñeta o número adelante. El título
 * es opcional. Las líneas vacías no cuentan.
 */
export function leerTramos(texto: string, duracionEpisodio: number): LineaTramo[] {
  return texto
    .split("\n")
    .map((linea, i) => ({ linea: linea.trim(), n: i + 1 }))
    .filter((x) => x.linea)
    .map(({ linea, n }): LineaTramo => {
      const m = LINEA.exec(linea);
      const desde = m ? leerTiempo(m[1]) : null;
      const hasta = m ? leerTiempo(m[2]) : null;
      if (!m || desde === null || hasta === null) return { n, error: "formato" };
      if (hasta - desde < 1) return { n, error: "alReves" };
      if (hasta - desde > MAXIMO_SEG) return { n, error: "largo" };
      if (duracionEpisodio && desde >= duracionEpisodio) return { n, error: "fuera" };
      const titulo = m[3].trim().slice(0, 120);
      return { n, tramo: { desdeSeg: desde, hastaSeg: duracionEpisodio ? Math.min(hasta, duracionEpisodio) : hasta, ...(titulo ? { titulo } : {}) } };
    });
}

export function VariosClips({
  episodioId,
  marcaId,
  duracionEpisodio,
  reproductor,
  onCerrar,
  onCreados,
}: {
  episodioId: string;
  marcaId: string;
  duracionEpisodio: number;
  reproductor?: RefObject<ControlReproductor | null>;
  onCerrar: () => void;
  onCreados: (cuantos: number) => void;
}) {
  const t = useTranslations("variosClips");
  const [modo, setModo] = useState<"ia" | "lista">("ia");
  const [instruccion, setInstruccion] = useState("");
  const [lista, setLista] = useState("");
  // Los momentos de la IA: cuáles se crean y con qué título.
  const [elegidos, setElegidos] = useState<Set<number>>(new Set());
  const [titulos, setTitulos] = useState<Record<number, string>>({});
  const [formato, setFormato] = useState<FormatoClip>("VERTICAL");
  const [autoEncuadre, setAutoEncuadre] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buscar, buscarQ] = useLazyQuery(BUSCAR_MOMENTOS_EPISODIO, { fetchPolicy: "no-cache" });
  const momentos: Momento[] = useMemo(() => buscarQ.data?.buscarMomentosEpisodio ?? [], [buscarQ.data]);
  const [crear, { loading: creando }] = useMutation(CREAR_CLIPS_EPISODIO);

  const lineas = useMemo(() => leerTramos(lista, duracionEpisodio), [lista, duracionEpisodio]);
  const conError = lineas.filter((l) => "error" in l);

  const tramos =
    modo === "ia"
      ? momentos
          .map((m, i) => ({ m, i }))
          .filter(({ i }) => elegidos.has(i))
          .map(({ m, i }) => ({
            desdeSeg: m.desdeSeg,
            hastaSeg: m.hastaSeg,
            titulo: (titulos[i] ?? m.titulo).trim() || undefined,
            gancho: m.gancho || undefined,
            explicacion: m.explicacion || undefined,
          }))
      : lineas.flatMap((l) => ("tramo" in l ? [l.tramo] : []));
  const demasiados = tramos.length > MAXIMO_CLIPS;
  const puedeCrear = tramos.length > 0 && !demasiados && (modo === "ia" || conError.length === 0);

  async function pedirMomentos() {
    setError(null);
    const r = await buscar({ variables: { episodioId, marcaId, instruccion: instruccion.trim() } });
    if (r.error) {
      setError(r.error.message);
      return;
    }
    const lista: Momento[] = r.data?.buscarMomentosEpisodio ?? [];
    // Se proponen todos menos los que ya son un clip.
    setElegidos(new Set(lista.flatMap((m, i) => (m.clipId ? [] : [i])).slice(0, MAXIMO_CLIPS)));
    setTitulos({});
  }

  function alternar(i: number) {
    setElegidos((s) => {
      const nuevo = new Set(s);
      if (nuevo.has(i)) nuevo.delete(i);
      else nuevo.add(i);
      return nuevo;
    });
  }

  async function crearTodos() {
    setError(null);
    try {
      const r = await crear({ variables: { input: { marcaId, episodioId, tramos, formato, autoEncuadre } } });
      onCreados(r.data?.crearClipsEpisodio?.length ?? tramos.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorCrear"));
    }
  }

  const textoError = (e: "formato" | "alReves" | "largo" | "fuera") => t(`lista.errores.${e}`);

  return (
    <div className="rounded-xl border border-ng-violeta/40 bg-ng-violeta/[0.06] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          {t("titulo")} <EtiquetaBeta />
        </h2>
        <button onClick={onCerrar} className="text-white/40 hover:text-white/80" title={t("cerrar")}>
          ✕
        </button>
      </div>

      <div role="tablist" className="mb-4 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(["ia", "lista"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => {
              setModo(m);
              setError(null);
            }}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
              modo === m ? "bg-white/10 font-semibold text-white" : "text-white/55 hover:text-white/80"
            }`}
          >
            {t(`modos.${m}`)}
          </button>
        ))}
      </div>

      {modo === "ia" && (
        <div className="space-y-3">
          <p className="text-sm text-white/70">{t("ia.pregunta")}</p>
          <textarea
            value={instruccion}
            onChange={(e) => setInstruccion(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t("ia.ejemplo")}
            className="w-full resize-y rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-ng-violeta"
          />
          <div className="flex flex-wrap gap-1.5 text-xs">
            {EJEMPLOS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setInstruccion(t(`ia.ejemplos.${e}`))}
                className="rounded-full border border-white/15 px-2.5 py-1 text-white/70 hover:bg-white/5"
              >
                {t(`ia.ejemplos.${e}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void pedirMomentos()}
            disabled={buscarQ.loading || instruccion.trim().length < 3}
            className="w-full rounded-lg border border-ng-violeta/60 px-3 py-2 text-sm font-medium text-white hover:bg-ng-violeta/10 disabled:opacity-50"
          >
            {buscarQ.loading ? t("ia.buscando") : momentos.length ? t("ia.buscarOtraVez") : t("ia.buscar")}
          </button>
          {buscarQ.loading && <p className="text-xs text-white/45">{t("ia.tarda")}</p>}
          {buscarQ.called && !buscarQ.loading && !buscarQ.error && !momentos.length && (
            <p className="text-sm text-white/55">{t("ia.ninguno")}</p>
          )}
          {momentos.length > 0 && !buscarQ.loading && (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {momentos.map((m, i) => {
                const marcado = elegidos.has(i);
                return (
                  <li
                    key={`${m.desdeSeg}-${m.hastaSeg}`}
                    className={`rounded-lg border p-2.5 text-sm ${marcado ? "border-ng-violeta/60 bg-black/25" : "border-white/10 bg-black/10"}`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternar(i)}
                        aria-label={t("ia.elegir", { titulo: titulos[i] ?? m.titulo })}
                        className="mt-1.5"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <input
                          value={titulos[i] ?? m.titulo}
                          onChange={(e) => setTitulos((x) => ({ ...x, [i]: e.target.value }))}
                          maxLength={120}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-medium outline-none hover:border-white/15 focus:border-ng-violeta"
                        />
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs text-white/50">
                          <span className="tabular-nums">
                            {tiempo(m.desdeSeg)} → {tiempo(m.hastaSeg)} · {Math.round(m.hastaSeg - m.desdeSeg)} s
                          </span>
                          {reproductor && (
                            <button
                              type="button"
                              onClick={() => reproductor.current?.reproducirTramo(m.desdeSeg, m.hastaSeg)}
                              className="text-ng-celeste hover:underline"
                            >
                              {t("escuchar")}
                            </button>
                          )}
                          {m.clipId && (
                            <Link href={`/episodios/${episodioId}/clips/${m.clipId}`} className="rounded bg-amber-300/15 px-1.5 py-0.5 text-amber-200 hover:underline">
                              {t("ia.yaEsClip")}
                            </Link>
                          )}
                        </p>
                        {m.explicacion && <p className="px-1 text-xs text-white/60">{m.explicacion}</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {modo === "lista" && (
        <div className="space-y-3">
          <p className="text-sm text-white/70">{t("lista.pregunta")}</p>
          <textarea
            value={lista}
            onChange={(e) => setLista(e.target.value)}
            rows={6}
            placeholder={t("lista.ejemplo")}
            className="w-full resize-y rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm outline-none focus:border-ng-violeta"
          />
          {lineas.length > 0 && (
            <ul className="max-h-60 space-y-1 overflow-y-auto text-xs">
              {lineas.map((l) =>
                "tramo" in l ? (
                  <li key={l.n} className="flex items-center gap-2 text-white/70">
                    <span className="text-emerald-400">✓</span>
                    <span className="tabular-nums">
                      {tiempo(l.tramo.desdeSeg)} → {tiempo(l.tramo.hastaSeg)}
                    </span>
                    <span className="truncate text-white/50">{l.tramo.titulo ?? t("lista.tituloIa")}</span>
                    {reproductor && (
                      <button
                        type="button"
                        onClick={() => reproductor.current?.reproducirTramo(l.tramo.desdeSeg, l.tramo.hastaSeg)}
                        className="ml-auto shrink-0 text-ng-celeste hover:underline"
                      >
                        {t("escuchar")}
                      </button>
                    )}
                  </li>
                ) : (
                  <li key={l.n} className="text-red-400">
                    {t("lista.linea", { n: l.n })}: {textoError(l.error)}
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}

      {tramos.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/60">{t("formato")}</span>
            {FORMATOS.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFormato(f.valor)}
                className={`rounded-lg border px-2.5 py-1 text-sm ${formato === f.valor ? "border-ng-azul bg-ng-azul/10" : "border-white/10 hover:border-white/25"}`}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" checked={autoEncuadre} onChange={(e) => setAutoEncuadre(e.target.checked)} className="mt-1" />
            <span>{t("autoEncuadre")}</span>
          </label>
        </div>
      )}
      {demasiados && <p className="mt-3 text-sm text-red-400">{t("demasiados", { maximo: MAXIMO_CLIPS })}</p>}
      {modo === "lista" && conError.length > 0 && <p className="mt-3 text-sm text-red-400">{t("lista.corregir")}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {(tramos.length > 0 || (modo === "lista" && lineas.length > 0)) && (
        <button
          type="button"
          onClick={() => void crearTodos()}
          disabled={creando || !puedeCrear}
          className="mt-3 w-full rounded-lg bg-ng-violeta px-3 py-2 text-sm font-medium text-ng-tinta hover:brightness-110 disabled:opacity-50"
        >
          {creando ? t("creando") : t("crear", { n: tramos.length })}
        </button>
      )}
    </div>
  );
}
