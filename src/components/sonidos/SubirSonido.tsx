"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Upload } from "lucide-react";
import { ErrorDeSubida, uploadSonido, type CamposSonido } from "@/lib/upload";
import { EFECTO_MAX_SEG, MUSICA_MAX_SEG, tituloDeArchivo, type Sonido, type TipoSonido } from "@/lib/sonidos";

/**
 * Subir un sonido a la biblioteca: archivo, tipo (música o efecto), título,
 * categoría y, para la de Clipfine, la fuente/licencia (obligatoria). Muestra
 * el avance y el error del servidor tal cual (dura de más, no se pudo leer…).
 */
export function SubirSonido({
  destino,
  conFuente = false,
  tipoInicial = "MUSICA",
  onSubido,
  onCancelar,
}: {
  /** La biblioteca de la marca, o la de Clipfine (solo superadmin). */
  destino: { marcaId: string } | { global: true };
  /** Pide la fuente/licencia, obligatoria (superadmin). */
  conFuente?: boolean;
  tipoInicial?: TipoSonido;
  onSubido: (s: Sonido) => void;
  onCancelar?: () => void;
}) {
  const t = useTranslations("bibliotecaSonidos");
  const te = useTranslations("erroresSubida");
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoSonido>(tipoInicial);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fuente, setFuente] = useState("");
  const [avance, setAvance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listo = Boolean(archivo && titulo.trim() && (!conFuente || fuente.trim()));
  const subiendo = avance !== null;

  async function subir() {
    if (!archivo || !listo) return;
    setError(null);
    setAvance(0);
    const campos: CamposSonido = {
      tipo,
      titulo: titulo.trim(),
      categoria: categoria.trim() || undefined,
      fuente: conFuente ? fuente.trim() : undefined,
      ...("global" in destino ? { global: true } : { marcaId: destino.marcaId }),
    };
    try {
      const sonido = await uploadSonido<Sonido>(archivo, campos, setAvance);
      onSubido(sonido);
      setArchivo(null);
      setTitulo("");
      setCategoria("");
      setFuente("");
      if (entrada.current) entrada.current.value = "";
    } catch (e) {
      setError(e instanceof ErrorDeSubida ? te(e.clave, e.datos) : e instanceof Error ? e.message : t("errorSubir"));
    } finally {
      setAvance(null);
    }
  }

  const campo =
    "w-full rounded-lg border border-white/10 bg-ng-fondo px-2.5 py-2 text-sm text-white placeholder:text-ng-tenue focus:border-ng-azul focus:outline-none disabled:opacity-50";

  return (
    <div className="space-y-3 rounded-ng-md border border-white/10 p-3">
      <div className="flex rounded-lg bg-ng-superficie p-0.5" role="radiogroup" aria-label={t("tipo")}>
        {(["MUSICA", "EFECTO"] as const).map((x) => (
          <button
            key={x}
            type="button"
            role="radio"
            aria-checked={tipo === x}
            disabled={subiendo}
            onClick={() => setTipo(x)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${tipo === x ? "bg-ng-azul text-ng-tinta" : "text-ng-secundario hover:text-white"}`}
          >
            {t(`tipos.${x}`)}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ng-tenue">
        {tipo === "MUSICA" ? t("limiteMusica", { min: MUSICA_MAX_SEG / 60 }) : t("limiteEfecto", { seg: EFECTO_MAX_SEG })}
      </p>

      <input
        ref={entrada}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        disabled={subiendo}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setArchivo(f);
          setError(null);
          if (f && !titulo.trim()) setTitulo(tituloDeArchivo(f.name));
        }}
        className="block w-full text-xs text-ng-secundario file:mr-3 file:rounded-lg file:border-0 file:bg-ng-elevada file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
      />
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder={t("titulo")} aria-label={t("titulo")} disabled={subiendo} className={campo} />
      <input
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        maxLength={60}
        placeholder={t("categoriaOpcional")}
        aria-label={t("categoriaOpcional")}
        disabled={subiendo}
        className={campo}
      />
      {conFuente && (
        <input
          value={fuente}
          onChange={(e) => setFuente(e.target.value)}
          maxLength={200}
          placeholder={t("fuenteObligatoria")}
          aria-label={t("fuenteObligatoria")}
          disabled={subiendo}
          className={campo}
        />
      )}

      {subiendo && (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-ng-azul transition-all" style={{ width: `${avance}%` }} />
          </div>
          <p className="text-[11px] text-ng-tenue">{avance! < 100 ? t("subiendo", { n: avance! }) : t("procesando")}</p>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} disabled={subiendo} className="rounded-lg px-3 py-1.5 text-xs text-ng-secundario hover:text-white disabled:opacity-40">
            {t("cancelar")}
          </button>
        )}
        <button
          type="button"
          onClick={() => void subir()}
          disabled={!listo || subiendo}
          className="flex items-center gap-1.5 rounded-lg bg-ng-azul px-3 py-1.5 text-xs font-semibold text-ng-tinta disabled:opacity-40"
        >
          {subiendo ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Upload size={14} aria-hidden />}
          {t("subir")}
        </button>
      </div>
    </div>
  );
}
