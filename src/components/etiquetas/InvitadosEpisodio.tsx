"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Star, X } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import { RED_DE, REDES_PERSONA, datosDe, useAccionesPersonas, useInvitados, usePersonas } from "@/lib/etiquetas";
import { AvatarPersona } from "./TarjetaPersona";
import { BuscadorPersonas } from "./BuscadorPersonas";
import { FormPersona } from "./FormPersona";

/**
 * Quienes vinieron a este programa: salen sugeridos al publicar sus clips. Se
 * suman del elenco o de Global buscando, o se crean acá; uno que va a volver
 * se guarda también en Global y queda en los dos lados.
 */
export function InvitadosEpisodio({ episodioId, marcaId, opera }: { episodioId: string; marcaId: string; opera: boolean }) {
  const t = useTranslations("etiquetas");
  const { invitados } = useInvitados(marcaId, episodioId);
  const { personas } = usePersonas(marcaId);
  const acciones = useAccionesPersonas(marcaId);
  const [nuevo, setNuevo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = new Set(invitados.map((p) => p._id));

  async function hacer(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("form.errorGuardar"));
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("invitados.titulo")}</h2>
        <Link href="/etiquetas" className="text-xs text-ng-celeste hover:underline">
          {t("invitados.verTodas")} →
        </Link>
      </div>
      <p className="mb-3 mt-0.5 text-xs text-white/45">{t("invitados.descripcion")}</p>

      {invitados.length === 0 && nuevo === null ? <p className="mb-2 text-xs text-white/40">{t("invitados.vacio")}</p> : null}
      <ul className="mb-3 flex flex-wrap gap-2">
        {invitados.map((p) => (
          <li key={p._id} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 py-1 pl-1 pr-2">
            <AvatarPersona persona={p} tamano={24} />
            <span className="text-sm">{p.nombre}</span>
            {p.nivel === "ELENCO" ? <Star size={11} className="text-marca" aria-label={t("nivel.ELENCO")} /> : null}
            <span className="flex items-center gap-0.5">
              {REDES_PERSONA.filter((r) => p[r]).map((r) => (
                <IconoRed key={r} red={RED_DE[r]} chico />
              ))}
            </span>
            {opera && (
              <button
                type="button"
                onClick={() => void hacer(() => acciones.quitarInvitado(episodioId, p._id))}
                disabled={acciones.guardando}
                aria-label={t("invitados.quitar", { nombre: p.nombre })}
                className="rounded-full p-0.5 text-white/40 hover:bg-white/10 hover:text-red-400 disabled:opacity-40"
              >
                <X size={13} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {opera &&
        (nuevo !== null ? (
          <FormPersona
            titulo={t("invitados.nuevo")}
            inicial={{ ...datosDe(null, "EPISODIO"), nombre: nuevo }}
            marcaId={marcaId}
            enEpisodio
            guardando={acciones.guardando}
            onCancelar={() => setNuevo(null)}
            onGuardar={async (d) => {
              await acciones.crear(d, episodioId);
              setNuevo(null);
            }}
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <BuscadorPersonas
              personas={personas}
              excluir={ids}
              placeholder={t("invitados.sumar")}
              onElegir={(p) => void hacer(() => acciones.agregarInvitado(episodioId, p._id))}
              onCrear={(nombre) => setNuevo(nombre)}
            />
            <button
              type="button"
              onClick={() => setNuevo("")}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 px-3 py-2 text-xs text-white/70 hover:border-white/40 hover:text-white"
            >
              <Plus size={13} aria-hidden /> {t("invitados.nuevo")}
            </button>
          </div>
        ))}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}
