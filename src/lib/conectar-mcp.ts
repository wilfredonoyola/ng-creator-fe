"use client";

import { asegurarTokenValido } from "@/lib/auth";
import { cabeceraIdioma } from "@/i18n/cliente";

/**
 * La aprobación del conector MCP (ng-creator-be#182): ChatGPT o Claude mandan
 * a la persona a /conectar?solicitud=…, y desde acá, con su sesión, se aprueba
 * o se rechaza. El backend responde a dónde volver (la app que pidió).
 */
const API = process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql\/?$/, "") ?? "http://localhost:4000";

async function pedir<T>(ruta: string, conSesion: boolean): Promise<T> {
  if (conSesion) await asegurarTokenValido();
  const token = conSesion ? localStorage.getItem("idToken") : null;
  const res = await fetch(`${API}${ruta}`, {
    method: conSesion ? "POST" : "GET",
    headers: { ...cabeceraIdioma(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const datos = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  if (!res.ok) {
    const m = Array.isArray(datos.message) ? datos.message[0] : datos.message;
    throw new Error(m || String(res.status));
  }
  return datos as T;
}

export const verSolicitud = (id: string) =>
  pedir<{ app: string; vuelveA: string }>(`/oauth/solicitud/${encodeURIComponent(id)}`, false);

export const aprobarSolicitud = (id: string) =>
  pedir<{ redirect: string }>(`/oauth/solicitud/${encodeURIComponent(id)}/aprobar`, true);

export const rechazarSolicitud = (id: string) =>
  pedir<{ redirect: string }>(`/oauth/solicitud/${encodeURIComponent(id)}/rechazar`, true);
