"use client";

/**
 * Utilidades para subir archivos al backend.
 */

import { CABECERA_IDIOMA, cabeceraIdioma, idiomaActual } from "@/i18n/cliente";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql\/?$/, "") ??
  "http://localhost:4000";

export type UploadResult = {
  url: string;
  path: string;
  storagePath: string;
};

/**
 * Los errores propios de estas funciones, con una clave del namespace
 * `erroresSubida` para que la pantalla los muestre en su idioma
 * (`err instanceof ErrorDeSubida ? t(err.clave, err.datos) : err.message`).
 * El mensaje sigue en español para quien todavía lo muestra tal cual. Lo que
 * responde el backend llega como un `Error` común, como llega.
 */
export type ClaveErrorSubida =
  | "sesionClips" | "soloVideo" | "clipMuyPesado" | "errorClip" | "sinUrlClip"
  | "sesionNotaVoz" | "soloAudio" | "notaVozMuyPesada" | "errorNotaVoz" | "sinUrlNotaVoz"
  | "noSeLeyo" | "sesion" | "urlTiktok" | "errorPreview" | "sesionDescargar"
  | "errorDescargar" | "errorProcesar" | "sinDatosVideo" | "sesionEvidencia"
  | "soloImagenesEvidencia" | "evidenciaMuyPesada" | "errorScreenshot" | "sinUrlScreenshot"
  | "sesionImagenes" | "noEsImagen" | "imagenMuyPesada" | "errorImagen" | "sesionPortada"
  | "errorPortada" | "sesionVideo" | "errorVideo" | "seCorto" | "seCancelo" | "sesionLogo"
  | "logoNoImagen" | "logoMuyPesado" | "errorLogo";

export class ErrorDeSubida extends Error {
  constructor(
    readonly clave: ClaveErrorSubida,
    mensaje: string,
    readonly datos: { status?: number } = {},
  ) {
    super(mensaje);
    this.name = "ErrorDeSubida";
  }
}

/** El mensaje del backend si vino; si no, el propio con su clave. */
function fallo(
  backend: string | undefined,
  clave: ClaveErrorSubida,
  mensaje: string,
  status: number,
): Error {
  return backend ? new Error(backend) : new ErrorDeSubida(clave, mensaje, { status });
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("idToken");
}

/**
 * Sube un clip de video al backend.
 * El clip se guarda en Bunny CDN y se devuelve la URL pública.
 */
export async function uploadClip(file: File): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) {
    throw new ErrorDeSubida("sesionClips", "Sesión requerida para subir clips");
  }

  // Validar tipo de archivo
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const validExtensions = ["mp4", "mov", "webm", "m4v"];
  const isVideoMimetype =
    file.type.startsWith("video/") || file.type === "application/octet-stream";
  const isVideoExtension = validExtensions.includes(ext);

  if (!isVideoMimetype && !isVideoExtension) {
    throw new ErrorDeSubida("soloVideo", "Solo se permiten archivos de video (mp4, mov, webm)");
  }

  // Validar tamaño (500MB max)
  if (file.size > 500 * 1024 * 1024) {
    throw new ErrorDeSubida("clipMuyPesado", "El archivo debe pesar menos de 500MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/uploads/clip`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...cabeceraIdioma(),
    },
    body: formData,
  });

  if (!response.ok) {
    let backend: string | undefined;
    try {
      backend = (await response.json()).message;
    } catch {
      // el backend no siempre responde JSON
    }
    throw fallo(backend, "errorClip", `Error al subir clip (${response.status})`, response.status);
  }

  const json = await response.json();

  if (!json.url) {
    throw new ErrorDeSubida("sinUrlClip", "El servidor no devolvió la URL del clip");
  }

  return {
    url: json.url,
    path: json.path,
    storagePath: json.storagePath || json.path,
  };
}

/**
 * Sube una nota de voz al backend.
 */
export async function uploadVoiceNote(file: File): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) {
    throw new ErrorDeSubida("sesionNotaVoz", "Sesión requerida para subir notas de voz");
  }

  // Validar tipo de archivo
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const validExtensions = ["mp3", "wav", "ogg", "m4a", "webm"];
  const isAudioMimetype =
    file.type.startsWith("audio/") || file.type === "application/octet-stream";
  const isAudioExtension = validExtensions.includes(ext);

  if (!isAudioMimetype && !isAudioExtension) {
    throw new ErrorDeSubida("soloAudio", "Solo se permiten archivos de audio");
  }

  // Validar tamaño (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    throw new ErrorDeSubida("notaVozMuyPesada", "El archivo debe pesar menos de 50MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/uploads/voice-note`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...cabeceraIdioma(),
    },
    body: formData,
  });

  if (!response.ok) {
    let backend: string | undefined;
    try {
      backend = (await response.json()).message;
    } catch {
      // el backend no siempre responde JSON
    }
    throw fallo(backend, "errorNotaVoz", `Error al subir nota de voz (${response.status})`, response.status);
  }

  const json = await response.json();

  if (!json.url) {
    throw new ErrorDeSubida("sinUrlNotaVoz", "El servidor no devolvió la URL de la nota de voz");
  }

  return {
    url: json.url,
    path: json.path,
    storagePath: json.storagePath || json.path,
  };
}

