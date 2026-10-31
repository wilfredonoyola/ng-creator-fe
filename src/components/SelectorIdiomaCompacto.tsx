"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { IDIOMAS, esIdioma, idiomaDelNavegador } from "@/i18n/idiomas";
import { guardarIdiomaElegido } from "@/i18n/cliente";

/**
 * "ES · EN" para las páginas sin sesión (landing, ingreso, legales). Sin
 * "Automático" a la vista: elegir el idioma que no es el del navegador lo deja
 * en la cookie, igual que en Perfil (SelectorIdioma); elegir el del navegador
 * la borra y vuelve a seguirlo. Así un toque de prueba no lo deja fijo un año.
 */
export function SelectorIdiomaCompacto({
  className = "",
  claro = false,
}: {
  className?: string;
  /** Sobre fondo blanco (la cabecera de la landing). */
  claro?: boolean;
}) {
  const t = useTranslations("idioma");
  const locale = useLocale();
  const actual = esIdioma(locale) ? locale : null;
  const router = useRouter();
  const [cambiando, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("elegir")} className={`flex items-center text-xs font-semibold ${className}`}>
      {IDIOMAS.map((i, n) => (
        <span key={i} className="flex items-center">
          {n > 0 && <span aria-hidden className={`px-1 ${claro ? "text-[#0A0A0A]/25" : "text-white/25"}`}>·</span>}
          <button
            type="button"
            lang={i}
            aria-label={t(i)}
            aria-pressed={actual === i}
            disabled={cambiando}
            onClick={() => {
              if (actual === i) return;
              const delNavegador = idiomaDelNavegador(navigator.languages?.join(",") || navigator.language);
              guardarIdiomaElegido(i === delNavegador ? null : i);
              startTransition(() => router.refresh());
            }}
            className={`rounded-ng-md px-1.5 py-0.5 uppercase tracking-wide transition-colors ${
              actual === i
                ? "bg-marca text-ng-tinta"
                : claro
                  ? "text-[#6B6A64] hover:text-[#0A0A0A]"
                  : "text-ng-secundario hover:text-white"
            }`}
          >
            {i}
          </button>
        </span>
      ))}
    </div>
  );
}
