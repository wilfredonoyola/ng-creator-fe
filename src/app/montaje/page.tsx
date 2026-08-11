"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@apollo/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EditorRecorte } from "@/components/montaje/EditorRecorte";
import { PreviewFinal } from "@/components/montaje/PreviewFinal";
import { ControlesTexto } from "@/components/montaje/ControlesTexto";
import { usePaginaActiva } from "@/lib/pagina-activa";
import { useSesion } from "@/lib/sesion";
import { downloadFromTikTok } from "@/lib/upload";
import {
  FORMATOS,
  PROPORCIONES,
  montajeInicial,
  type Montaje,
} from "@/lib/montaje";
import { LICENSES, MONTAR_VIDEO } from "@/graphql/operations";

interface Licencia {
  _id: string;
  scope: string;
  status: string;
}

interface Fuente {
  storagePath: string;
  publicUrl: string;
  ancho: number;
  alto: number;
  duracion: number;
}

/**
 * Editor de reencuadre: de una URL de TikTok a un video listo para publicar.
 *
 * Está pensado como herramienta rápida, no como editor: pegar el link, elegir
 * el área útil, escribir dos titulares y generar. Todo lo que no aporte a ese
 * camino de un par de minutos sobra.
 *
 * El resultado no se publica desde acá: entra como expediente en revisión, con
 * su licencia, y sale por la cola de siempre.
 */
