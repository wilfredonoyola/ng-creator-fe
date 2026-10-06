"use client";

import { useMutation, useQuery } from "@apollo/client";
import {
  CONECTAR_CON_UPLOAD_POST,
  DESCONECTAR_DE_UPLOAD_POST,
  PROVEEDORES_PUBLICACION,
} from "@/graphql/operations";

export type Proveedor = "propio" | "upload-post";
type Red = "TIKTOK" | "YOUTUBE" | "INSTAGRAM" | "FACEBOOK";

/** Lo que vuelve en la URL cuando Upload-Post termina de conectar una cuenta. */
export const PARAMETRO_VUELTA = "upload_post";

/** Las queries de cuentas que hay que refrescar al conectar o desconectar. */
export const QUERIES_DE_CUENTAS = ["TiktokCuentas", "YoutubeCanales"];

/**
 * Por qué flujo se conectan las cuentas NUEVAS de una red. Si el backend no
 * responde (o todavía no tiene la query) queda el flujo propio, como siempre.
 */
export function useProveedor(red: "tiktok" | "youtube"): Proveedor {
  const { data } = useQuery(PROVEEDORES_PUBLICACION, { errorPolicy: "all" });
  return data?.proveedoresPublicacion?.[red] === "upload-post"
    ? "upload-post"
    : "propio";
}

/**
 * Conectar y desconectar por Upload-Post. Conectar abre su página en la misma
 * pestaña porque vuelve a Integraciones con `?upload_post=ok`, y ahí se
 * sincroniza (ver la página de integraciones).
 */
export function useUploadPost(marcaId: string | undefined, red: Red) {
  const [pedirUrl, { loading: abriendo }] = useMutation(CONECTAR_CON_UPLOAD_POST);
  const [desconectarMut] = useMutation(DESCONECTAR_DE_UPLOAD_POST, {
    refetchQueries: QUERIES_DE_CUENTAS,
  });

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

  return { conectar, desconectar, abriendo };
}
