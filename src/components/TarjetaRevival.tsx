"use client";

export type EstadoRevival =
  | "NUEVO"
  | "PARA_TRABAJAR"
  | "EN_TRABAJO"
  | "EN_REVISION"
  | "PROGRAMADO"
  | "PUBLICADO"
  | "DESCARTADO";

export interface PostRevival {
  _id: string;
  postId: string;
  mensaje?: string | null;
  tipo: "IMAGEN" | "VIDEO" | "ENLACE" | "TEXTO" | "OTRO";
  permalink?: string | null;
  imagenUrl?: string | null;
  imagenGuardadaUrl?: string | null;
  analisisIa?: string | null;
  promptImagen?: string | null;
  imagenNuevaUrl?: string | null;
  mensajeNuevo?: string | null;
  publicadoPermalink?: string | null;
  programadaPara?: string | null;
  historiaUrl?: string | null;
  historiaPublicadaEn?: string | null;
  publicadoEn: string;
  reacciones: number;
  comentarios: number;
  compartidos: number;
  reproducciones?: number | null;
  score: number;
  estado: EstadoRevival;
}

export const ETIQUETA_ESTADO: Record<EstadoRevival, string> = {
  NUEVO: "Nuevo",
  PARA_TRABAJAR: "Para trabajar",
  EN_TRABAJO: "En trabajo",
  EN_REVISION: "En revisión",
  PROGRAMADO: "Programado",
  PUBLICADO: "Publicado",
  DESCARTADO: "Descartado",
};

const COLOR_ESTADO: Record<EstadoRevival, string> = {
  NUEVO: "bg-white/10 text-white/50",
  PARA_TRABAJAR: "bg-[#0FED9D]/15 text-[#0FED9D]",
  EN_TRABAJO: "bg-amber-500/15 text-amber-300",
  EN_REVISION: "bg-sky-500/15 text-sky-300",
  PROGRAMADO: "bg-indigo-500/15 text-indigo-300",
  PUBLICADO: "bg-violet-500/15 text-violet-300",
  DESCARTADO: "bg-white/5 text-white/25",
};

const ICONO_TIPO: Record<PostRevival["tipo"], string> = {
  IMAGEN: "🖼️",
  VIDEO: "🎬",
  ENLACE: "🔗",
  TEXTO: "📝",
  OTRO: "❓",
};

/**
 * Avance del flujo por etapa: a dónde lleva el botón principal.
 *
 * Las etapas que faltan (EN_TRABAJO, EN_REVISION, PUBLICADO) no cambian de
 * estado con un botón: abren el panel de trabajo, donde el avance depende de
 * generar el prompt, subir la imagen y publicar.
 */
const SIGUIENTE: Partial<
  Record<EstadoRevival, { estado: EstadoRevival; texto: string }>
> = {
  NUEVO: { estado: "PARA_TRABAJAR", texto: "Trabajar" },
  PARA_TRABAJAR: { estado: "EN_TRABAJO", texto: "Empezar" },
  DESCARTADO: { estado: "NUEVO", texto: "Recuperar" },
};

/** Etapas cuyo trabajo ocurre dentro del panel, no con un cambio de estado. */
const ABRE_PANEL: EstadoRevival[] = [
  "EN_TRABAJO",
  "EN_REVISION",
  "PROGRAMADO",
  "PUBLICADO",
];

const TEXTO_PANEL: Partial<Record<EstadoRevival, string>> = {
  EN_TRABAJO: "Generar imagen",
  EN_REVISION: "Revisar y publicar",
  PROGRAMADO: "Ver programación",
  PUBLICADO: "Ver resultado",
};

/**
 * Una publicación del historial, con su imagen a tamaño útil.
 *
 * La imagen va en `object-contain` sobre negro y no recortada: se muestra para
 * decidir si vale la pena reciclarla, y un recorte esconde justo lo que hay que
 * juzgar.
 */
export function TarjetaRevival({
  post,
  ocupado,
  onCambiarEstado,
  onAbrirPanel,
}: {
  post: PostRevival;
  ocupado: boolean;
  onCambiarEstado: (postId: string, estado: EstadoRevival) => void;
  onAbrirPanel: (post: PostRevival) => void;
}) {
  // La copia en Bunny es permanente; la de Facebook caduca. Se prefiere la
  // nuestra cuando existe.
  const imagen = post.imagenGuardadaUrl || post.imagenUrl;
  const siguiente = SIGUIENTE[post.estado];
  const numero = (n: number) => n.toLocaleString("es");

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="relative aspect-[4/5] bg-black">
        {imagen ? (
          // URL del CDN de Facebook o de Bunny: next/image exigiría declarar
          // cada dominio y las de Facebook además caducan.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagen}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-20">
            {ICONO_TIPO[post.tipo]}
          </div>
        )}

        <span
          className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-medium ${COLOR_ESTADO[post.estado]}`}
        >
          {ETIQUETA_ESTADO[post.estado]}
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-[#0FED9D]">
          {numero(post.score)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-xs text-white/70">
          {post.mensaje || <span className="text-white/25">Sin texto</span>}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
          <span title="Reacciones">❤️ {numero(post.reacciones)}</span>
          <span title="Comentarios">💬 {numero(post.comentarios)}</span>
          <span title="Compartidos">🔁 {numero(post.compartidos)}</span>
          {post.reproducciones != null && (
            <span title="Reproducciones">▶️ {numero(post.reproducciones)}</span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2 text-[10px] text-white/25">
          <span>
            {new Date(post.publicadoEn).toLocaleDateString("es", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0FED9D]"
            >
              ver original
            </a>
          )}
        </div>

        {/* py-2.5 para que el objetivo sea cómodo de tocar: a dos columnas en
            un teléfono la tarjeta mide unos 170px y los botones quedan chicos. */}
        <div className="mt-3 flex gap-2">
          {ABRE_PANEL.includes(post.estado) ? (
            <button
              onClick={() => onAbrirPanel(post)}
              className="flex-1 rounded-lg bg-[#0FED9D] py-2.5 text-xs font-semibold text-black transition hover:brightness-110"
            >
              {TEXTO_PANEL[post.estado]}
            </button>
          ) : siguiente ? (
            <button
              onClick={() => onCambiarEstado(post.postId, siguiente.estado)}
              disabled={ocupado}
              className="flex-1 rounded-lg bg-[#0FED9D] py-2.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-40"
            >
              {siguiente.texto}
            </button>
          ) : null}
          {post.estado !== "DESCARTADO" && (
            <button
              onClick={() => onCambiarEstado(post.postId, "DESCARTADO")}
              disabled={ocupado}
              title="Descartar"
              aria-label="Descartar"
              className="shrink-0 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white/40 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
            >
              {/* La palabra no entra junto al botón principal en una tarjeta
                  angosta; el icono sí, y el aria-label mantiene el sentido. */}
              <span className="sm:hidden">✕</span>
              <span className="hidden sm:inline">Descartar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
