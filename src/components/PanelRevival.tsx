"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import {
  ADJUNTAR_IMAGEN_NUEVA,
  GENERAR_PROMPT_REVIVAL,
  PUBLICAR_REVIVAL,
} from "@/graphql/operations";
import { uploadImagenRevival } from "@/lib/upload";
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
  };
  pageId: string;
  onCerrar: () => void;
  onCambio: () => void;
}) {
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
      setError(err instanceof Error ? err.message : "No se pudo subir");
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 sm:p-8"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0a0a0a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-bold">Revivir publicación</h2>
            <p className="text-xs text-white/40">
              {new Date(post.publicadoEn).toLocaleDateString("es", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · score {post.score.toLocaleString("es")}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-lg px-3 py-1 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-5">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Comparador */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Lado titulo="Original" imagen={original} texto={post.mensaje} />
            <Lado
              titulo="Nueva"
              imagen={post.imagenNuevaUrl}
              texto={post.mensajeNuevo}
              vacio="Todavía no subiste la imagen nueva"
            />
          </div>

          {/* Análisis y prompt */}
          {post.estado !== "PUBLICADO" && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Análisis y prompt para ChatGPT
                </h3>
                <button
                  onClick={() =>
                    generar({ variables: { postId: post.postId } })
                  }
                  disabled={generando}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20 disabled:opacity-40"
                >
                  {generando
                    ? "Analizando…"
                    : post.promptImagen
                      ? "Regenerar"
                      : "Generar prompt"}
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
                  <button
                    onClick={copiarPrompt}
                    className="mt-2 rounded-lg bg-[#0FED9D] px-4 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
                  >
                    {copiado ? "✓ Copiado" : "Copiar prompt"}
                  </button>
                </>
              ) : (
                !generando && (
                  <p className="text-xs text-white/30">
                    Generá el prompt, pegalo en ChatGPT y volvé con la imagen.
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
                  Texto de la publicación nueva
                </label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-white/80 outline-none focus:border-[#0FED9D]/40"
                  placeholder="Arranca con el texto del original; editalo a gusto."
                />
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-4 text-sm text-white/50 transition hover:border-[#0FED9D]/40 hover:text-white/80">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={elegirArchivo}
                  disabled={subiendo}
                />
                {subiendo
                  ? "Subiendo y aplicando la marca de agua…"
                  : post.imagenNuevaUrl
                    ? "Reemplazar imagen nueva"
                    : "Subir la imagen que hiciste en ChatGPT"}
              </label>
              <p className="text-[11px] text-white/25">
                La marca de agua de la página se aplica en el servidor: no hace
                falta que la pongas vos.
              </p>
            </div>
          )}

          {/* Publicar o programar */}
          {post.estado === "PUBLICADO" ? (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
              Publicado.{" "}
              {post.publicadoPermalink && (
                <a
                  href={post.publicadoPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Ver en Facebook
                </a>
              )}
            </div>
          ) : post.estado === "PROGRAMADO" ? (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
              Programado para{" "}
              <strong>
                {post.programadaPara &&
                  new Date(post.programadaPara).toLocaleString("es", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </strong>
              .
              <p className="mt-1 text-xs text-indigo-200/60">
                La agenda la sostiene Facebook, así que sale a esa hora aunque
                este sistema esté apagado. Para cancelarla o cambiarla, entrá al
                Meta Business Suite de la página.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["ahora", "Publicar ahora"],
                    ["programar", "Programar"],
                  ] as const
                ).map(([valor, etiqueta]) => (
                  <button
                    key={valor}
                    onClick={() => setModo(valor)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      modo === valor
                        ? "bg-[#0FED9D]/10 text-[#0FED9D]"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {etiqueta}
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
                    className="w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm text-white/80 outline-none focus:border-[#0FED9D]/40"
                  />
                  <p className="mt-1 text-[11px] text-white/25">
                    Facebook exige al menos 10 minutos de anticipación. La hora
                    es la de tu computadora.
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
                className="w-full rounded-lg bg-[#0FED9D] py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
              >
                {publicando
                  ? modo === "programar"
                    ? "Programando…"
                    : "Publicando…"
                  : !post.imagenNuevaUrl
                    ? "Subí la imagen nueva para poder publicar"
                    : modo === "programar"
                      ? "Programar publicación"
                      : "Publicar en la página"}
              </button>
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
