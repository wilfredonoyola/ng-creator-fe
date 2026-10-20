"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import {
  BORRAR_EPISODIO,
  CONFIRMAR_SUBIDA_EPISODIO,
  PREPARAR_SUBIDA_CLIP,
  RENOVAR_SUBIDA_EPISODIO,
} from "@/graphql/operations";
import { iniciarSubidaTus, type CredencialesTus, type SubidaEpisodio } from "@/lib/subida-episodio";

/** Lo mismo que acepta el backend (CLIP_SUBIDO_MAXIMO_SEG): lo que deja el editor, 5 min. */
export const MAXIMO_SEG_CLIP_SUBIDO = 300;

/** Lo que se está subiendo. */
export interface SubiendoClip {
  nombre: string;
  episodioId: string | null;
  pct: number;
}

/** Lo que hace falta de un clip subido para borrarlo. */
export interface ClipSubidoParaBorrar {
  episodio: { _id: string; titulo: string };
  clip: { titulo: string; publicacion?: { programadas: number } | null } | null;
}

/**
 * Cuánto dura un video del disco, leyendo solo sus metadatos. null si el
 * navegador no lo puede leer (un HEVC en Chrome, por ejemplo): el backend
 * igual lo frena si pasa del máximo.
 */
function duracionDe(archivo: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo);
    const v = document.createElement("video");
    const fin = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => fin(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => fin(null);
    setTimeout(() => fin(null), 8000);
    v.src = url;
  });
}

const esVideo = (f: File) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name);

/**
 * Subir clips ya editados (ng-creator-be#181) de a uno, en orden, y borrarlos.
 * Lo usan Clips subidos y Contenido; con `episodioId` el clip queda en ese
 * episodio (be#228). `alCambiar` se llama cuando hay algo nuevo que mostrar.
 */
export function useSubirClips({
  marcaId,
  episodioId = null,
  alCambiar,
}: {
  marcaId: string;
  episodioId?: string | null;
  alCambiar: () => void;
}) {
  const t = useTranslations("clipsSubidos");
  const control = useRef<SubidaEpisodio | null>(null);
  const [cola, setCola] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState<SubiendoClip | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);

  const [preparar] = useMutation(PREPARAR_SUBIDA_CLIP);
  const [renovar] = useMutation(RENOVAR_SUBIDA_EPISODIO);
  const [confirmar] = useMutation(CONFIRMAR_SUBIDA_EPISODIO);
  const [borrarEpisodio] = useMutation(BORRAR_EPISODIO);

  useEffect(() => () => control.current?.detener(), []);

  // Los archivos elegidos suben de a uno, en orden.
  useEffect(() => {
    if (subiendo || !cola.length) return;
    const [archivo, ...resto] = cola;
    setCola(resto);
    void subir(archivo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cola, subiendo]);

  function encolar(archivos: File[]) {
    const videos = archivos.filter(esVideo);
    const otros = archivos.length - videos.length;
    setAvisos(otros ? [t("noEsVideo", { n: otros })] : []);
    if (videos.length) setCola((c) => [...c, ...videos]);
  }

  async function subir(archivo: File) {
    const dura = await duracionDe(archivo);
    if (dura !== null && dura > MAXIMO_SEG_CLIP_SUBIDO + 1) {
      setAvisos((a) => [...a, t("muyLargo", { nombre: archivo.name, dura: Math.round(dura), maximo: MAXIMO_SEG_CLIP_SUBIDO })]);
      return;
    }
    setSubiendo({ nombre: archivo.name, episodioId: null, pct: 0 });
    let cred: CredencialesTus & { episodio: { _id: string; titulo: string } };
    try {
      const r = await preparar({
        variables: {
          input: {
            marcaId,
            nombreArchivo: archivo.name,
            tamanoBytes: archivo.size,
            tipoArchivo: archivo.type || null,
            ...(episodioId ? { episodioId } : {}),
          },
        },
      });
      cred = r.data.prepararSubidaClip;
    } catch (e) {
      setAvisos((a) => [...a, `${archivo.name}: ${e instanceof Error ? e.message : t("errorSubir")}`]);
      setSubiendo(null);
      return;
    }
    const id = cred.episodio._id;
    setSubiendo({ nombre: archivo.name, episodioId: id, pct: 0 });
    alCambiar();
    try {
      control.current = await iniciarSubidaTus({
        archivo,
        titulo: cred.episodio.titulo,
        credenciales: cred,
        renovar: async () => (await renovar({ variables: { id, marcaId } })).data.renovarSubidaEpisodio as CredencialesTus,
        onProgreso: (subidos, total) => setSubiendo((s) => s && { ...s, pct: total ? (subidos / total) * 100 : 0 }),
        onEstado: (estado) => {
          if (estado === "terminada") {
            void confirmar({ variables: { id, marcaId } })
              .catch(() => undefined)
              .finally(() => {
                control.current = null;
                setSubiendo(null);
                alCambiar();
              });
          } else if (estado === "error") {
            setAvisos((a) => [...a, `${archivo.name}: ${t("errorSubir")}`]);
            control.current = null;
            setSubiendo(null);
          }
        },
      });
    } catch (e) {
      setAvisos((a) => [...a, `${archivo.name}: ${e instanceof Error ? e.message : t("errorSubir")}`]);
      setSubiendo(null);
    }
  }

  // Uno ya publicado no se ofrece (be#223 también lo rechaza); si tiene algo
  // programado, se avisa que se cancela.
  async function borrar(c: ClipSubidoParaBorrar) {
    const programadas = c.clip?.publicacion?.programadas ?? 0;
    const pregunta = [
      t("confirmarBorrar", { titulo: c.clip?.titulo ?? c.episodio.titulo }),
      programadas ? t("seCancelan", { n: programadas }) : null,
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!window.confirm(pregunta)) return;
    if (subiendo?.episodioId === c.episodio._id) {
      control.current?.detener();
      control.current = null;
      setSubiendo(null);
    }
    try {
      await borrarEpisodio({
        variables: { id: c.episodio._id, marcaId },
        refetchQueries: ["PublicacionesDeMarca", "ClipsListosSinProgramar"],
      });
    } catch (e) {
      setAvisos((a) => [...a, `${c.clip?.titulo ?? c.episodio.titulo}: ${e instanceof Error ? e.message : t("errorBorrar")}`]);
    } finally {
      alCambiar();
    }
  }

  return { encolar, borrar, subiendo, enCola: cola.length, avisos };
}
