"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMarcaActiva, type PruebaMarca } from "@/lib/marca-activa";
import { PREFIJO_SITIO } from "@/lib/sitio";

/** Los planes, en la landing. */
export const ENLACE_PLANES = `${PREFIJO_SITIO}/#precios`;

/**
 * La prueba gratis de la marca activa, si tiene: cuánto usó y si ya no puede
 * subir más. Null para las marcas con plan.
 */
export function usePrueba(): { prueba: PruebaMarca | null; agotada: boolean } {
  const { activa } = useMarcaActiva();
  const prueba = activa?.prueba ?? null;
  return { prueba, agotada: Boolean(prueba && prueba.episodiosUsados >= prueba.topeEpisodios) };
}

/**
 * "Prueba gratis: 1 de 2 episodios", discreto, con el enlace a los planes. Al
 * llegar al tope cambia por el aviso de que no se pueden subir más.
 *
 * Al montarse vuelve a pedir las marcas: lo usado cambia con cada episodio que
 * se sube, y la lista se cargó al entrar.
 */
export function AvisoPrueba({ className = "" }: { className?: string }) {
  const t = useTranslations("prueba");
  const { refrescar } = useMarcaActiva();
  const { prueba, agotada } = usePrueba();

  useEffect(() => {
    void refrescar().catch(() => {});
  }, [refrescar]);

  if (!prueba) return null;

  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-ng-md border px-3 py-2 text-xs ${
        agotada ? "border-amber-400/30 bg-amber-400/5 text-amber-200" : "border-white/10 bg-white/5 text-white/60"
      } ${className}`}
    >
      <span>
        {agotada
          ? t("tope")
          : t("uso", { usados: prueba.episodiosUsados, tope: prueba.topeEpisodios })}
      </span>
      <Link href={ENLACE_PLANES} className="font-medium text-ng-celeste hover:underline">
        {t("verPlanes")}
      </Link>
    </p>
  );
}