export default function MontajePage() {
  const { activa } = usePaginaActiva();
  const { puedeOperar } = useSesion();
  const puede = puedeOperar(activa?.pageId);

  const [url, setUrl] = useState("");
  const [fuente, setFuente] = useState<Fuente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  const [montaje, setMontaje] = useState<Montaje>(montajeInicial());
  const [proporcion, setProporcion] = useState<string>("libre");
  const [licenciaId, setLicenciaId] = useState("");

  const { data: licenciasData } = useQuery(LICENSES);
  const licencias: Licencia[] = (licenciasData?.licenses ?? []).filter(
    (l: Licencia) => l.status === "ACTIVA",
  );

  const [montar, { loading: montando }] = useMutation(MONTAR_VIDEO);

  const videoMaestro = useRef<HTMLVideoElement | null>(null);
  const videosPreview = useRef<Set<HTMLVideoElement>>(new Set());

  const aspectoFuente = fuente ? fuente.ancho / fuente.alto : 9 / 16;
  const valorProporcion =
    PROPORCIONES.find((p) => p.id === proporcion)?.valor ?? null;

  const cambiar = useCallback((parcial: Partial<Montaje>) => {
    setMontaje((m) => ({ ...m, ...parcial }));
  }, []);

  /**
   * Los videos del preview se registran acá para poder moverlos junto al
   * original. El Set se vacía al cargar otra fuente, que es cuando React
   * recrea los elementos; sincronizar cuadro a cuadro no vale la pena para un
   * preview de composición, así que solo se igualan al reproducir o al buscar.
   */
  const registrarVideo = useCallback((v: HTMLVideoElement | null) => {
    if (v) videosPreview.current.add(v);
  }, []);

  function conTodos(fn: (v: HTMLVideoElement) => void) {
    if (videoMaestro.current) fn(videoMaestro.current);
    videosPreview.current.forEach(fn);
  }

  async function cargar() {
    if (!url.includes("tiktok.com")) {
      setError("Pegá un link de TikTok");
      return;
    }
    setError(null);
    setListo(null);
    setCargando(true);
    videosPreview.current.clear();
    try {
      const r = await downloadFromTikTok(url);
      // Las dimensiones reales las reporta el <video> al cargar los metadatos;
      // hasta entonces no se puede convertir nada.
      setFuente({
        storagePath: r.storagePath ?? r.path,
        publicUrl: r.url,
        ancho: 1080,
        alto: 1920,
        duracion: 0,
      });
      setMontaje(montajeInicial());
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar el video");
    } finally {
      setCargando(false);
    }
  }

  async function generar() {
    if (!activa || !fuente || !licenciaId) return;
    setError(null);
    try {
      const { data } = await montar({
        variables: {
          input: {
            pageId: activa.pageId,
            licenseId: licenciaId,
            origenStoragePath: fuente.storagePath,
            trim: montaje.trim,
            recorte: montaje.recorte,
            lienzo: montaje.lienzo,
            video: montaje.video,
            fondo: montaje.fondo,
            textoSuperior: montaje.textoSuperior.contenido.trim()
              ? montaje.textoSuperior
              : null,
            textoInferior: montaje.textoInferior.contenido.trim()
              ? montaje.textoInferior
              : null,
          },
        },
      });
      setListo(data?.montarVideo?._id ?? null);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo generar el video");
    }
  }

  const duracionTrim = useMemo(
    () => Math.max(montaje.trim.hastaSeg - montaje.trim.desdeSeg, 0),
    [montaje.trim],
  );

  if (!activa) {
    return (
      <DashboardLayout>
        <Aviso
          titulo="No hay ninguna página activa"
          detalle="El montaje se guarda como expediente de una página. Elegí una en el switch de la izquierda."
        />
      </DashboardLayout>
    );
  }

  if (!puede) {
    return (
      <DashboardLayout>
        <Aviso
          titulo="Solo lectura en esta página"
          detalle="Tu rol acá no permite crear material. Pedile a quien la administra que te haga editor."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Montaje</h1>
        <p className="mt-1 text-sm text-white/50">
          De un link a un video listo: elegí el área útil, escribí los titulares
          y generá. Queda en revisión, no se publica solo.
        </p>
      </div>

      {/* Paso 1: el link */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@usuario/video/..."
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none transition focus:border-[#0FED9D]/50"
        />
        <button
          onClick={cargar}
          disabled={cargando || !url.trim()}
          className="rounded-lg bg-[#0FED9D] px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-40"
        >
          {cargando ? "Descargando…" : "Cargar video"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {listo && (
        <div className="mb-4 rounded-xl border border-[#0FED9D]/30 bg-[#0FED9D]/5 p-4">
          <p className="text-sm text-[#0FED9D]">Video generado.</p>
          <Link
            href="/revision"
            className="mt-1 inline-block text-xs text-white/60 underline hover:text-white"
          >
            Está esperando en la cola de revisión →
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Original y recorte */}
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">
            Original · elegí el área útil
          </h2>
          {fuente ? (
            <>
              {/* Se acota el ANCHO para que el alto derivado no pase de 62vh.
                  Un `max-height` sobre una caja con `aspect-ratio` la recorta
                  en vez de achicarla; topeando el ancho, el alto lo sigue solo
                  y la proporcion del video queda intacta. Sin esto, un 9:16 en
                  una columna ancha se va abajo de la pantalla y hay que
                  scrollear para ver el recorte, que es lo que se viene a mirar. */}
              <div
                className="mx-auto w-full"
                style={{ maxWidth: `calc(62vh * ${aspectoFuente})` }}
              >
              <EditorRecorte
                src={fuente.publicUrl}
                recorte={montaje.recorte}
                onCambio={(recorte) => cambiar({ recorte })}
                proporcion={valorProporcion}
                aspectoFuente={aspectoFuente}
                videoRef={videoMaestro}
                onMetadatos={({ ancho, alto, duracion }) => {
                  setFuente((f) => (f ? { ...f, ancho, alto, duracion } : f));
                  setMontaje((m) => ({
                    ...m,
                    trim: { desdeSeg: 0, hastaSeg: duracion },
                  }));
                }}
              />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-white/35">Proporción</span>
                {PROPORCIONES.map((p) => (
                  <Chip
                    key={p.id}
                    activo={proporcion === p.id}
                    onClick={() => setProporcion(p.id)}
                  >
                    {p.etiqueta}
                  </Chip>
                ))}
              </div>

              {/* Tramo temporal */}
              {fuente.duracion > 0 && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-white/40">
                    <span>Tramo del video</span>
                    <span>{duracionTrim.toFixed(1)}s</span>
                  </div>
                  <Deslizador
                    etiqueta="Desde"
                    valor={montaje.trim.desdeSeg}
                    min={0}
                    max={fuente.duracion}
                    paso={0.1}
                    formato={(v) => `${v.toFixed(1)}s`}
                    onCambio={(v) =>
                      cambiar({
                        trim: {
                          desdeSeg: Math.min(v, montaje.trim.hastaSeg - 0.5),
                          hastaSeg: montaje.trim.hastaSeg,
                        },
                      })
                    }
                  />
                  <Deslizador
                    etiqueta="Hasta"
                    valor={montaje.trim.hastaSeg}
                    min={0}
                    max={fuente.duracion}
                    paso={0.1}
                    formato={(v) => `${v.toFixed(1)}s`}
                    onCambio={(v) =>
                      cambiar({
                        trim: {
                          desdeSeg: montaje.trim.desdeSeg,
                          hastaSeg: Math.max(v, montaje.trim.desdeSeg + 0.5),
                        },
                      })
                    }
                  />
                  <button
                    onClick={() =>
                      conTodos((v) => {
                        v.currentTime = montaje.trim.desdeSeg;
                        void v.play();
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 py-2 text-xs text-white/60 transition hover:bg-white/5"
                  >
                    ▶ Reproducir el tramo
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              className="mx-auto flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-dashed border-white/15 px-6 text-center text-xs text-white/25"
              style={{ maxWidth: "calc(62vh * 9 / 16)" }}
            >
              Pegá un link de TikTok arriba
            </div>
          )}
        </section>

        {/* Resultado */}
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">
            Cómo va a quedar
          </h2>
          <div
            className="mx-auto w-full"
            style={{
              maxWidth: `min(280px, calc(62vh * ${montaje.lienzo.ancho} / ${montaje.lienzo.alto}))`,
            }}
          >
            <PreviewFinal
              montaje={montaje}
              src={fuente?.publicUrl ?? null}
              aspectoFuente={aspectoFuente}
              registrarVideo={registrarVideo}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/35">Formato</span>
            {FORMATOS.map((f) => (
              <Chip
                key={f.id}
                activo={
                  montaje.lienzo.ancho === f.ancho &&
                  montaje.lienzo.alto === f.alto
                }
                onClick={() =>
                  cambiar({
                    lienzo: { ...montaje.lienzo, ancho: f.ancho, alto: f.alto },
                  })
                }
              >
                {f.etiqueta}
              </Chip>
            ))}
          </div>

          <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <Deslizador
              etiqueta="Tamaño"
              valor={montaje.video.escala}
              min={0.2}
              max={2}
              paso={0.01}
              formato={(v) => `${Math.round(v * 100)}%`}
              onCambio={(escala) =>
                cambiar({ video: { ...montaje.video, escala } })
              }
            />
            <Deslizador
              etiqueta="Posición"
              valor={montaje.video.centroY}
              min={0}
              max={1}
              paso={0.005}
              formato={(v) => `${Math.round(v * 100)}%`}
              onCambio={(centroY) =>
                cambiar({ video: { ...montaje.video, centroY } })
              }
            />
            <button
              onClick={() =>
                cambiar({ video: { escala: 1, centroX: 0.5, centroY: 0.5 } })
              }
              className="w-full rounded-lg border border-white/10 py-2 text-xs text-white/50 transition hover:bg-white/5"
            >
              Centrar
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/35">Fondo</span>
            <Chip
              activo={montaje.fondo.tipo === "SOLIDO"}
              onClick={() =>
                cambiar({ fondo: { ...montaje.fondo, tipo: "SOLIDO" } })
              }
            >
              Color
            </Chip>
            <Chip
              activo={montaje.fondo.tipo === "DESENFOQUE"}
              onClick={() =>
                cambiar({ fondo: { ...montaje.fondo, tipo: "DESENFOQUE" } })
              }
            >
              Desenfoque
            </Chip>
            {montaje.fondo.tipo === "SOLIDO" && (
              <input
                type="color"
                value={montaje.fondo.color}
                onChange={(e) =>
                  cambiar({ fondo: { ...montaje.fondo, color: e.target.value } })
                }
                className="h-7 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
              />
            )}
          </div>
        </section>
      </div>

      {/* Titulares */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ControlesTexto
          titulo="Titular de arriba"
          texto={montaje.textoSuperior}
          onCambio={(textoSuperior) => cambiar({ textoSuperior })}
        />
        <ControlesTexto
          titulo="Titular de abajo"
          texto={montaje.textoInferior}
          onCambio={(textoInferior) => cambiar({ textoInferior })}
        />
      </div>

      {/* Generar */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Licencia *
            </label>
            {licencias.length > 0 ? (
              <select
                value={licenciaId}
                onChange={(e) => setLicenciaId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[#0FED9D]/50"
              >
                <option value="">Seleccionar licencia</option>
                {licencias.map((l) => (
                  <option key={l._id} value={l._id} className="bg-[#111]">
                    {l.scope}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-white/40">
                No hay licencias activas.{" "}
                <Link href="/creators" className="text-[#0FED9D] hover:underline">
                  Creá una primero
                </Link>
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-white/30">
              Sin licencia vigente el sistema no guarda el material. Es la misma
              puerta que usa el resto del pipeline.
            </p>
          </div>

          <button
            onClick={generar}
            disabled={!fuente || !licenciaId || montando}
            className="rounded-lg bg-[#0FED9D] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
          >
            {montando ? "Generando…" : "Generar video"}
          </button>
        </div>
        {montando && (
          <p className="mt-3 text-xs text-white/40">
            Se está procesando en el servidor. Puede tardar algunos minutos según
            el largo del tramo; no cierres esta pestaña.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
        activo
          ? "bg-[#0FED9D] text-black"
          : "border border-white/10 text-white/60 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  paso,
  formato,
  onCambio,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  formato: (v: number) => string;
  onCambio: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11px] text-white/40">
        {etiqueta}
        <span className="text-white/60">{formato(valor)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onCambio(Number(e.target.value))}
        className="mt-1 w-full accent-[#0FED9D]"
      />
    </label>
  );
}

function Aviso({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
      <div className="mb-3 text-4xl opacity-40">🎞️</div>
      <p className="font-medium text-white/70">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/40">{detalle}</p>
    </div>
  );
}
