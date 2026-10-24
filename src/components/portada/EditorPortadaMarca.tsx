"use client";

import { useTranslations } from "next-intl";
import { cuadroMasCerca, TEXTO_PORTADA_MAX, type CuadroPortada } from "@/lib/portada-marca";
import { VistaPortada } from "./VistaPortada";

/**
 * La portada de marca de una publicación (ng-creator-be#239): el título (vacío
 * = el gancho o el título del clip) y el cuadro, elegido entre los cuadros
 * limpios del clip. Un clip exportado antes no los tiene: ahí se elige con el
 * video (`sinCuadros`), y el cuadro trae los textos del clip.
 */
export function EditorPortadaMarca({
  texto,
  onTexto,
  textoPorDefecto,
  cuadros,
  seg,
  onSeg,
  imagen,
  cargando,
  error,
  sinCuadros,
}: {
  texto: string;
  onTexto: (v: string) => void;
  textoPorDefecto: string;
  cuadros: CuadroPortada[];
  seg: number | null;
  onSeg: (v: number) => void;
  imagen: string | null;
  cargando: boolean;
  error?: boolean;
  /** Lo que se muestra para elegir el cuadro si el clip no tiene cuadros limpios. */
  sinCuadros?: React.ReactNode;
}) {
  const t = useTranslations("portadaMarca");
  const elegido = cuadroMasCerca(cuadros, seg);
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="min-w-0 flex-1 space-y-3">
        <label className="block space-y-1">
          <span className="block text-xs text-white/45">{t("editor.texto")}</span>
          <textarea
            value={texto}
            onChange={(e) => onTexto(e.target.value.slice(0, TEXTO_PORTADA_MAX))}
            placeholder={textoPorDefecto}
            rows={2}
            className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-ng-azul"
          />
          <span className="flex justify-between text-[11px] text-white/35">
            <span>{t("editor.textoAyuda")}</span>
            <span className="tabular-nums">
              {texto.length}/{TEXTO_PORTADA_MAX}
            </span>
          </span>
        </label>
        <div className="space-y-1.5">
          <span className="block text-xs text-white/45">{t("editor.cuadro")}</span>
          {cuadros.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cuadros.map((c) => (
                <button
                  key={c.url}
                  type="button"
                  onClick={() => onSeg(c.seg)}
                  aria-pressed={elegido?.url === c.url}
                  aria-label={t("editor.cuadroEn", { seg: c.seg.toFixed(1) })}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                    elegido?.url === c.url ? "border-marca" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- cuadro del CDN */}
                  <img src={c.url} alt="" className="h-20 w-[45px] object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <>
              {sinCuadros}
              <p className="text-[11px] text-white/40">{t("editor.sinCuadros")}</p>
            </>
          )}
        </div>
      </div>
      <VistaPortada imagen={imagen} cargando={cargando} error={error} />
    </div>
  );
}
