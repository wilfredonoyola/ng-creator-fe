"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Plus, Users } from "lucide-react";
import { MAXIMO_COLABORADORES_INSTAGRAM, MAXIMO_ETIQUETADOS_INSTAGRAM, usuarioEn, type Persona } from "@/lib/etiquetas";
import { FormPersona } from "./EditorPersonas";

/**
 * "Etiquetar" al programar: el elenco de la marca y los invitados del
 * episodio, como fichas para tocar. Los invitados salen marcados (vinieron a
 * este programa); el elenco, no. En Instagram, cada uno puede ir como
 * colaborador (el Reel sale también en su perfil).
 */
export function EtiquetarPublicacion({
  personas,
  invitados,
  elegidas,
  onAlternar,
  colaboradores,
  onColaborador,
  conInstagram,
  onAgregarInvitado,
  guardando,
}: {
  personas: Persona[];
  /** Ids de los invitados del episodio: llevan su marca. */
  invitados: Set<string>;
  elegidas: Set<string>;
  onAlternar: (id: string) => void;
  colaboradores: Set<string>;
  onColaborador: (id: string) => void;
  /** Hay una cuenta de Instagram marcada: solo entonces se ofrece "colaborador". */
  conInstagram: boolean;
  /** Sin esto (sin permiso), no se ofrece "+ Invitado". */
  onAgregarInvitado?: (p: Persona) => Promise<unknown>;
  guardando?: boolean;
}) {
  const t = useTranslations("etiquetas");
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elegidasConIg = personas.filter((p) => elegidas.has(p.id) && usuarioEn("INSTAGRAM", p));
  const deMas = elegidasConIg.filter((p) => !colaboradores.has(p.id)).length > MAXIMO_ETIQUETADOS_INSTAGRAM;

  return (
    <div className="space-y-2">
      {personas.length === 0 && !agregando ? <p className="text-xs text-white/40">{t("publicar.vacio")}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {personas.map((p) => {
          const on = elegidas.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onAlternar(p.id)}
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                on ? "border-white/15 bg-white/10 text-white" : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70"
              }`}
            >
              {on ? <Check size={12} aria-hidden /> : null}
              {p.nombre}
              {invitados.has(p.id) ? <span className="rounded-full bg-marca/20 px-1.5 text-[10px] text-marca">{t("publicar.invitado")}</span> : null}
            </button>
          );
        })}
        {onAgregarInvitado && !agregando && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAgregando(true);
            }}
            className="flex items-center gap-1 rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-white/60 hover:border-white/40 hover:text-white"
          >
            <Plus size={12} aria-hidden /> {t("publicar.agregarInvitado")}
          </button>
        )}
      </div>

      {agregando && onAgregarInvitado && (
        <FormPersona
          inicial={{ id: "", nombre: "" }}
          guardando={guardando}
          onCancelar={() => setAgregando(false)}
          onGuardar={async (p) => {
            setError(null);
            try {
              await onAgregarInvitado(p);
              setAgregando(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : t("errorGuardar"));
            }
          }}
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {conInstagram && elegidasConIg.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-white/10 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs text-white/60">
            <Users size={13} aria-hidden /> {t("publicar.colaborador")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {elegidasConIg.map((p) => {
              const on = colaboradores.has(p.id);
              const lleno = !on && colaboradores.size >= MAXIMO_COLABORADORES_INSTAGRAM;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onColaborador(p.id)}
                  disabled={lleno}
                  aria-pressed={on}
                  title={lleno ? t("publicar.maximoColaboradores", { max: MAXIMO_COLABORADORES_INSTAGRAM }) : undefined}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    on ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/10 text-white/50 hover:text-white/80"
                  }`}
                >
                  @{usuarioEn("INSTAGRAM", p)}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-white/35">{t("publicar.colaboradorAyuda", { max: MAXIMO_COLABORADORES_INSTAGRAM })}</p>
        </div>
      )}
      {deMas && <p className="text-xs text-amber-300">{t("publicar.maximoEtiquetas", { max: MAXIMO_ETIQUETADOS_INSTAGRAM })}</p>}
      <p className="text-xs text-white/40">{t("publicar.ayuda")}</p>
    </div>
  );
}
