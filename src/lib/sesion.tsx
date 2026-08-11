"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@apollo/client";
import { MIS_ACCESOS, YO } from "@/graphql/operations";

export type Rol = "ADMIN" | "MIEMBRO";

/**
 * Rol dentro de una página. Es lo que decide casi todo; `Rol` quedó solo para
 * lo que es del sistema entero (administrar usuarios, sumar páginas nuevas).
 *
 * PROVEEDOR es el dueño de material con quien hay un trato: no entra al espacio
 * de trabajo, solo sube lo suyo y sigue su estado. Su flujo todavía no está
 * construido, así que hoy no habilita ninguna pantalla.
 */
export type RolPagina = "PROPIETARIO" | "EDITOR" | "LECTOR" | "PROVEEDOR";

export interface Usuario {
  _id: string;
  email: string;
  nombre?: string | null;
  roles: Rol[];
  activo: boolean;
}

export interface AccesoDePagina {
  pageId: string;
  rol: RolPagina;
}

interface Sesion {
  usuario: Usuario | null;
  /** Rol global. Solo habilita sumar cuentas de Facebook nuevas al sistema. */
  esAdmin: boolean;
  accesos: AccesoDePagina[];
  /** El rol en una página, o null si no tiene acceso. */
  rolEn: (pageId?: string | null) => RolPagina | null;
  /** Puede cambiar cosas del espacio de trabajo (crear, aprobar, publicar). */
  puedeOperar: (pageId?: string | null) => boolean;
  /** Puede configurar la página y repartir accesos. */
  esPropietario: (pageId?: string | null) => boolean;
  cargando: boolean;
}

const VACIO: Sesion = {
  usuario: null,
  esAdmin: false,
  accesos: [],
  rolEn: () => null,
  puedeOperar: () => false,
  esPropietario: () => false,
  cargando: true,
};

const SesionContext = createContext<Sesion>(VACIO);

/**
 * Usuario de la sesión, sus roles globales y su acceso a cada página.
 *
 * Los permisos viven en nuestro backend, no en los claims de Cognito, así que
 * hay que preguntarlos. Esconder controles en la interfaz es comodidad, no
 * seguridad: quien autoriza de verdad son CognitoGuard y PaginaGuard.
 */
export function SesionProvider({ children }: { children: React.ReactNode }) {
  // errorPolicy para que un 401 no tumbe el árbol: DashboardLayout ya redirige
  // al login cuando no hay sesión.
  const { data, loading } = useQuery(YO, { errorPolicy: "all" });
  const { data: accesosData, loading: cargandoAccesos } = useQuery(MIS_ACCESOS, {
    errorPolicy: "all",
  });

  const usuario: Usuario | null = data?.yo ?? null;
  const accesos: AccesoDePagina[] = useMemo(
    () => accesosData?.misAccesos ?? [],
    [accesosData],
  );

  const valor = useMemo<Sesion>(() => {
    const porPagina = new Map(accesos.map((a) => [a.pageId, a.rol]));
    const rolEn = (pageId?: string | null) =>
      (pageId && porPagina.get(pageId)) || null;

    return {
      usuario,
      esAdmin: !!usuario?.roles?.includes("ADMIN"),
      accesos,
      rolEn,
      puedeOperar: (pageId) => {
        const rol = rolEn(pageId);
        return rol === "PROPIETARIO" || rol === "EDITOR";
      },
      esPropietario: (pageId) => rolEn(pageId) === "PROPIETARIO",
      cargando: loading || cargandoAccesos,
    };
  }, [usuario, accesos, loading, cargandoAccesos]);

  return (
    <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
  );
}

export function useSesion(): Sesion {
  return useContext(SesionContext);
}

/** Etiqueta y color de cada rol, para no repetirlos en cada pantalla. */
export const ESTILO_ROL: Record<
  RolPagina,
  { etiqueta: string; clase: string; ayuda: string }
> = {
  PROPIETARIO: {
    etiqueta: "Propietario",
    clase: "border-[#0FED9D]/40 bg-[#0FED9D]/10 text-[#0FED9D]",
    ayuda:
      "Configura la página, la reconecta en Meta y decide quién más entra.",
  },
  EDITOR: {
    etiqueta: "Editor",
    clase: "border-[#5FA3F5]/40 bg-[#1877F2]/10 text-[#5FA3F5]",
    ayuda:
      "Crea, revisa, aprueba y publica. No necesita cuenta de Facebook.",
  },
  LECTOR: {
    etiqueta: "Lector",
    clase: "border-white/20 bg-white/5 text-white/60",
    ayuda: "Mira el trabajo de la página, no lo toca.",
  },
  PROVEEDOR: {
    etiqueta: "Proveedor",
    clase: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    ayuda:
      "Dueño de material con quien hay un trato: sube sus videos y sigue su estado, sin entrar al espacio de trabajo. Su pantalla todavía no está construida.",
  },
};
