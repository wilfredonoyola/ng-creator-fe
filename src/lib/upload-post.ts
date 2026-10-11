"use client";

import { useMutation, useQuery } from "@apollo/client";
import {
  CONECTAR_CON_UPLOAD_POST,
  CUENTAS_UPLOAD_POST,
  DESCONECTAR_DE_UPLOAD_POST,
  PROVEEDORES_PUBLICACION,
} from "@/graphql/operations";

export type Proveedor = "propio" | "upload-post";
export type Red = "TIKTOK" | "YOUTUBE" | "INSTAGRAM" | "FACEBOOK";
export const REDES_UPLOAD_POST: Red[] = ["TIKTOK", "YOUTUBE", "INSTAGRAM", "FACEBOOK"];

/** Una cuenta conectada en el perfil de Upload-Post de la marca. */
export interface CuentaUploadPost {
  _id: string;
  red: Red;
  nombre: string;
  usuario?: string | null;
  avatarUrl?: string | null;
  activa: boolean;
}

/** Lo que vuelve en la URL cuando Upload-Post termina de conectar una cuenta. */
export const PARAMETRO_VUELTA = "upload_post";

/** Las queries que hay que refrescar al conectar, desconectar o vincular. */
export const QUERIES_UPLOAD_POST = ["CuentasUploadPost", "EstadoUploadPost"];

/**
 * Por dónde publica cada red: 'propio' (nuestras apps) o 'upload-post'. Si el
 * backend no responde (o todavía no tiene la query), todo queda en 'propio'.
 */
export function useProveedores(): Record<Red, Proveedor> {
  const { data } = useQuery(PROVEEDORES_PUBLICACION, { errorPolicy: "all" });
  const p = data?.proveedoresPublicacion;
  const de = (v: unknown): Proveedor => (v === "upload-post" ? "upload-post" : "propio");
  return {
    TIKTOK: de(p?.tiktok),
    YOUTUBE: de(p?.youtube),
    INSTAGRAM: de(p?.instagram),
    FACEBOOK: de(p?.facebook),
  };
}

/**
 * Si la conexión propia de Meta está apagada: Facebook e Instagram publican
 * por Upload-Post, así que no se ofrece conectar ni publicar por la propia (y
 * no aparecen dos "Facebook" en las publicaciones). Con PROVEEDOR_FACEBOOK o
 * PROVEEDOR_INSTAGRAM en 'propio' en el backend, vuelve todo.
 */
export function metaPropiaApagada(p: Record<Red, Proveedor>): boolean {
  return p.FACEBOOK === "upload-post" && p.INSTAGRAM === "upload-post";
}

/** Las cuentas de Upload-Post de la marca (vacío si no hay red que las use). */
export function useCuentasUploadPost(marcaId: string | undefined, skip = false) {
  const q = useQuery(CUENTAS_UPLOAD_POST, {
    variables: { marcaId },
    skip: !marcaId || skip,
    errorPolicy: "all",
  });
  const cuentas: CuentaUploadPost[] = q.data?.cuentasUploadPost ?? [];
  return { cuentas, cargando: q.loading };
}

/**
 * Conectar y desconectar una red por Upload-Post. Conectar abre su página en
 * la misma pestaña porque vuelve a Redes conectadas con `?upload_post=ok`.
 */
export function useUploadPost(marcaId: string | undefined, red: Red) {
  const [pedirUrl, { loading: abriendo }] = useMutation(CONECTAR_CON_UPLOAD_POST);
  const [desconectarMut, { loading: desconectando }] = useMutation(
    DESCONECTAR_DE_UPLOAD_POST,
    { refetchQueries: QUERIES_UPLOAD_POST },
  );

  async function conectar(): Promise<string | null> {
    const { data } = await pedirUrl({ variables: { marcaId, red } });
    const url: string | undefined = data?.conectarConUploadPost;
    if (!url) return null;
    window.location.href = url;
    return url;
  }

  async function desconectar() {
    await desconectarMut({ variables: { marcaId, red } });
  }

  return { conectar, desconectar, abriendo, desconectando };
}
