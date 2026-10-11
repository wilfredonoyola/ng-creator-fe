"use client";

import { useQuery } from "@apollo/client";
import { SOY_SUPERADMIN } from "@/graphql/operations";
import { haySesion } from "@/lib/auth";

/**
 * Si la sesión actual es de un superadmin: los correos de la lista fija del
 * backend (SUPERADMINS). Lo usan /superadmin y el link del menú.
 */
export function useSoySuperadmin(): { soy: boolean; cargando: boolean } {
  const conSesion = typeof window !== "undefined" && haySesion();
  const { data, loading } = useQuery<{ soySuperadmin: boolean }>(SOY_SUPERADMIN, {
    skip: !conSesion,
    fetchPolicy: "cache-first",
    errorPolicy: "all",
  });
  return { soy: !!data?.soySuperadmin, cargando: conSesion && loading };
}
