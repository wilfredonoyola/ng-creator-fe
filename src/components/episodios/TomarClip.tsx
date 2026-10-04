"use client";

import { useState } from "react";
import { useMutation, type ApolloClient } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { CRUCES_DE_TRAMO, SOLTAR_CLIP_EPISODIO, TOMAR_CLIP_EPISODIO } from "@/graphql/operations";
import { useSesion } from "@/lib/sesion";

/**
 * Quién tiene cada clip y el aviso de cruces (#70, ng-creator-be#125).
 *
 * El equipo de una marca trabaja el mismo episodio: "Tomarlo" deja el clip a
 * nombre de quien lo va a hacer, y antes de cortar un tramo se avisa si otro
 * clip ya cubre ese momento. Nada de esto bloquea: tomar uno ajeno se confirma
 * y un cruce se puede guardar igual.
 */

export interface Autoria {
  usuarioId: string;
  nombre: string;
  en: string;
}

export interface CruceClip {
  clipId: string;
  titulo: string;
  desdeSeg: number;
  hastaSeg: number;
  tomadoPor?: Autoria | null;
  segundosEnComun: number;
  /** El tramo nuevo contiene al otro y es más largo: más contexto, no un duplicado. */
  masLargo: boolean;
}

/** "Lo edita Ana", "Lo editás vos" o "Libre". */
export function quienLoTiene(
  tomadoPor: Autoria | null | undefined,
  usuarioId: string | null | undefined,
  t: ReturnType<typeof useTranslations<"editorTomar">>,
): string {
  if (!tomadoPor) return t("libre");
  return tomadoPor.usuarioId === usuarioId ? t("loEditasVos") : t("loEdita", { nombre: tomadoPor.nombre });
}

/**
 * La etiqueta de quién lo tiene y, para quien opera la marca, "Tomarlo" (en
 * los libres y en los ajenos, confirmando) o "Liberar" (en los propios).
 */
export function TomarClip({
  clipId,
  marcaId,
  tomadoPor,
  puedeOperar,
}: {
  clipId: string;
  marcaId: string;
  tomadoPor?: Autoria | null;
  puedeOperar: boolean;
}) {
  const t = useTranslations("editorTomar");
  const locale = useLocale();
  const { usuario } = useSesion();
  const [tomar, { loading: tomando }] = useMutation(TOMAR_CLIP_EPISODIO);
  const [soltar, { loading: soltando }] = useMutation(SOLTAR_CLIP_EPISODIO);
  const [error, setError] = useState<string | null>(null);
  const mio = Boolean(tomadoPor && tomadoPor.usuarioId === usuario?._id);
  const ocupado = tomando || soltando;

  async function lotomo() {
    if (tomadoPor && !mio && !window.confirm(t("confirmarTomar", { nombre: tomadoPor.nombre }))) return;
    setError(null);
    try {
      await tomar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorTomar"));
    }
  }

  async function losuelto() {
    setError(null);
    try {
      await soltar({ variables: { id: clipId, marcaId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorSoltar"));
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        title={tomadoPor ? t("desde", { fecha: new Date(tomadoPor.en).toLocaleString(locale) }) : undefined}
        className={`rounded-full px-2 py-0.5 text-[11px] ${
          !tomadoPor
            ? "bg-white/5 text-white/50"
            : mio
              ? "bg-ng-violeta/25 text-white"
              : "bg-amber-400/15 text-amber-300"
        }`}
      >
        {quienLoTiene(tomadoPor, usuario?._id, t)}
      </span>
      {puedeOperar && (
        <button
          onClick={() => void (mio ? losuelto() : lotomo())}
          disabled={ocupado}
          title={mio ? t("liberarAyuda") : t("tomarAyuda")}
          className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/5 disabled:opacity-50"
        >
          {mio ? t("liberar") : t("tomar")}
        </button>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </span>
  );
}

/** Los clips que ya cubren parte del tramo. Si la consulta falla, no se frena a nadie. */
export async function buscarCruces(
  cliente: ApolloClient<object>,
  variables: { episodioId: string; marcaId: string; desdeSeg: number; hastaSeg: number; excluirClipId?: string },
): Promise<CruceClip[]> {
  try {
    const { data } = await cliente.query({ query: CRUCES_DE_TRAMO, variables, fetchPolicy: "network-only" });
    return data?.crucesDeTramo ?? [];
  } catch {
    return [];
  }
}

/** El aviso antes de crear o guardar un tramo que pisa otros clips. No bloquea. */
export function AvisoCruces({
  cruces,
  usuarioId,
  textoSeguir,
  onSeguir,
  onCancelar,
}: {
  cruces: CruceClip[];
  usuarioId?: string | null;
  textoSeguir: string;
  onSeguir: () => void;
  onCancelar: () => void;
}) {
  const t = useTranslations("editorTomar");
  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-400/[0.07] p-3 text-sm">
      <p className="mb-2 font-medium text-amber-200">{t("cruces.titulo")}</p>
      <ul className="space-y-1.5 text-white/75">
        {cruces.map((c) => (
          <li key={c.clipId}>
            {t("cruces.cruce", {
              titulo: c.titulo,
              desde: reloj(c.desdeSeg),
              hasta: reloj(c.hastaSeg),
              quien: !c.tomadoPor
                ? t("cruces.libre")
                : c.tomadoPor.usuarioId === usuarioId
                  ? t("cruces.vos")
                  : t("cruces.otro", { nombre: c.tomadoPor.nombre }),
              segundos: Math.round(c.segundosEnComun),
            })}
            {c.masLargo && <span className="text-white/50"> {t("cruces.masLargo")}</span>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onSeguir}
          className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:brightness-110"
        >
          {textoSeguir}
        </button>
        <button
          onClick={onCancelar}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          {t("cruces.cancelar")}
        </button>
      </div>
    </div>
  );
}

/** 83.4 → "1:23". */
function reloj(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}
