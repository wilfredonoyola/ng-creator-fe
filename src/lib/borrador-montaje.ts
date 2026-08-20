"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import { GUARDAR_MONTAJE } from "@/graphql/operations";

/**
 * El guardado automático del editor de montaje.
 *
 * Antes todo el armado vivía en la memoria de la pestaña: cerrarla perdía el
 * encuadre, los titulares, los momentos y con qué grabación iba cada uno. A
 * diez videos diarios eso no se sostiene — no se puede preparar varios y
 * grabarlos después, ni retomar el que quedó por la mitad.
 *
 * No hay botón de guardar a propósito. Un botón obliga a acordarse, y de lo
 * que se trata justamente es de no tener que acordarse.
 */

/** La clave de localStorage donde queda cuál borrador se estaba editando. */
export const CLAVE_BORRADOR = "montajeBorrador";

export type EstadoGuardado = "limpio" | "guardando" | "guardado" | "error";

/**
 * Cuánto se espera desde la última tecla antes de guardar.
 *
 * Un segundo y medio: mover un deslizador dispara decenas de cambios por
 * segundo y guardar cada uno sería castigar la base para escribir estados
 * intermedios que nadie va a retomar. Bajarlo mucho hace ruido; subirlo mucho
 * empieza a perder trabajo real si se cierra la pestaña de golpe.
 */
const ESPERA_MS = 1500;

export interface DatosBorrador {
  /** El estado del editor entero, tal cual se va a volver a cargar. */
  config: unknown;
  /** Para la lista del historial. */
  nombre: string;
  origenUrl?: string;
}

export function useGuardadoAutomatico(params: {
  pageId?: string;
  /** `null` mientras no haya nada que guardar (sin video cargado). */
  datos: DatosBorrador | null;
}): {
  id: string | null;
  estado: EstadoGuardado;
  /** Para cuando se abre un borrador existente o se empieza uno nuevo. */
  adoptar: (id: string | null, config: unknown) => void;
  guardarYa: () => void;
} {
  const [id, setId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoGuardado>("limpio");
  const [guardar] = useMutation(GUARDAR_MONTAJE);

  /**
   * Lo último que se sabe escrito, serializado.
   *
   * Es lo que evita el bucle: al abrir un borrador se hidrata el editor, eso
   * cuenta como "cambio" y dispararía un guardado idéntico al que se acaba de
   * leer. Comparando contra esto, hidratar no escribe nada.
   */
  const ultimoGuardado = useRef<string | null>(null);
  const idRef = useRef<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** El guardado en vuelo, para no pisar uno con otro. */
  const enVuelo = useRef(false);
  const pendiente = useRef<DatosBorrador | null>(null);

  const escribir = useCallback(
    async (datos: DatosBorrador) => {
      if (!params.pageId) return;
      if (enVuelo.current) {
        // Guardar de nuevo mientras el anterior viaja crearía dos borradores:
        // el segundo saldría sin `id` porque el primero todavía no lo devolvió.
        pendiente.current = datos;
        return;
      }
      enVuelo.current = true;
      setEstado("guardando");
      const serializado = JSON.stringify(datos.config);
      try {
        const { data } = await guardar({
          variables: {
            input: {
              id: idRef.current,
              pageId: params.pageId,
              nombre: datos.nombre,
              config: datos.config,
              origenUrl: datos.origenUrl ?? null,
            },
          },
        });
        const nuevoId: string | undefined = data?.guardarMontaje?._id;
        if (nuevoId) {
          idRef.current = nuevoId;
          setId(nuevoId);
          try {
            localStorage.setItem(CLAVE_BORRADOR, nuevoId);
          } catch {
            // Modo incógnito o storage lleno: el borrador igual quedó en el
            // servidor, solo que esta pestaña no lo va a reabrir sola.
          }
        }
        ultimoGuardado.current = serializado;
        setEstado("guardado");
      } catch {
        // Sin reintento automático: el próximo cambio vuelve a intentar solo, y
        // reintentar en bucle contra un backend caído es la forma de convertir
        // una falla en una tormenta.
        setEstado("error");
      } finally {
        enVuelo.current = false;
        const siguiente = pendiente.current;
        pendiente.current = null;
        if (siguiente) void escribir(siguiente);
      }
    },
    [guardar, params.pageId],
  );

  // El disparador: cada cambio reinicia la espera.
  const datos = params.datos;
  useEffect(() => {
    if (!datos || !params.pageId) return;
    if (JSON.stringify(datos.config) === ultimoGuardado.current) return;

    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void escribir(datos), ESPERA_MS);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [datos, escribir, params.pageId]);

  /** Adopta un borrador ya existente sin volver a escribirlo. */
  const adoptar = useCallback((nuevoId: string | null, config: unknown) => {
    idRef.current = nuevoId;
    setId(nuevoId);
    ultimoGuardado.current = config === null ? null : JSON.stringify(config);
    setEstado(nuevoId ? "guardado" : "limpio");
    try {
      if (nuevoId) localStorage.setItem(CLAVE_BORRADOR, nuevoId);
      else localStorage.removeItem(CLAVE_BORRADOR);
    } catch {
      // Ver arriba: que no se pueda recordar no impide seguir trabajando.
    }
  }, []);

  const guardarYa = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    if (datos) void escribir(datos);
  }, [datos, escribir]);

  return { id, estado, adoptar, guardarYa };
}
