import { useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  ACTUALIZAR_PERSONA,
  AGREGAR_INVITADO,
  BORRAR_PERSONA,
  CREAR_PERSONA,
  INVITADOS_EPISODIO,
  PERSONAS,
  QUITAR_INVITADO,
  REVERIFICAR_PERSONA,
  SUGERIR_PERSONAS_CLIP,
} from "@/graphql/operations";
import type { Red } from "@/lib/upload-post";

/**
 * Etiquetas: a quién se etiqueta al publicar. Tres niveles, todos de la marca:
 *
 * - ELENCO: quienes salen siempre (conductores, columnistas). Primeros en todo.
 * - GLOBAL: el directorio de la marca, gente que aparece cada tanto.
 * - EPISODIO: el invitado de un solo programa. Se puede pasar a GLOBAL y
 *   queda en los dos lados.
 *
 * Cada persona tiene su usuario en cada red (sin '@'); el backend los limpia,
 * acepta el enlace del perfil y los verifica al guardar.
 */
export type NivelPersona = "ELENCO" | "GLOBAL" | "EPISODIO";
/** NO_ETIQUETABLE: Instagram rechazó etiquetarla al publicar; ahí va solo como @mención. */
export type EstadoUsuario = "EXISTE" | "NO_EXISTE" | "SIN_VERIFICAR" | "NO_ETIQUETABLE";

export interface VerificacionRed {
  red: Red;
  estado: EstadoUsuario;
  nombre?: string | null;
  foto?: string | null;
  verificadoEn?: string | null;
}

export interface Persona {
  _id: string;
  marcaId?: string;
  nombre: string;
  alias: string[];
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  facebook?: string | null;
  /**
   * El id de su página de Facebook, si es una página (lo resuelve el backend
   * desde el usuario cuando Meta lo deja; un número se copia tal cual). Sin
   * él no se la puede invitar como colaboradora del Reel.
   */
  facebookPaginaId?: string | null;
  foto?: string | null;
  nivel: NivelPersona;
  episodioId?: string | null;
  verificaciones: VerificacionRed[];
  usos: number;
  ultimoUsoEn?: string | null;
  createdAt?: string;
}

/** Lo que se edita en el formulario (y se manda como `PersonaInput`). */
export interface DatosPersona {
  nombre: string;
  alias: string[];
  instagram: string;
  tiktok: string;
  youtube: string;
  facebook: string;
  nivel: NivelPersona;
}

export interface Sugerida {
  persona: Persona;
  motivo: "invitado" | "elenco" | "mencionado";
  segundo?: number | null;
}

export const REDES_PERSONA = ["instagram", "tiktok", "youtube", "facebook"] as const;
export type RedPersona = (typeof REDES_PERSONA)[number];

export const RED_DE: Record<RedPersona, Red> = { instagram: "INSTAGRAM", tiktok: "TIKTOK", youtube: "YOUTUBE", facebook: "FACEBOOK" };
const CLAVE: Record<Red, RedPersona> = { INSTAGRAM: "instagram", TIKTOK: "tiktok", YOUTUBE: "youtube", FACEBOOK: "facebook" };
export const NOMBRE_RED: Record<RedPersona, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook" };

/** Lo mismo que el backend: Instagram acepta hasta 20 etiquetas y 3 colaboradores. */
export const MAXIMO_ETIQUETADOS_INSTAGRAM = 20;
export const MAXIMO_COLABORADORES_INSTAGRAM = 3;
/** Facebook: hasta 10 páginas colaboradoras por Reel (Meta: 10 invitaciones por página cada 24 h). */
export const MAXIMO_COLABORADORES_FACEBOOK = 10;

/** El perfil en cada red, para abrirlo y mirarlo (lo mismo que arma el backend). */
export function urlPerfil(red: RedPersona, usuario: string): string {
  const u = usuario.trim().replace(/^@+/, "");
  if (red === "instagram") return `https://www.instagram.com/${u}/`;
  if (red === "tiktok") return `https://www.tiktok.com/@${u}`;
  if (red === "youtube") return `https://www.youtube.com/@${u}`;
  return /^\d+$/.test(u) ? `https://www.facebook.com/profile.php?id=${u}` : `https://www.facebook.com/${u}`;
}

