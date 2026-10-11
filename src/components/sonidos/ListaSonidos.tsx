"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, LoaderCircle, Pause, Pencil, Play, Search, Trash2, X } from "lucide-react";
import { filtrarSonidos, porCategoria, type Sonido } from "@/lib/sonidos";
import { relojFino } from "@/components/episodios/editor/tipos";

export interface CambiosSonido {
  titulo: string;
  categoria: string;
  fuente?: string;
}

/**
 * Una lista de sonidos de la biblioteca: búsqueda, agrupados por categoría y
 * con play para escucharlos antes. La usan el editor (Audio) y /superadmin.
 *
 * - `acciones` pone botones propios en cada fila (Elegir, Agregar…).
 * - Los que son `editable` se renombran y se borran ahí mismo; el error del
 *   servidor (por ejemplo, "lo usan 3 clips") se muestra en la fila.
 */
export function ListaSonidos({
  sonidos,
  cargando,
  escucha,
  acciones,
  editable,
  conFuente = false,
  fuenteObligatoria = false,
  onGuardar,
  onBorrar,
  elegido,
  vacio,
  conBuscador = true,
  altoMaximo,
}: {
  sonidos: Sonido[];
  cargando?: boolean;
  escucha: { sonando: string | null; alternar: (id: string, url: string) => void };
  acciones?: (s: Sonido) => ReactNode;
  editable?: (s: Sonido) => boolean;
  /** Muestra y edita la fuente/licencia (superadmin). */
  conFuente?: boolean;
  fuenteObligatoria?: boolean;
  onGuardar?: (s: Sonido, cambios: CambiosSonido) => Promise<void>;
  onBorrar?: (s: Sonido) => Promise<void>;
  /** El sonido elegido, resaltado. */
  elegido?: string | null;
  vacio: string;
  conBuscador?: boolean;
  /** Con scroll propio a partir de este alto (clase de Tailwind). */
  altoMaximo?: string;
}) {
  const t = useTranslations("bibliotecaSonidos");
  const [busqueda, setBusqueda] = useState("");
  const grupos = porCategoria(filtrarSonidos(sonidos, busqueda));

  return (
    <div className="space-y-2">
      {conBuscador && sonidos.length > 4 && (
        <label className="flex items-center gap-2 rounded-ng-md bg-ng-superficie px-3 py-2 text-sm">
          <Search size={15} className="shrink-0 text-ng-tenue" aria-hidden />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("buscar")}
            aria-label={t("buscar")}
            className="min-w-0 flex-1 bg-transparent text-white placeholder:text-ng-tenue focus:outline-none"
          />
        </label>
      )}
      {cargando && !sonidos.length ? (
        <p className="flex items-center gap-2 text-xs text-ng-tenue">
          <LoaderCircle size={14} className="animate-spin" aria-hidden />
          {t("cargando")}
        </p>
      ) : !grupos.length ? (
        <p className="text-xs text-ng-tenue">{busqueda.trim() ? t("sinResultados") : vacio}</p>
      ) : (
        <div className={`space-y-3 ${altoMaximo ? `${altoMaximo} overflow-y-auto pr-1` : ""}`}>
          {grupos.map(([categoria, lista]) => (
            <section key={categoria || "-"} className="space-y-1">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ng-tenue">{categoria || t("sinCategoria")}</h4>
              <ul className="space-y-1">
                {lista.map((s) => (
                  <FilaSonido
                    key={s._id}
                    sonido={s}
                    sonando={escucha.sonando === s._id}
                    onEscuchar={() => escucha.alternar(s._id, s.url)}
                    acciones={acciones?.(s)}
                    editable={Boolean(editable?.(s))}
                    conFuente={conFuente}
                    fuenteObligatoria={fuenteObligatoria}
                    onGuardar={onGuardar}
                    onBorrar={onBorrar}
                    elegido={elegido === s._id}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilaSonido({
  sonido: s,
  sonando,
  onEscuchar,
  acciones,
  editable,
  conFuente,
  fuenteObligatoria,
  onGuardar,
  onBorrar,
  elegido,
}: {
  sonido: Sonido;
  sonando: boolean;
  onEscuchar: () => void;
  acciones?: ReactNode;
  editable: boolean;
  conFuente: boolean;
  fuenteObligatoria: boolean;
  onGuardar?: (s: Sonido, cambios: CambiosSonido) => Promise<void>;
  onBorrar?: (s: Sonido) => Promise<void>;
  elegido: boolean;
}) {
  const t = useTranslations("bibliotecaSonidos");
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(s.titulo);
  const [categoria, setCategoria] = useState(s.categoria ?? "");
  const [fuente, setFuente] = useState(s.fuente ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!onGuardar || !titulo.trim() || (fuenteObligatoria && !fuente.trim())) return;
    setOcupado(true);
    setError(null);
    try {
      await onGuardar(s, { titulo: titulo.trim(), categoria: categoria.trim(), ...(conFuente ? { fuente: fuente.trim() } : {}) });
      setEditando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGuardar"));
    } finally {
      setOcupado(false);
    }
  }

  async function borrar() {
    if (!onBorrar || !window.confirm(t("confirmarBorrar", { titulo: s.titulo }))) return;
    setOcupado(true);
    setError(null);
    try {
      await onBorrar(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorBorrar"));
      setOcupado(false);
    }
  }

  const campo = "w-full rounded-lg border border-white/10 bg-ng-fondo px-2.5 py-1.5 text-sm text-white placeholder:text-ng-tenue focus:border-ng-azul focus:outline-none";

  return (
    <li className={`rounded-ng-md px-2 py-1.5 ${elegido ? "bg-ng-azul/10 ring-1 ring-ng-azul/60" : "bg-ng-superficie"}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEscuchar}
          aria-label={sonando ? t("pausar", { titulo: s.titulo }) : t("escuchar", { titulo: s.titulo })}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
            sonando ? "bg-ng-azul text-ng-tinta" : "bg-ng-elevada text-white hover:bg-white/15"
          }`}
        >
          {sonando ? <Pause size={14} fill="currentColor" aria-hidden /> : <Play size={14} fill="currentColor" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{s.titulo}</p>
          <p className="truncate text-[11px] text-ng-tenue">
            {relojFino(s.duracionSeg)}
            {s.marcaId ? ` · ${t("deTuMarca")}` : ""}
            {conFuente && s.fuente ? ` · ${s.fuente}` : ""}
          </p>
        </div>
        {editable && !editando && (
          <>
            <button
              type="button"
              onClick={() => setEditando(true)}
              disabled={ocupado}
              aria-label={t("editar", { titulo: s.titulo })}
              title={t("editar", { titulo: s.titulo })}
              className="p-1 text-ng-tenue hover:text-white disabled:opacity-40"
            >
              <Pencil size={14} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void borrar()}
              disabled={ocupado}
              aria-label={t("borrar", { titulo: s.titulo })}
              title={t("borrar", { titulo: s.titulo })}
              className="p-1 text-ng-tenue hover:text-red-400 disabled:opacity-40"
            >
              {ocupado && !editando ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
            </button>
          </>
        )}
        {acciones}
      </div>
      {editando && (
        <div className="mt-2 space-y-2">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder={t("titulo")} aria-label={t("titulo")} className={campo} />
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            maxLength={60}
            placeholder={t("categoriaOpcional")}
            aria-label={t("categoriaOpcional")}
            className={campo}
          />
          {conFuente && (
            <input
              value={fuente}
              onChange={(e) => setFuente(e.target.value)}
              maxLength={200}
              placeholder={t("fuente")}
              aria-label={t("fuente")}
              className={campo}
            />
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditando(false);
                setTitulo(s.titulo);
                setCategoria(s.categoria ?? "");
                setFuente(s.fuente ?? "");
                setError(null);
              }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-ng-secundario hover:text-white"
            >
              <X size={13} aria-hidden />
              {t("cancelar")}
            </button>
            <button
              type="button"
              onClick={() => void guardar()}
              disabled={ocupado || !titulo.trim() || (fuenteObligatoria && !fuente.trim())}
              className="flex items-center gap-1 rounded-lg bg-ng-azul px-2.5 py-1 text-xs font-semibold text-ng-tinta disabled:opacity-40"
            >
              {ocupado ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Check size={13} aria-hidden />}
              {t("guardar")}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </li>
  );
}
