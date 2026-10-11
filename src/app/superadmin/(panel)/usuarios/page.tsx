"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { SET_USUARIO_ACTIVO_SUPERADMIN, USUARIOS_SUPERADMIN } from "@/graphql/operations";
import { tiempoRelativo } from "@/lib/time";

type Origen = "CHATGPT" | "GOOGLE" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "LINKEDIN" | "RECOMENDACION" | "OTRO";

type Fila = {
  esSuperadmin: boolean;
  usuario: {
    _id: string;
    email: string;
    nombre?: string | null;
    activo: boolean;
    ultimoAccesoEn?: string | null;
    createdAt: string;
    comoNosConocio?: Origen | null;
    comoNosConocioDetalle?: string | null;
  };
  accesos: { marcaId: string; marcaNombre: string; rol: "PROPIETARIO" | "EDITOR" | "LECTOR" | "PROVEEDOR" }[];
};

/**
 * Todas las personas con cuenta: a qué marcas entran y con qué rol, cuándo
 * entraron por última vez, y desde acá se les corta o devuelve el acceso.
 */
export default function UsuariosSuperadmin() {
  const t = useTranslations("superadmin.usuarios");
  const tRol = useTranslations("marcoRoles");
  const tOrigen = useTranslations("onboarding.marca.comoNosConocio.opciones");
  const locale = useLocale();
  const { data, loading, error } = useQuery<{ usuariosSuperadmin: Fila[] }>(USUARIOS_SUPERADMIN, {
    fetchPolicy: "cache-and-network",
  });
  const [activar, { loading: cambiando }] = useMutation(SET_USUARIO_ACTIVO_SUPERADMIN, {
    refetchQueries: [{ query: USUARIOS_SUPERADMIN }],
  });
  const [busqueda, setBusqueda] = useState("");
  const [fallo, setFallo] = useState<string | null>(null);

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const todas = data?.usuariosSuperadmin ?? [];
    if (!q) return todas;
    return todas.filter(
      (f) =>
        f.usuario.email.toLowerCase().includes(q) ||
        (f.usuario.nombre ?? "").toLowerCase().includes(q) ||
        f.accesos.some((a) => a.marcaNombre.toLowerCase().includes(q)),
    );
  }, [data, busqueda]);

  async function alternar(f: Fila) {
    const activo = !f.usuario.activo;
    if (!activo && !window.confirm(t("confirmarCortar", { email: f.usuario.email }))) return;
    setFallo(null);
    try {
      await activar({ variables: { usuarioId: f.usuario._id, activo } });
    } catch (err) {
      setFallo(err instanceof Error ? err.message : t("error"));
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 max-w-2xl text-white/50">{t("subtitulo", { n: data?.usuariosSuperadmin.length ?? 0 })}</p>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={t("buscar")}
        aria-label={t("buscar")}
        className="mb-4 w-full max-w-sm rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul"
      />

      {(error || fallo) && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{fallo ?? error?.message}</p>
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {filas.map((f) => (
            <li key={f.usuario._id} className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${f.usuario.activo ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="truncate font-medium">{f.usuario.nombre || f.usuario.email}</span>
                  {f.esSuperadmin && <span className="rounded-full bg-marca px-2 py-0.5 text-[10px] font-bold uppercase text-ng-tinta">Superadmin</span>}
                  {!f.usuario.activo && <span className="rounded-full border border-red-400/40 px-2 py-0.5 text-[10px] text-red-300">{t("sinAcceso")}</span>}
                </p>
                {f.usuario.nombre && <p className="truncate text-xs text-white/45">{f.usuario.email}</p>}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {f.accesos.length === 0 ? (
                    <span className="text-xs text-white/35">{t("sinMarcas")}</span>
                  ) : (
                    f.accesos.map((a) => (
                      <span key={a.marcaId} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                        {a.marcaNombre} · {tRol(`${a.rol}.etiqueta`)}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-white/45 sm:justify-end">
                {f.usuario.comoNosConocio && (
                  <span>
                    {t("conocio")} {tOrigen(f.usuario.comoNosConocio)}
                    {f.usuario.comoNosConocioDetalle ? ` (${f.usuario.comoNosConocioDetalle})` : ""}
                  </span>
                )}
                <span>
                  {f.usuario.ultimoAccesoEn ? t("entro", { cuando: tiempoRelativo(f.usuario.ultimoAccesoEn, Date.now(), locale) }) : t("nuncaEntro")}
                </span>
                {!f.esSuperadmin && (
                  <button
                    onClick={() => alternar(f)}
                    disabled={cambiando}
                    className={`rounded-lg border px-3 py-1.5 transition disabled:opacity-40 ${
                      f.usuario.activo ? "border-red-400/30 text-red-300 hover:bg-red-400/10" : "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
                    }`}
                  >
                    {f.usuario.activo ? t("cortar") : t("devolver")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
