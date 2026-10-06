"use client";

import { useQuery } from "@apollo/client";
import { YOUTUBE_CANALES } from "@/graphql/operations";
import type { CanalYoutube } from "@/components/CanalesYoutube";
import type { Marca } from "@/lib/marca-activa";
import { type Red, useCuentasUploadPost, useProveedores } from "@/lib/upload-post";

/**
 * Un lugar a donde puede salir un clip de la marca: su página de Facebook, su
 * Instagram, un canal de YouTube o una cuenta de Upload-Post.
 */
export interface Destino {
  clave: string;
  red: Red;
  /** El id que recibe programarPublicacion, y el que guarda `destinosApagados`. */
  cuentaId: string;
  nombre: string;
  foto?: string | null;
  formato: string;
  etiqueta: string;
  /** Si no se puede usar, por qué (clave en `publicarClip.motivos`). */
  motivo?: "reconectar" | "desactivado";
}

/** Formato y etiqueta de cada red cuando el destino sale de Upload-Post. */
const FORMATO: Record<Red, { formato: string; etiqueta: string }> = {
  FACEBOOK: { formato: "REEL", etiqueta: "Reel" },
  INSTAGRAM: { formato: "REEL", etiqueta: "Reel" },
  YOUTUBE: { formato: "SHORT", etiqueta: "Short" },
  TIKTOK: { formato: "VIDEO", etiqueta: "Video" },
};

/**
 * Los destinos de la marca, cada red por su proveedor: con 'upload-post', sus
 * destinos son las cuentas del perfil de Upload-Post de la marca (la cola
 * recibe su _id); con 'propio', la página de Facebook, su Instagram y los
 * canales de YouTube. Lo usan Publicar y los ajustes de Redes conectadas, así
 * los ids que se apagan allá son los mismos que se programan acá.
 */
export function useDestinosMarca(marca: Marca | null | undefined) {
  const marcaId = marca?._id ?? "";
  const proveedores = useProveedores();
  const porUploadPost = (Object.keys(proveedores) as Red[]).filter((r) => proveedores[r] === "upload-post");
  const canalesQ = useQuery(YOUTUBE_CANALES, {
    variables: { marcaId },
    skip: !marcaId || proveedores.YOUTUBE === "upload-post",
    errorPolicy: "all",
  });
  const uploadPost = useCuentasUploadPost(marcaId || undefined, porUploadPost.length === 0);

  const destinos: Destino[] = [];
  const pagina = marca?.paginaFacebook;
  if (pagina && proveedores.FACEBOOK === "propio") {
    destinos.push({
      clave: `fb:${pagina.pageId}`,
      red: "FACEBOOK",
      cuentaId: pagina.pageId,
      nombre: pagina.nombre,
      foto: pagina.fotoUrl,
      formato: "REEL",
      etiqueta: "Reel",
    });
    // Instagram sale con la misma conexión que Facebook: la cuenta ligada a
    // la página, si Meta dio el permiso al conectar (ng-creator-be#60).
    if (pagina.instagramId && proveedores.INSTAGRAM === "propio") {
      destinos.push({
        clave: `ig:${pagina.instagramId}`,
        red: "INSTAGRAM",
        cuentaId: pagina.instagramId,
        nombre: pagina.instagramUsuario ? `@${pagina.instagramUsuario}` : pagina.nombre,
        foto: pagina.instagramFotoUrl,
        formato: "REEL",
        etiqueta: "Reel",
      });
    }
  }
  for (const c of uploadPost.cuentas) {
    if (proveedores[c.red] !== "upload-post") continue;
    destinos.push({
      clave: `up:${c.red}:${c._id}`,
      red: c.red,
      cuentaId: c._id,
      nombre: c.usuario ? `@${c.usuario}` : c.nombre,
      foto: c.avatarUrl,
      ...FORMATO[c.red],
      motivo: c.activa ? undefined : "desactivado",
    });
  }
  // Las redes de Upload-Post sin cuenta: se conectan en la web, en Redes conectadas.
  const faltanUploadPost = uploadPost.cargando
    ? []
    : porUploadPost.filter((r) => !destinos.some((d) => d.red === r));
  for (const c of (proveedores.YOUTUBE === "propio" ? canalesQ.data?.youtubeCanales ?? [] : []) as CanalYoutube[]) {
    destinos.push({
      clave: `yt:${c.canalId}`,
      red: "YOUTUBE",
      cuentaId: c.canalId,
      nombre: c.nombre,
      foto: c.miniaturaUrl,
      formato: "SHORT",
      etiqueta: "Short",
      motivo: c.requiereReconexion ? "reconectar" : !c.activa ? "desactivado" : undefined,
    });
  }

  return {
    destinos,
    proveedores,
    faltanUploadPost,
    cargando: uploadPost.cargando || canalesQ.loading,
  };
}