/**
 * De un enlace pegado, la red y el usuario: instagram.com/x, tiktok.com/@x,
 * youtube.com/@x, facebook.com/x y facebook.com/profile.php?id=123. Null si
 * no es un enlace de perfil que conozcamos.
 */
export function detectarPerfil(texto: string): { red: RedPersona; usuario: string } | null {
  const t = texto.trim();
  const id = t.match(/facebook\.com\/profile\.php\?(?:.*&)?id=(\d{5,20})/i);
  if (id) return { red: "facebook", usuario: id[1] };
  const reglas: [RedPersona, RegExp][] = [
    ["instagram", /instagram\.com\/([A-Za-z0-9._]{1,30})/i],
    ["tiktok", /tiktok\.com\/@([A-Za-z0-9._]{2,24})/i],
    ["youtube", /youtube\.com\/@([A-Za-z0-9._-]{3,30})/i],
    ["facebook", /(?:facebook|fb)\.com\/([A-Za-z0-9.]{1,50})/i],
  ];
  for (const [red, re] of reglas) {
    const m = t.match(re);
    if (m && !/^(p|reel|reels|explore|watch|channel|share|profile\.php)$/i.test(m[1])) return { red, usuario: m[1] };
  }
  return null;
}

/**
 * Su usuario en esa red, o null si no tiene: ahí no se lo etiqueta. En
 * Facebook, un perfil sin nombre de usuario se guarda con su número
 * (profile.php?id=…): un número no se puede mencionar.
 */
export function usuarioEn(red: Red, p: Pick<Persona, RedPersona>): string | null {
  const u = p[CLAVE[red]]?.trim();
  if (!u || (red === "FACEBOOK" && (/^\d+$/.test(u) || /\.php$/i.test(u)))) return null;
  return u;
}

/** Cómo verificó la red ese usuario (lo guardado al crear o reverificar). */
export function verificacionEn(p: Persona, red: RedPersona): VerificacionRed | undefined {
  return p.verificaciones?.find((v) => v.red === RED_DE[red]);
}

/** Instagram ya rechazó etiquetarla (privada, no existe o no acepta): ahí va como @mención. */
export function noEtiquetableEnInstagram(p: Persona): boolean {
  return Boolean(p.instagram) && verificacionEn(p, "instagram")?.estado === "NO_ETIQUETABLE";
}

/** La foto de la persona: la suya, o la primera que dio una red al verificarla. */
export function fotoDe(p: Persona): string | null {
  return p.foto || p.verificaciones?.find((v) => v.estado === "EXISTE" && v.foto)?.foto || null;
}

/** Sin acentos ni mayúsculas: "José" se encuentra escribiendo "jose". */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Si la persona coincide con lo que se busca: nombre, alias o cualquier usuario. */
export function coincide(p: Persona, buscar: string): boolean {
  const q = normalizar(buscar.trim().replace(/^@/, ""));
  if (!q) return true;
  return [p.nombre, ...(p.alias ?? []), ...REDES_PERSONA.map((r) => p[r] ?? "")].some((x) => normalizar(x).includes(q));
}

// ---- Menciones en la descripción ----

/** La forma de mencionar a alguien en el texto que se escribe: "@Nombre". */
export const marcaDe = (p: Pick<Persona, "nombre">) => `@${p.nombre}`;

/** Quiénes de `personas` están mencionados en el texto (por su "@Nombre"). */
export function mencionadas(texto: string, personas: Persona[]): Persona[] {
  return personas.filter((p) => texto.includes(marcaDe(p)));
}

/** Escapa un texto para usarlo dentro de una expresión regular. */
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Cómo se nombra a alguien en esa red: "@usuario" si tiene, su nombre si no
 * (sin '@': una mención a la nada confunde más que ayuda).
 */
export function nombreEnRed(red: Red, p: Persona): string {
  const u = usuarioEn(red, p);
  return u ? `@${u}` : p.nombre;
}

