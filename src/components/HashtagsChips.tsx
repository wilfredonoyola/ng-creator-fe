"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MAX_HASHTAGS, sumarHashtags } from "@/lib/ajustes-publicacion";

/**
 * Hashtags como chips: se escribe y Enter, espacio o coma lo agrega; ✕ lo
 * quita. Se muestran con '#', se guardan sin. Pegar "#a #b, c" agrega los tres.
 * Sin `onChange`, solo se ven.
 */
export function HashtagsChips({
  valor,
  onChange,
  placeholder,
}: {
  valor: string[];
  onChange?: (hashtags: string[]) => void;
  placeholder?: string;
}) {
  const t = useTranslations("hashtagsChips");
  const [texto, setTexto] = useState("");
  const editable = Boolean(onChange);
  const lleno = valor.length >= MAX_HASHTAGS;

  function agregar(crudo: string) {
    const partes = crudo.split(/[\s,]+/);
    if (onChange && partes.some(Boolean)) onChange(sumarHashtags(valor, partes));
    setTexto("");
  }

  function quitar(h: string) {
    onChange?.(valor.filter((x) => x !== h));
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] p-2 ${
        editable ? "focus-within:border-ng-azul" : ""
      }`}
    >
      {valor.map((h) => (
        <span
          key={h}
          className="flex max-w-full items-center gap-1 rounded-full border border-ng-azul/50 bg-ng-azul/10 py-0.5 pl-2.5 pr-1 text-xs"
        >
          <span className="truncate">#{h}</span>
          {editable ? (
            <button
              type="button"
              onClick={() => quitar(h)}
              aria-label={t("quitar", { hashtag: h })}
              className="flex h-4 w-4 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          ) : (
            <span className="w-1" />
          )}
        </span>
      ))}
      {editable ? (
        <input
          value={texto}
          disabled={lleno}
          onChange={(e) => {
            const v = e.target.value;
            // Espacio o coma cierran el hashtag (también al pegar varios).
            if (/[\s,]/.test(v)) agregar(v);
            else setTexto(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar(texto);
            } else if (e.key === "Backspace" && !texto && valor.length) {
              quitar(valor[valor.length - 1]);
            }
          }}
          onBlur={() => texto && agregar(texto)}
          placeholder={lleno ? t("lleno", { max: MAX_HASHTAGS }) : placeholder ?? t("placeholder")}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-white/30"
        />
      ) : valor.length === 0 ? (
        <span className="px-1 text-xs text-white/35">{t("ninguno")}</span>
      ) : null}
    </div>
  );
}
