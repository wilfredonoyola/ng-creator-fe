"use client";

import { useQuery } from "@apollo/client";
import { PRIMEROS_PASOS } from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";

export type ClavePaso = "marca" | "configurar" | "episodio" | "redes";

export interface PasoGuia {
  clave: ClavePaso;
  hecho: boolean;
  opcional?: boolean;
  /** A dónde lleva tocarlo. */
  href: string;
}

interface Vista {
  marcaConfigurada: boolean;
  primerEpisodio: boolean;
  redesConectadas: boolean;
  completos: boolean;
}

/**
 * La guía de primeros pasos de la marca activa (ng-creator-be#273): crear la
 * marca, configurarla (opcional), subir el primer episodio y conectar las
 * redes. El backend calcula cada paso con lo que la marca tiene y devuelve
 * null a quien no es propietario ni ADMIN.
 *
 * `cache-and-network`: el Sidebar se monta en cada pantalla, así que al volver
 * de subir el episodio o conectar una red el paso ya aparece hecho.
 */
export function usePrimerosPasos() {
  const { activa } = useMarcaActiva();
  const marcaId = activa?._id;
  const { data } = useQuery(PRIMEROS_PASOS, {
    variables: { marcaId },
    skip: !marcaId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const vista: Vista | null = marcaId ? (data?.primerosPasos ?? null) : null;
  const pasos: PasoGuia[] = vista
    ? [
        { clave: "marca", hecho: true, href: "/panel" },
        { clave: "configurar", hecho: vista.marcaConfigurada, opcional: true, href: "/admin/plantilla" },
        { clave: "episodio", hecho: vista.primerEpisodio, href: "/episodios" },
        { clave: "redes", hecho: vista.redesConectadas, href: "/admin/facebook" },
      ]
    : [];


  return {
    /** Null: no es propietario, o todavía no cargó. */
    vista,
    pasos,
    hechos: pasos.filter((p) => p.hecho).length,
    /** El primer obligatorio que falta; si no, el opcional. */
    siguiente: pasos.find((p) => !p.hecho && !p.opcional) ?? pasos.find((p) => !p.hecho) ?? null,
    /** Siempre en el menú (no se oculta); completa, queda chica. */
    visible: Boolean(vista),
    completos: Boolean(vista?.completos),
  };
}
