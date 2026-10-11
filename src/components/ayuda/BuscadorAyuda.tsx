"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { ENLACE_AYUDA, type CategoriaAyuda } from "@/lib/ayuda";

export type EntradaBuscador = { slug: string; titulo: string; descripcion: string; categoria: CategoriaAyuda; texto: string };

/** Sin tildes ni mayúsculas: "revisión" encuentra "revision" y al revés. */
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * El buscador de /ayuda. Busca en el navegador, sobre los artículos que ya
 * vinieron con la página: son pocos y así responde mientras se escribe.
 * Cada palabra tiene que aparecer; pesa más en el título (y el slug, que
 * nombra el tema con otras palabras) que en el texto.
 */
export function BuscadorAyuda({ entradas }: { entradas: EntradaBuscador[] }) {
  const t = useTranslations("ayuda");
  const [q, setQ] = useState("");
  const indice = useMemo(
    () => entradas.map((e) => ({ e, titulo: normalizar(`${e.titulo} ${e.slug.replace(/-/g, " ")}`), resto: normalizar(`${e.descripcion} ${e.texto}`) })),
    [entradas],
  );
  const palabras = normalizar(q).split(/\s+/).filter((p) => p.length > 1);
  const resultados = palabras.length
    ? indice
        .filter(({ titulo, resto }) => palabras.every((p) => titulo.includes(p) || resto.includes(p)))
        .map(({ e, titulo }) => ({ e, peso: palabras.filter((p) => titulo.includes(p)).length }))
        .sort((a, b) => b.peso - a.peso)
        .slice(0, 8)
    : [];

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">{t("buscar")}</span>
        <Search size={20} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6A64]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("buscarEjemplo")}
          className="h-14 w-full rounded-md bg-white pl-12 pr-4 text-[17px] text-[#0A0A0A] outline-none placeholder:text-[#8A8983] focus-visible:shadow-[0_0_0_3px_#FFD400]"
        />
      </label>
      {palabras.length > 0 && (
        <div aria-live="polite" className="overflow-hidden rounded-md bg-white text-[#0A0A0A]">
          {resultados.length ? (
            <ul className="divide-y divide-[#E9E8E4]">
              {resultados.map(({ e }) => (
                <li key={e.slug}>
                  <Link href={`${ENLACE_AYUDA}/${e.slug}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-[#F4F3EE] focus-visible:bg-[#F4F3EE] focus-visible:outline-none">
                    <span className="font-bold">{e.titulo}</span>
                    <span className="text-sm text-[#3A3935]">{e.descripcion}</span>
                    <span className="text-xs font-medium uppercase tracking-[.08em] text-[#8A8983]">{t(`categorias.${e.categoria}`)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-[#3A3935]">{t("sinResultados", { q: q.trim() })}</p>
          )}
        </div>
      )}
    </div>
  );
}
