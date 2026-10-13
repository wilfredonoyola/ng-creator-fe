"use client";

import { useEffect, useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import { VERIFICAR_USUARIO_RED } from "@/graphql/operations";
import { REDES_PERSONA, conPersona, urlPerfil, type Persona, type RedPersona } from "@/lib/etiquetas";
import type { Red } from "@/lib/upload-post";

const RED: Record<RedPersona, Red> = { instagram: "INSTAGRAM", tiktok: "TIKTOK", youtube: "YOUTUBE", facebook: "FACEBOOK" };
const NUEVA: Persona = { id: "", nombre: "" };

/** Al guardar a alguien nuevo: si además va a la lista de la marca. */
export interface OpcionesGuardado {
  enMarca: boolean;
}

/**
 * Una lista de personas para etiquetar: las de la marca o los invitados de un
 * episodio. Cada cambio se guarda al toque (la lista entera): no hay un
 * "Guardar" que olvidar. El backend limpia los usuarios y acepta el enlace del
 * perfil pegado; si uno no sirve, el error vuelve acá.
 *
 * En un episodio (`deLaMarca` + `onGuardarEnMarca`), la persona nueva se puede
 * guardar también en la marca, para los próximos episodios, y las de la marca
 * se suman con un toque.
 */
export function EditorPersonas({
  personas,
  onGuardar,
  puede,
  guardando,
  vacio,
  marcaId,
  deLaMarca,
  onGuardarEnMarca,
}: {
  personas: Persona[];
  /** Devuelve la lista como quedó guardada (con los ids nuevos). */
  onGuardar: (personas: Persona[]) => Promise<Persona[] | unknown>;
  puede: boolean;
  guardando?: boolean;
  /** Lo que se lee cuando todavía no hay nadie. */
  vacio: string;
  /** Para verificar los usuarios. */
  marcaId?: string | null;
  /** Las personas de la marca, para sumarlas con un toque (en un episodio). */
  deLaMarca?: Persona[];
  /** Con esto, la persona nueva se ofrece guardarla también en la marca. */
  onGuardarEnMarca?: (p: Persona) => Promise<unknown>;
}) {
  const t = useTranslations("etiquetas");
  // Índice que se edita; -1 = una nueva.
  const [editando, setEditando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function guardar(lista: Persona[], nueva?: { persona: Persona; enMarca: boolean }) {
    setError(null);
    try {
      const guardada = await onGuardar(lista);
      if (nueva?.enMarca && onGuardarEnMarca) {
        // Con el id que le dio el backend: la misma persona en la marca y en el episodio.
        const ids = new Set(personas.map((p) => p.id));
        const conId = Array.isArray(guardada) ? (guardada as Persona[]).find((p) => !ids.has(p.id)) : undefined;
        await onGuardarEnMarca(conId ?? nueva.persona);
      }
      setEditando(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGuardar"));
      return false;
    }
  }

  const ids = new Set(personas.map((p) => p.id));
  const sugeridas = (deLaMarca ?? []).filter((p) => !ids.has(p.id));

  return (
    <div className="space-y-2">
      {personas.length === 0 && editando !== -1 && <p className="text-xs text-white/40">{vacio}</p>}
      {personas.map((p, i) =>
        editando === i ? (
          <FormPersona
            key={p.id}
            inicial={p}
            marcaId={marcaId}
            guardando={guardando}
            onCancelar={() => setEditando(null)}
            onGuardar={(nueva) => guardar(personas.map((x, k) => (k === i ? nueva : x)))}
          />
        ) : (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.nombre}</p>
              <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/45">
                {REDES_PERSONA.filter((r) => p[r]).map((r) => (
                  <a
                    key={r}
                    href={urlPerfil(r, p[r]!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("verificar.verPerfil")}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    <IconoRed red={RED[r]} chico />@{p[r]}
                  </a>
                ))}
                {!REDES_PERSONA.some((r) => p[r]) && <span className="text-amber-300/80">{t("sinUsuarios")}</span>}
              </p>
            </div>
            {puede && (
              <>
                <button type="button" onClick={() => setEditando(i)} aria-label={t("editar", { nombre: p.nombre })} className="rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white">
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => void guardar(personas.filter((_, k) => k !== i))}
                  disabled={guardando}
                  aria-label={t("quitar", { nombre: p.nombre })}
                  className="rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </>
            )}
          </div>
        ),
      )}
      {editando === -1 && (
        <FormPersona
          inicial={NUEVA}
          marcaId={marcaId}
          guardando={guardando}
          ofrecerMarca={Boolean(onGuardarEnMarca)}
          onCancelar={() => setEditando(null)}
          onGuardar={(nueva, o) => guardar([...personas, nueva], { persona: nueva, enMarca: Boolean(o?.enMarca) })}
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {puede && editando === null && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditando(-1);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white/40 hover:text-white"
          >
            <Plus size={13} aria-hidden /> {t("agregar")}
          </button>
          {sugeridas.length > 0 && <span className="ml-1 text-[11px] text-white/35">{t("deLaMarca")}</span>}
          {sugeridas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void guardar(conPersona(personas, p))}
              disabled={guardando}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/60 hover:border-white/30 hover:text-white disabled:opacity-40"
            >
              <Plus size={11} aria-hidden /> {p.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * El nombre y su usuario en cada red. Alcanza con una: donde no tiene, ahí no
 * se lo etiqueta. Se puede pegar el enlace del perfil. Cada usuario se
 * verifica solo al escribirlo, para atrapar un error de tipeo.
 */
export function FormPersona({
  inicial,
  onGuardar,
  onCancelar,
  guardando,
  marcaId,
  ofrecerMarca = false,
}: {
  inicial: Persona;
  onGuardar: (p: Persona, opciones?: OpcionesGuardado) => Promise<boolean> | Promise<unknown>;
  onCancelar: () => void;
  guardando?: boolean;
  marcaId?: string | null;
  /** Ofrece "Guardar también en la marca" (alguien nuevo en un episodio). */
  ofrecerMarca?: boolean;
}) {
  const t = useTranslations("etiquetas");
  const [p, setP] = useState<Persona>(inicial);
  const [enMarca, setEnMarca] = useState(false);
  const valida = p.nombre.trim().length > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valida) void onGuardar({ ...p, nombre: p.nombre.trim() }, { enMarca: ofrecerMarca && enMarca });
      }}
      className="space-y-2 rounded-xl border border-white/15 bg-white/[0.03] p-3"
    >
      <input
        autoFocus
        value={p.nombre}
        onChange={(e) => setP({ ...p, nombre: e.target.value })}
        placeholder={t("nombre")}
        maxLength={80}
        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-ng-azul"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {REDES_PERSONA.map((r) => (
          <CampoUsuario key={r} red={r} valor={p[r] ?? ""} onCambio={(v) => setP({ ...p, [r]: v })} marcaId={marcaId} />
        ))}
      </div>
      <p className="text-[11px] text-white/35">{t("ayudaUsuarios")}</p>
      {ofrecerMarca && (
        <label className="flex items-start gap-2 text-xs text-white/70">
          <input type="checkbox" checked={enMarca} onChange={(e) => setEnMarca(e.target.checked)} className="mt-0.5 accent-[#FFD400]" />
          <span>
            {t("tambienEnMarca")}
            <span className="block text-[11px] text-white/35">{t("tambienEnMarcaAyuda")}</span>
          </span>
        </label>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!valida || guardando}
          className="rounded-lg bg-marca px-3 py-1.5 text-xs font-semibold text-ng-tinta hover:brightness-105 disabled:opacity-40"
        >
          {guardando ? t("guardando") : t("guardar")}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg px-3 py-1.5 text-xs text-white/60 hover:text-white">
          {t("cancelar")}
        </button>
      </div>
    </form>
  );
}

interface Verificacion {
  estado: "EXISTE" | "NO_EXISTE" | "SIN_VERIFICAR";
  usuario: string;
  url: string;
  nombre?: string | null;
  foto?: string | null;
  motivo?: string | null;
}

/**
 * Un usuario de una red, que se verifica solo un momento después de dejar de
 * escribir (be#200). No frena el guardado: si la red dice que no existe, avisa;
 * si no se puede saber (Facebook, Instagram personal), deja el enlace para
 * mirarlo.
 */
function CampoUsuario({
  red,
  valor,
  onCambio,
  marcaId,
}: {
  red: RedPersona;
  valor: string;
  onCambio: (v: string) => void;
  marcaId?: string | null;
}) {
  const t = useTranslations("etiquetas");
  const [verificar, { data, loading, error, variables }] = useLazyQuery<{ verificarUsuarioRed: Verificacion }>(VERIFICAR_USUARIO_RED, {
    fetchPolicy: "cache-first",
  });
  const limpio = valor.trim();
  useEffect(() => {
    if (!marcaId || limpio.length < 2) return;
    const espera = setTimeout(() => void verificar({ variables: { marcaId, red: RED[red], usuario: limpio } }), 700);
    return () => clearTimeout(espera);
  }, [marcaId, red, limpio, verificar]);

  // La respuesta puede ser de lo que había escrito antes: solo vale si es de esto.
  const vigente = !error && variables?.usuario === limpio ? data?.verificarUsuarioRed : undefined;
  const nombreRed = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook" }[red];

  return (
    <div>
      <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/30 px-2.5 focus-within:border-ng-azul">
        <IconoRed red={RED[red]} chico />
        <span className="text-sm text-white/35">@</span>
        <input
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder={t(`usuario.${red}`)}
          maxLength={120}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-white/30"
        />
        {loading && limpio ? <Loader2 size={13} className="shrink-0 animate-spin text-white/40" aria-hidden /> : null}
      </label>
      {limpio && !loading && (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[11px]">
          {vigente?.estado === "EXISTE" && (
            <span className="inline-flex min-w-0 items-center gap-1 text-ng-teal">
              {vigente.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vigente.foto} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
              ) : (
                <CheckCircle2 size={12} aria-hidden />
              )}
              <span className="truncate">{t("verificar.existe", { nombre: vigente.nombre || `@${vigente.usuario}` })}</span>
            </span>
          )}
          {vigente?.estado === "NO_EXISTE" && (
            <span className="inline-flex items-center gap-1 text-red-400">
              <AlertTriangle size={12} aria-hidden />
              {vigente.motivo === "noExisteOPrivada" ? t("verificar.noExisteOPrivada", { red: nombreRed }) : t("verificar.noExiste", { red: nombreRed })}
            </span>
          )}
          {vigente?.estado === "SIN_VERIFICAR" && (
            <span className="text-white/40">
              {vigente.motivo === "instagramPersonalONoExiste" ? t("verificar.instagramPersonal") : t("verificar.sinVerificar")}
            </span>
          )}
          <a
            href={vigente?.url || urlPerfil(red, limpio)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-ng-celeste hover:underline"
          >
            {t("verificar.verPerfil")} <ExternalLink size={10} aria-hidden />
          </a>
        </p>
      )}
    </div>
  );
}
