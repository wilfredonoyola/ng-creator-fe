"use client";

import { cabeceraIdioma, idiomaActual } from "@/i18n/cliente";
import { asegurarTokenValido, haySesion } from "@/lib/auth";

/**
 * El chat de soporte (ng-creator-be#186): REST, con o sin sesión. En el sitio
 * público (www) no hay sesión y se pide el correo al pasarla al equipo; en el
 * panel va el token y alcanza con el de la cuenta.
 */
const API = process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql\/?$/, "") ?? "http://localhost:4000";
const GUARDADA = "chatSoporte";

export type MensajeChat = { rol: "PERSONA" | "ASISTENTE"; texto: string };
export type ConversacionGuardada = { id: string; clave: string };

function cabeceras(): Record<string, string> {
  const token = haySesion() ? localStorage.getItem("idToken") : null;
  return {
    "Content-Type": "application/json",
    ...cabeceraIdioma(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  if (haySesion()) await asegurarTokenValido();
  const res = await fetch(`${API}${ruta}`, { ...init, headers: cabeceras() });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const m = (datos as { message?: string | string[] }).message;
    throw new Error(Array.isArray(m) ? m[0] : m || String(res.status));
  }
  return datos as T;
}

export const guardada = (): ConversacionGuardada | null => {
  try {
    const v = JSON.parse(localStorage.getItem(GUARDADA) ?? "null");
    return v?.id && v?.clave ? v : null;
  } catch {
    return null;
  }
};

export const olvidar = () => {
  try {
    localStorage.removeItem(GUARDADA);
  } catch {}
};

export async function escribir(texto: string, pagina: string) {
  const g = guardada();
  const r = await pedir<{ id: string; clave: string; respuesta: string; sugiereDerivar: boolean; derivada: boolean }>(
    "/soporte/chat",
    { method: "POST", body: JSON.stringify({ ...(g ?? {}), texto, idioma: idiomaActual(), pagina }) },
  );
  try {
    localStorage.setItem(GUARDADA, JSON.stringify({ id: r.id, clave: r.clave }));
  } catch {}
  return r;
}

export async function derivar(correo?: string) {
  const g = guardada();
  if (!g) throw new Error("sin conversación");
  return pedir<{ derivada: boolean; enviado: boolean; correo: string }>(`/soporte/chat/${g.id}/derivar`, {
    method: "POST",
    body: JSON.stringify({ clave: g.clave, ...(correo ? { correo } : {}) }),
  });
}

export async function leer() {
  const g = guardada();
  if (!g) return null;
  try {
    return await pedir<{ derivada: boolean; mensajes: MensajeChat[] }>(
      `/soporte/chat/${g.id}?clave=${encodeURIComponent(g.clave)}`,
    );
  } catch {
    olvidar();
    return null;
  }
}

export const conSesion = () => haySesion();
