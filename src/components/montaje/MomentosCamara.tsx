"use client";

import { useState } from "react";
import { uploadCamara } from "@/lib/upload";
import {
  LIMITE_REEL_SEG,
  PLANTILLAS,
  duracionFinal,
  grabacionNecesaria,
  type Camara,
  type Momento,
  type PosicionCamara,
} from "@/lib/montaje";

/**
 * Los momentos en que aparece la cámara propia.
 *
 * Nada se agrega solo: cada fila la pone quien edita, con los botones de
 * arriba. Las plantillas llenan la lista como atajo y después se borra o se
 * cambia lo que no sirva.
 *
 * Muestra la duración final todo el tiempo porque las pausas suman: descubrir
 * que el video quedó en 96 segundos después de esperar el render son minutos
 * tirados, y el tope de un Reel son 90.
 */
export function MomentosCamara({
  camara,
  momentos,
  duracionBase,
  onCamara,
  onMomentos,
}: {
  camara: Camara | null;
  momentos: Momento[];
  duracionBase: number;
  onCamara: (c: Camara | null) => void;
  onMomentos: (m: Momento[]) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duracionGrabacion, setDuracionGrabacion] = useState(0);

  const final = duracionFinal(duracionBase, momentos);
  const necesaria = grabacionNecesaria(momentos);
  const seExcede = final > LIMITE_REEL_SEG;
  const faltaGrabacion =
    duracionGrabacion > 0 && necesaria > duracionGrabacion + 0.2;

  function agregar(tipo: Momento["tipo"]) {
    onMomentos([
      ...momentos,
      {
        id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        tipo,
        desdeSeg: 0,
        duracionSeg: tipo === "PAUSA" ? 5 : 4,
      },
    ]);
  }

  function cambiar(id: string, cambio: Partial<Momento>) {
    onMomentos(momentos.map((m) => (m.id === id ? { ...m, ...cambio } : m)));
  }

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSubiendo(true);
    try {
      const r = await uploadCamara(file);
      onCamara({
        origenStoragePath: r.storagePath,
        posicion: "ABAJO_DERECHA",
        tamano: 0.32,
        factorEnPausa: 1.6,
        atenuacionDb: -12,
      });
      // La duración real la mide el navegador: sirve para avisar antes de
      // generar si los momentos piden más grabación de la que hay.
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        setDuracionGrabacion(v.duration);
        URL.revokeObjectURL(url);
      };
      v.src = url;
    } catch (err: any) {
      setError(err?.message ?? "No se pudo subir el video");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-white/35">
        Aparecer en el video
      </h3>

      {!camara ? (
        <>
          <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-white/20 px-3 py-4 text-center transition hover:border-[#0FED9D]/50 hover:bg-white/5">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={subir}
              disabled={subiendo}
            />
            <span className="text-xs text-white/60">
              {subiendo ? "Subiendo…" : "Subí tu video de cámara"}
            </span>
            <span className="mt-1 block text-[10px] text-white/30">
              Grabá una toma corrida; los momentos la van repartiendo en orden
            </span>
          </label>
          {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
        </>
      ) : (
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">
              Video cargado
              {duracionGrabacion > 0 && ` · ${duracionGrabacion.toFixed(0)}s`}
            </span>
            <button
              onClick={() => {
                onCamara(null);
                onMomentos([]);
              }}
              className="text-white/40 transition hover:text-red-400"
            >
              Quitar
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/35">Posición</span>
            {(
              [
                ["ABAJO_DERECHA", "Abajo derecha"],
                ["ABAJO_CENTRO", "Abajo centro"],
              ] as [PosicionCamara, string][]
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => onCamara({ ...camara, posicion: valor })}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                  camara.posicion === valor
                    ? "bg-[#0FED9D] text-black"
                    : "border border-white/10 text-white/50 hover:bg-white/5"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="flex items-center justify-between text-[11px] text-white/40">
              Tamaño del círculo
              <span className="text-white/60">
                {Math.round(camara.tamano * 100)}%
              </span>
            </span>
            <input
              type="range"
              min={0.15}
              max={0.6}
              step={0.01}
              value={camara.tamano}
              onChange={(e) =>
                onCamara({ ...camara, tamano: Number(e.target.value) })
              }
              className="mt-1 w-full accent-[#0FED9D]"
            />
          </label>

          {/* Plantillas: llenan la lista, no la reemplazan. */}
          <div>
            <p className="mb-1.5 text-[11px] text-white/35">
              Empezar desde una plantilla
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLANTILLAS.map((p) => {
                const entra = duracionBase >= p.minimoSeg;
                return (
                  <button
                    key={p.id}
                    disabled={!entra}
                    title={
                      entra
                        ? p.detalle
                        : `Necesita un video de al menos ${p.minimoSeg}s`
                    }
                    onClick={() =>
                      onMomentos(
                        p.momentos(duracionBase).map((m, i) => ({
                          ...m,
                          id: `${Date.now()}-${i}`,
                        })),
                      )
                    }
                    className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {p.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-white/35">Momentos</span>
              <span className="flex gap-1.5">
                <button
                  onClick={() => agregar("APARICION")}
                  className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/70 transition hover:bg-white/5"
                >
                  + Aparición
                </button>
                <button
                  onClick={() => agregar("PAUSA")}
                  className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/70 transition hover:bg-white/5"
                >
                  + Pausa
                </button>
              </span>
            </div>

            {momentos.length === 0 ? (
              <p className="text-[11px] text-white/25">
                Todavía no agregaste ninguno. Una aparición va encima del video;
                una pausa lo congela mientras hablás.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {momentos.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-black/30 px-2 py-1.5 text-[11px]"
                  >
                    <span
                      className={
                        m.tipo === "PAUSA"
                          ? "text-indigo-300"
                          : "text-[#0FED9D]"
                      }
                    >
                      {m.tipo === "PAUSA" ? "⏸ Pausa" : "🔵 Aparición"}
                    </span>
                    <label className="flex items-center gap-1 text-white/40">
                      {m.tipo === "PAUSA" ? "en" : "desde"}
                      <input
                        type="number"
                        min={0}
                        max={Math.max(duracionBase, 1)}
                        step={0.5}
                        value={m.desdeSeg}
                        onChange={(e) =>
                          cambiar(m.id, { desdeSeg: Number(e.target.value) })
                        }
                        className="w-14 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-right text-white"
                      />
                      s
                    </label>
                    <label className="flex items-center gap-1 text-white/40">
                      por
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={m.duracionSeg}
                        onChange={(e) =>
                          cambiar(m.id, { duracionSeg: Number(e.target.value) })
                        }
                        className="w-14 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-right text-white"
                      />
                      s
                    </label>
                    <button
                      onClick={() =>
                        onMomentos(momentos.filter((x) => x.id !== m.id))
                      }
                      className="ml-auto text-white/30 transition hover:text-red-400"
                      aria-label="Quitar"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {momentos.length > 0 && (
            <div className="space-y-1 border-t border-white/10 pt-3 text-[11px]">
              <p className={seExcede ? "text-amber-300" : "text-white/50"}>
                Duración final: <strong>{final.toFixed(1)}s</strong>
                {final !== duracionBase && (
                  <span className="text-white/30">
                    {" "}
                    ({duracionBase.toFixed(1)}s +{" "}
                    {(final - duracionBase).toFixed(1)}s de pausas)
                  </span>
                )}
              </p>
              {seExcede && (
                <p className="text-amber-300">
                  Pasa los {LIMITE_REEL_SEG}s de un Reel. Acortá una pausa o el
                  tramo del video.
                </p>
              )}
              {faltaGrabacion && (
                <p className="text-red-400">
                  Los momentos piden {necesaria.toFixed(1)}s de grabación y tu
                  video tiene {duracionGrabacion.toFixed(1)}s.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
