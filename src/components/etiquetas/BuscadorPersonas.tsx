"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import { RED_DE, REDES_PERSONA, coincide, type Persona } from "@/lib/etiquetas";
import { AvatarPersona } from "./TarjetaPersona";

/**
 * Buscar a alguien entre las personas de la marca para sumarlo (a un
 * episodio, a las etiquetas de un clip). Busca por nombre, alias y usuario,
 * sin acentos. Con `onCrear`, si no aparece se lo crea con lo escrito.
 */
export function BuscadorPersonas({
  personas,
  excluir,
  onElegir,
  onCrear,
  placeholder,
  autoFocus = false,
}: {
  personas: Persona[];
  excluir?: Set<string>;
  onElegir: (p: Persona) => void;
  onCrear?: (nombre: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("etiquetas");
  const id = useId();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(autoFocus);
  const [activo, setActivo] = useState(0);
  const resultados = personas.filter((p) => !excluir?.has(p._id) && coincide(p, q)).slice(0, 8);
  const conCrear = Boolean(onCrear && q.trim());
  const total = resultados.length + (conCrear ? 1 : 0);

  function elegir(i: number) {
    if (i < resultados.length) onElegir(resultados[i]);
    else if (conCrear) onCrear!(q.trim());
    setQ("");
    setActivo(0);
  }

  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 focus-within:border-ng-azul">
        <Search size={14} className="shrink-0 text-white/40" aria-hidden />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActivo(0);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (!total) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActivo((a) => (a + 1) % total);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActivo((a) => (a - 1 + total) % total);
            } else if (e.key === "Enter") {
              e.preventDefault();
              elegir(activo);
            } else if (e.key === "Escape") setAbierto(false);
          }}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          aria-activedescendant={abierto && total ? `${id}-${activo}` : undefined}
          placeholder={placeholder ?? t("buscador.placeholder")}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-white/30"
        />
      </label>
      {abierto && (q.trim() || resultados.length > 0) && (
        <ul id={`${id}-lista`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-white/10 bg-[#1A1A18] py-1 shadow-2xl">
          {resultados.map((p, i) => (
            <li
              key={p._id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === activo}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(i);
              }}
              onMouseEnter={() => setActivo(i)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${i === activo ? "bg-white/10" : ""}`}
            >
              <AvatarPersona persona={p} tamano={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{p.nombre}</span>
                <span className="block truncate text-[11px] text-white/40">{t(`nivel.${p.nivel}`)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {REDES_PERSONA.filter((r) => p[r]).map((r) => (
                  <IconoRed key={r} red={RED_DE[r]} chico />
                ))}
              </span>
            </li>
          ))}
          {conCrear && (
            <li
              id={`${id}-${resultados.length}`}
              role="option"
              aria-selected={activo === resultados.length}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(resultados.length);
              }}
              onMouseEnter={() => setActivo(resultados.length)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-marca ${activo === resultados.length ? "bg-white/10" : ""}`}
            >
              <Plus size={14} aria-hidden /> {t("buscador.crear", { nombre: q.trim() })}
            </li>
          )}
          {!resultados.length && !conCrear && <li className="px-3 py-2 text-xs text-white/40">{t("buscador.sinResultados")}</li>}
        </ul>
      )}
    </div>
  );
}
