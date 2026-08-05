"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { FACEBOOK_PAGINAS_ACTIVAS } from "@/graphql/operations";

export interface PaginaFacebook {
  _id: string;
  pageId: string;
  nombre: string;
  fotoUrl?: string | null;
}

/**
 * Color estable por pagina, derivado del pageId.
 *
 * Sirve para que se vea de un golpe en que espacio de trabajo estas: el mismo
 * workspace siempre tiene el mismo color, sin guardar nada en la base.
 */
export function colorDePagina(pageId: string): string {
  let h = 0;
  for (let i = 0; i < pageId.length; i++) {
    h = (h * 31 + pageId.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 80% 58%)`;
}

interface ContextoPagina {
  paginas: PaginaFacebook[];
  activa: PaginaFacebook | null;
  seleccionar: (pageId: string) => void;
  cargando: boolean;
}

const CLAVE = "paginaActivaId";

const PaginaContext = createContext<ContextoPagina>({
  paginas: [],
  activa: null,
  seleccionar: () => {},
  cargando: true,
});

/**
 * Contexto de pagina de Facebook: sobre cual se esta trabajando.
 *
 * Solo ofrece las paginas habilitadas por un admin, asi que conectar una cuenta
 * no la vuelve destino de publicacion por accidente.
 *
 * La eleccion se guarda en localStorage, pero siempre se valida contra la lista
 * del servidor: si la pagina se deshabilito o se desconecto, la seleccion
 * guardada se descarta en vez de dejar un contexto que ya no existe.
 */
export function PaginaActivaProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useQuery(FACEBOOK_PAGINAS_ACTIVAS, {
    errorPolicy: "all",
  });
  const [elegidaId, setElegidaId] = useState<string | null>(null);

  const paginas: PaginaFacebook[] = data?.facebookPaginasActivas ?? [];

  // localStorage solo despues del montaje: leerlo al renderizar rompe la
  // hidratacion, porque el servidor no lo tiene.
  useEffect(() => {
    setElegidaId(localStorage.getItem(CLAVE));
  }, []);

  const activa = useMemo(() => {
    if (!paginas.length) return null;
    return paginas.find((p) => p.pageId === elegidaId) ?? paginas[0];
  }, [paginas, elegidaId]);

  // Si lo guardado ya no es valido, se corrige lo persistido.
  useEffect(() => {
    if (!activa) return;
    if (activa.pageId !== elegidaId) {
      localStorage.setItem(CLAVE, activa.pageId);
      setElegidaId(activa.pageId);
    }
  }, [activa, elegidaId]);

  function seleccionar(pageId: string) {
    localStorage.setItem(CLAVE, pageId);
    setElegidaId(pageId);
  }

  return (
    <PaginaContext.Provider
      value={{ paginas, activa, seleccionar, cargando: loading }}
    >
      {children}
    </PaginaContext.Provider>
  );
}

export function usePaginaActiva(): ContextoPagina {
  return useContext(PaginaContext);
}
