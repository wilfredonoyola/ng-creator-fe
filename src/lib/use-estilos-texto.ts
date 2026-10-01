"use client";

import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { ESTILOS_TEXTO } from "@/graphql/operations";
import type { EstiloTexto, EstiloTextoDef } from "@/lib/estilos-texto";

/**
 * La galería de estilos de texto, del backend. Es la misma para todas las
 * marcas y no cambia mientras se usa la app: la primera vez va a la red y
 * después sale del caché de Apollo.
 */
export function useEstilosTexto() {
  const q = useQuery(ESTILOS_TEXTO, { fetchPolicy: "cache-first" });
  const estilos: EstiloTextoDef[] = useMemo(() => q.data?.estilosTexto ?? [], [q.data]);
  const porEstilo = useMemo(() => new Map<EstiloTexto, EstiloTextoDef>(estilos.map((e) => [e.estilo, e])), [estilos]);
  return { estilos, porEstilo, cargando: q.loading, error: q.error };
}
