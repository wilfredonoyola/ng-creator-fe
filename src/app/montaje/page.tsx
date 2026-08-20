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
  FORMATOS_LISTOS,
  VOLUMENES,
  encajarVideoSobreBanda,
  PROPORCIONES,
  montajeInicial,
  duracionFinal,
  type Montaje,
} from "@/lib/montaje";
import {
  ESTILO_MONTAJE,
  GUARDAR_ESTILO_MONTAJE,
  LICENSES,
  MONTAJE_GUARDADO,
  MONTAJE_TRABAJO,
  MONTAR_VIDEO,
} from "@/graphql/operations";
import { ColaRenders } from "@/components/montaje/ColaRenders";
import { HistorialMontajes } from "@/components/montaje/HistorialMontajes";
import {
  aplicarEstilo,
  extraerEstilo,
  formatoDelEstilo,
} from "@/lib/estilo-montaje";
import {
  CLAVE_BORRADOR,
  DatosBorrador,
  EstadoGuardado,
  useGuardadoAutomatico,
} from "@/lib/borrador-montaje";

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
  /** La licencia se mira al publicar, no mientras se edita. */
  const [verLicencia, setVerLicencia] = useState(false);

  const { data: licenciasData } = useQuery(LICENSES);
  const licencias: Licencia[] = (licenciasData?.licenses ?? []).filter(
    (l: Licencia) => l.status === "ACTIVA",
  );

  const [montar] = useMutation(MONTAR_VIDEO);
  const cliente = useApolloClient();

  /**
   * El estilo de la página: cómo se ven sus videos.
   *
   * Se lee una vez y se aplica al cargar un link, no sobre lo que ya está en
   * pantalla: pisar un montaje en curso porque llegó una consulta sería
   * borrarle a alguien lo que estaba haciendo.
   */
  const { data: estiloData } = useQuery(ESTILO_MONTAJE, {
    variables: { pageId: activa?.pageId },
    skip: !activa,
  });
  const estilo = estiloData?.estiloMontaje?.config ?? null;
  const [guardarEstilo] = useMutation(GUARDAR_ESTILO_MONTAJE);
  const [estiloGuardado, setEstiloGuardado] = useState(false);

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
    /** Cuántos hay delante. Solo tiene sentido mientras espera turno. */
    posicionEnCola?: number;
  } | null>(null);
  /**
   * Hay un render en curso o esperando turno.
   *
   * Ojo con lo que YA NO significa: antes esto congelaba la pantalla entera.
   * Con cola es lo contrario — mientras uno se arma se prepara el siguiente, y
   * eso es justamente lo que convierte setenta minutos de espera atendida en
   * setenta de máquina trabajando sola. Editar acá no toca el render en marcha:
   * el servidor se quedó con una copia del pedido al encolarlo.
   */
  const montando =
    trabajo?.estado === "RENDERIZANDO" || trabajo?.estado === "EN_COLA";

  /**
   * Lo último que se mandó a la fila, serializado.
   *
   * Es contra el doble clic: sin esto, apretar Generar dos veces encola el
   * mismo video dos veces y se lo cobra dos veces a la única vCPU. Cambiar algo
   * lo habilita de nuevo, que es lo correcto — ahí ya es otro video.
   */
  const [ultimoEnviado, setUltimoEnviado] = useState<string | null>(null);

  const zonaPaneles = useRef<HTMLDivElement>(null);
  const altoPanel = useAltoDisponible(zonaPaneles);
  /** El preview es lo que mas se mira: no comparte el tope del editor. */
  const [altoPreview, setAltoPreview] = useState(560);
  useEffect(() => {
    const medir = () =>
      setAltoPreview(Math.max(360, Math.min(640, window.innerHeight - 230)));
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  const esMovil = useEsMovil();

  const videoMaestro = useRef<HTMLVideoElement | null>(null);
  const videosPreview = useRef<Set<HTMLVideoElement>>(new Set());

  /**
   * Dónde mirar cada grabación, por ruta de storage.
   *
   * Es un mapa y no una sola URL porque cada momento puede traer la suya. Vive
   * acá arriba porque la necesitan dos: el panel, para los círculos con el ▶, y
   * el preview, para componer la toma correcta en cada momento.
   *
   * No entra en el montaje: eso viaja al backend, que recibe la RUTA y arma la
   * URL pública él mismo, para que nadie apunte la cámara a un archivo ajeno.
   */
  const [urlsPorRuta, setUrlsPorRuta] = useState<Record<string, string>>({});
  const registrarUrl = useCallback((ruta: string, url: string | null) => {
    if (!url) return;
    setUrlsPorRuta((m) => (m[ruta] === url ? m : { ...m, [ruta]: url }));
  }, []);

  const aspectoFuente = fuente ? fuente.ancho / fuente.alto : 9 / 16;
  const valorProporcion =
    PROPORCIONES.find((p) => p.id === proporcion)?.valor ?? null;

  const cambiar = useCallback((parcial: Partial<Montaje>) => {
    setMontaje((m) => ({ ...m, ...parcial }));
  }, []);

  /**
   * El formato elegido, solo para marcar cuál está activo.
   *
   * No se guarda en el montaje: lo que importa es el resultado, no de qué botón
   * salió. Si después movés algo a mano, el montaje sigue siendo válido aunque
   * ya no coincida con ningún preset.
   */
  const [formatoElegido, setFormatoElegido] = useState<string | null>(null);

  /**
   * Guiado o todo junto.
   *
   * La pantalla con todos los paneles abiertos funciona para quien ya conoce la
   * herramienta, pero obliga a saber en que orden atacarla. El guiado hace una
   * pregunta por vez, en el orden en que se decide de verdad.
   *
   * Conviven en vez de reemplazarse: el que ya sabe lo que hace no tiene por que
   * pasar por cinco pantallas para mover un slider.
   */
  const [modo, setModo] = useState<"guiado" | "completo">("guiado");
  const [paso, setPaso] = useState(1);
  useEffect(() => {
    const g = localStorage.getItem("montajeModo");
    if (g === "completo") setModo("completo");
  }, []);

  const PASOS = [
    { n: 1, titulo: "El video", ayuda: "Pegá el link y elegí qué parte se ve" },
    { n: 2, titulo: "Qué armás", ayuda: "El formato decide cómo se ve todo" },
    { n: 3, titulo: "Tu parte", ayuda: "Grabá lo que vas a decir" },
    { n: 4, titulo: "Subtítulos", ayuda: "Opcional, se transcribe solo" },
    { n: 5, titulo: "Titulares", ayuda: "Opcional, el texto de arriba y abajo" },
  ];
  const guiado = modo === "guiado";
  const ve = (n: number) => !guiado || paso === n;

  function cambiarModo(m: "guiado" | "completo") {
    setModo(m);
    localStorage.setItem("montajeModo", m);
  }

  /**
   * Con la cámara en banda, mover su alto reacomoda el video.
   *
   * Son dos mitades de una misma decisión: agrandar la banda sin achicar el
   * video deja al video tapado, y achicarla deja negro. Pedirle a alguien que
   * ajuste las dos a mano es pedirle que haga la cuenta.
   */
  const alturaBanda =
    montaje.camara?.posicion === "BANDA_ABAJO" ? montaje.camara.tamano : null;
  useEffect(() => {
    if (alturaBanda === null || !fuente) return;
    setMontaje((m) => ({ ...m, video: encajarVideoSobreBanda(m, aspectoFuente) }));
  }, [alturaBanda, aspectoFuente, fuente]);

  function aplicarFormato(id: string) {
    const f = FORMATOS_LISTOS.find((x) => x.id === id);
    if (!f) return;
    setFormatoElegido(id);
    setMontaje((m) => ({
      ...m,
      ...f.ajustes(m, aspectoFuente),
      momentos: f.momentos(duracionTrim).map((mo, i) => ({
        ...mo,
        id: `${id}-${i}`,
      })),
    }));
  }

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

  /**
   * Estado del reproductor.
   *
   * `reproduciendo` se sigue del video del editor y no de lo que se apretó: el
   * preview detiene los videos por su cuenta durante una pausa, así que un
   * booleano manejado a mano quedaría mintiendo apenas empieza la primera.
   */
  const [reproduciendo, setReproduciendo] = useState(false);
  const [sonido, setSonido] = useState(false);

  useEffect(() => {
    const v = videoMaestro.current;
    if (!v) return;
    const anda = () => setReproduciendo(true);
    const para = () => setReproduciendo(false);
    v.addEventListener("play", anda);
    v.addEventListener("pause", para);
    v.addEventListener("ended", para);
    return () => {
      v.removeEventListener("play", anda);
      v.removeEventListener("pause", para);
      v.removeEventListener("ended", para);
    };
  }, [fuente]);

  function alternarReproduccion() {
    const v = videoMaestro.current;
    // Si quedó al final del tramo, "reproducir" tiene que volver a empezar:
    // apretar play y que no pase nada se siente como que está roto.
    const alFinal = v && v.currentTime >= montaje.trim.hastaSeg - 0.1;
    if (reproduciendo) {
      conTodos((x) => x.pause());
    } else if (alFinal) {
      desdeElInicio();
    } else {
      conTodos((x) => void x.play().catch(() => {}));
    }
  }

  function desdeElInicio() {
    conTodos((v) => {
      v.currentTime = montaje.trim.desdeSeg;
      void v.play().catch(() => {});
    });
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
      // El estilo de la página es el punto de partida, no un extra: es lo que
      // evita tomar diez veces por día las mismas diez decisiones.
      setMontaje(aplicarEstilo(montajeInicial(), estilo));
      const formato = formatoDelEstilo(estilo);
      if (formato) setFormatoElegido(formato);
      // Link nuevo, borrador nuevo: si se siguiera pisando el anterior, cargar
      // otro video borraria el trabajo del primero sin avisar.
      borrador.adoptar(null, null);
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
            volumenVideo: montaje.volumenVideo,
            subtitulos: montaje.subtitulos,
            // El id de cada fila es solo para React; el backend no lo espera.
            momentos: montaje.camara
              ? montaje.momentos.map(
                  ({ tipo, desdeSeg, duracionSeg, origenStoragePath }) => ({
                    tipo,
                    desdeSeg,
                    duracionSeg,
                    origenStoragePath: origenStoragePath ?? null,
                  }),
                )
              : [],
          },
        },
      });
      const t = data?.montarVideo;
      if (t) {
        setTrabajo(t);
        setUltimoEnviado(JSON.stringify(datosBorrador?.config ?? null));
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
    if (!trabajo || !activa) return;
    if (trabajo.estado !== "RENDERIZANDO" && trabajo.estado !== "EN_COLA") return;

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
        const e = data.montajeTrabajo.estado;
        if (e !== "RENDERIZANDO" && e !== "EN_COLA") {
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
        const e = data?.montajeTrabajo?.estado;
        if (e === "RENDERIZANDO" || e === "EN_COLA") {
          setTrabajo(data.montajeTrabajo);
        } else {
          localStorage.removeItem(CLAVE_TRABAJO);
        }
      })
      .catch(() => localStorage.removeItem(CLAVE_TRABAJO));
    // Solo al montar: es un rescate, no un seguimiento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa]);

  /**
   * Lo que se guarda como borrador.
   *
   * Va memoizado por contenido y no armado en cada render: el hook reinicia su
   * espera cada vez que este objeto cambia de identidad, y la pantalla se
   * redibuja una vez por segundo mientras algo renderiza. Con un objeto nuevo
   * cada vez, la espera nunca llegaría a cumplirse y no se guardaría jamás.
   */
  const datosBorrador = useMemo<DatosBorrador | null>(() => {
    // Sin video cargado no hay nada que guardar: un borrador vacío por página
    // ensuciaría el historial con filas que no se pueden abrir.
    if (!fuente) return null;
    return {
      config: {
        // Versión del formato. La configuración se guarda como JSON sin validar,
        // así que al leerla hay que poder reconocer lo que no se entiende en vez
        // de hidratar el editor con basura.
        version: 1,
        montaje,
        fuente,
        proporcion,
        formatoElegido,
        licenciaId,
      },
      nombre: nombreDeBorrador(montaje, fuente),
      origenUrl: fuente.origenUrl,
    };
  }, [fuente, montaje, proporcion, formatoElegido, licenciaId]);

  const borrador = useGuardadoAutomatico({
    pageId: activa?.pageId,
    datos: datosBorrador,
  });

  /**
   * Deja el editor como estaba en un borrador guardado.
   *
   * Desconfía del contenido a propósito: es JSON que el backend guarda sin
   * mirar, así que un borrador viejo o de otra versión del editor podría no
   * tener la forma que se espera. Ante la duda no se hidrata nada — perder un
   * borrador raro es molesto; hidratar el editor a medias lo deja en un estado
   * imposible de entender.
   */
  const aplicarBorrador = useCallback(
    (id: string, config: unknown): boolean => {
      const c = config as Record<string, any> | null;
      if (!c || c.version !== 1 || !c.montaje || !c.fuente?.storagePath) {
        return false;
      }
      setFuente(c.fuente);
      setMontaje(c.montaje);
      setProporcion(typeof c.proporcion === "string" ? c.proporcion : "libre");
      setFormatoElegido(c.formatoElegido ?? null);
      setLicenciaId(typeof c.licenciaId === "string" ? c.licenciaId : "");
      setUrl(c.fuente.origenUrl ?? "");
      borrador.adoptar(id, config);
      return true;
    },
    [borrador],
  );

  /** Abre un montaje de la lista y deja el editor como estaba. */
  const abrirBorrador = useCallback(
    async (id: string) => {
      if (!activa) return;
      setError(null);
      try {
        const { data } = await cliente.query({
          query: MONTAJE_GUARDADO,
          variables: { id, pageId: activa.pageId },
          fetchPolicy: "network-only",
        });
        const g = data?.montajeGuardado;
        if (!g?.config || !aplicarBorrador(g._id, g.config)) {
          setError(
            "Ese montaje se guardó con una versión anterior del editor y ya no se puede abrir.",
          );
        }
      } catch {
        setError("No se pudo abrir ese montaje");
      }
    },
    [activa, cliente, aplicarBorrador],
  );

  // Al abrir la pantalla, retomar el borrador que quedó a medias.
  useEffect(() => {
    if (fuente || !activa) return;
    const guardado = localStorage.getItem(CLAVE_BORRADOR);
    if (!guardado) return;
    cliente
      .query({
        query: MONTAJE_GUARDADO,
        variables: { id: guardado, pageId: activa.pageId },
        fetchPolicy: "network-only",
      })
      .then(({ data }) => {
        const g = data?.montajeGuardado;
        if (!g?.config || !aplicarBorrador(g._id, g.config)) {
          localStorage.removeItem(CLAVE_BORRADOR);
        }
      })
      .catch(() => {
        // Puede ser un borrador borrado desde otra pestaña, o de una página a
        // la que ya no se tiene acceso. En cualquier caso, olvidarlo.
        localStorage.removeItem(CLAVE_BORRADOR);
      });
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
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold">Montaje</h1>
          {fuente && <EstadoBorrador estado={borrador.estado} />}
        </div>
        <p className="mt-1 text-sm text-white/50">
          De un link a un video listo: elegí el área útil, escribí los titulares
          y generá. Queda en revisión, no se publica solo.
        </p>
      </div>

      <div className="pb-20 lg:pb-0">
      {montando && (
        <div className="mb-4 rounded-xl border border-[#0FED9D]/30 bg-[#0FED9D]/5 p-4">
          <div className="flex items-center justify-between text-sm">
            {/* Arriba del 95% ffmpeg ya termino y lo que queda es subir a
                Bunny, que son varias decenas de megas y no reporta avance.
                Decirlo evita que el ultimo tramo se lea como un cuelgue. */}
            <span className="font-medium text-[#0FED9D]">
              {/* Esperando turno no es lo mismo que armandose: con la cola, un
                  0% quieto es normal, y decir "componiendo" lo haria parecer
                  colgado justo cuando todo esta bien. */}
              {trabajo?.estado === "EN_COLA"
                ? (trabajo?.posicionEnCola ?? 0) === 0
                  ? "Es el siguiente"
                  : `Esperando turno · ${trabajo?.posicionEnCola} delante`
                : (trabajo?.progreso ?? 0) >= 95
                  ? "Subiendo el video"
                  : `Componiendo el video · ${Math.round(trabajo?.progreso ?? 0)}%`}
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

      {activa && <ColaRenders pageId={activa.pageId} excluir={trabajo?._id} />}

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
      {ve(1) && (
      <div className="mx-auto mb-4 flex w-full max-w-[1010px] flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@usuario/video/..."

          className="min-w-0 flex-1 disabled:opacity-40 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none transition focus:border-[#0FED9D]/50"
        />
        <button
          onClick={cargar}
          disabled={cargando || !url.trim()}
          className="rounded-lg bg-[#0FED9D] px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-40"
        >
          {cargando ? "Descargando…" : "Cargar video"}
        </button>
      </div>
      )}

      {/* Solo con la pantalla vacía: con un video cargado, lo que se está
          haciendo es ESE video y la lista de los viejos estorba. */}
      {ve(1) && !fuente && activa && (
        <HistorialMontajes
          pageId={activa.pageId}
          puede={puede}
          onAbrir={abrirBorrador}
        />
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Este div envolvia la pantalla para atenuarla y bloquearla mientras
          renderizaba. Con cola ya no se bloquea nada —se sigue trabajando
          mientras la fila avanza— asi que quedo sin atributos. Se conserva el
          envoltorio para no reindentar quinientas lineas por nada. */}
      <div>
        {/* Dos columnas: a la izquierda se trabaja, a la derecha se ve el
            resultado. La derecha queda FIJA al hacer scroll porque todo lo de
            la izquierda la modifica: antes los titulares estaban cien lineas
            debajo del preview, o sea que se escribia a ciegas justo donde mas
            falta verlo. */}
        <div className="grid justify-center gap-5 lg:grid-cols-[minmax(0,600px)_minmax(0,400px)]">
          <div ref={zonaPaneles} className="min-w-0 space-y-4">
            {/* La barra de pasos. Con todos los paneles abiertos hay que saber
                en que orden atacarlos; una pregunta por vez saca esa carga. */}
            {guiado && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] text-white/35">
                      Paso {paso} de {PASOS.length}
                    </span>
                    <p className="truncate text-sm font-semibold text-white/90">
                      {PASOS[paso - 1].titulo}
                    </p>
                    <p className="truncate text-[11px] text-white/40">
                      {PASOS[paso - 1].ayuda}
                    </p>
                  </div>
                  <button
                    onClick={() => cambiarModo("completo")}
                    className="shrink-0 text-[11px] text-white/35 underline transition hover:text-white/70"
                  >
                    Ver todo el editor
                  </button>
                </div>
                <div className="mt-2.5 flex gap-1">
                  {PASOS.map((x) => (
                    <button
                      key={x.n}
                      onClick={() => setPaso(x.n)}
                      aria-label={x.titulo}
                      className={`h-1 flex-1 rounded-full transition ${
                        x.n <= paso ? "bg-[#0FED9D]" : "bg-white/15"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {!guiado && (
              <button
                onClick={() => {
                  cambiarModo("guiado");
                  setPaso(1);
                }}
                className="self-start text-[11px] text-white/35 underline transition hover:text-white/70"
              >
                ← Volver al modo guiado
              </button>
            )}

            <Bloque numero={1} titulo="Elegí el área útil" oculto={!ve(1)}>
          {fuente ? (
            <>
              {/* Se acota el ANCHO para que el alto derivado entre en el
                  espacio libre. Un `max-height` sobre una caja con
                  `aspect-ratio` la recorta en vez de achicarla; topeando el
                  ancho, el alto lo sigue solo y la proporción queda intacta.
                  El ancho depende de la proporción REAL del video, así que un
                  vertical y un horizontal ocupan el mismo alto y el panel no
                  salta de tamaño al cargar otro material. */}
              {/* Apilado y no en fila. El ancho del video sale de
                  `altoPanel * aspectoFuente`: con un video horizontal eso daba
                  712px dentro de una columna de 600, asi que a los controles no
                  les quedaba nada y se desbordaban en una tira vertical.
                  El tope contra el ancho disponible es lo que lo garantiza. */}
              <div className="flex flex-col gap-4">
              <div
                className="mx-auto w-full shrink-0"
                style={{ maxWidth: Math.min(altoPanel * aspectoFuente, 540) }}
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
              {/* El audio del video de origen. Es distinto de la atenuacion por
                  aparicion: eso baja el original solo mientras hablas encima,
                  esto es el nivel de base. */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-white/35">Audio del video</span>
                {VOLUMENES.map((v) => (
                  <Chip
                    key={v.etiqueta}
                    activo={Math.abs(montaje.volumenVideo - v.valor) < 0.05}
                    onClick={() => cambiar({ volumenVideo: v.valor })}
                  >
                    {v.etiqueta}
                  </Chip>
                ))}
              </div>

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

                </div>
              )}
              </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-white/15 px-6 py-10 text-center text-xs text-white/25">
              Pegá un link de TikTok arriba para empezar
            </div>
          )}
            </Bloque>

            {/* Lo opcional viene plegado: el camino corto es pegar el link,
                encuadrar y generar. Desplegarlo es una decisión, no un peaje. */}
            {/* Un formato en vez de seis decisiones sueltas.
                Antes había que acomodar a mano el lienzo, el fondo, dónde va el
                video, la forma de la cámara y los momentos —cinco controles
                repartidos en dos columnas— para llegar a algo que en realidad es
                UN formato conocido. */}
            {fuente && ve(2) && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-white/35">
                  Qué querés armar
                </h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {FORMATOS_LISTOS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => aplicarFormato(f.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        formatoElegido === f.id
                          ? "border-[#0FED9D]/60 bg-[#0FED9D]/10"
                          : "border-white/10 hover:border-white/25 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`block text-xs font-semibold ${
                          formatoElegido === f.id ? "text-[#0FED9D]" : "text-white/80"
                        }`}
                      >
                        {f.nombre}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-white/40">
                        {f.detalle}
                      </span>
                    </button>
                  ))}
                </div>

              </div>
            )}

            {fuente && ve(4) && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  {/* Un interruptor y nada mas. Elegir por separado si se
                      subtitula el video o la camara es una pregunta que casi
                      nadie quiere contestar: quien mira no distingue de donde
                      sale cada voz. */}
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 p-3 transition hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={montaje.subtitulos.activos}
                      onChange={(e) =>
                        cambiar({
                          subtitulos: {
                            ...montaje.subtitulos,
                            activos: e.target.checked,
                          },
                        })
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#0FED9D]"
                    />
                    <span>
                      <span className="block text-xs font-medium text-white/80">
                        Subtítulos automáticos
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-white/40">
                        Transcribe lo que se dice —el video y vos— y lo escribe
                        palabra por palabra. Suma medio minuto al render.
                      </span>
                    </span>
                  </label>
              </div>
            )}

            <BloqueOpcional
              numero={2}
              titulo="Titulares"
              oculto={!ve(5)}
              abierto={guiado}
              resumen={
                [montaje.textoSuperior, montaje.textoInferior]
                  .filter((t) => t.contenido.trim())
                  .map((t) => `“${t.contenido.trim().slice(0, 22)}”`)
                  .join(" · ") || "Sin titulares"
              }
            >
              <div className="grid gap-4">
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
              oculto={!ve(3)}
              abierto={guiado}
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
                pageId={activa.pageId}
                urlsPorRuta={urlsPorRuta}
                onUrl={registrarUrl}
                onCamara={(camara) => cambiar({ camara })}
                onMomentos={(momentos) => cambiar({ momentos })}
              />
            </BloqueOpcional>

            {guiado && (
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setPaso((n) => Math.max(1, n - 1))}
                  disabled={paso === 1}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-xs text-white/60 transition hover:bg-white/5 disabled:opacity-30"
                >
                  Atrás
                </button>
                {paso < PASOS.length ? (
                  <button
                    onClick={() => setPaso((n) => Math.min(PASOS.length, n + 1))}
                    className="rounded-lg bg-white/10 px-6 py-2.5 text-xs font-medium text-white/80 transition hover:bg-white/15"
                  >
                    {/* Los opcionales lo dicen: seguir sin tocarlos es una
                        opcion valida, no algo que uno se saltea mal. */}
                    {paso === 4 || paso === 5 ? "Saltear" : "Siguiente"}
                  </button>
                ) : (
                  <span className="text-[11px] text-white/35">
                    Listo — generá el video con el botón de la derecha
                  </span>
                )}
              </div>
            )}

            {/* Los ajustes del lienzo estaban en la columna de la derecha,
                que debería ser solo para MIRAR. Con decisiones de los dos lados
                uno termina editando en dos lugares a la vez, y "Tamaño" y
                "Posición" significaban una cosa acá y otra allá. Ahora viven
                donde se decide, y plegados: casi nunca hay que tocarlos. */}
            <BloqueOpcional
              numero={4}
              titulo="Ajustes del lienzo"
              oculto={guiado}
              resumen={`${montaje.lienzo.ancho}×${montaje.lienzo.alto} · ${
                montaje.fondo.tipo === "SOLIDO" ? "fondo liso" : "desenfoque"
              }`}
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
              </div>
            </BloqueOpcional>
          </div>

          <div
            className={`order-first space-y-3 self-start lg:order-none lg:sticky lg:top-4 ${
              fuente ? "" : "hidden"
            }`}
          >
            <h2 className="hidden text-xs font-medium uppercase tracking-wider text-white/35 lg:block">
              Cómo va a quedar
            </h2>
            {/* Mismo tope de alto que el editor: con el ancho fijo en 300, un
                lienzo 9:16 daba 533px y el preview terminaba siendo lo mas alto
                de la pantalla, justo lo que se venia a achicar. */}
            <div
              className="mx-auto w-full lg:static lg:bg-transparent lg:py-0 sticky top-0 z-20 bg-[#0a0a0a] py-2"
              style={{
                // El preview heredaba el tope de alto del editor —400px— y en
                // 9:16 eso lo dejaba en 225 de ancho: una miniatura para juzgar
                // encuadre, tamaño de la banda y legibilidad del texto. Es lo
                // que mas se mira de la pantalla, asi que se le da su propio
                // limite, atado al alto de la ventana para que no se corte.
                maxWidth: Math.min(
                  esMovil ? 150 : 360,
                  ((esMovil ? 260 : altoPreview) * montaje.lienzo.ancho) /
                    montaje.lienzo.alto,
                ),
              }}
            >
            <PreviewFinal
              montaje={montaje}
              src={fuente?.publicUrl ?? null}
              aspectoFuente={aspectoFuente}
              registrarVideo={registrarVideo}
              urlsPorRuta={urlsPorRuta}
              duracionBase={duracionTrim}
              sonido={sonido}
            />
            </div>
            {/* Antes habia un solo boton que SIEMPRE volvia al principio:
                para revisar un detalle del segundo 40 habia que mirar los
                40 anteriores, y no habia forma de frenar ni de escuchar. */}
            <div className="mt-2 flex items-center gap-1.5">
              <button
                onClick={alternarReproduccion}
                className="flex-1 rounded-lg border border-white/10 py-2 text-xs text-white/60 transition hover:bg-white/5"
              >
                {reproduciendo ? "⏸ Pausar" : "▶ Reproducir"}
              </button>
              <button
                onClick={desdeElInicio}
                title="Volver al inicio del tramo"
                aria-label="Volver al inicio del tramo"
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/5"
              >
                ⏮
              </button>
              <button
                onClick={() => setSonido((s) => !s)}
                title={sonido ? "Silenciar" : "Activar el sonido"}
                aria-label={sonido ? "Silenciar" : "Activar el sonido"}
                className={`rounded-lg border px-3 py-2 text-xs transition ${
                  sonido
                    ? "border-[#0FED9D]/40 bg-[#0FED9D]/10 text-[#0FED9D]"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                {sonido ? "🔊" : "🔇"}
              </button>
            </div>


            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="space-y-3">
          <button
            onClick={generar}
            disabled={!fuente || ultimoEnviado === JSON.stringify(datosBorrador?.config ?? null)}
            className="rounded-lg bg-[#0FED9D] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
          >
            {ultimoEnviado === JSON.stringify(datosBorrador?.config ?? null) ? "En la fila" : "Generar video"}
          </button>

          {/* Guardar el estilo es una linea gris y no un boton grande: se usa
              una vez cada tantos videos, cuando uno decide que ASI es como
              quiere que se vean. Compite mal con Generar por la atencion. */}
          {fuente && puede && (
            <button
              onClick={async () => {
                if (!activa) return;
                try {
                  await guardarEstilo({
                    variables: {
                      pageId: activa.pageId,
                      config: extraerEstilo(montaje, formatoElegido),
                    },
                  });
                  setEstiloGuardado(true);
                  setTimeout(() => setEstiloGuardado(false), 2500);
                } catch {
                  setError("No se pudo guardar el estilo");
                }
              }}
              className="text-left text-xs text-white/45 underline underline-offset-2 transition hover:text-white/70"
            >
              {estiloGuardado
                ? "Listo: los próximos videos arrancan así"
                : "Guardar esto como el estilo de la página"}
            </button>
          )}

          {/* La licencia como una linea y no como una tarjeta: importa al
              publicar, no mientras se edita, y ocupaba lugar fijo diciendo algo
              que casi nunca cambia. */}
          <button
            onClick={() => setVerLicencia(true)}
            className="w-full text-center text-[11px] text-white/30 underline transition hover:text-white/60"
          >
            {licenciaId ? "Licencia elegida · cambiar" : "Sin licencia · elegir"}
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
            disabled={!fuente || ultimoEnviado === JSON.stringify(datosBorrador?.config ?? null)}
            className="shrink-0 rounded-lg bg-[#0FED9D] px-5 py-2.5 text-sm font-semibold text-black transition disabled:opacity-40"
          >
            {ultimoEnviado === JSON.stringify(datosBorrador?.config ?? null) ? "En la fila" : "Generar"}
          </button>
        </div>
      )}

      {verLicencia && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setVerLicencia(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Licencia</h3>
              <button
                onClick={() => setVerLicencia(false)}
                className="text-white/40 transition hover:text-white"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
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
              onClick={() => setVerLicencia(false)}
              className="mt-3 w-full rounded-lg bg-white/10 py-2.5 text-xs font-medium text-white/80 transition hover:bg-white/15"
            >
              Listo
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

/** Un paso del trabajo. Numerado para que el orden se lea sin explicarlo. */
/**
 * Con qué nombre aparece un borrador en la lista.
 *
 * El titular primero: es lo que uno escribió y por lo tanto lo que reconoce.
 * Si todavía no hay ninguno queda el id del video de TikTok, que al menos
 * distingue un borrador de otro — mucho mejor que veinte filas iguales.
 */
function nombreDeBorrador(m: Montaje, f: Fuente): string {
  const titular =
    m.textoSuperior.contenido.trim() || m.textoInferior.contenido.trim();
  if (titular) return titular.replace(/\s+/g, " ").slice(0, 80);

  const id = f.origenUrl.match(/\/video\/(\d+)/)?.[1];
  return id ? `TikTok ${id}` : "Montaje sin nombre";
}

/**
 * El cartelito de guardado.
 *
 * Chico y sin color salvo cuando algo falla: el guardado automático funciona
 * bien cuando no se lo nota, y un aviso verde parpadeando cada dos segundos es
 * exactamente lo contrario. Lo que sí tiene que gritar es el error, porque ahí
 * el trabajo está en riesgo y hay que enterarse.
 */
function EstadoBorrador({ estado }: { estado: EstadoGuardado }) {
  if (estado === "limpio") return null;
  if (estado === "error") {
    return (
      <span className="text-xs text-red-400">
        No se pudo guardar · se reintenta al siguiente cambio
      </span>
    );
  }
  return (
    <span className="text-xs text-white/35">
      {estado === "guardando" ? "Guardando…" : "Guardado"}
    </span>
  );
}

function Bloque({
  numero,
  titulo,
  oculto,
  children,
}: {
  numero: number;
  titulo: string;
  /** En modo guiado solo se ve el paso actual. */
  oculto?: boolean;
  children: React.ReactNode;
}) {
  if (oculto) return null;
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
  oculto,
  abierto,
  children,
}: {
  numero: number;
  titulo: string;
  resumen: string;
  oculto?: boolean;
  /** Guiado abre el paso: plegado seria un click de mas sobre lo que se vino a hacer. */
  abierto?: boolean;
  children: React.ReactNode;
}) {
  if (oculto) return null;
  return (
    <details
      open={abierto}
      className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4"
    >
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
