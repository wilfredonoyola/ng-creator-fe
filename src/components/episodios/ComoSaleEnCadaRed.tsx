"use client";

import { useTranslations } from "next-intl";
import { IconoRed } from "@/components/IconoRed";
import { REDES } from "@/lib/publicaciones";
import { DESCRIPCION_MAX, TITULO_YOUTUBE_MAX, type ComoSale } from "@/lib/destinos";

/**
 * "Cómo sale en cada red": el texto final por red (en YouTube, con su título),
 * y en rojo la que se pasa del límite. Lo usan la pantalla de publicar y el
 * detalle de una publicación agendada en el calendario.
 */
export function ComoSaleEnCadaRed({ comoSale }: { comoSale: ComoSale[] }) {
  const t = useTranslations("publicarClip");
  const sePasan = comoSale.filter((c) => c.largo);
  return comoSale.length ? (
    <details open={sePasan.length > 0 || undefined} className="group rounded-xl border border-white/10 px-3 py-2">
      <summary className="cursor-pointer list-none text-xs text-white/50 marker:hidden">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span>
        {t("comoSale")}
        {sePasan.length ? (
          <span className="text-red-400">
            {" · "}
            {t("comoSaleAviso", { redes: sePasan.map((c) => REDES[c.red]?.nombre ?? c.red).join(", ") })}
          </span>
        ) : null}
      </summary>
      <ul className="mt-2 space-y-2">
        {comoSale.map((c) => (
          <li key={c.red} className="flex gap-2 text-xs">
            <IconoRed red={c.red} chico />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 whitespace-pre-line break-words text-white/60">
                {c.titulo ? <span className="font-medium text-white/80">{c.titulo} — </span> : null}
                {c.texto || t("sinTexto")}
              </p>
              {c.largo ? (
                <p className="text-red-400">
                  {c.titulo && c.titulo.length > TITULO_YOUTUBE_MAX
                    ? t("tituloLargo", { max: TITULO_YOUTUBE_MAX })
                    : t("comoSaleLargo", { max: DESCRIPCION_MAX, n: c.texto.length })}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </details>
  ) : null;
}
