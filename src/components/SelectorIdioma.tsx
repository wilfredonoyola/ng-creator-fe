"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { COOKIE_IDIOMA, IDIOMAS, type Idioma } from "@/i18n/idiomas";

/** Lo elegido, o null = automático (el del navegador). Solo se lee en el navegador. */
function elegido(): Idioma | null {
  if (typeof document === "undefined") return null;
  const v = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_IDIOMA}=`))?.split("=")[1];
  return (IDIOMAS as readonly string[]).includes(v ?? "") ? (v as Idioma) : null;
}

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
  useEffect(() => setValor(elegido()), []);

  function elegir(nuevo: Idioma | null) {
    document.cookie = nuevo
      ? `${COOKIE_IDIOMA}=${nuevo}; path=/; max-age=31536000; samesite=lax`
      : `${COOKIE_IDIOMA}=; path=/; max-age=0; samesite=lax`;
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
