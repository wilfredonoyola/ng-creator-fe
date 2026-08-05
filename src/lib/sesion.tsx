"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@apollo/client";
import { YO } from "@/graphql/operations";

export type Rol = "ADMIN" | "MIEMBRO";

export interface Usuario {
  _id: string;
  email: string;
  nombre?: string | null;
  roles: Rol[];
  activo: boolean;
}

interface Sesion {
  usuario: Usuario | null;
  esAdmin: boolean;
  cargando: boolean;
}

const SesionContext = createContext<Sesion>({
  usuario: null,
  esAdmin: false,
  cargando: true,
});

/**
 * Usuario de la sesion y sus roles.
 *
 * Los roles viven en nuestro backend, no en los claims de Cognito, asi que hay
 * que preguntarlos. Esconder controles de admin en la interfaz es comodidad, no
 * seguridad: quien autoriza de verdad es el AdminGuard del backend.
 */
export function SesionProvider({ children }: { children: React.ReactNode }) {
  // errorPolicy para que un 401 no tumbe el arbol: DashboardLayout ya redirige
  // al login cuando no hay sesion.
  const { data, loading } = useQuery(YO, { errorPolicy: "all" });

  const usuario: Usuario | null = data?.yo ?? null;

  return (
    <SesionContext.Provider
      value={{
        usuario,
        esAdmin: !!usuario?.roles?.includes("ADMIN"),
        cargando: loading,
      }}
    >
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion(): Sesion {
  return useContext(SesionContext);
}
