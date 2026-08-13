"use client";

import { useEffect, useRef, useState } from "react";
import { uploadCamara } from "@/lib/upload";
import { GrabarConTelefono } from "./GrabarConTelefono";
import {
  LIMITE_REEL_SEG,
  PLANTILLAS,
  duracionFinal,
  grabacionNecesaria,
  type Camara,
  type Momento,
  type PosicionCamara,
} from "@/lib/montaje";

/** Un círculo chico y reproducible. Ver la toma vale más que su nombre de archivo. */
function TomaChica({ url, etiqueta }: { url?: string; etiqueta: string }) {
  const v = useRef<HTMLVideoElement>(null);
  if (!url) {
    return <span className="h-7 w-7 shrink-0 rounded-full bg-white/10" />;
  }
  return (
    <button
      onClick={() => (v.current?.paused ? v.current?.play() : v.current?.pause())}
      aria-label={etiqueta}
      className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/15 bg-black"
    >
      <video ref={v} src={url} muted playsInline className="h-full w-full object-cover" />
    </button>
  );
}

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
  pageId,
  urlsPorRuta,
  onUrl,
  onCamara,
  onMomentos,
}: {
  camara: Camara | null;
  momentos: Momento[];
  duracionBase: number;
  pageId: string;
  /** Dónde mirar cada grabación, por ruta. La tiene el padre: el preview también la usa. */
  urlsPorRuta: Record<string, string>;
  onUrl: (ruta: string, url: string | null) => void;
  onCamara: (c: Camara | null) => void;
  onMomentos: (m: Momento[]) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duracionGrabacion, setDuracionGrabacion] = useState(0);

  /**
   * Cambiar la toma y sacar la camara son cosas distintas.
   *
   * Antes habia un solo boton, "Quitar", que borraba el video Y todos los
   * momentos. Quien solo queria repetir la grabacion perdia la lista entera sin
   * ningun aviso: seis momentos configurados a mano, en un click.
   */
  const [reemplazando, setReemplazando] = useState(false);
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);

  const [viendo, setViendo] = useState(false);
  const vistaPrevia = useRef<HTMLVideoElement>(null);

  /** Qué momento tiene abierto el panel para darle su propia toma. */
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [subiendoEn, setSubiendoEn] = useState<string | null>(null);

  async function subirPara(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSubiendoEn(id);
    try {
      const r = await uploadCamara(file);
      onUrl(r.storagePath, r.url);
      cambiar(id, { origenStoragePath: r.storagePath });
      setAbriendo(null);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo subir el video");
    } finally {
      setSubiendoEn(null);
      e.target.value = "";
    }
  }

  // El QR solo tiene sentido en la computadora: si ya estás en el teléfono, no
  // hay nada que puentear y el botón de subir abre la cámara igual.
  const [enComputadora, setEnComputadora] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const ver = () => setEnComputadora(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);

  /**
   * Deja el video nuevo conservando los ajustes que ya estaban.
   *
   * Al reemplazar, la posicion y el tamaño se mantienen: quien ya los acomodo
   * no queria volver a empezar, solo cambiar la toma.
   */
  function aplicarVideo(storagePath: string, url: string | null) {
    onCamara(
      camara
        ? { ...camara, origenStoragePath: storagePath }
        : {
            origenStoragePath: storagePath,
            posicion: "ABAJO_DERECHA",
            tamano: 0.32,
            factorEnPausa: 1.6,
            atenuacionDb: -12,
          },
    );
    // La URL vive fuera del montaje: el backend recibe la RUTA y arma la pública
    // él mismo, justamente para que nadie pueda apuntar la cámara a un archivo
    // de otro sitio. Esto es al pepe para mirar, nada más.
    onUrl(storagePath, url);
    setViendo(false);
    setReemplazando(false);
  }

  function usarVideo(
    storagePath: string,
    duracionSeg: number | null,
    url: string | null,
  ) {
    aplicarVideo(storagePath, url);
    // Por el camino del QR la duracion la mide el telefono. Sin esto el aviso
    // de "los momentos piden mas grabacion de la que hay" no funcionaba nunca
    // grabando con el telefono, que es el camino principal.
    setDuracionGrabacion(duracionSeg ?? 0);
  }

  function quitar() {
    onCamara(null);
    onMomentos([]);
    setDuracionGrabacion(0);
    setViendo(false);
    setConfirmandoQuitar(false);
    setReemplazando(false);
  }

  function alternarVista() {
    const v = vistaPrevia.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => setViendo(false));
    else v.pause();
  }

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
      aplicarVideo(r.storagePath, r.url);
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

      {!camara || reemplazando ? (
        <div className="mt-2 space-y-2">
          {reemplazando && (
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-white/40">
                Mandá la toma nueva. Los momentos y los ajustes se mantienen.
              </span>
              <button
                onClick={() => setReemplazando(false)}
                className="shrink-0 text-white/40 underline"
              >
                Cancelar
              </button>
            </div>
          )}
          {enComputadora && (
            <GrabarConTelefono pageId={pageId} onVideo={usarVideo} />
          )}
          <label className="block cursor-pointer rounded-lg border border-dashed border-white/20 px-3 py-4 text-center transition hover:border-[#0FED9D]/50 hover:bg-white/5">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={subir}
              disabled={subiendo}
            />
            <span className="text-xs text-white/60">
              {subiendo
                ? "Subiendo…"
                : enComputadora
                  ? "…o subí un video desde acá"
                  : "Grabar o elegir un video"}
            </span>
            <span className="mt-1 block text-[10px] text-white/30">
              Grabá una toma corrida; los momentos la van repartiendo en orden
            </span>
          </label>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-3 text-xs">
            {/* El círculo no es decoración: es el recorte real, así que mirarlo
                acá es la única forma de ver si el encuadre entró bien sin
                esperar el render entero. */}
            {camara.origenStoragePath && urlsPorRuta[camara.origenStoragePath] && (
              <button
                onClick={alternarVista}
                aria-label={viendo ? "Pausar la toma" : "Ver la toma"}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/15 bg-black"
              >
                <video
                  ref={vistaPrevia}
                  src={urlsPorRuta[camara.origenStoragePath]}
                  playsInline
                  onPlay={() => setViendo(true)}
                  onPause={() => setViendo(false)}
                  onEnded={() => setViendo(false)}
                  className="h-full w-full object-cover"
                />
                {!viendo && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] text-white">
                    ▶
                  </span>
                )}
              </button>
            )}
            <span className="text-white/50">
              Video cargado
              {duracionGrabacion > 0 && ` · ${duracionGrabacion.toFixed(0)}s`}
            </span>
            <span className="ml-auto flex gap-3">
              <button
                onClick={() => {
                  setReemplazando(true);
                  setConfirmandoQuitar(false);
                }}
                className="text-white/40 transition hover:text-white"
              >
                Cambiar
              </button>
              <button
                onClick={() =>
                  momentos.length ? setConfirmandoQuitar(true) : quitar()
                }
                className="text-white/40 transition hover:text-red-400"
              >
                Quitar
              </button>
            </span>
          </div>

          {/* Solo cuando hay algo que perder. Sin momentos configurados, pedir
              confirmacion es un tramite de mas. */}
          {confirmandoQuitar && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-[11px]">
              <p className="text-white/70">
                Se borran también los {momentos.length} momentos. Si solo querés
                otra toma, usá <strong>Cambiar</strong>.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={quitar}
                  className="rounded-lg bg-red-500/80 px-2.5 py-1 font-medium text-white"
                >
                  Quitar igual
                </button>
                <button
                  onClick={() => setConfirmandoQuitar(false)}
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-white/60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

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
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-black/30 px-2 py-2.5 text-[11px]"
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
                        inputMode="decimal"
                        min={0}
                        max={Math.max(duracionBase, 1)}
                        step={0.5}
                        value={m.desdeSeg}
                        onChange={(e) =>
                          cambiar(m.id, { desdeSeg: Number(e.target.value) })
                        }
                        className="w-16 rounded border border-white/10 bg-black/40 px-1 py-1.5 text-right text-white"
                      />
                      s
                    </label>
                    <label className="flex items-center gap-1 text-white/40">
                      por
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0.5}
                        step={0.5}
                        value={m.duracionSeg}
                        onChange={(e) =>
                          cambiar(m.id, { duracionSeg: Number(e.target.value) })
                        }
                        className="w-16 rounded border border-white/10 bg-black/40 px-1 py-1.5 text-right text-white"
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

                    {/* La toma de ESTE momento.
                        Sin esto todos se reparten una sola grabación en orden, y
                        alargar uno corre el tramo de los que siguen: empiezan a
                        la mitad de una palabra sin que nadie los haya tocado. */}
                    <div className="w-full">
                      {m.origenStoragePath ? (
                        <div className="flex items-center gap-2 text-white/40">
                          <TomaChica
                            url={urlsPorRuta[m.origenStoragePath]}
                            etiqueta="Toma propia de este momento"
                          />
                          <span>Toma propia</span>
                          <button
                            onClick={() =>
                              cambiar(m.id, { origenStoragePath: undefined })
                            }
                            className="text-white/30 underline transition hover:text-white/60"
                          >
                            usar la general
                          </button>
                        </div>
                      ) : abriendo === m.id ? (
                        <div className="space-y-1.5 rounded-lg border border-white/10 p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white/40">
                              Grabá o subí la toma de este momento
                            </span>
                            <button
                              onClick={() => setAbriendo(null)}
                              className="text-white/30 underline"
                            >
                              cancelar
                            </button>
                          </div>
                          {enComputadora && (
                            <GrabarConTelefono
                              pageId={pageId}
                              onVideo={(ruta, _dur, url) => {
                                onUrl(ruta, url);
                                cambiar(m.id, { origenStoragePath: ruta });
                                setAbriendo(null);
                              }}
                            />
                          )}
                          <label className="block cursor-pointer rounded-lg border border-dashed border-white/20 py-2 text-center text-white/50 transition hover:border-[#0FED9D]/50">
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => subirPara(m.id, e)}
                            />
                            {subiendoEn === m.id
                              ? "Subiendo…"
                              : enComputadora
                                ? "…o subí un archivo"
                                : "Elegir un video"}
                          </label>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAbriendo(m.id)}
                          className="text-white/25 underline transition hover:text-white/50"
                        >
                          + usar una toma propia para este momento
                        </button>
                      )}
                    </div>
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
