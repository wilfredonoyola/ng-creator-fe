"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import { REDES_PERSONA, type Persona, type RedPersona } from "@/lib/etiquetas";
import type { Red } from "@/lib/upload-post";

const RED: Record<RedPersona, Red> = { instagram: "INSTAGRAM", tiktok: "TIKTOK", youtube: "YOUTUBE", facebook: "FACEBOOK" };
const NUEVA: Persona = { id: "", nombre: "" };

/**
 * Una lista de personas para etiquetar: el elenco de la marca o los invitados
 * de un episodio. Cada cambio se guarda al toque (la lista entera): no hay un
 * "Guardar" que olvidar. El backend limpia los usuarios y acepta el enlace del
 * perfil pegado; si uno no sirve, el error vuelve acá.
 */
export function EditorPersonas({
  personas,
  onGuardar,
  puede,
  guardando,
  vacio,
}: {
  personas: Persona[];
  onGuardar: (personas: Persona[]) => Promise<unknown>;
  puede: boolean;
  guardando?: boolean;
  /** Lo que se lee cuando todavía no hay nadie. */
  vacio: string;
}) {
  const t = useTranslations("etiquetas");
  // Índice que se edita; -1 = una nueva.
  const [editando, setEditando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function guardar(lista: Persona[]) {
    setError(null);
    try {
      await onGuardar(lista);
      setEditando(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGuardar"));
      return false;
    }
  }

  return (
    <div className="space-y-2">
      {personas.length === 0 && editando !== -1 && <p className="text-xs text-white/40">{vacio}</p>}
      {personas.map((p, i) =>
        editando === i ? (
          <FormPersona
            key={p.id}
            inicial={p}
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
                  <span key={r} className="inline-flex items-center gap-1">
                    <IconoRed red={RED[r]} chico />@{p[r]}
                  </span>
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
        <FormPersona inicial={NUEVA} guardando={guardando} onCancelar={() => setEditando(null)} onGuardar={(nueva) => guardar([...personas, nueva])} />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {puede && editando === null && (
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
      )}
    </div>
  );
}

/**
 * El nombre y su usuario en cada red. Alcanza con una: donde no tiene, ahí no
 * se lo etiqueta. Se puede pegar el enlace del perfil.
 */
export function FormPersona({
  inicial,
  onGuardar,
  onCancelar,
  guardando,
}: {
  inicial: Persona;
  onGuardar: (p: Persona) => Promise<boolean> | Promise<unknown>;
  onCancelar: () => void;
  guardando?: boolean;
}) {
  const t = useTranslations("etiquetas");
  const [p, setP] = useState<Persona>(inicial);
  const valida = p.nombre.trim().length > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valida) void onGuardar({ ...p, nombre: p.nombre.trim() });
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
          <label key={r} className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/30 px-2.5 focus-within:border-ng-azul">
            <IconoRed red={RED[r]} chico />
            <span className="text-sm text-white/35">@</span>
            <input
              value={p[r] ?? ""}
              onChange={(e) => setP({ ...p, [r]: e.target.value })}
              placeholder={t(`usuario.${r}`)}
              maxLength={120}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-white/30"
            />
          </label>
        ))}
      </div>
      <p className="text-[11px] text-white/35">{t("ayudaUsuarios")}</p>
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