/**
 * Lee un archivo como Data URL para preview local.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ErrorDeSubida("noSeLeyo", "No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export type TikTokPreview = {
  title: string;
  thumbnail: string;
  duration: number;
  author: string;
  videoUrl?: string;
};

/**
 * Obtiene preview/metadata de un video de TikTok sin descargarlo.
 */
export async function getTikTokPreview(url: string): Promise<TikTokPreview> {
  const token = getAuthToken();
  if (!token) {
    throw new ErrorDeSubida("sesion", "Sesión requerida");
  }

  if (!url.includes("tiktok.com")) {
    throw new ErrorDeSubida("urlTiktok", "El URL debe ser de TikTok");
  }

  const response = await fetch(`${API_BASE_URL}/uploads/tiktok/preview`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...cabeceraIdioma(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    let backend: string | undefined;
    try {
      backend = (await response.json()).message;
    } catch {
      // el backend no siempre responde JSON
    }
    throw fallo(backend, "errorPreview", `Error al obtener preview (${response.status})`, response.status);
  }

  return response.json();
}

/**
 * Descarga un video de TikTok y lo sube a Bunny CDN.
 * El backend hace la descarga y subida, devolviendo el mismo resultado que uploadClip.
 */
export async function downloadFromTikTok(url: string): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) {
    throw new ErrorDeSubida("sesionDescargar", "Sesión requerida para descargar videos");
  }

  // Validar que sea un URL de TikTok
  if (!url.includes("tiktok.com")) {
    throw new ErrorDeSubida("urlTiktok", "El URL debe ser de TikTok");
  }

  const response = await fetch(`${API_BASE_URL}/uploads/tiktok`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...cabeceraIdioma(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const json = await response.json().catch(() => ({}));

  // Verificar errores HTTP
  if (!response.ok) {
    throw fallo(json.message, "errorDescargar", `Error al descargar video (${response.status})`, response.status);
  }

  // Verificar que la respuesta sea exitosa
  if (!json.success) {
    throw json.message ? new Error(json.message) : new ErrorDeSubida("errorProcesar", "El servidor reportó un error al procesar el video");
  }

  // Verificar que tengamos los datos necesarios
  if (!json.url || !json.storagePath) {
    throw new ErrorDeSubida("sinDatosVideo", "El servidor no devolvió los datos del video correctamente");
  }

  return {
    url: json.url,
    path: json.path,
    storagePath: json.storagePath || json.path,
  };
}

/**
 * Sube un screenshot de evidencia de licencia.
 */
export async function uploadLicenseScreenshot(file: File): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) {
    throw new ErrorDeSubida("sesionEvidencia", "Sesión requerida para subir evidencia");
  }

  // Validar tipo de archivo
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const validExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
  const isImageMimetype = file.type.startsWith("image/");
  const isImageExtension = validExtensions.includes(ext);

  if (!isImageMimetype && !isImageExtension) {
    throw new ErrorDeSubida("soloImagenesEvidencia", "Solo se permiten imágenes (jpg, png, webp, gif)");
  }

  // Validar tamaño (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new ErrorDeSubida("evidenciaMuyPesada", "El archivo debe pesar menos de 10MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/uploads/license-screenshot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...cabeceraIdioma(),
    },
    body: formData,
  });

  if (!response.ok) {
    let backend: string | undefined;
    try {
      backend = (await response.json()).message;
    } catch {
      // el backend no siempre responde JSON
    }
    throw fallo(backend, "errorScreenshot", `Error al subir screenshot (${response.status})`, response.status);
  }

  const json = await response.json();

  if (!json.url) {
    throw new ErrorDeSubida("sinUrlScreenshot", "El servidor no devolvió la URL del screenshot");
  }

  return {
    url: json.url,
    path: json.path,
    storagePath: json.storagePath || json.path,
  };
}

/**
 * Sube el logo de una fan page. El backend le recorta el fondo y lo deja listo
 * como marca de agua, así que no hace falta exportarlo con transparencia.
 */
export async function uploadLogoPagina(
  file: File,
  pageId: string,
): Promise<UploadResult> {
  return subirImagen("page-logo", file, { pageId });
}

