"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PestanasPublicaciones } from "@/components/PestanasPublicaciones";
import { ClipsSubidos } from "@/components/episodios/ClipsSubidos";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";

/**
 * Subir clips ya editados (ng-creator-be#181), como pestaña de Publicaciones:
 * es contenido que va directo a publicar, no un episodio del que salen clips.
 */
export default function ClipsSubidosPage() {
  const t = useTranslations("clipsSubidos");
  const { activa } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const marcaId = activa?._id ?? null;

  return (
    <DashboardLayout>
      <PestanasPublicaciones />
      {marcaId ? (
        <ClipsSubidos marcaId={marcaId} puedeOperar={puedeOperar(marcaId)} />
      ) : (
        <p className="text-sm text-amber-400">{t("sinMarca")}</p>
      )}
    </DashboardLayout>
  );
}
