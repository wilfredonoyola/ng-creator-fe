"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EditorRecorte } from "@/components/montaje/EditorRecorte";
import { PreviewFinal } from "@/components/montaje/PreviewFinal";
import { ControlesTexto } from "@/components/montaje/ControlesTexto";
import { MomentosCamara } from "@/components/montaje/MomentosCamara";
import { usePaginaActiva } from "@/lib/pagina-activa";
import { useSesion } from "@/lib/sesion";
import { downloadFromTikTok } from "@/lib/upload";
import {
  FORMATOS,
  PROPORCIONES,
  montajeInicial,
  duracionFinal,
  type Montaje,
} from "@/lib/montaje";
import { LICENSES, MONTAJE_TRABAJO, MONTAR_VIDEO } from "@/graphql/operations";

/** Lo que Meta admite en un Reel. El backend lo valida antes de publicar. */
const LIMITE_REEL_SEG = 90;

/**
 * Tope del panel del editor.
 *
 * Se bajo de 520: con ese alto, en una laptop a 100% el paso 1 ocupaba la
 * pantalla entera y los titulares quedaban abajo del pliegue. Mas grande no
 * ayuda a encuadrar —el rectangulo se arrastra igual— y obliga a scrollear
 * para ver que sigue.
 */
const ALTO_MAXIMO = 400;

/**
 * Alto que queda libre desde donde arranca el elemento hasta el pie de la
 * ventana.
 *
 * Se mide en vez de estimarlo con `vh` porque encima de los paneles hay
 * encabezado, input de URL y avisos que aparecen y desaparecen: cualquier
 * fracción fija del viewport termina dejando el video cortado abajo en unas
 * pantallas y chiquito en otras.
 *
 * Se toma la posición respecto del documento y no del viewport, así el valor no
 * cambia mientras se scrollea: si dependiera del scroll, el panel se agrandaría
 * y achicaría solo al bajar por la página.
 */
/** `lg` de Tailwind. Debajo de eso las columnas se apilan y el preview cambia de papel. */
function useEsMovil(): boolean {
  const [movil, setMovil] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const ver = () => setMovil(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);
  return movil;
}