async function subirImagen(
  endpoint: string,
  file: File,
  campos: Record<string, string>,
): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) throw new ErrorDeSubida("sesionImagenes", "Sesión requerida para subir imágenes");
  if (!file.type.startsWith("image/")) {
    throw new ErrorDeSubida("noEsImagen", "El archivo tiene que ser una imagen");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new ErrorDeSubida("imagenMuyPesada", "La imagen debe pesar menos de 25MB");
  }

  const formData = new FormData();
  formData.append("file", file);
  for (const [k, v] of Object.entries(campos)) formData.append(k, v);

  const response = await fetch(`${API_BASE_URL}/uploads/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, ...cabeceraIdioma() },
    body: formData,
  });

  if (!response.ok) {
    let backend: string | undefined;
    try {
      backend = (await response.json()).message;
    } catch {
      // el backend no siempre responde JSON
    }
    throw fallo(backend, "errorImagen", `Error al subir la imagen (${response.status})`, response.status);
  }

  const json = await response.json();
  return { url: json.url, path: json.path, storagePath: json.path };
}

/**
 * Sube una imagen para usar como portada de un video.
 *
 * Solo la guarda: asignarla al expediente es la mutation `usarPortadaSubida`,
 * que es la que puede verificar el acceso a la página.
 */
export async function uploadPortada(
  file: File,
  expedienteId: string
): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) throw new ErrorDeSubida("sesionPortada", "Sesión requerida para subir la portada");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("expedienteId", expedienteId);

  const response = await fetch(`${API_BASE_URL}/uploads/portada`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, ...cabeceraIdioma() },
    body: formData,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.success) {
    throw json.message ? new Error(json.message) : new ErrorDeSubida("errorPortada", "No se pudo subir la portada");
  }
  return { url: json.url, path: json.path, storagePath: json.storagePath };
}

/**
 * Sube el video de cámara que se compone sobre un montaje.
 *
 * `XMLHttpRequest` y no `fetch`: fetch no expone el avance de la subida, y este
 * es el único upload que se hace desde el teléfono. Dos minutos a 1080p son
 * decenas de megas, que por datos móviles es un minuto largo; un spinner sin
 * números durante todo ese rato se lee como colgado, y lo que sigue es cerrar
 * la pestaña con la subida a mitad de camino.
 *
 * `onAvance` recibe el porcentaje entero. Es opcional: desde la computadora la
 * subida es lo bastante rápida como para que no haga falta.
 */
export function uploadCamara(
  file: File,
  onAvance?: (porcentaje: number) => void,
): Promise<UploadResult> {
  const token = getAuthToken();
  if (!token) {
    return Promise.reject(new ErrorDeSubida("sesionVideo", "Sesión requerida para subir el video"));
  }

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/uploads/camara`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader(CABECERA_IDIOMA, idiomaActual());

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onAvance?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let json: any = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // Un cuerpo que no es JSON solo puede significar que fallo antes de
        // llegar al handler; el status de abajo es el que decide.
      }
      if (xhr.status < 200 || xhr.status >= 300 || !json.success) {
        reject(json.message ? new Error(json.message) : new ErrorDeSubida("errorVideo", "No se pudo subir el video"));
        return;
      }
      resolve({ url: json.url, path: json.path, storagePath: json.storagePath });
    };

    // Un corte de red no deja mensaje propio: sin esto el error que llega es un
    // ProgressEvent vacio y la pantalla no sabe que decir.
    xhr.onerror = () =>
      reject(new ErrorDeSubida("seCorto", "Se cortó la conexión mientras se subía el video"));
    xhr.onabort = () => reject(new ErrorDeSubida("seCancelo", "Se canceló la subida"));

    xhr.send(formData);
  });
}

/**
 * Sube el logo de una marca (be#117): el que lleva la plantilla de sus clips.
 * El backend le recorta el fondo y lo deja en la marca. Devuelve su URL.
 */
export async function uploadMarcaLogo(file: File, marcaId: string): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new ErrorDeSubida("sesionLogo", "Sesión requerida para subir el logo");
  if (!file.type.startsWith("image/")) throw new ErrorDeSubida("logoNoImagen", "El logo tiene que ser una imagen (PNG o JPG)");
  if (file.size > 10 * 1024 * 1024) throw new ErrorDeSubida("logoMuyPesado", "El logo debe pesar menos de 10 MB");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("marcaId", marcaId);
  const response = await fetch(`${API_BASE_URL}/uploads/marca-logo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, ...cabeceraIdioma() },
    body: formData,
  });
  if (!response.ok) {
    let backend: string | undefined;
    try {
      backend = (await response.json()).message;
    } catch {
      // el backend no siempre responde JSON
    }
    throw fallo(backend, "errorLogo", `No se pudo subir el logo (${response.status})`, response.status);
  }
  return (await response.json()).url as string;
}
