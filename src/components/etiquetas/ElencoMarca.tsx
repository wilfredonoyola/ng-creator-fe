"use client";

import { useTranslations } from "next-intl";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { useElenco } from "@/lib/etiquetas";
import { EditorPersonas } from "./EditorPersonas";

/**
 * El elenco de la marca: quienes salen siempre y se etiquetan al programar.
 * Va junto a "Al publicar, por defecto" porque es lo mismo: el punto de
 * partida de cada publicación. Lo cambia quien opera la marca.
 */
export function ElencoMarca() {
  const t = useTranslations("etiquetas");
  const { activa: marca } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const { elenco, guardar, guardando } = useElenco(marca?._id);
  if (!marca) return null;
  const puede = puedeOperar(marca._id);
  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-semibold">{t("elenco.titulo")}</h2>
      <p className="mb-3 mt-1 text-sm text-white/50">{t("elenco.descripcion", { marca: marca.nombre })}</p>
      <EditorPersonas personas={elenco} onGuardar={guardar} puede={puede} guardando={guardando} vacio={t("elenco.vacio")} />
      {!puede && <p className="mt-3 text-xs text-white/40">{t("elenco.soloLectura")}</p>}
    </section>
  );
}
