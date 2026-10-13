"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import { useFormatter, useTranslations } from "next-intl";
import { AtSign, ChevronDown, Plus, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EPISODIOS_ETIQUETAS } from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { datosDe, useAccionesPersonas, usePersonas, type NivelPersona, type Persona } from "@/lib/etiquetas";
import { FormPersona } from "@/components/etiquetas/FormPersona";
import { TarjetaPersona } from "@/components/etiquetas/TarjetaPersona";
import { InvitadosEpisodio } from "@/components/etiquetas/InvitadosEpisodio";

type Pestana = "ELENCO" | "GLOBAL" | "EPISODIO";
const PESTANAS: Pestana[] = ["ELENCO", "GLOBAL", "EPISODIO"];

/**
 * Etiquetas: a quién se etiqueta en los clips de la marca, en tres niveles.
 * El elenco (siempre), Global (el directorio, gente que aparece cada tanto) y
 * los invitados de cada episodio. Cada persona lleva su usuario en cada red,
 * verificado cuando la red lo deja, y al publicar se la menciona con @.
 */
export default function EtiquetasPage() {
  const t = useTranslations("etiquetas");
  const { activa: marca } = useMarcaActiva();
  const { puedeOperar } = useSesion();
  const marcaId = marca?._id;
  const puede = puedeOperar(marcaId);
  const [pestana, setPestana] = useState<Pestana>("ELENCO");
  const [escrito, setEscrito] = useState("");
  const [buscar, setBuscar] = useState("");
  const [editando, setEditando] = useState<Persona | "nueva" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const acciones = useAccionesPersonas(marcaId);

  // La búsqueda va al servidor un momento después de dejar de escribir.
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(escrito), 250);
    return () => clearTimeout(espera);
  }, [escrito]);

  const todas = usePersonas(marcaId);
  const lista = usePersonas(marcaId, { buscar, nivel: pestana === "EPISODIO" ? undefined : pestana });
  const cuantas = (n: NivelPersona) => todas.personas.filter((p) => p.nivel === n).length;

  async function hacer(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("form.errorGuardar"));
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <AtSign size={22} className="text-marca" aria-hidden /> {t("pagina.titulo")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/55">{t("pagina.bajada", { marca: marca?.nombre ?? "" })}</p>
            <p className="mt-1 text-xs text-white/35">{t("pagina.resumen", { elenco: cuantas("ELENCO"), global: cuantas("GLOBAL") })}</p>
          </div>
          {puede && pestana !== "EPISODIO" && (
            <button
              type="button"
              onClick={() => setEditando("nueva")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-marca px-4 py-2.5 text-sm font-bold text-ng-tinta hover:brightness-105"
            >
              <Plus size={16} aria-hidden /> {t("pagina.agregar")}
            </button>
          )}
        </header>

        <div className="sticky top-0 z-10 -mx-1 mb-4 space-y-3 bg-ng-fondo/90 px-1 py-2 backdrop-blur">
          <div role="tablist" aria-label={t("pagina.titulo")} className="inline-flex w-full rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:w-auto">
            {PESTANAS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={pestana === p}
                onClick={() => {
                  setPestana(p);
                  setEditando(null);
                }}
                className={`flex-1 rounded-lg px-4 py-1.5 text-sm transition sm:flex-none ${
                  pestana === p ? "bg-white font-semibold text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {t(`pagina.tabs.${p}`)}
                {p !== "EPISODIO" && <span className={`ml-1.5 text-xs ${pestana === p ? "text-black/50" : "text-white/35"}`}>{cuantas(p)}</span>}
              </button>
            ))}
          </div>
          {pestana !== "EPISODIO" && (
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 focus-within:border-ng-azul">
              <Search size={15} className="text-white/40" aria-hidden />
              <input
                value={escrito}
                onChange={(e) => setEscrito(e.target.value)}
                placeholder={t("pagina.buscar")}
                aria-label={t("pagina.buscar")}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30"
              />
            </label>
          )}
        </div>

        <p className="mb-4 text-xs text-white/45">{t(`pagina.tabAyuda.${pestana}`)}</p>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {!puede && <p className="mb-3 text-xs text-white/40">{t("pagina.soloLectura")}</p>}

        {editando && pestana !== "EPISODIO" && (
          <div className="mb-4">
            <FormPersona
              key={editando === "nueva" ? "nueva" : editando._id}
              titulo={editando === "nueva" ? t("form.tituloNueva") : t("form.tituloEditar", { nombre: editando.nombre })}
              inicial={datosDe(editando === "nueva" ? null : editando, pestana)}
              niveles={editando !== "nueva" && editando.nivel === "EPISODIO" ? ["EPISODIO", "GLOBAL", "ELENCO"] : ["ELENCO", "GLOBAL"]}
              marcaId={marcaId}
              guardando={acciones.guardando}
              onCancelar={() => setEditando(null)}
              onGuardar={async (d) => {
                if (editando === "nueva") await acciones.crear(d);
                else await acciones.actualizar(editando._id, d);
                setEditando(null);
              }}
            />
          </div>
        )}

        {pestana === "EPISODIO" ? (
          marcaId ? <PorEpisodio marcaId={marcaId} opera={puede} /> : null
        ) : lista.cargando ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </ul>
        ) : lista.personas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <AtSign size={28} className="mx-auto mb-2 text-white/25" aria-hidden />
            <p className="text-sm text-white/55">{buscar.trim() ? t("pagina.sinResultados", { buscar }) : t(`pagina.vacio.${pestana}`)}</p>
            {puede && !buscar.trim() && (
              <button type="button" onClick={() => setEditando("nueva")} className="mt-3 text-sm font-semibold text-marca hover:underline">
                {t("pagina.agregar")}
              </button>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {lista.personas.map((p) => (
              <TarjetaPersona
                key={p._id}
                persona={p}
                puede={puede}
                onEditar={() => setEditando(p)}
                onNivel={(n) => void hacer(() => acciones.cambiarNivel(p, n))}
                onReverificar={() => void hacer(() => acciones.reverificar(p._id))}
                onBorrar={() => {
                  if (window.confirm(t("tarjeta.confirmarBorrar", { nombre: p.nombre }))) void hacer(() => acciones.borrar(p._id));
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}

/** Los episodios recientes; cada uno se abre para ver y cambiar sus invitados. */
function PorEpisodio({ marcaId, opera }: { marcaId: string; opera: boolean }) {
  const t = useTranslations("etiquetas");
  const formato = useFormatter();
  const [abierto, setAbierto] = useState<string | null>(null);
  const q = useQuery<{ episodios: { _id: string; titulo?: string | null; miniaturaUrl?: string | null; createdAt: string }[] }>(EPISODIOS_ETIQUETAS, {
    variables: { marcaId, limite: 20 },
    fetchPolicy: "cache-and-network",
  });
  const episodios = q.data?.episodios ?? [];
  if (q.loading && !q.data) return <div className="h-40 animate-pulse rounded-2xl bg-white/5" />;
  if (!episodios.length) return <p className="text-sm text-white/45">{t("pagina.episodios.vacio")}</p>;
  return (
    <ul className="space-y-2">
      {episodios.map((ep) => {
        const esteAbierto = abierto === ep._id;
        return (
          <li key={ep._id} className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setAbierto(esteAbierto ? null : ep._id)}
              aria-expanded={esteAbierto}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              {ep.miniaturaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ep.miniaturaUrl} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="h-10 w-16 shrink-0 rounded-md bg-white/5" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{ep.titulo || "—"}</span>
                <span className="block text-xs text-white/40">{formato.dateTime(new Date(ep.createdAt), { dateStyle: "medium" })}</span>
              </span>
              <ChevronDown size={16} className={`shrink-0 text-white/40 transition ${esteAbierto ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {esteAbierto && (
              <div className="border-t border-white/10 px-3 pb-3">
                <InvitadosEpisodio episodioId={ep._id} marcaId={marcaId} opera={opera} />
                <Link href={`/episodios/${ep._id}`} className="mt-2 inline-block text-xs text-ng-celeste hover:underline">
                  {t("pagina.episodios.abrir")} →
                </Link>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
