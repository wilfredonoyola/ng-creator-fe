"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AJUSTAR_MARCA_ADMIN, MARCAS_ACTIVAS, MARCAS_ADMIN } from "@/graphql/operations";
import { useSesion } from "@/lib/sesion";

type MarcaAdmin = {
  _id: string;
  nombre: string;
  activa: boolean;
  archivadaEn?: string | null;
  demo: boolean;
  createdAt: string;
  prueba?: { topeEpisodios: number; episodiosUsados: number } | null;
};

/**
 * Las marcas, para el admin (ng-creator-be#169): cambiar el nombre, marcarla
 * como cuenta de demo y ajustar cuántos episodios puede subir (o dejarla sin
 * tope). Solo ADMIN.
 */
export default function MarcasAdminPage() {
  const t = useTranslations("adminMarcas");
  const { esAdmin, cargando: cargandoSesion } = useSesion();
  const { data, loading, error } = useQuery<{ marcasAdmin: MarcaAdmin[] }>(MARCAS_ADMIN, {
    skip: !esAdmin,
    fetchPolicy: "cache-and-network",
  });
  const [busqueda, setBusqueda] = useState("");

  const marcas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const todas = data?.marcasAdmin ?? [];
    return q ? todas.filter((m) => m.nombre.toLowerCase().includes(q)) : todas;
  }, [data, busqueda]);

  if (!cargandoSesion && !esAdmin) {
    return (
      <DashboardLayout>
        <p className="text-white/50">{t("soloAdmin")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 max-w-2xl text-white/50">{t("subtitulo")}</p>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={t("buscar")}
        aria-label={t("buscar")}
        className="mb-4 w-full max-w-sm rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul"
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : marcas.length === 0 ? (
        <p className="text-sm text-white/40">{t("vacio")}</p>
      ) : (
        <ul className="space-y-3">
          {marcas.map((m) => (
            <FilaMarca key={m._id} marca={m} />
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}

function FilaMarca({ marca }: { marca: MarcaAdmin }) {
  const t = useTranslations("adminMarcas");
  const [nombre, setNombre] = useState(marca.nombre);
  const [demo, setDemo] = useState(marca.demo);
  const [sinTope, setSinTope] = useState(!marca.prueba);
  const [tope, setTope] = useState(String(marca.prueba?.topeEpisodios ?? 25));
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ajustar, { loading }] = useMutation(AJUSTAR_MARCA_ADMIN, {
    refetchQueries: [{ query: MARCAS_ADMIN }, { query: MARCAS_ACTIVAS }],
  });

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

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value.slice(0, 60))}
          aria-label={t("nombre")}
          className="min-w-0 flex-1 rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm font-medium outline-none transition focus:border-ng-azul sm:max-w-sm"
        />
        {marca.demo && (
          <span className="rounded-full bg-marca px-2 py-0.5 text-[11px] font-bold uppercase text-ng-tinta">{t("demo")}</span>
        )}
        {(marca.archivadaEn || !marca.activa) && (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/50">{t("archivada")}</span>
        )}
      </div>

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

        <button
          type="button"
          onClick={guardar}
          disabled={!cambio || !topeValido || !nombreValido || loading}
          className="ml-auto rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
        >
          {loading ? t("guardando") : t("guardar")}
        </button>
      </div>
      {mensaje && <p className={`mt-2 text-xs ${mensaje.ok ? "text-emerald-400" : "text-red-400"}`}>{mensaje.texto}</p>}
    </li>
  );
}
