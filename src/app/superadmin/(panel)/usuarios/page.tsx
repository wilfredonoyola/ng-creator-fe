"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { SET_USUARIO_ACTIVO_SUPERADMIN, USUARIOS_SUPERADMIN } from "@/graphql/operations";
import { fechaCompleta, tiempoRelativo } from "@/lib/time";
import { entrarComo } from "@/lib/suplantar";

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
  comunicaciones: { marketing: boolean | null; telefono: string | null; whatsapp: boolean | null };
  accesos: { marcaId: string; marcaNombre: string; rol: "PROPIETARIO" | "EDITOR" | "REVISOR" | "LECTOR" | "PROVEEDOR" }[];
};

/**
 * Para entender rápido quién es cada persona: dueños (tienen su marca),
 * equipo (entran solo a marcas de otros), sin marca (se registraron y no
 * siguieron) y sin acceso (cortados).
 */
const FILTROS = ["todos", "duenos", "equipo", "sinMarca", "sinAcceso"] as const;
type Filtro = (typeof FILTROS)[number];

const ORDENES = ["ultimoAcceso", "registro", "nombre"] as const;
type Orden = (typeof ORDENES)[number];

function pasaFiltro(f: Fila, filtro: Filtro): boolean {
  const esDueno = f.accesos.some((a) => a.rol === "PROPIETARIO");
  switch (filtro) {
    case "duenos":
      return esDueno;
    case "equipo":
      return f.accesos.length > 0 && !esDueno;
    case "sinMarca":
      return f.accesos.length === 0 && !f.esSuperadmin;
    case "sinAcceso":
      return !f.usuario.activo;
    default:
      return true;
  }
}

const tiempo = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

function comparar(a: Fila, b: Fila, orden: Orden): number {
  switch (orden) {
    case "registro":
      return tiempo(b.usuario.createdAt) - tiempo(a.usuario.createdAt);
    case "nombre":
      return (a.usuario.nombre || a.usuario.email).localeCompare(b.usuario.nombre || b.usuario.email);
    default:
      return tiempo(b.usuario.ultimoAccesoEn) - tiempo(a.usuario.ultimoAccesoEn);
  }
}

/**
 * Todas las personas con cuenta: a qué marcas entran y con qué rol, cuándo
 * entraron por última vez, y desde acá se les corta o devuelve el acceso, o
 * se entra como ellas para ver y operar sus marcas (lib/suplantar.ts).
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
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden>("ultimoAcceso");
  const [fallo, setFallo] = useState<string | null>(null);

  const todas = useMemo(() => data?.usuariosSuperadmin ?? [], [data]);
  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return todas
      .filter((f) => pasaFiltro(f, filtro))
      .filter(
        (f) =>
          !q ||
          f.usuario.email.toLowerCase().includes(q) ||
          (f.usuario.nombre ?? "").toLowerCase().includes(q) ||
          f.accesos.some((a) => a.marcaNombre.toLowerCase().includes(q)),
      )
      .sort((a, b) => comparar(a, b, orden));
  }, [todas, busqueda, filtro, orden]);

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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t("buscar")}
          aria-label={t("buscar")}
          className="w-full max-w-sm rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              title={t(`filtros.${f}.ayuda`)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filtro === f ? "border-marca bg-marca/15 text-white" : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {t(`filtros.${f}.nombre`)} · {todas.filter((x) => pasaFiltro(x, f)).length}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-white/50">
          {t("ordenar")}
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="rounded-lg border border-white/10 bg-ng-hondo/70 px-2 py-1.5 text-xs text-white outline-none focus:border-ng-azul"
          >
            {ORDENES.map((o) => (
              <option key={o} value={o}>
                {t(`ordenes.${o}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

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
                      <Link
                        key={a.marcaId}
                        href={`/superadmin/clientes?marca=${a.marcaId}`}
                        title={t("verCliente")}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 transition hover:border-marca/50 hover:text-white"
                      >
                        {a.marcaNombre} · {tRol(`${a.rol}.etiqueta`)}
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-white/45 sm:justify-end">
                {f.comunicaciones.marketing === true && (
                  <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-300">{t("comunicaciones.marketing")}</span>
                )}
                {f.comunicaciones.marketing === false && <span>{t("comunicaciones.sinMarketing")}</span>}
                {/* El enlace a WhatsApp solo con su consentimiento; sin él, el número a secas. */}
                {f.comunicaciones.telefono &&
                  (f.comunicaciones.whatsapp ? (
                    <a
                      href={`https://wa.me/${f.comunicaciones.telefono.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-300"
                    >
                      {t("comunicaciones.whatsapp")} · {f.comunicaciones.telefono}
                    </a>
                  ) : (
                    <span>{f.comunicaciones.telefono}</span>
                  ))}
                {f.usuario.comoNosConocio && (
                  <span>
                    {t("conocio")} {tOrigen(f.usuario.comoNosConocio)}
                    {f.usuario.comoNosConocioDetalle ? ` (${f.usuario.comoNosConocioDetalle})` : ""}
                  </span>
                )}
                <span title={fechaCompleta(f.usuario.createdAt, locale)}>
                  {t("registro", { cuando: tiempoRelativo(f.usuario.createdAt, Date.now(), locale) })}
                </span>
                <span>
                  {f.usuario.ultimoAccesoEn ? t("entro", { cuando: tiempoRelativo(f.usuario.ultimoAccesoEn, Date.now(), locale) }) : t("nuncaEntro")}
                </span>
                {!f.esSuperadmin && f.usuario.activo && (
                  <button
                    onClick={() => {
                      if (window.confirm(t("confirmarEntrar", { email: f.usuario.email }))) {
                        entrarComo({ id: f.usuario._id, email: f.usuario.email });
                      }
                    }}
                    className="rounded-lg border border-marca/50 px-3 py-1.5 text-marca transition hover:bg-marca/10"
                  >
                    {t("entrarComo")}
                  </button>
                )}
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
