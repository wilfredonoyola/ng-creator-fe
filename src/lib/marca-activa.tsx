"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { MARCAS_ACTIVAS } from "@/graphql/operations";

/** La página de Facebook de una marca: la cuenta sobre la que trabaja lo de Facebook. */
export interface PaginaFacebook {
  _id: string;
  pageId: string;
  nombre: string;
  fotoUrl?: string | null;
  /**
   * La cuenta de Instagram ligada a la página, si Meta dio el permiso al
   * conectar (ng-creator-be#60). Sale con la misma conexión que Facebook.
   */
  instagramId?: string | null;
  instagramUsuario?: string | null;
  instagramFotoUrl?: string | null;
}

/**
 * Una marca: el espacio de trabajo. Su cola, su numeración, su equipo y sus
 * borradores cuelgan de ella (`_id`). Lo que es propio de Facebook —historial,
 * análisis, publicar— trabaja sobre su `paginaFacebook`.
 */
export interface Marca {
  _id: string;
  nombre: string;
  logoUrl?: string | null;
  paginaFacebook?: PaginaFacebook | null;
}

/**
 * Color estable por marca.
 *
 * Sirve para que se vea de un golpe en qué espacio de trabajo estás: el mismo
 * workspace siempre tiene el mismo color, sin guardar nada en la base.
 *
 * Sale del `pageId` de su página cuando tiene una, y no del id de la marca, a
 * propósito: es el color que cada espacio tenía antes de que existieran las
 * marcas, y cambiárselo a todos el día de la migración sería justo el tipo de
 * cambio que nadie pidió notar.
 */
export function colorDeMarca(marca: Marca): string {
  const semilla = marca.paginaFacebook?.pageId ?? marca._id;
  let h = 0;
  for (let i = 0; i < semilla.length; i++) {
    h = (h * 31 + semilla.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 80% 58%)`;
}

interface ContextoMarca {
  marcas: Marca[];
  activa: Marca | null;
  seleccionar: (marcaId: string) => void;
  cargando: boolean;
}

const CLAVE = "marcaActivaId";
/** Donde se guardaba la elección antes de #58: el `pageId` de la página. */
const CLAVE_VIEJA = "paginaActivaId";

const MarcaContext = createContext<ContextoMarca>({
  marcas: [],
  activa: null,
  seleccionar: () => {},
  cargando: true,
});

/** localStorage puede no estar (modo privado, bloqueado): la elección es una comodidad. */
function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento se vuelve a la primera marca al recargar, y nada más.
  }
}

/**
 * Contexto de marca: sobre cuál se está trabajando.
 *
 * Solo ofrece las marcas activas —las que tienen alguna cuenta habilitada por
 * su propietario—, así que conectar una cuenta no la vuelve destino de
 * publicación por accidente.
 *
 * La elección se guarda en localStorage, pero siempre se valida contra la
 * lista del servidor: si la marca se deshabilitó, la selección guardada se
 * descarta en vez de dejar un contexto que ya no existe.
 */
export function MarcaActivaProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useQuery(MARCAS_ACTIVAS, {
    errorPolicy: "all",
  });
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [paginaVieja, setPaginaVieja] = useState<string | null>(null);
  const [leido, setLeido] = useState(false);

  const marcas: Marca[] = useMemo(() => data?.marcasActivas ?? [], [data]);

  // localStorage solo después del montaje: leerlo al renderizar rompe la
  // hidratación, porque el servidor no lo tiene.
  useEffect(() => {
    setElegidaId(leer(CLAVE));
    setPaginaVieja(leer(CLAVE_VIEJA));
    setLeido(true);
  }, []);

  const activa = useMemo(() => {
    if (!marcas.length) return null;
    return (
      marcas.find((m) => m._id === elegidaId) ??
      // Quien venía trabajando en una página sigue en la marca de esa página
      // después de la migración, en vez de caer en la primera de la lista.
      marcas.find((m) => !elegidaId && m.paginaFacebook?.pageId === paginaVieja) ??
      marcas[0]
    );
  }, [marcas, elegidaId, paginaVieja]);

  // Si lo guardado ya no es válido, se corrige lo persistido. Recién después
  // de leerlo: con las marcas ya en caché, esto correría antes y pisaría la
  // elección guardada con la primera de la lista.
  useEffect(() => {
    if (!activa || !leido) return;
    if (activa._id !== elegidaId) {
      guardar(CLAVE, activa._id);
      setElegidaId(activa._id);
    }
  }, [activa, elegidaId, leido]);

  function seleccionar(marcaId: string) {
    guardar(CLAVE, marcaId);
    setElegidaId(marcaId);
  }

  return (
    <MarcaContext.Provider
      value={{ marcas, activa, seleccionar, cargando: loading }}
    >
      {children}
    </MarcaContext.Provider>
  );
}

export function useMarcaActiva(): ContextoMarca {
  return useContext(MarcaContext);
}
