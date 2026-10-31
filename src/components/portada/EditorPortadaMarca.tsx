"use client";

import { useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { Loader2, Paintbrush, RefreshCw, Star, Undo2 } from "lucide-react";
import { PLANTILLA_CLIP_MARCA, TITULOS_PORTADA } from "@/graphql/operations";
import { temaValido } from "@/lib/estilos-texto";
import type { DisenoPortada } from "@/lib/diseno-portada";
import { cuadroMasCerca, mejorCuadro, TEXTO_PORTADA_MAX, type AvisoPortada, type CuadroPortada } from "@/lib/portada-marca";
import { AvisosPortada } from "./AvisosPortada";
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
 *
 * Portada automática (be#249): los títulos vienen en dos renglones (el de
 * abajo va en el color de la marca) y "Otros" pide más; el mejor cuadro lleva
 * una estrella; y abajo, la revisión (`avisos`, la pide quien programa, que
 * es quien frena el botón si hay un aviso grave).
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
  avisos,
  revisando,
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
  /** La revisión de la portada (useAvisosPortada); sin esto no se muestra. */
  avisos?: AvisoPortada[];
  revisando?: boolean;
}) {
  const t = useTranslations("portadaMarca");
  const elegido = cuadroMasCerca(cuadros, seg);
  const mejor = mejorCuadro(cuadros);
  const [editando, setEditando] = useState(false);
  const titulosQ = useQuery(TITULOS_PORTADA, {
    variables: { marcaId, clipId },
    skip: !marcaId || !clipId,
  });
  const titulos: string[] = (titulosQ.data?.titulosPortada ?? []).filter((x: string) => x.trim()).slice(0, 8);
  const textoEnUso = texto.trim() || textoPorDefecto;
  // El color de la marca, para el renglón de abajo de los títulos (como sale en la portada).
  const estiloQ = useQuery(PLANTILLA_CLIP_MARCA, { variables: { marcaId }, skip: !marcaId });
  const colorMarca = temaValido(estiloQ.data?.estiloClipMarca?.tema).colorPrimario;

  // "Otros": la IA arma títulos nuevos y quedan en el clip. Se dejan en el
  // cache como los de siempre y en el clip, para el texto por defecto.
  const cliente = useApolloClient();
  const [pidiendoOtros, setPidiendoOtros] = useState(false);
  async function pedirOtros() {
    if (!marcaId || !clipId) return;
    setPidiendoOtros(true);
    try {
      const r = await cliente.query({ query: TITULOS_PORTADA, variables: { marcaId, clipId, nuevos: true }, fetchPolicy: "network-only" });
      const nuevos: string[] = r.data?.titulosPortada ?? [];
      cliente.writeQuery({ query: TITULOS_PORTADA, variables: { marcaId, clipId }, data: { titulosPortada: nuevos } });
      const id = cliente.cache.identify({ __typename: "ClipEpisodio", _id: clipId });
      if (id) cliente.cache.modify({ id, fields: { titulosPortada: () => nuevos.filter((x) => x.trim()) } });
    } catch {
      // Quedan los de antes: no hay nada que avisar.
    } finally {
      setPidiendoOtros(false);
    }
  }
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
        {(titulos.length > 0 || (marcaId && clipId && !titulosQ.loading)) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="block text-xs text-white/45">{t("editor.sugeridos")}</span>
              {marcaId && clipId && (
                <button
                  type="button"
                  onClick={() => void pedirOtros()}
                  disabled={pidiendoOtros}
                  title={t("editor.otrosAyuda")}
                  className="flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/5 disabled:opacity-50"
                >
                  {pidiendoOtros ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  {t("editor.otros")}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {titulos.map((x) => {
                // El Enter separa el renglón de arriba (blanco) del de abajo (color de la marca).
                const [arriba, ...resto] = x.split("\n");
                const abajo = resto.join(" ").trim();
                return (
                  <button
                    key={x}
                    type="button"
                    onClick={() => onTexto(x.slice(0, TEXTO_PORTADA_MAX))}
                    aria-pressed={textoEnUso === x}
                    className={`max-w-full rounded-2xl border px-2.5 py-1 text-left text-xs leading-snug ${
                      textoEnUso === x ? "border-marca bg-marca/15 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <span className="block truncate">{arriba.trim()}</span>
                    {abajo && <span className="block truncate font-semibold" style={{ color: colorMarca }}>
                        {abajo}
                      </span>}
                  </button>
                );
              })}
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
                  aria-label={
                    t("editor.cuadroEn", { seg: c.seg.toFixed(1) }) + (mejor?.url === c.url ? ` · ${t("editor.mejorCuadro")}` : "")
                  }
                  title={mejor?.url === c.url ? t("editor.mejorCuadro") : undefined}
                  className={`relative shrink-0 overflow-hidden rounded-lg border-2 ${
                    elegido?.url === c.url ? "border-marca" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- cuadro del CDN */}
                  <img src={c.url} alt="" className="h-20 w-[45px] object-cover" loading="lazy" />
                  {mejor?.url === c.url && (
                    <span className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5" aria-hidden>
                      <Star className="h-2.5 w-2.5 fill-marca text-marca" />
                    </span>
                  )}
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
      <div className="mx-auto w-[240px] space-y-3 sm:mx-0">
        <VistaPortada imagen={imagen} cargando={cargando} error={error} ancho={240} />
        {avisos && <AvisosPortada avisos={avisos} revisando={revisando} />}
      </div>
      {editando && marcaId && onDiseno && (
        <EditorPortada
          marcaId={marcaId}
          inicial={diseno ?? undefined}
          clipId={clipId}
          seg={seg}
          texto={texto}
          cuadroUrl={elegido?.url ?? posterUrl ?? null}
          cuadroLimpio={!!elegido}
          cara={elegido?.cara ?? null}
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
