"use client";

import { useTranslations } from "next-intl";
import { conPersona, useElenco, useInvitados } from "@/lib/etiquetas";
import { EditorPersonas } from "./EditorPersonas";

/**
 * Quienes vinieron a este programa: salen marcados al programar sus clips.
 * Los que vuelven seguido se suman de la marca con un toque, y uno nuevo se
 * puede guardar también en la marca para los próximos episodios.
 */
export function InvitadosEpisodio({ episodioId, marcaId, opera }: { episodioId: string; marcaId: string; opera: boolean }) {
  const t = useTranslations("etiquetas");
  const { invitados, guardar, guardando } = useInvitados(episodioId, marcaId);
  const marca = useElenco(marcaId);
  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-sm font-semibold">{t("invitados.titulo")}</h2>
      <p className="mb-3 mt-0.5 text-xs text-white/45">{t("invitados.descripcion")}</p>
      <EditorPersonas
        personas={invitados}
        onGuardar={guardar}
        puede={opera}
        guardando={guardando || marca.guardando}
        vacio={t("invitados.vacio")}
        marcaId={marcaId}
        deLaMarca={marca.elenco}
        onGuardarEnMarca={(p) => marca.guardar(conPersona(marca.elenco, p))}
      />
    </section>
  );
}
