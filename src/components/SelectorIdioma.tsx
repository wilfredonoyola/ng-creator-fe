"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IDIOMAS, type Idioma } from "@/i18n/idiomas";
import { guardarIdiomaElegido, idiomaElegido } from "@/i18n/cliente";

/**
 * Elegir el idioma de la interfaz, o dejarlo en automático. Queda en una cookie
 * (un año) que lee i18n/request.ts; el servidor vuelve a pintar la página en
 * el idioma nuevo sin recargar.
 */
export function SelectorIdioma() {
  const t = useTranslations("idioma");
  const router = useRouter();
  const [valor, setValor] = useState<Idioma | null>(null);
  // La cookie se lee después de montar: en el servidor no está, y leerla antes rompe la hidratación.
  useEffect(() => setValor(idiomaElegido()), []);

  function elegir(nuevo: Idioma | null) {
    guardarIdiomaElegido(nuevo);
    setValor(nuevo);
    router.refresh();
  }

  const opciones: { valor: Idioma | null; etiqueta: string }[] = [
    { valor: null, etiqueta: t("automatico") },
    ...IDIOMAS.map((i) => ({ valor: i, etiqueta: t(i) })),
  ];
  return (
    <div>
      <p className="text-sm font-medium">{t("titulo")}</p>
      <p className="mt-0.5 text-xs text-white/45">{t("detalle")}</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("titulo")}>
        {opciones.map((o) => (
          <button
            key={o.etiqueta}
            type="button"
            role="radio"
            aria-checked={valor === o.valor}
            onClick={() => elegir(o.valor)}
            className={`rounded-full border px-3 py-1 text-sm ${
              valor === o.valor ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/15 text-white/60 hover:bg-white/5"
            }`}
          >
            {o.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
