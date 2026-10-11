"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ENLACE_FUNCIONES } from "@/components/landing/Publica";

/**
 * Los links viejos a /features#revision (correos, la landing de antes, lo que
 * haya guardado alguien) llevan a la página de esa sección, /features/revision.
 * El hash no llega al servidor, así que se resuelve acá.
 */
export function HashAPagina({ ids }: { ids: readonly string[] }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (ids.includes(id)) router.replace(`${ENLACE_FUNCIONES}/${id}`);
  }, [ids, router]);
  return null;
}
