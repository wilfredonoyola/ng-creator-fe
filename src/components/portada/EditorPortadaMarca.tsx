"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { Paintbrush, Undo2 } from "lucide-react";
import { TITULOS_PORTADA } from "@/graphql/operations";
import type { DisenoPortada } from "@/lib/diseno-portada";
import { cuadroMasCerca, TEXTO_PORTADA_MAX, type CuadroPortada } from "@/lib/portada-marca";
import { EditorPortada } from "./EditorPortada";
import { VistaPortada } from "./VistaPortada";

/**
 * La portada de marca de una publicación (ng-creator-be#239): el título (vacío
 * = el gancho o el título del clip) y el cuadro, elegido entre los cuadros
 * limpios del clip. Un clip exportado antes no los tiene: ahí se elige con el
 * video (`sinCuadros`), y el cuadro trae los textos del clip.
 *
 * Con el editor (be#244): títulos sugeridos por la IA para elegir con un
 * toque, y "Personalizar esta portada", que abre el editor con el diseño de la
 * marca y deja uno propio para esta publicación (`diseno`; null = el de la marca).
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
  marcaId,
  clipId,
  diseno,
  onDiseno,
  posterUrl,
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
  marcaId?: string;
  clipId?: string | null;
  /** El diseño propio de esta publicación; null = el de la marca. */
  diseno?: DisenoPortada | null;
  /** Sin esto no se ofrece personalizar. */
  onDiseno?: (d: DisenoPortada | null) => void;
  /** El cuadro que ve el editor si el clip no tiene cuadros limpios. */
  posterUrl?: string | null;
}) {
  const t = useTranslations("portadaMarca");
  const elegido = cuadroMasCerca(cuadros, seg);
  const [editando, setEditando] = useState(false);
  const titulosQ = useQuery(TITULOS_PORTADA, {
    variables: { marcaId, clipId },
    skip: !marcaId || !clipId,
  });
  const titulos: string[] = (titulosQ.data?.titulosPortada ?? []).filter((x: string) => x.trim()).slice(0, 8);
  const textoEnUso = texto.trim() || textoPorDefecto;
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="min-w-0 flex-1 space-y-3">
        {onDiseno && marcaId && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-sm font-semibold text-ng-tinta hover:brightness-110"
            >
              <Paintbrush className="h-4 w-4" />
              {diseno ? t("personalizar.editar") : t("personalizar.boton")}
            </button>
            {diseno && (
              <button
                type="button"
                onClick={() => onDiseno(null)}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
              >
                <Undo2 className="h-3.5 w-3.5" />
                {t("personalizar.quitar")}
              </button>
            )}
            <span className="w-full text-[11px] text-white/40">{diseno ? t("personalizar.propia") : t("personalizar.ayuda")}</span>
          </div>
        )}
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
        {titulos.length > 0 && (
          <div className="space-y-1.5">
            <span className="block text-xs text-white/45">{t("editor.sugeridos")}</span>
            <div className="flex flex-wrap gap-1.5">
              {titulos.map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => onTexto(x.slice(0, TEXTO_PORTADA_MAX))}
                  aria-pressed={textoEnUso === x}
                  className={`max-w-full truncate rounded-full border px-2.5 py-1 text-left text-xs ${
                    textoEnUso === x ? "border-marca bg-marca/15 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
                  }`}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
        )}
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
      <div className="mx-auto sm:mx-0">
        <VistaPortada imagen={imagen} cargando={cargando} error={error} ancho={240} />
      </div>
      {editando && marcaId && onDiseno && (
        <EditorPortada
          marcaId={marcaId}
          inicial={diseno ?? undefined}
          clipId={clipId}
          seg={seg}
          texto={texto}
          cuadroUrl={elegido?.url ?? posterUrl ?? null}
          tituloEjemplo={textoEnUso}
          titulo={t("personalizar.tituloEditor")}
          textoGuardar={t("personalizar.usar")}
          onGuardar={(d) => {
            onDiseno(d);
            setEditando(false);
          }}
          onCerrar={() => setEditando(false)}
        />
      )}
    </div>
  );
}
