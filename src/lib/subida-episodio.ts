"use client";

import * as tus from "tus-js-client";

/**
 * Subida directa de un episodio largo a Bunny Stream, por TUS.
 *
 * Un episodio de dos horas pesa varios GB. Por el backend (como `upload.ts`)
 * no entra: el droplet se queda sin memoria o la petición vence antes de
 * terminar. Acá el archivo va del navegador a Bunny, en pedazos, y el backend
 * solo firma.
 *
 * Lo que da TUS y no da un PUT normal es retomar: Bunny recuerda cuántos bytes
 * recibió, y si la conexión se corta se sigue desde ahí, no desde cero.
 */

/** Lo que devuelve `prepararSubidaEpisodio` / `renovarSubidaEpisodio`. */
export interface CredencialesTus {
  endpoint: string;
  libraryId: string;
  videoId: string;
  /** Segundos UNIX, como string porque viaja como header. */
  expiracion: string;
  firma: string;
}

export type EstadoSubida =
  | "subiendo"
  | "reintentando"
  | "sin-conexion"
  | "pausada"
  | "error"
  | "terminada";

export interface SubidaEpisodio {
  pausar: () => void;
  reanudar: () => void;
  /** Frena y suelta los listeners. Borrar el video es cosa del backend. */
  detener: () => void;
}

/**
 * Tamaño de cada pedazo.
 *
 * Sin `chunkSize`, tus-js-client manda el archivo entero en un solo PATCH, y si
 * ese PATCH se corta no queda ningún offset confirmado del que retomar: se
 * vuelve a empezar de cero, que es justo lo que este flujo existe para evitar.
 * Con pedazos, lo peor que se pierde en un corte es uno.
 *
 * 50 MB y no 5: pedazos chicos multiplican las peticiones y bajan mucho la
 * velocidad, y en un archivo de varios GB eso son horas. 50 MB en una conexión
 * doméstica es menos de un minuto de trabajo perdido por corte.
 */
const TAMANO_PEDAZO = 50 * 1024 * 1024;

/**
 * En cuántas partes se sube el archivo a la vez.
 *
 * Una sola conexión hacia el endpoint de Bunny (Chicago, ~95 ms desde aquí) se
 * estanca en 6-8 Mbps aunque la línea dé 35: lo mide cualquier prueba de una
 * conexión contra varias. Cuatro partes en paralelo llenan la línea. Bunny
 * acepta la extensión `concatenation` de TUS, que es la que las junta al final.
 */
const PARTES_EN_PARALELO = 4;

/**
 * Debajo de esto no vale la pena partir: el POST extra que junta las partes
 * cuesta más de lo que se gana.
 */
const MINIMO_PARA_PARALELO = 200 * 1024 * 1024;

/**
 * Cuánto esperar entre reintentos. Suman unos 12 minutos: alcanza para un
 * corte de wifi o un cambio de red sin que nadie tenga que tocar nada. Si se
 * agotan, la subida queda en error y se retoma sola al volver la conexión.
 */
const ESPERAS_REINTENTO = [
  0, 1_000, 3_000, 5_000, 10_000, 20_000, 30_000, 60_000, 60_000, 120_000,
  120_000, 300_000,
];

/**
 * Margen antes del vencimiento de la firma para pedir otra.
 *
 * Se renueva ANTES de que venza y no al recibir el 401: tus-js-client no
 * reintenta los 4xx, así que esperar al error frenaría la subida.
 */
const MARGEN_RENOVACION_MS = 10 * 60 * 1000;

