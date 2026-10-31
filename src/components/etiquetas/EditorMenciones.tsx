"use client";

import { Fragment, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AtSign } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import { RED_DE, REDES_PERSONA, coincide, marcaDe, type Persona } from "@/lib/etiquetas";
import { AvatarPersona } from "./TarjetaPersona";

/** Lo que se escribe después de "@", hasta el cursor: hasta dos palabras ("@ana ló"). */
const CONSULTA = /(?:^|[\s(¿¡"'])@([^\s@][^@\n]{0,24})?$/u;

/**
 * La descripción con menciones, como en las redes: escribir "@" abre la lista
 * de personas de la marca (y los invitados del episodio); elegir una deja
 * "@Nombre" resaltado en el texto y la etiqueta. Al publicar, cada red recibe
 * su usuario en ese lugar (ver `textoParaRed`): se escribe una vez, sale bien
 * en las cuatro.
 *
 * Es un textarea común (anda igual en el teléfono, con el corrector y el
 * pegado) con una capa detrás que pinta las menciones en el mismo lugar.
 */
export function EditorMenciones({
  valor,
  onCambio,
  personas,
  onMencionar,
  placeholder,
  maxLength,
  rows = 4,
}: {
  valor: string;
  onCambio: (v: string) => void;
  personas: Persona[];
  onMencionar: (p: Persona) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  const t = useTranslations("etiquetas");
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const capa = useRef<HTMLDivElement>(null);
  const [consulta, setConsulta] = useState<{ texto: string; desde: number } | null>(null);
  const [activo, setActivo] = useState(0);

  const resultados = consulta ? personas.filter((p) => coincide(p, consulta.texto)).slice(0, 7) : [];
  // Con dos palabras y nada que coincida, era texto común con una arroba: se cierra.
  const abierta = Boolean(consulta) && (resultados.length > 0 || !/\s/.test(consulta?.texto ?? ""));

  function mirar(texto: string, cursor: number) {
    const m = texto.slice(0, cursor).match(CONSULTA);
    if (!m) return setConsulta(null);
    const q = m[1] ?? "";
    setConsulta({ texto: q, desde: cursor - q.length - 1 });
    setActivo(0);
  }

  function elegir(p: Persona) {
    const el = area.current;
    if (!consulta || !el) return;
    const cursor = el.selectionStart;
    const insertado = `${marcaDe(p)} `;
    const nuevo = valor.slice(0, consulta.desde) + insertado + valor.slice(cursor).replace(/^ /, "");
    onCambio(maxLength ? nuevo.slice(0, maxLength) : nuevo);
    onMencionar(p);
    setConsulta(null);
    const pos = consulta.desde + insertado.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  // Las menciones de quienes existen, para pintarlas (los nombres largos primero).
  const nombres = [...new Set(personas.map(marcaDe))].sort((a, b) => b.length - a.length);
  const partes = pintar(valor, nombres);

  return (
    <div className="relative">
      <div className="relative rounded-xl border border-white/15 bg-white/[0.03] focus-within:border-ng-azul">
        <div
          ref={capa}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2.5 text-sm text-transparent"
        >
          {partes.map((x, i) =>
            x.mencion ? (
              <mark key={i} className="rounded-[4px] bg-ng-azul/25 text-transparent shadow-[0_0_0_1px_rgba(91,141,255,.45)]">
                {x.texto}
              </mark>
            ) : (
              <Fragment key={i}>{x.texto}</Fragment>
            ),
          )}
          {"\n"}
        </div>
        <textarea
          ref={area}
          value={valor}
          onChange={(e) => {
            onCambio(e.target.value);
            mirar(e.target.value, e.target.selectionStart);
          }}
          onSelect={(e) => mirar(e.currentTarget.value, e.currentTarget.selectionStart)}
          onScroll={(e) => {
            if (capa.current) capa.current.scrollTop = e.currentTarget.scrollTop;
          }}
          onBlur={() => setTimeout(() => setConsulta(null), 150)}
          onKeyDown={(e) => {
            if (!abierta || !resultados.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActivo((a) => (a + 1) % resultados.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActivo((a) => (a - 1 + resultados.length) % resultados.length);
            } else if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              elegir(resultados[activo]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setConsulta(null);
            }
          }}
          role="combobox"
          aria-expanded={abierta}
          aria-controls={`${id}-menciones`}
          aria-autocomplete="list"
          aria-activedescendant={abierta && resultados.length ? `${id}-m${activo}` : undefined}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          className="relative block w-full resize-y bg-transparent px-3 py-2.5 text-sm text-white caret-white outline-none placeholder:text-white/30"
        />
      </div>
      <p className="mt-1 flex items-center gap-1 px-1 text-[11px] text-white/35">
        <AtSign size={11} aria-hidden /> {t("menciones.ayuda")}
      </p>
      {abierta && (
        <div className="absolute inset-x-0 z-30 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A18] shadow-2xl">
          <ul id={`${id}-menciones`} role="listbox" aria-label={t("menciones.lista")} className="max-h-72 overflow-auto py-1">
            {resultados.map((p, i) => (
              <li
                key={p._id}
                id={`${id}-m${i}`}
                role="option"
                aria-selected={i === activo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(p);
                }}
                onMouseEnter={() => setActivo(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${i === activo ? "bg-white/10" : ""}`}
              >
                <AvatarPersona persona={p} tamano={28} />
                <span className="min-w-0 flex-1 truncate text-sm">{p.nombre}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {REDES_PERSONA.filter((r) => p[r]).map((r) => (
                    <IconoRed key={r} red={RED_DE[r]} chico />
                  ))}
                  {!REDES_PERSONA.some((r) => p[r]) && <span className="text-[10px] text-white/35">{t("menciones.sinRedes")}</span>}
                </span>
              </li>
            ))}
            {!resultados.length && <li className="px-3 py-2 text-xs text-white/40">{t("menciones.sinResultados")}</li>}
          </ul>
          <p className="hidden border-t border-white/10 px-3 py-1.5 text-[10px] text-white/30 sm:block">{t("menciones.teclas")}</p>
        </div>
      )}
    </div>
  );
}

/** El texto partido en lo común y las menciones conocidas, para pintarlas. */
function pintar(texto: string, nombres: string[]): { texto: string; mencion: boolean }[] {
  if (!nombres.length || !texto.includes("@")) return [{ texto, mencion: false }];
  const partes: { texto: string; mencion: boolean }[] = [];
  let i = 0;
  let desde = 0;
  while (i < texto.length) {
    const n = texto[i] === "@" ? nombres.find((x) => texto.startsWith(x, i) && !/[\p{L}\p{N}_]/u.test(texto[i + x.length] ?? "")) : undefined;
    if (n) {
      if (i > desde) partes.push({ texto: texto.slice(desde, i), mencion: false });
      partes.push({ texto: n, mencion: true });
      i += n.length;
      desde = i;
    } else i++;
  }
  if (desde < texto.length) partes.push({ texto: texto.slice(desde), mencion: false });
  return partes;
}
