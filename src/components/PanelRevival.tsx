"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  ADJUNTAR_IMAGEN_NUEVA,
  GENERAR_PROMPT_REVIVAL,
  PUBLICAR_REVIVAL,
  PUBLICAR_HISTORIA_REVIVAL,
  PREVISUALIZAR_HISTORIA,
} from "@/graphql/operations";
import { ErrorDeSubida, uploadImagenRevival } from "@/lib/upload";
import type { PostRevival } from "./TarjetaRevival";

/**
 * Panel de trabajo de un revival: del análisis hasta publicar.
 *
 * Todo el flujo vive en un solo lugar porque son pasos encadenados sobre la
 * misma publicación: repartirlos en pantallas obligaría a ir y volver para
 * comparar el original con la versión nueva, que es justo lo que hay que mirar
 * antes de aprobar.
 *
 * Nunca publica solo. La aprobación es siempre de una persona.
 */
export function PanelRevival({
  post,
  pageId,
  onCerrar,
  onCambio,
}: {
  post: PostRevival & {
    analisisIa?: string | null;
    promptImagen?: string | null;
    imagenNuevaUrl?: string | null;
    mensajeNuevo?: string | null;
    publicadoPermalink?: string | null;
    programadaPara?: string | null;
    historiaUrl?: string | null;
    historiaPublicadaEn?: string | null;
  };
  pageId: string;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const t = useTranslations("revivalPanel");
  const tSubida = useTranslations("erroresSubida");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState(post.mensajeNuevo ?? post.mensaje ?? "");
  const [modo, setModo] = useState<"ahora" | "programar">("ahora");
  const [cuando, setCuando] = useState("");

  const original = post.imagenGuardadaUrl || post.imagenUrl;

  const [generar, { loading: generando }] = useMutation(
    GENERAR_PROMPT_REVIVAL,
    { onCompleted: onCambio, onError: (e) => setError(e.message) },
  );
  const [adjuntar] = useMutation(ADJUNTAR_IMAGEN_NUEVA, {
    onCompleted: onCambio,
    onError: (e) => setError(e.message),
  });
  const [publicar, { loading: publicando }] = useMutation(PUBLICAR_REVIVAL, {
    onCompleted: onCambio,
    onError: (e) => setError(e.message),
  });
  const [publicarHistoria, { loading: subiendoHistoria }] = useMutation(
    PUBLICAR_HISTORIA_REVIVAL,
    { onCompleted: onCambio, onError: (e) => setError(e.message) },
  );
  const [previsualizar, { loading: previsualizando }] = useMutation(
    PREVISUALIZAR_HISTORIA,
    { onCompleted: onCambio, onError: (e) => setError(e.message) },
  );

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSubiendo(true);
    try {
      // El backend le aplica la marca de agua antes de guardarla.
      const { url } = await uploadImagenRevival(file, pageId, post.postId);
      await adjuntar({
        variables: {
          postId: post.postId,
          imagenNuevaUrl: url,
          mensajeNuevo: mensaje || null,
        },
      });
    } catch (err) {
      setError(err instanceof ErrorDeSubida ? tSubida(err.clave, err.datos) : err instanceof Error ? err.message : t("errorSubir"));
    } finally {
      setSubiendo(false);
    }
  }

  function copiarPrompt() {
    if (!post.promptImagen) return;
    navigator.clipboard.writeText(post.promptImagen);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-0 sm:p-8"
      onClick={onCerrar}
    >
      {/* En el teléfono ocupa toda la pantalla: un modal flotante con márgenes
          deja el comparador en una ventana chica, y comparar dos imágenes es
          justamente lo que se viene a hacer acá. */}
      <div
        className="min-h-[100dvh] w-full max-w-4xl border-white/10 bg-ng-fondo sm:min-h-0 sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-ng-fondo px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <h2 className="font-bold">{t("titulo")}</h2>
            <p className="text-xs text-white/40">
              {new Date(post.publicadoEn).toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              {t("score", { score: post.score.toLocaleString(locale) })}
            </p>
          </div>
          <button
            onClick={onCerrar}
            aria-label={t("cerrar")}
            className="rounded-lg px-3 py-1 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Comparador */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Lado titulo={t("original")} imagen={original} texto={post.mensaje} />
            <Lado
              titulo={t("nueva")}
              imagen={post.imagenNuevaUrl}
              texto={post.mensajeNuevo}
              vacio={t("sinNueva")}
            />
          </div>

          {/* Análisis y prompt */}
          {post.estado !== "PUBLICADO" && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {t("analisisTitulo")}
                </h3>
                <button
                  onClick={() =>
                    generar({ variables: { postId: post.postId } })
                  }
                  disabled={generando}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20 disabled:opacity-40"
                >
                  {generando
                    ? t("analizando")
                    : post.promptImagen
                      ? t("regenerar")
                      : t("generarPrompt")}
                </button>
              </div>

              {post.analisisIa && (
                <p className="mb-3 whitespace-pre-line text-xs leading-relaxed text-white/60">
                  {post.analisisIa}
                </p>
              )}

              {post.promptImagen ? (
                <>
                  <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/50 p-3 text-xs leading-relaxed text-white/75">
                    {post.promptImagen}
                  </pre>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={copiarPrompt}
                      className="rounded-lg bg-marca px-4 py-1.5 text-xs font-semibold text-ng-tinta transition hover:brightness-110"
                    >
                      {copiado ? t("copiado") : t("copiarPrompt")}
                    </button>
                    {original && (
                      <a
                        href={original}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5"
                      >
                        {t("bajarReferencia")}
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-white/30">
                    {t("ayudaChatgpt")}
                  </p>
                </>
              ) : (
                !generando && (
                  <p className="text-xs text-white/30">
                    {t("generaPrimero")}
                  </p>
                )
              )}
            </div>
          )}

          {/* Texto y subida */}
          {post.estado !== "PUBLICADO" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  {t("textoNuevo")}
                </label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-white/80 outline-none focus:border-ng-azul/40"
                  placeholder={t("placeholderTexto")}
                />
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-4 text-sm text-white/50 transition hover:border-ng-azul/40 hover:text-white/80">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={elegirArchivo}
                  disabled={subiendo}
                />
                {subiendo
                  ? t("subiendoMarca")
                  : post.imagenNuevaUrl
                    ? t("reemplazar")
                    : t("subirImagen")}
              </label>
              <p className="text-[11px] text-white/25">
                {t("marcaServidor")}
              </p>
            </div>
          )}

          {/* Publicar o programar */}
          {post.estado === "PUBLICADO" ? (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
              {t("publicado")}{" "}
              {post.publicadoPermalink && (
                <a
                  href={post.publicadoPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {t("verFacebook")}
                </a>
              )}
            </div>
          ) : post.estado === "PROGRAMADO" ? (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
              {t.rich("programadoPara", {
                fecha: post.programadaPara
                  ? new Date(post.programadaPara).toLocaleString(locale, {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "",
                b: (c) => <strong>{c}</strong>,
              })}
              <p className="mt-1 text-xs text-indigo-200/60">
                {t("agendaFacebook")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["ahora", "programar"] as const).map((valor) => (
                  <button
                    key={valor}
                    onClick={() => setModo(valor)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      modo === valor
                        ? "bg-ng-teal/10 text-ng-teal"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {t(`modos.${valor}`)}
                  </button>
                ))}
              </div>

              {modo === "programar" && (
                <div>
                  <input
                    type="datetime-local"
                    value={cuando}
                    min={minimoProgramable()}
                    onChange={(e) => setCuando(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white/80 outline-none focus:border-ng-azul/40"
                  />
                  <p className="mt-1 text-[11px] text-white/25">
                    {t("anticipacion")}
                  </p>
                </div>
              )}

              <button
                onClick={() =>
                  publicar({
                    variables: {
                      postId: post.postId,
                      programarPara:
                        modo === "programar" && cuando
                          ? new Date(cuando).toISOString()
                          : null,
                    },
                  })
                }
                disabled={
                  !post.imagenNuevaUrl ||
                  publicando ||
                  (modo === "programar" && !cuando)
                }
                className="w-full rounded-lg bg-marca py-2.5 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
              >
                {publicando
                  ? modo === "programar"
                    ? t("programando")
                    : t("publicando")
                  : !post.imagenNuevaUrl
                    ? t("subiPrimero")
                    : modo === "programar"
                      ? t("programarPublicacion")
                      : t("publicarPagina")}
              </button>
            </div>
          )}

          {/* Historia: publicación aparte de la del feed */}
          {post.imagenNuevaUrl && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{t("historia")}</h3>
                  <p className="text-[11px] text-white/40">
                    {post.historiaPublicadaEn
                      ? t("historiaSubida", {
                          fecha: new Date(post.historiaPublicadaEn).toLocaleString(locale, {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                        })
                      : t("historiaAparte")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() =>
                      previsualizar({ variables: { postId: post.postId } })
                    }
                    disabled={previsualizando}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5 disabled:opacity-40"
                  >
                    {previsualizando
                      ? t("armando")
                      : post.historiaUrl
                        ? t("regenerar")
                        : t("verComoQueda")}
                  </button>
                  <button
                    onClick={() =>
                      publicarHistoria({ variables: { postId: post.postId } })
                    }
                    disabled={subiendoHistoria}
                    className="rounded-lg border border-white/15 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:border-ng-azul/40 hover:text-ng-celeste disabled:opacity-40"
                  >
                    {subiendoHistoria
                      ? t("subiendo")
                      : post.historiaPublicadaEn
                        ? t("volverASubir")
                        : t("subirHistoria")}
                  </button>
                </div>
              </div>

              {/* Vista previa del 9:16 real, no una simulación con CSS */}
              {post.historiaUrl && (
                <div className="mt-3 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.historiaUrl}
                    alt={t("altHistoria")}
                    className="w-48 rounded-xl border border-white/10"
                  />
                </div>
              )}

              <p className="mt-2 text-[11px] text-white/25">
                {t("notaTexto")}
              </p>
              <p className="text-[11px] text-white/25">
                {t("noProgramable")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Mínimo que acepta el input de fecha: 15 minutos desde ahora.
 *
 * Facebook exige 10, pero el input trabaja en hora local y sin formato de zona,
 * así que un margen extra evita que un envío lento caiga del otro lado del
 * límite y Meta rechace la programación.
 */
function minimoProgramable(): string {
  const t = new Date(Date.now() + 15 * 60_000);
  // datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local, no en UTC.
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
}

function Lado({
  titulo,
  imagen,
  texto,
  vacio,
}: {
  titulo: string;
  imagen?: string | null;
  texto?: string | null;
  vacio?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-wider text-white/40">
        {titulo}
      </p>
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl bg-black">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen} alt="" className="h-full w-full object-contain" />
        ) : (
          <p className="px-4 text-center text-xs text-white/25">{vacio}</p>
        )}
      </div>
      {texto && (
        <p className="mt-2 line-clamp-3 text-xs text-white/50">{texto}</p>
      )}
    </div>
  );
}