export async function iniciarSubidaTus(opts: {
  archivo: File;
  titulo: string;
  credenciales: CredencialesTus;
  renovar: () => Promise<CredencialesTus>;
  onProgreso: (subidos: number, total: number) => void;
  onEstado: (estado: EstadoSubida, mensaje?: string) => void;
}): Promise<SubidaEpisodio> {
  const { archivo, renovar, onProgreso, onEstado } = opts;
  let cred = opts.credenciales;
  let yaRenovoPorError = false;
  let pausada = false;
  let detenida = false;
  // Solo se relanza por `online` una subida que está frenada por error. Llamar
  // `start()` sobre una que sigue viva abriría dos PATCH sobre el mismo offset.
  let frenada = false;

  const metadata = {
    // Bunny exige los dos. Algunos .mov llegan sin tipo desde el navegador.
    filetype: archivo.type || "video/mp4",
    title: opts.titulo,
  };

  const upload = new tus.Upload(archivo, {
    endpoint: cred.endpoint,
    chunkSize: TAMANO_PEDAZO,
    retryDelays: ESPERAS_REINTENTO,
    parallelUploads:
      archivo.size >= MINIMO_PARA_PARALELO ? PARTES_EN_PARALELO : 1,
    metadata,
    // Las partes llevan su propia metadata, que por defecto va vacía; Bunny
    // exige la misma que el video entero.
    metadataForPartialUploads: metadata,
    /**
     * La huella con la que tus-js-client guarda en localStorage dónde quedó
     * cada subida.
     *
     * La de fábrica es nombre + tamaño + fecha del archivo + endpoint. Con
     * Bunny el endpoint es uno solo para todo, así que subir el mismo archivo
     * como dos episodios distintos retomaría el primero dentro del segundo. Con
     * el `videoId` adentro, cada huella es de un solo video.
     */
    fingerprint: async (file: File) =>
      [
        "bunny-episodio",
        cred.videoId,
        file.name,
        file.size,
        file.lastModified,
      ].join("-"),
    removeFingerprintOnSuccess: true,

    // Los headers de Bunny van acá y no en `headers` porque la firma puede
    // cambiar a mitad de camino: cada petición lleva la vigente.
    onBeforeRequest: async (req) => {
      const vence = Number(cred.expiracion) * 1000;
      if (vence - Date.now() < MARGEN_RENOVACION_MS) {
        cred = await renovar();
      }
      req.setHeader("AuthorizationSignature", cred.firma);
      req.setHeader("AuthorizationExpire", cred.expiracion);
      req.setHeader("VideoId", cred.videoId);
      req.setHeader("LibraryId", cred.libraryId);
    },

    onProgress: (subidos, total) => {
      onProgreso(subidos, total);
      // Si llegan bytes, la subida siguió: se limpia el "reintentando".
      if (!pausada && !detenida) onEstado("subiendo");
    },

    onShouldRetry: (err, intento) => {
      const status = err.originalResponse?.getStatus() ?? 0;
      // Sin conexión no se gastan reintentos: se espera al evento `online`.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return false;
      }
      // Lo mismo que hace tus-js-client por defecto: los 4xx no se arreglan
      // reintentando, salvo 409/423 (offset desfasado, recurso ocupado).
      const reintentable =
        status === 0 || status >= 500 || status === 409 || status === 423;
      if (reintentable) {
        onEstado("reintentando", `Reintento ${intento + 1}…`);
      }
      return reintentable;
    },

    onError: async (err) => {
      if (detenida || pausada) return;
      const status =
        (err as tus.DetailedError).originalResponse?.getStatus() ?? 0;

      // La firma venció igual (la pestaña estuvo dormida, el reloj de la
      // máquina está corrido). Una firma nueva y se sigue, una sola vez: si
      // vuelve a fallar no es la firma.
      if ((status === 401 || status === 403) && !yaRenovoPorError) {
        yaRenovoPorError = true;
        try {
          cred = await renovar();
          upload.start();
          return;
        } catch {
          // cae al error de abajo
        }
      }

      frenada = true;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        onEstado(
          "sin-conexion",
          "Sin conexión. La subida sigue sola cuando vuelva.",
        );
        return;
      }
      onEstado("error", mensajeDeError(status, err));
    },

    onSuccess: () => {
      soltar();
      onEstado("terminada");
    },
  });

  /**
   * Al volver la conexión se retoma sola. Es lo que cubre el caso más común:
   * el wifi se cayó un rato largo y se agotaron los reintentos.
   */
  function alVolverConexion() {
    if (detenida || pausada || !frenada) return;
    frenada = false;
    onEstado("subiendo");
    upload.start();
  }

  function soltar() {
    window.removeEventListener("online", alVolverConexion);
  }

  window.addEventListener("online", alVolverConexion);

  // Si esta pestaña (o una anterior en este navegador) ya había subido parte
  // de este video, se sigue desde ahí.
  const anteriores = await upload.findPreviousUploads();
  if (anteriores.length) {
    const anterior = anteriores[0];
    // Una subida que empezó por una sola conexión (antes de que existiera el
    // paralelo) se termina igual: en paralelo arrancaría de cero y se perdería
    // lo ya subido.
    if (!anterior.parallelUploadUrls) upload.options.parallelUploads = 1;
    upload.resumeFromPreviousUpload(anterior);
  }
  onEstado("subiendo");
  upload.start();

  return {
    pausar: () => {
      pausada = true;
      void upload.abort();
      onEstado("pausada");
    },
    reanudar: () => {
      pausada = false;
      frenada = false;
      yaRenovoPorError = false;
      onEstado("subiendo");
      upload.start();
    },
    detener: () => {
      detenida = true;
      soltar();
      void upload.abort();
    },
  };
}

function mensajeDeError(status: number, err: Error): string {
  if (status === 401 || status === 403) {
    return "Bunny rechazó la firma de la subida. Probá reanudar; si sigue, avisá.";
  }
  if (status === 413) return "Bunny rechazó el archivo por tamaño.";
  return `La subida se frenó${status ? ` (${status})` : ""}: ${err.message}`;
}
