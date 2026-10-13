"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PestanasEpisodios } from "@/components/PestanasEpisodios";
import { ClipsSubidos } from "@/components/episodios/ClipsSubidos";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";

/**
 * Subir clips ya editados (ng-creator-be#181), como pestaña de Episodios: es
 * donde se busca el contenido con el que se trabaja, junto a los episodios.
 */
export default function ClipsSubidosPage() {
  const t = useTranslations("clipsSubidos");
  const { activa } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const marcaId = activa?._id ?? null;

  return (
    <DashboardLayout>
      <PestanasEpisodios />
      {marcaId ? (
        <ClipsSubidos marcaId={marcaId} puedeOperar={puedeOperar(marcaId)} />
      ) : (
        <p className="text-sm text-amber-400">{t("sinMarca")}</p>
      )}
    </DashboardLayout>
  );
}
