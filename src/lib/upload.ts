"use client";

/**
 * Utilidades para subir archivos al backend.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql\/?$/, "") ??
  "http://localhost:4000";

export type UploadResult = {
  url: string;
  path: string;
  storagePath: string;
};

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
    throw new Error("Sesión requerida para subir clips");
  }

  // Validar tipo de archivo
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const validExtensions = ["mp4", "mov", "webm", "m4v"];
  const isVideoMimetype =
    file.type.startsWith("video/") || file.type === "application/octet-stream";
  const isVideoExtension = validExtensions.includes(ext);

  if (!isVideoMimetype && !isVideoExtension) {
    throw new Error("Solo se permiten archivos de video (mp4, mov, webm)");
  }

  // Validar tamaño (500MB max)
  if (file.size > 500 * 1024 * 1024) {
    throw new Error("El archivo debe pesar menos de 500MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/uploads/clip`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Error al subir clip (${response.status})`;
    try {
      const json = await response.json();
      errorMsg = json.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const json = await response.json();

  if (!json.url) {
    throw new Error("El servidor no devolvió la URL del clip");
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
    throw new Error("Sesión requerida para subir notas de voz");
  }

  // Validar tipo de archivo
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const validExtensions = ["mp3", "wav", "ogg", "m4a", "webm"];
  const isAudioMimetype =
    file.type.startsWith("audio/") || file.type === "application/octet-stream";
  const isAudioExtension = validExtensions.includes(ext);

  if (!isAudioMimetype && !isAudioExtension) {
    throw new Error("Solo se permiten archivos de audio");
  }

  // Validar tamaño (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("El archivo debe pesar menos de 50MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/uploads/voice-note`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Error al subir nota de voz (${response.status})`;
    try {
      const json = await response.json();
      errorMsg = json.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const json = await response.json();

  if (!json.url) {
    throw new Error("El servidor no devolvió la URL de la nota de voz");
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
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
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
    throw new Error("Sesión requerida");
  }

  if (!url.includes("tiktok.com")) {
    throw new Error("El URL debe ser de TikTok");
  }

  const response = await fetch(`${API_BASE_URL}/uploads/tiktok/preview`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    let errorMsg = `Error al obtener preview (${response.status})`;
    try {
      const json = await response.json();
      errorMsg = json.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
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
    throw new Error("Sesión requerida para descargar videos");
  }

  // Validar que sea un URL de TikTok
  if (!url.includes("tiktok.com")) {
    throw new Error("El URL debe ser de TikTok");
  }

  const response = await fetch(`${API_BASE_URL}/uploads/tiktok`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const json = await response.json().catch(() => ({}));

  // Verificar errores HTTP
  if (!response.ok) {
    const errorMsg = json.message || `Error al descargar video (${response.status})`;
    throw new Error(errorMsg);
  }

  // Verificar que la respuesta sea exitosa
  if (!json.success) {
    throw new Error(json.message || "El servidor reportó un error al procesar el video");
  }

  // Verificar que tengamos los datos necesarios
  if (!json.url || !json.storagePath) {
    throw new Error("El servidor no devolvió los datos del video correctamente");
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
    throw new Error("Sesión requerida para subir evidencia");
  }

  // Validar tipo de archivo
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const validExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
  const isImageMimetype = file.type.startsWith("image/");
  const isImageExtension = validExtensions.includes(ext);

  if (!isImageMimetype && !isImageExtension) {
    throw new Error("Solo se permiten imágenes (jpg, png, webp, gif)");
  }

  // Validar tamaño (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("El archivo debe pesar menos de 10MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/uploads/license-screenshot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Error al subir screenshot (${response.status})`;
    try {
      const json = await response.json();
      errorMsg = json.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const json = await response.json();

  if (!json.url) {
    throw new Error("El servidor no devolvió la URL del screenshot");
  }

  return {
    url: json.url,
    path: json.path,
    storagePath: json.storagePath || json.path,
  };
}