/**
 * El texto que sale en una red:
 *
 * 1. Cada "@Nombre" del texto se cambia por su usuario en esa red (o su nombre).
 * 2. En TikTok, YouTube y Facebook (que no etiquetan por API), quien se
 *    etiquetó pero no se nombró en el texto va como @mención al final.
 *    Instagram etiqueta de verdad: ahí solo se agrega a quien Instagram ya
 *    rechazó etiquetar (noEtiquetableEnInstagram).
 */
export function textoParaRed(texto: string, red: Red, enTexto: Persona[], etiquetadas: Persona[]): string {
  // Los nombres largos primero: "@Ana María" antes que "@Ana".
  let r = texto;
  for (const p of [...enTexto].sort((a, b) => b.nombre.length - a.nombre.length)) {
    r = r.replace(new RegExp(`${escapar(marcaDe(p))}(?![\\p{L}\\p{N}_])`, "gu"), nombreEnRed(red, p));
  }
  const ids = new Set(enTexto.map((p) => p._id));
  // Instagram etiqueta de verdad: solo se menciona a quien no deja etiquetarse.
  const aMencionar = red === "INSTAGRAM" ? etiquetadas.filter(noEtiquetableEnInstagram) : etiquetadas;
  if (!aMencionar.length) return r;
  const ya = r.toLowerCase();
  const extra = [
    ...new Set(
      aMencionar
        .filter((p) => !ids.has(p._id))
        .map((p) => usuarioEn(red, p))
        .filter((u): u is string => !!u && !ya.includes(`@${u.toLowerCase()}`)),
    ),
  ].map((u) => `@${u}`);
  if (!extra.length) return r;
  return r.trim() ? `${r.trimEnd()}\n\n${extra.join(" ")}` : extra.join(" ");
}

/** Los `ajustes` de Instagram: a quién etiquetar y a quién invitar como colaborador. */
export function ajustesInstagram(personas: Persona[], colaboradores: Set<string>) {
  // Quien Instagram ya rechazó no se manda: va mencionado en el texto (textoParaRed).
  const conUsuario = personas.filter((p) => usuarioEn("INSTAGRAM", p) && !noEtiquetableEnInstagram(p));
  const colab = conUsuario.filter((p) => colaboradores.has(p._id)).map((p) => usuarioEn("INSTAGRAM", p)!);
  const etiquetados = [...new Set(conUsuario.filter((p) => !colaboradores.has(p._id)).map((p) => usuarioEn("INSTAGRAM", p)!))];
  return etiquetados.length || colab.length ? { etiquetados, colaboradores: [...new Set(colab)] } : undefined;
}

/** Los `ajustes` de Facebook: las páginas que se invitan como colaboradoras del Reel. */
export function ajustesFacebook(personas: Persona[], colaboradores: Set<string>) {
  const ids = [
    ...new Set(personas.filter((p) => colaboradores.has(p._id) && p.facebookPaginaId).map((p) => p.facebookPaginaId!)),
  ].slice(0, MAXIMO_COLABORADORES_FACEBOOK);
  return ids.length ? { colaboradores: ids } : undefined;
}

/** Sin __typename: es lo que acepta `PersonaInput`. */
export function aEntrada(d: DatosPersona) {
  return {
    nombre: d.nombre.trim(),
    alias: d.alias.map((a) => a.trim()).filter(Boolean),
    instagram: d.instagram.trim() || null,
    tiktok: d.tiktok.trim() || null,
    youtube: d.youtube.trim() || null,
    facebook: d.facebook.trim() || null,
    nivel: d.nivel,
  };
}

export function datosDe(p: Persona | null, nivel: NivelPersona): DatosPersona {
  return {
    nombre: p?.nombre ?? "",
    alias: p?.alias ?? [],
    instagram: p?.instagram ?? "",
    tiktok: p?.tiktok ?? "",
    youtube: p?.youtube ?? "",
    facebook: p?.facebook ?? "",
    nivel: p?.nivel ?? nivel,
  };
}

