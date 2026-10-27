"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { PREPARAR_RECORTE_IMAGEN, RECORTE_IMAGEN } from "@/graphql/operations";
import type { EstadoRecorte, ImagenClip } from "@/lib/clip-encuadre";

/** Cada cuánto se pregunta por un recorte en curso. */
const SONDEO_MS = 2000;
/** Desde cuándo un recorte en curso se avisa como lento. */
const LENTO_MS = 90_000;

/** El recorte de una imagen con unas opciones, como lo ve la vista previa antes de guardar. */
export interface RecorteLocal {
  estadoRecorte: EstadoRecorte | null;
  urlFinal: string | null;
  /** Lleva más de 90 s PENDIENTE. */
  lento: boolean;
}

/**
 * `mejorar` (editor de portada, be#255): la versión mejorada con IA; solo cuenta
 * sin "Quitar fondo" ni contorno. `separar` (be#249): la persona separada del
 * cuadro, del tamaño del cuadro (mejorada también, con `mejorar`).
 */
type Opciones = Pick<ImagenClip, "url" | "sinFondo" | "contorno"> & { mejorar?: boolean; separar?: boolean };

/** Pide la mejorada con IA y no un recorte (con quitar fondo o contorno, el servidor ignora `mejorar`). */
export const esMejora = (im: Opciones) => !im.separar && !!im.mejorar && !im.sinFondo && !im.contorno;

/** Pide la persona separada ("Separar a la persona"): manda sobre lo demás. */
export const esSeparar = (im: Opciones) => !!im.separar;

/** Hay algo que pedir al servidor: un recorte, la mejorada o la separada. */
const pideAlgo = (im: Opciones) => esSeparar(im) || im.sinFondo || im.contorno || esMejora(im);

const variablesDe = (marcaId: string, im: Opciones) => ({
  marcaId,
  url: im.url,
  sinFondo: im.sinFondo,
  contorno: im.contorno,
  mejorar: esSeparar(im) ? !!im.mejorar : esMejora(im),
  separar: esSeparar(im),
});

interface Entrada {
  estadoRecorte: EstadoRecorte | null;
  urlFinal: string | null;
  /** Cuándo se pidió (o se reintentó): para el aviso de lento. */
  desde: number;
}

/** Un recorte por url y opciones: es la clave del trabajo en el servidor. */
export const claveRecorte = (im: Opciones) =>
  esSeparar(im) ? `s${im.mejorar ? "m" : ""} ${im.url}` : `${im.sinFondo ? 1 : 0}${im.contorno ? 1 : 0}${esMejora(im) ? "m" : ""} ${im.url}`;

/**
 * Los recortes de las imágenes del borrador, sin esperar a guardar el clip:
 * al agregar una imagen o cambiar "Quitar fondo"/"Contorno blanco" se pide
 * (`prepararRecorteImagen`) y se pregunta cada 2 s (`recorteImagen`) hasta
 * que quede LISTO o FALLIDO. El estado es local, por url y opciones.
 *
 * Con `mejorar` (y sin quitar fondo ni contorno) pide la versión mejorada con
 * IA (~40 s): el editor de portada la usa para el cuadro del clip, el fondo y
 * las imágenes subidas. El editor de clips no la usa. Con `separar`, la
 * persona separada del cuadro limpio (be#249, ~1 min con `mejorar`).
 *
 * `activo` en false (quien solo mira) no pide nada: se queda con lo guardado.
 */
export function useRecortesImagen(marcaId: string | null | undefined, imagenes: Opciones[], activo: boolean) {
  const cliente = useApolloClient();
  const [recortes, setRecortes] = useState<Record<string, Entrada>>({});
  const [ahora, setAhora] = useState(() => Date.now());
  const pedidos = useRef(new Set<string>());

  const poner = useCallback((clave: string, r: { estadoRecorte?: EstadoRecorte | null; urlFinal?: string | null }, desde?: number) => {
    setRecortes((prev) => ({
      ...prev,
      [clave]: {
        estadoRecorte: r.estadoRecorte ?? null,
        urlFinal: r.urlFinal ?? null,
        desde: desde ?? prev[clave]?.desde ?? Date.now(),
      },
    }));
  }, []);

  const preparar = useCallback(
    async (im: Opciones) => {
      if (!marcaId) return;
      const clave = claveRecorte(im);
      pedidos.current.add(clave);
      poner(clave, { estadoRecorte: "PENDIENTE", urlFinal: null }, Date.now());
      try {
        const r = await cliente.mutate({
          mutation: PREPARAR_RECORTE_IMAGEN,
          variables: variablesDe(marcaId, im),
          fetchPolicy: "no-cache",
        });
        const v = r.data?.prepararRecorteImagen;
        if (v) poner(clave, v);
      } catch {
        // Sin respuesta queda como estaba guardado: se vuelve a pedir al
        // cambiar las opciones, y guardar el clip lo encola igual.
        pedidos.current.delete(clave);
        setRecortes((prev) => {
          const { [clave]: _fuera, ...resto } = prev;
          return resto;
        });
      }
    },
    [cliente, marcaId, poner],
  );

  // Pedir las que hacen falta y todavía no se pidieron.
  const faltan = activo
    ? imagenes.filter((im) => pideAlgo(im) && !pedidos.current.has(claveRecorte(im)))
    : [];
  const claveFaltan = faltan.map(claveRecorte).join("|");
  useEffect(() => {
    for (const im of faltan) void preparar(im);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `faltan` cambia con su clave
  }, [claveFaltan, preparar]);

  // Sondear las PENDIENTE del borrador.
  const enCurso = activo
    ? imagenes.filter((im) => recortes[claveRecorte(im)]?.estadoRecorte === "PENDIENTE")
    : [];
  const claveEnCurso = Array.from(new Set(enCurso.map(claveRecorte))).join("|");
  useEffect(() => {
    if (!claveEnCurso || !marcaId) return;
    let vivo = true;
    const preguntar = async () => {
      setAhora(Date.now());
      await Promise.all(
        enCurso.map(async (im) => {
          try {
            const r = await cliente.query({
              query: RECORTE_IMAGEN,
              variables: variablesDe(marcaId, im),
              fetchPolicy: "no-cache",
            });
            const v = r.data?.recorteImagen;
            if (vivo && v) poner(claveRecorte(im), v);
          } catch {
            // Un sondeo perdido no cambia nada: el próximo vuelve a preguntar.
          }
        }),
      );
    };
    const id = setInterval(() => void preguntar(), SONDEO_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `enCurso` cambia con su clave
  }, [claveEnCurso, marcaId, cliente, poner]);

  /** Lo que se sabe del recorte de una imagen, o undefined si no se pidió (se usa lo guardado). */
  const recorteDe = useCallback(
    (im: Opciones): RecorteLocal | undefined => {
      if (!activo || !pideAlgo(im)) return undefined;
      const r = recortes[claveRecorte(im)];
      if (!r) return undefined;
      return { ...r, lento: r.estadoRecorte === "PENDIENTE" && ahora - r.desde > LENTO_MS };
    },
    [activo, recortes, ahora],
  );

  return { recorteDe, reintentar: preparar };
}