function useAltoDisponible(ref: React.RefObject<HTMLElement | null>) {
  const [alto, setAlto] = useState(ALTO_MAXIMO);

  useEffect(() => {
    function medir() {
      const el = ref.current;
      if (!el) return;
      const desdeArriba = el.getBoundingClientRect().top + window.scrollY;
      setAlto(
        Math.max(240, Math.min(ALTO_MAXIMO, window.innerHeight - desdeArriba - 24)),
      );
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [ref]);

  return alto;
}

interface Licencia {
  _id: string;
  scope: string;
  status: string;
}

interface Fuente {
  storagePath: string;
  publicUrl: string;
  /** El link original. Es lo único que después permite volver a buscar al autor. */
  origenUrl: string;
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

  const [montaje, setMontaje] = useState<Montaje>(montajeInicial());
  const [proporcion, setProporcion] = useState<string>("libre");
  const [licenciaId, setLicenciaId] = useState("");

  const { data: licenciasData } = useQuery(LICENSES);
  const licencias: Licencia[] = (licenciasData?.licenses ?? []).filter(
    (l: Licencia) => l.status === "ACTIVA",
  );

  const [montar] = useMutation(MONTAR_VIDEO);
  const cliente = useApolloClient();

  /**
   * El trabajo en curso. Su id se guarda en localStorage para que cerrar la
   * pestaña no pierda el montaje: el render sigue en el servidor y al volver
   * se retoma el seguimiento donde estaba.
   */
  const [trabajo, setTrabajo] = useState<{
    _id: string;
    estado: string;
    progreso: number;
    expedienteId?: string | null;
    error?: string | null;
  } | null>(null);
  const montando = trabajo?.estado === "RENDERIZANDO";

  const zonaPaneles = useRef<HTMLDivElement>(null);
  const altoPanel = useAltoDisponible(zonaPaneles);
  const esMovil = useEsMovil();

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
    setCargando(true);
    videosPreview.current.clear();
    try {
      const r = await downloadFromTikTok(url);

      // El backend devuelve la ruta en Bunny y sin ella no hay nada que montar.
      // Se valida acá y no al generar porque si se guarda un valor invalido, el
      // error aparece minutos despues y culpando al servidor: ya paso con un
      // `origenStoragePath` que llego como la cadena "undefined".
      const ruta = r.storagePath || r.path;
      if (typeof ruta !== "string" || !ruta.trim() || ruta === "undefined") {
        throw new Error(
          "El servidor no devolvio donde quedo guardado el video. " +
            "Volve a cargar el link.",
        );
      }

      // Las dimensiones reales las reporta el <video> al cargar los metadatos;
      // hasta entonces no se puede convertir nada.
      setFuente({
        storagePath: ruta,
        publicUrl: r.url,
        origenUrl: url.trim(),
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
    if (!activa || !fuente) return;
    if (!fuente.storagePath) {
      setError("Se perdio la referencia al video. Volve a cargar el link.");
      return;
    }
    setError(null);
    try {
      const { data } = await montar({
        variables: {
          input: {
            pageId: activa.pageId,
            // Vacio = que el backend registre una licencia SIN_VERIFICAR con
            // el link de origen. La puerta de derechos sigue en pie; lo que se
            // saca del medio es tener que elegir a mano en cada video.
            licenseId: licenciaId || null,
            origenStoragePath: fuente.storagePath,
            origenUrl: fuente.origenUrl,
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
            camara: montaje.camara,
            // El id de cada fila es solo para React; el backend no lo espera.
            momentos: montaje.camara
              ? montaje.momentos.map(({ tipo, desdeSeg, duracionSeg }) => ({
                  tipo,
                  desdeSeg,
                  duracionSeg,
                }))
              : [],
          },
        },
      });
      const t = data?.montarVideo;
      if (t) {
        setTrabajo(t);
        localStorage.setItem(CLAVE_TRABAJO, t._id);
      }
    } catch (e: any) {
      setError(e?.message ?? "No se pudo iniciar el montaje");
    }
  }

  const CLAVE_TRABAJO = "montajeEnCurso";

  // Acompaña a la barra: con el porcentaje solo no se sabe si avanza o se
  // colgó, y el reloj responde esa pregunta sin consultar nada.
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    if (!montando) {
      setSegundos(0);
      return;
    }
    const t = setInterval(() => setSegundos((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [montando]);

  /**
   * Pregunta cómo va cada 2 segundos mientras renderiza.
   *
   * Sondeo y no WebSocket: el backend no tiene subscriptions montadas, y para
   * un proceso de minutos preguntar cada 2s es irrelevante al lado de lo que
   * cuesta el render.
   */
  useEffect(() => {
    if (!trabajo || trabajo.estado !== "RENDERIZANDO" || !activa) return;

    let vivo = true;
    const t = setInterval(async () => {
      try {
        const { data } = await cliente.query({
          query: MONTAJE_TRABAJO,
          variables: { id: trabajo._id, pageId: activa.pageId },
          fetchPolicy: "network-only",
        });
        if (!vivo || !data?.montajeTrabajo) return;
        setTrabajo(data.montajeTrabajo);
        if (data.montajeTrabajo.estado !== "RENDERIZANDO") {
          localStorage.removeItem(CLAVE_TRABAJO);
          if (data.montajeTrabajo.estado === "FALLIDO") {
            setError(data.montajeTrabajo.error ?? "El montaje falló");
          }
        }
      } catch {
        // Un sondeo perdido no es un fallo del render: se reintenta solo.
      }
    }, 2000);

    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [trabajo, activa, cliente]);

  // Al abrir la pantalla, retomar un montaje que haya quedado corriendo.
  useEffect(() => {
    if (trabajo || !activa) return;
    const guardado = localStorage.getItem(CLAVE_TRABAJO);
    if (!guardado) return;
    cliente
      .query({
        query: MONTAJE_TRABAJO,
        variables: { id: guardado, pageId: activa.pageId },
        fetchPolicy: "network-only",
      })
      .then(({ data }) => {
        if (data?.montajeTrabajo?.estado === "RENDERIZANDO") {
          setTrabajo(data.montajeTrabajo);
        } else {
          localStorage.removeItem(CLAVE_TRABAJO);
        }
      })
      .catch(() => localStorage.removeItem(CLAVE_TRABAJO));
    // Solo al montar: es un rescate, no un seguimiento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa]);

  const duracionConMomentos = duracionFinal(
    Math.max(montaje.trim.hastaSeg - montaje.trim.desdeSeg, 0),
    montaje.momentos,
  );
  const excedeLimite = duracionConMomentos > LIMITE_REEL_SEG;

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

      <div className="pb-20 lg:pb-0">
      {montando && (
        <div className="mb-4 rounded-xl border border-[#0FED9D]/30 bg-[#0FED9D]/5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#0FED9D]">
              Componiendo el video · {Math.round(trabajo?.progreso ?? 0)}%
            </span>
            <span className="text-xs text-white/40">
              {Math.floor(segundos / 60)}:
              {String(segundos % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#0FED9D] transition-all duration-500"
              style={{ width: `${Math.max(2, trabajo?.progreso ?? 0)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/45">
            Podés cerrar la pestaña: el video se sigue armando en el servidor y
            al volver acá se retoma. Cuando termine queda en revisión.
          </p>
        </div>
      )}

      {trabajo?.estado === "LISTO" && (
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

      {/* Paso 1: el link */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@usuario/video/..."
          disabled={montando}
          className="min-w-0 flex-1 disabled:opacity-40 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none transition focus:border-[#0FED9D]/50"
        />
        <button
          onClick={cargar}
          disabled={cargando || montando || !url.trim()}
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

      <div
        aria-busy={montando}
        className={
          montando ? "pointer-events-none select-none opacity-40" : undefined
        }
      >
        {/* Dos columnas: a la izquierda se trabaja, a la derecha se ve el
            resultado. La derecha queda FIJA al hacer scroll porque todo lo de
            la izquierda la modifica: antes los titulares estaban cien lineas
            debajo del preview, o sea que se escribia a ciegas justo donde mas
            falta verlo. */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,330px)]">
          <div ref={zonaPaneles} className="min-w-0 space-y-4">
            <Bloque numero={1} titulo="Elegí el área útil">
          {fuente ? (
            <>
              {/* Se acota el ANCHO para que el alto derivado entre en el
                  espacio libre. Un `max-height` sobre una caja con
                  `aspect-ratio` la recorta en vez de achicarla; topeando el
                  ancho, el alto lo sigue solo y la proporción queda intacta.
                  El ancho depende de la proporción REAL del video, así que un
                  vertical y un horizontal ocupan el mismo alto y el panel no
                  salta de tamaño al cargar otro material. */}
              <div className="flex flex-col gap-4 sm:flex-row">
              <div
                className="mx-auto w-full shrink-0 sm:mx-0"
                style={{ maxWidth: altoPanel * aspectoFuente }}
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
                  // El tramo arranca ya recortado al maximo permitido en vez
                  // de abarcar el video entero: con un TikTok de 3 minutos, el
                  // valor por defecto era uno que el servidor iba a rechazar, y
                  // el usuario se enteraba recien al apretar Generar.
                  setMontaje((m) => ({
                    ...m,
                    trim: {
                      desdeSeg: 0,
                      hastaSeg: Math.min(duracion, LIMITE_REEL_SEG),
                    },
                  }));
                }}
              />
              </div>

              {/* Columna de controles: el video es vertical y angosto, asi que
                  debajo desperdiciaba todo el ancho de la fila. */}
              <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
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
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-white/40">
                    <span>
                      Tramo del video
                      {fuente.duracion > LIMITE_REEL_SEG && (
                        <span className="ml-1.5 text-white/25">
                          · de {fuente.duracion.toFixed(0)}s, recortado a{" "}
                          {LIMITE_REEL_SEG}s
                        </span>
                      )}
                    </span>
                    <span className="text-white/60">
                      {duracionTrim.toFixed(1)}s
                    </span>
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
                  {/* Meta rechaza los Reels de mas de 90s, y el pipeline lo
                      valida antes de publicar: sin este aviso el limite se
                      descubre despues de esperar todo el render. Ademas cada
                      segundo de tramo es tiempo de CPU en el servidor. */}
                  {duracionTrim > LIMITE_REEL_SEG && (
                    <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-300">
                      {duracionTrim.toFixed(0)}s es demasiado para un Reel: Meta
                      admite hasta {LIMITE_REEL_SEG}s. Se va a poder generar,
                      pero al publicarlo como Reel te lo va a rechazar. Y el
                      render tarda en proporcion al tramo.
                      <button
                        onClick={() =>
                          cambiar({
                            trim: {
                              desdeSeg: montaje.trim.desdeSeg,
                              hastaSeg:
                                montaje.trim.desdeSeg + LIMITE_REEL_SEG,
                            },
                          })
                        }
                        className="ml-1 underline hover:text-amber-200"
                      >
                        Recortar a {LIMITE_REEL_SEG}s
                      </button>
                    </p>
                  )}

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
              </div>
              </div>
            </>
          ) : (
            <div
              className="mx-auto flex aspect-[9/16] w-full items-center justify-center rounded-xl border border-dashed border-white/15 px-6 text-center text-xs text-white/25 sm:mx-0"
              style={{ maxWidth: (altoPanel * 9) / 16 }}
            >
              Pegá un link de TikTok arriba
            </div>
          )}
            </Bloque>

            {/* Lo opcional viene plegado: el camino corto es pegar el link,
                encuadrar y generar. Desplegarlo es una decisión, no un peaje. */}
            <BloqueOpcional
              numero={2}
              titulo="Titulares"
              resumen={
                [montaje.textoSuperior, montaje.textoInferior]
                  .filter((t) => t.contenido.trim())
                  .map((t) => `“${t.contenido.trim().slice(0, 22)}”`)
                  .join(" · ") || "Sin titulares"
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
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
            </BloqueOpcional>

            <BloqueOpcional
              numero={3}
              titulo="Aparecer en el video"
              resumen={
                montaje.camara
                  ? `${montaje.momentos.length} momento${montaje.momentos.length !== 1 ? "s" : ""}`
                  : "No aparecés"
              }
            >
              <MomentosCamara
                camara={montaje.camara}
                momentos={montaje.momentos}
                duracionBase={duracionTrim}
                onCamara={(camara) => cambiar({ camara })}
                onMomentos={(momentos) => cambiar({ momentos })}
              />
            </BloqueOpcional>
          </div>

          <div className="order-first space-y-3 self-start lg:order-none lg:sticky lg:top-4">
            <h2 className="hidden text-xs font-medium uppercase tracking-wider text-white/35 lg:block">
              Cómo va a quedar
            </h2>
            {/* Mismo tope de alto que el editor: con el ancho fijo en 300, un
                lienzo 9:16 daba 533px y el preview terminaba siendo lo mas alto
                de la pantalla, justo lo que se venia a achicar. */}
            <div
              className="mx-auto w-full lg:static lg:bg-transparent lg:py-0 sticky top-0 z-20 bg-[#0a0a0a] py-2"
              style={{
                maxWidth: Math.min(
                  esMovil ? 130 : 300,
                  ((esMovil ? 230 : altoPanel) * montaje.lienzo.ancho) /
                    montaje.lienzo.alto,
                ),
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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="space-y-3">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Licencia
            </label>
            <select
              value={licenciaId}
              onChange={(e) => setLicenciaId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[#0FED9D]/50"
            >
              <option value="">Sin verificar (no pedí permiso)</option>
              {licencias.map((l) => (
                <option key={l._id} value={l._id} className="bg-[#111]">
                  {l.scope}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-white/30">
              {licenciaId ? (
                "El material queda con la licencia que elegiste."
              ) : (
                <>
                  Se registra una licencia marcada{" "}
                  <span className="text-amber-400/70">sin verificar</span> con el
                  link de origen guardado. Podés regularizarla después desde{" "}
                  <Link href="/creators" className="text-[#0FED9D] hover:underline">
                    Creators
                  </Link>
                  .
                </>
              )}
            </p>
          </div>

          <button
            onClick={generar}
            disabled={!fuente || montando}
            className="rounded-lg bg-[#0FED9D] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
          >
            {montando ? "Generando…" : "Generar video"}
          </button>
        </div>
      </div>
          </div>
        </div>
      </div>

      </div>

      {/* En telefono, la accion no puede vivir al fondo de una pagina larga:
          queda fija abajo, con la duracion final al lado para no tener que
          subir a comprobarla antes de generar. */}
      {fuente && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-white/10 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur lg:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="min-w-0 flex-1 text-[11px] leading-tight">
            <p className={excedeLimite ? "text-amber-300" : "text-white/50"}>
              {duracionConMomentos.toFixed(1)}s finales
            </p>
            <p className="truncate text-white/30">
              {licenciaId ? "Con licencia elegida" : "Licencia sin verificar"}
            </p>
          </div>
          <button
            onClick={generar}
            disabled={!fuente || montando}
            className="shrink-0 rounded-lg bg-[#0FED9D] px-5 py-2.5 text-sm font-semibold text-black transition disabled:opacity-40"
          >
            {montando ? "Generando…" : "Generar"}
          </button>
        </div>
      )}

    </DashboardLayout>
  );
}

/** Un paso del trabajo. Numerado para que el orden se lea sin explicarlo. */
function Bloque({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] text-white/60">
          {numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/**
 * Un paso que se puede saltear, plegado por defecto.
 *
 * El resumen en la cabecera existe para no tener que abrirlo solo para
 * recordar qué hay adentro.
 */
function BloqueOpcional({
  numero,
  titulo,
  resumen,
  children,
}: {
  numero: number;
  titulo: string;
  resumen: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] text-white/60">
          {numero}
        </span>
        {titulo}
        <span className="ml-auto truncate pl-2 text-[11px] font-normal text-white/30">
          {resumen}
        </span>
        <span className="text-white/30 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
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
