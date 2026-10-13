import { useMutation, useQuery } from "@apollo/client";
import {
  ELENCO_MARCAS,
  GUARDAR_ELENCO,
  GUARDAR_INVITADOS_EPISODIO,
  INVITADOS_EPISODIO,
} from "@/graphql/operations";
import type { Red } from "@/lib/upload-post";

/**
 * Alguien a quien etiquetar al publicar (ng-creator-be#198): el elenco de la
 * marca (`Marca.elenco`) o un invitado del episodio (`Episodio.invitados`),
 * con su usuario en cada red, sin '@'. El backend los limpia al guardar (y
 * acepta el enlace del perfil pegado).
 */
export interface Persona {
  id: string;
  nombre: string;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  facebook?: string | null;
}

export const REDES_PERSONA = ["instagram", "tiktok", "youtube", "facebook"] as const;
export type RedPersona = (typeof REDES_PERSONA)[number];

/** El perfil en cada red, para abrirlo y mirarlo (lo mismo que arma el backend). */
export function urlPerfil(red: RedPersona, usuario: string): string {
  const u = usuario.trim().replace(/^@+/, "");
  if (red === "instagram") return `https://www.instagram.com/${u}/`;
  if (red === "tiktok") return `https://www.tiktok.com/@${u}`;
  if (red === "youtube") return `https://www.youtube.com/@${u}`;
  return /^\d+$/.test(u) ? `https://www.facebook.com/profile.php?id=${u}` : `https://www.facebook.com/${u}`;
}

/** Lo mismo que el backend: Instagram acepta hasta 20 etiquetas y 3 colaboradores. */
export const MAXIMO_ETIQUETADOS_INSTAGRAM = 20;
export const MAXIMO_COLABORADORES_INSTAGRAM = 3;

const CLAVE: Record<Red, RedPersona> = {
  INSTAGRAM: "instagram",
  TIKTOK: "tiktok",
  YOUTUBE: "youtube",
  FACEBOOK: "facebook",
};

/**
 * Su usuario en esa red, o null si no tiene: ahí no se lo etiqueta. En
 * Facebook, un perfil sin nombre de usuario se guarda con su número
 * (profile.php?id=…): un número no se puede mencionar, así que tampoco.
 */
export function usuarioEn(red: Red, p: Persona): string | null {
  const u = p[CLAVE[red]]?.trim();
  if (!u || (red === "FACEBOOK" && (/^\d+$/.test(u) || /\.php$/i.test(u)))) return null;
  return u;
}

/**
 * El texto que sale en cada red. Instagram etiqueta de verdad (va en
 * `ajustes`), así que su texto no cambia; TikTok, YouTube y Facebook no tienen
 * etiquetas por API: ahí van como @menciones al final.
 */
export function textoConMenciones(descripcion: string, red: Red, personas: Persona[]): string {
  if (red === "INSTAGRAM") return descripcion;
  const menciones = [...new Set(personas.map((p) => usuarioEn(red, p)).filter((u): u is string => !!u))].map((u) => `@${u}`);
  if (!menciones.length) return descripcion;
  return descripcion.trim() ? `${descripcion.trimEnd()}\n\n${menciones.join(" ")}` : menciones.join(" ");
}

/** Los `ajustes` de Instagram: a quién etiquetar y a quién invitar como colaborador. */
export function ajustesInstagram(personas: Persona[], colaboradores: Set<string>) {
  const conUsuario = personas.filter((p) => usuarioEn("INSTAGRAM", p));
  const colab = conUsuario.filter((p) => colaboradores.has(p.id)).map((p) => usuarioEn("INSTAGRAM", p)!);
  const etiquetados = conUsuario.filter((p) => !colaboradores.has(p.id)).map((p) => usuarioEn("INSTAGRAM", p)!);
  return etiquetados.length || colab.length ? { etiquetados, colaboradores: colab } : undefined;
}

/** Sin __typename: es lo que acepta `PersonaEtiquetaInput`. */
export function aEntrada(p: Persona) {
  return {
    id: p.id || undefined,
    nombre: p.nombre,
    instagram: p.instagram || undefined,
    tiktok: p.tiktok || undefined,
    youtube: p.youtube || undefined,
    facebook: p.facebook || undefined,
  };
}

/**
 * Suma a alguien a una lista sin repetirlo: si ya está (mismo id), lo
 * reemplaza con sus datos nuevos.
 */
export function conPersona(lista: Persona[], p: Persona): Persona[] {
  return lista.some((x) => x.id === p.id) ? lista.map((x) => (x.id === p.id ? p : x)) : [...lista, p];
}

/** El elenco de la marca y cómo guardarlo (la lista entera, ya normalizada por el backend). */
export function useElenco(marcaId: string | undefined | null) {
  const q = useQuery(ELENCO_MARCAS, { skip: !marcaId, errorPolicy: "all" });
  const [mut, { loading: guardando }] = useMutation(GUARDAR_ELENCO, { refetchQueries: ["ElencoMarcas"], awaitRefetchQueries: true });
  const marca = (q.data?.marcasActivas as { _id: string; elenco?: Persona[] }[] | undefined)?.find((m) => m._id === marcaId);
  return {
    elenco: marca?.elenco ?? [],
    cargando: q.loading,
    guardando,
    guardar: async (personas: Persona[]) => {
      const r = await mut({ variables: { marcaId, personas: personas.map(aEntrada) } });
      return (r.data?.guardarElenco ?? []) as Persona[];
    },
  };
}

/** Los invitados de un episodio y cómo guardarlos. */
export function useInvitados(episodioId: string | undefined, marcaId: string | undefined | null) {
  const q = useQuery(INVITADOS_EPISODIO, {
    variables: { id: episodioId, marcaId },
    skip: !episodioId || !marcaId,
    errorPolicy: "all",
  });
  const [mut, { loading: guardando }] = useMutation(GUARDAR_INVITADOS_EPISODIO, {
    refetchQueries: ["InvitadosEpisodio"],
    awaitRefetchQueries: true,
  });
  return {
    invitados: (q.data?.episodio?.invitados ?? []) as Persona[],
    cargando: q.loading,
    guardando,
    guardar: async (personas: Persona[]) => {
      const r = await mut({ variables: { marcaId, episodioId, personas: personas.map(aEntrada) } });
      return (r.data?.guardarInvitadosEpisodio ?? []) as Persona[];
    },
  };
}
