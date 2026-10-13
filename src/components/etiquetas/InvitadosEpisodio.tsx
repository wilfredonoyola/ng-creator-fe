"use client";

import { useTranslations } from "next-intl";
import { useInvitados } from "@/lib/etiquetas";
import { EditorPersonas } from "./EditorPersonas";

/** Quienes vinieron solo a este programa: salen marcados al programar sus clips. */
export function InvitadosEpisodio({ episodioId, marcaId, opera }: { episodioId: string; marcaId: string; opera: boolean }) {
  const t = useTranslations("etiquetas");
  const { invitados, guardar, guardando } = useInvitados(episodioId, marcaId);
  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-sm font-semibold">{t("invitados.titulo")}</h2>
      <p className="mb-3 mt-0.5 text-xs text-white/45">{t("invitados.descripcion")}</p>
      <EditorPersonas personas={invitados} onGuardar={guardar} puede={opera} guardando={guardando} vacio={t("invitados.vacio")} />
    </section>
  );
}
