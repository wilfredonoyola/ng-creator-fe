"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { BORRAR_CLIP_EPISODIO } from "@/graphql/operations";

type ClipBorrable = {
  _id: string;
  titulo: string;
  origen?: string | null;
  publicacion?: { publicadas: number; programadas: number } | null;
};

/**
 * Si se ofrece borrar el clip: solo los hechos a mano (los de la IA se
 * descartan), quien opera, y mientras no se haya publicado. Lo publicado es
 * lo que se mide y se ve en el calendario: no se borra (be#223, que además
 * lo rechaza).
 */
export function sePuedeBorrar(clip: ClipBorrable, opera: boolean): boolean {
  return opera && clip.origen === "MANUAL" && (clip.publicacion?.publicadas ?? 0) === 0;
}

/**
 * Borrar un clip hecho a mano, después de confirmar. Si tenía algo programado,
 * la confirmación lo dice: se cancela con el clip. Devuelve true si se borró.
 */
export function useBorrarClip(marcaId: string) {
  const t = useTranslations("editorBarra.borrar");
  const [borrarMut, { loading: borrando }] = useMutation(BORRAR_CLIP_EPISODIO);
  const [error, setError] = useState<string | null>(null);

  async function borrar(clip: ClipBorrable): Promise<boolean> {
    const programadas = clip.publicacion?.programadas ?? 0;
    const pregunta = [t("confirmar", { titulo: clip.titulo }), programadas ? t("seCancelan", { n: programadas }) : null]
      .filter(Boolean)
      .join("\n\n");
    if (!window.confirm(pregunta)) return false;
    setError(null);
    try {
      await borrarMut({
        variables: { id: clip._id, marcaId },
        refetchQueries: ["ClipsDeEpisodio", "PublicacionesDeMarca", "ClipsListosSinProgramar"],
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      return false;
    }
  }

  return { borrar, borrando, error, limpiarError: () => setError(null) };
}
