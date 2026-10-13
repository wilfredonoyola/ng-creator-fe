"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link2, Sparkles } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import { NOMBRE_RED, RED_DE, REDES_PERSONA, detectarPerfil, type DatosPersona, type NivelPersona } from "@/lib/etiquetas";
import { CampoUsuario } from "./CampoUsuario";

/**
 * Cargar o editar a una persona. Lo más rápido es pegar el enlace de su
 * perfil: se reconoce la red y el usuario solos (también el de una página de
 * Facebook sin nombre, profile.php?id=…). Cada usuario se verifica al
 * escribirlo, para atrapar un error de tipeo antes de publicar.
 *
 * `niveles`: entre cuáles se elige (en Etiquetas). En un episodio va
 * `enEpisodio`: es un invitado, y se ofrece guardarlo también en Global.
 */
export function FormPersona({
  inicial,
  titulo,
  onGuardar,
  onCancelar,
  guardando,
  marcaId,
  niveles,
  enEpisodio = false,
}: {
  inicial: DatosPersona;
  titulo?: string;
  onGuardar: (d: DatosPersona) => Promise<unknown>;
  onCancelar: () => void;
  guardando?: boolean;
  marcaId?: string | null;
  niveles?: NivelPersona[];
  enEpisodio?: boolean;
}) {
  const t = useTranslations("etiquetas");
  const [d, setD] = useState<DatosPersona>(inicial);
  const [enlace, setEnlace] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [alias, setAlias] = useState(inicial.alias.join(", "));
  const [error, setError] = useState<string | null>(null);
  const valida = d.nombre.trim().length > 0;

  function pegar(texto: string) {
    setEnlace(texto);
    if (!texto.trim()) return setAviso(null);
    const p = detectarPerfil(texto);
    if (!p) return setAviso(/\.(com|net|be)\b|https?:/i.test(texto) ? t("form.enlaceNoReconocido") : null);
    setD((x) => ({ ...x, [p.red]: p.usuario }));
    setAviso(t("form.enlaceDetectado", { red: NOMBRE_RED[p.red], usuario: p.usuario }));
    setEnlace("");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valida) return;
    setError(null);
    try {
      await onGuardar({ ...d, nombre: d.nombre.trim(), alias: alias.split(",").map((a) => a.trim()).filter(Boolean) });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.errorGuardar"));
    }
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className="space-y-3 rounded-2xl border border-white/15 bg-[#121211] p-4 shadow-[0_12px_40px_-20px_rgba(0,0,0,.8)]">
      {titulo ? <p className="text-sm font-semibold">{titulo}</p> : null}

      <label className="block">
        <span className="mb-1 block text-xs text-white/50">{t("form.nombre")}</span>
        <input
          autoFocus
          value={d.nombre}
          onChange={(e) => setD({ ...d, nombre: e.target.value })}
          placeholder={t("form.nombrePlaceholder")}
          maxLength={80}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-ng-azul"
        />
      </label>

      <label className="block">
        <span className="mb-1 flex items-center gap-1.5 text-xs text-white/50">
          <Link2 size={12} aria-hidden /> {t("form.enlace")}
        </span>
        <input
          value={enlace}
          onChange={(e) => pegar(e.target.value)}
          placeholder={t("form.enlacePlaceholder")}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-lg border border-dashed border-white/20 bg-black/20 px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-ng-azul"
        />
        {aviso ? (
          <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-ng-teal" aria-live="polite">
            <Sparkles size={11} aria-hidden /> {aviso}
          </span>
        ) : null}
      </label>

      <div>
        <span className="mb-1 block text-xs text-white/50">{t("form.usuarios")}</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {REDES_PERSONA.map((r) => (
            <CampoUsuario key={r} red={r} valor={d[r]} onCambio={(v) => setD((x) => ({ ...x, [r]: v }))} marcaId={marcaId} />
          ))}
        </div>
        <p className="mt-1 px-1 text-[11px] text-white/35">{t("form.ayudaUsuarios")}</p>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-white/50">{t("form.alias")}</span>
        <input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder={t("form.aliasPlaceholder")}
          maxLength={200}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-ng-azul"
        />
        <span className="mt-1 block px-1 text-[11px] text-white/35">{t("form.aliasAyuda")}</span>
      </label>

      {niveles && niveles.length > 1 && (
        <div>
          <span className="mb-1 block text-xs text-white/50">{t("form.nivel")}</span>
          <div role="radiogroup" className="inline-flex rounded-lg border border-white/15 p-0.5">
            {niveles.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={d.nivel === n}
                onClick={() => setD({ ...d, nivel: n })}
                className={`rounded-md px-3 py-1 text-xs transition ${d.nivel === n ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
              >
                {t(`nivel.${n}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {enEpisodio && (
        <label className="flex items-start gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={d.nivel === "GLOBAL"}
            onChange={(e) => setD({ ...d, nivel: e.target.checked ? "GLOBAL" : "EPISODIO" })}
            className="mt-0.5 accent-[#FFD400]"
          />
          <span>
            {t("form.tambienGlobal")}
            <span className="block text-[11px] text-white/35">{t("form.tambienGlobalAyuda")}</span>
          </span>
        </label>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!valida || guardando}
          className="rounded-lg bg-marca px-4 py-2 text-xs font-bold text-ng-tinta hover:brightness-105 disabled:opacity-40"
        >
          {guardando ? t("form.guardando") : t("form.guardar")}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg px-3 py-2 text-xs text-white/60 hover:text-white">
          {t("form.cancelar")}
        </button>
        <span className="ml-auto hidden items-center gap-1 sm:flex" aria-hidden>
          {REDES_PERSONA.filter((r) => d[r].trim()).map((r) => (
            <IconoRed key={r} red={RED_DE[r]} chico />
          ))}
        </span>
      </div>
    </form>
  );
}
