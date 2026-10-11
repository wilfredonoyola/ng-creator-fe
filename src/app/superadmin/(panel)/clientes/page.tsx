"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  AJUSTAR_MARCA_ADMIN,
  ARCHIVAR_CLIENTE_SUPERADMIN,
  CLIENTES_SUPERADMIN,
  MARCAS_ACTIVAS,
} from "@/graphql/operations";
import { fechaCompleta } from "@/lib/time";

type Cliente = {
  propietarios: string[];
  miembros: number;
  episodios: number;
  marca: {
    _id: string;
    nombre: string;
    archivadaEn?: string | null;
    demo: boolean;
    createdAt: string;
    prueba?: { topeEpisodios: number; episodiosUsados: number } | null;
  };
};

type Filtro = "todos" | "activos" | "demo" | "archivados";

/**
 * Los clientes de Clipfine (cada marca): quién es el dueño, cuánto tienen, y
 * desde acá se renombran, se marcan como demo, se les ajusta el cupo de
 * episodios y se apagan o prenden.
 */
export default function ClientesSuperadmin() {
  const t = useTranslations("superadmin.clientes");
  const { data, loading, error } = useQuery<{ clientesSuperadmin: Cliente[] }>(CLIENTES_SUPERADMIN, {
    fetchPolicy: "cache-and-network",
  });
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("activos");

  const todos = data?.clientesSuperadmin ?? [];
  const clientes = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return todos.filter((c) => {
      if (filtro === "activos" && c.marca.archivadaEn) return false;
      if (filtro === "archivados" && !c.marca.archivadaEn) return false;
      if (filtro === "demo" && !c.marca.demo) return false;
      if (!q) return true;
      return c.marca.nombre.toLowerCase().includes(q) || c.propietarios.some((p) => p.toLowerCase().includes(q));
    });
  }, [todos, busqueda, filtro]);

  const cuenta = (f: Filtro) =>
    f === "todos"
      ? todos.length
      : todos.filter((c) => (f === "activos" ? !c.marca.archivadaEn : f === "archivados" ? !!c.marca.archivadaEn : c.marca.demo)).length;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 max-w-2xl text-white/50">{t("subtitulo")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t("buscar")}
          aria-label={t("buscar")}
          className="w-full max-w-sm rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["activos", "demo", "archivados", "todos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filtro === f ? "border-marca bg-marca/15 text-white" : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {t(`filtros.${f}`)} · {cuenta(f)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : clientes.length === 0 ? (
        <p className="text-sm text-white/40">{t("vacio")}</p>
      ) : (
        <ul className="space-y-3">
          {clientes.map((c) => (
            <FilaCliente key={c.marca._id} cliente={c} />
          ))}
        </ul>
      )}
    </>
  );
}

function FilaCliente({ cliente }: { cliente: Cliente }) {
  const t = useTranslations("superadmin.clientes");
  const locale = useLocale();
  const { marca } = cliente;
  const archivada = !!marca.archivadaEn;
  const [nombre, setNombre] = useState(marca.nombre);
  const [demo, setDemo] = useState(marca.demo);
  const [sinTope, setSinTope] = useState(!marca.prueba);
  const [tope, setTope] = useState(String(marca.prueba?.topeEpisodios ?? 25));
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const refetchQueries = [{ query: CLIENTES_SUPERADMIN }, { query: MARCAS_ACTIVAS }];
  const [ajustar, { loading: guardando }] = useMutation(AJUSTAR_MARCA_ADMIN, { refetchQueries });
  const [archivar, { loading: archivando }] = useMutation(ARCHIVAR_CLIENTE_SUPERADMIN, { refetchQueries });

  const topeNum = Number(tope);
  const topeValido = sinTope || (Number.isInteger(topeNum) && topeNum >= 0 && topeNum <= 1000);
  const nombreLimpio = nombre.trim().replace(/\s+/g, " ");
  const nombreValido = nombreLimpio.length >= 2 && nombreLimpio.length <= 60;
  const cambio =
    nombreLimpio !== marca.nombre ||
    demo !== marca.demo ||
    sinTope !== !marca.prueba ||
    (!sinTope && topeNum !== marca.prueba?.topeEpisodios);

  async function guardar() {
    setMensaje(null);
    try {
      await ajustar({
        variables: {
          marcaId: marca._id,
          nombre: nombreLimpio !== marca.nombre ? nombreLimpio : null,
          demo,
          sinTope,
          topeEpisodios: sinTope ? null : topeNum,
        },
      });
      setMensaje({ ok: true, texto: t("guardado") });
    } catch (err) {
      setMensaje({ ok: false, texto: err instanceof Error ? err.message : t("error") });
    }
  }

  async function alternarArchivo() {
    if (!archivada && !window.confirm(t("confirmarApagar", { nombre: marca.nombre }))) return;
    setMensaje(null);
    try {
      await archivar({ variables: { marcaId: marca._id, archivada: !archivada } });
    } catch (err) {
      setMensaje({ ok: false, texto: err instanceof Error ? err.message : t("error") });
    }
  }

  return (
    <li className={`rounded-xl border p-4 ${archivada ? "border-white/5 bg-white/[0.01] opacity-70" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value.slice(0, 60))}
          aria-label={t("nombre")}
          className="min-w-0 flex-1 rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm font-medium outline-none transition focus:border-ng-azul sm:max-w-sm"
        />
        {marca.demo && <span className="rounded-full bg-marca px-2 py-0.5 text-[11px] font-bold uppercase text-ng-tinta">{t("demo")}</span>}
        {archivada && <span className="rounded-full border border-red-400/40 px-2 py-0.5 text-[11px] text-red-300">{t("apagado")}</span>}
      </div>

      <p className="mt-2 text-xs text-white/45">
        {cliente.propietarios.length > 0 ? cliente.propietarios.join(", ") : t("sinPropietario")}
        {" · "}
        {t("resumen", { miembros: cliente.miembros, episodios: cliente.episodios })}
        {" · "}
        {t("desde", { fecha: fechaCompleta(marca.createdAt, locale) })}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="accent-[#FFD400]" />
          {t("esDemo")}
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-white/60">{t("cupo")}</span>
          <input
            type="number"
            min={0}
            max={1000}
            value={tope}
            disabled={sinTope}
            onChange={(e) => setTope(e.target.value)}
            aria-label={t("cupo")}
            className="w-20 rounded-ng-md border border-white/10 bg-ng-hondo/70 px-2 py-1.5 text-sm outline-none transition focus:border-ng-azul disabled:opacity-40"
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sinTope} onChange={(e) => setSinTope(e.target.checked)} className="accent-[#FFD400]" />
            {t("sinTope")}
          </label>
          {marca.prueba && (
            <span className="text-xs text-white/40">
              {t("usados", { usados: marca.prueba.episodiosUsados, tope: marca.prueba.topeEpisodios })}
            </span>
          )}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={alternarArchivo}
            disabled={archivando}
            className={`rounded-lg border px-3 py-2 text-sm transition disabled:opacity-40 ${
              archivada ? "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10" : "border-red-400/30 text-red-300 hover:bg-red-400/10"
            }`}
          >
            {archivada ? t("prender") : t("apagar")}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!cambio || !topeValido || !nombreValido || guardando}
            className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
          >
            {guardando ? t("guardando") : t("guardar")}
          </button>
        </div>
      </div>
      {mensaje && <p className={`mt-2 text-xs ${mensaje.ok ? "text-emerald-400" : "text-red-400"}`}>{mensaje.texto}</p>}
    </li>
  );
}