/** Une listas sin repetir a nadie (por id), en el orden en que llegan. */
export function sinRepetir(...listas: Persona[][]): Persona[] {
  const vistos = new Set<string>();
  return listas.flat().filter((p) => (vistos.has(p._id) ? false : (vistos.add(p._id), true)));
}

// ---- Datos ----

const REFRESCAR = ["Personas", "InvitadosEpisodio", "SugerirPersonasClip"];

/** Las personas de la marca. Sin `nivel`: elenco y global. */
export function usePersonas(marcaId: string | null | undefined, opciones: { buscar?: string; nivel?: NivelPersona } = {}) {
  const q = useQuery<{ personas: Persona[] }>(PERSONAS, {
    variables: { marcaId, buscar: opciones.buscar?.trim() || null, nivel: opciones.nivel ?? null },
    skip: !marcaId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  return { personas: q.data?.personas ?? [], cargando: q.loading && !q.data, error: q.error };
}

export function useInvitados(marcaId: string | null | undefined, episodioId: string | null | undefined) {
  const q = useQuery<{ invitadosEpisodio: Persona[] }>(INVITADOS_EPISODIO, {
    variables: { marcaId, episodioId },
    skip: !marcaId || !episodioId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  return { invitados: q.data?.invitadosEpisodio ?? [], cargando: q.loading && !q.data };
}

export function useSugeridas(marcaId: string | null | undefined, clipId: string | null | undefined) {
  const q = useQuery<{ sugerirPersonasClip: Sugerida[] }>(SUGERIR_PERSONAS_CLIP, {
    variables: { marcaId, clipId },
    skip: !marcaId || !clipId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  return { sugeridas: q.data?.sugerirPersonasClip ?? [], cargando: q.loading && !q.data };
}

/** Crear, cambiar, borrar y sumar o quitar de un episodio. Todo refresca las listas. */
export function useAccionesPersonas(marcaId: string | null | undefined) {
  const opciones = { refetchQueries: REFRESCAR, awaitRefetchQueries: true };
  const [crear, c] = useMutation(CREAR_PERSONA, opciones);
  const [actualizar, a] = useMutation(ACTUALIZAR_PERSONA, opciones);
  const [borrar, b] = useMutation(BORRAR_PERSONA, opciones);
  const [agregar, g] = useMutation(AGREGAR_INVITADO, opciones);
  const [quitar, q] = useMutation(QUITAR_INVITADO, opciones);
  const [reverificar, r] = useMutation(REVERIFICAR_PERSONA, opciones);
  return useMemo(
    () => ({
      guardando: c.loading || a.loading || b.loading || g.loading || q.loading,
      reverificando: r.loading,
      crear: async (d: DatosPersona, episodioId?: string | null) =>
        (await crear({ variables: { marcaId, input: aEntrada(d), episodioId: episodioId ?? null } })).data?.crearPersona as Persona,
      actualizar: async (id: string, d: DatosPersona) =>
        (await actualizar({ variables: { marcaId, id, input: aEntrada(d) } })).data?.actualizarPersona as Persona,
      /** Cambia solo el nivel (hacer global, pasar al elenco). */
      cambiarNivel: async (p: Persona, nivel: NivelPersona) =>
        (await actualizar({ variables: { marcaId, id: p._id, input: aEntrada({ ...datosDe(p, nivel), nivel }) } })).data?.actualizarPersona as Persona,
      borrar: async (id: string) => Boolean((await borrar({ variables: { marcaId, id } })).data?.borrarPersona),
      agregarInvitado: async (episodioId: string, personaId: string) =>
        ((await agregar({ variables: { marcaId, episodioId, personaId } })).data?.agregarInvitado ?? []) as Persona[],
      quitarInvitado: async (episodioId: string, personaId: string) =>
        ((await quitar({ variables: { marcaId, episodioId, personaId } })).data?.quitarInvitado ?? []) as Persona[],
      reverificar: async (id: string) => (await reverificar({ variables: { marcaId, id } })).data?.reverificarPersona as Persona,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marcaId, c.loading, a.loading, b.loading, g.loading, q.loading, r.loading],
  );
}
