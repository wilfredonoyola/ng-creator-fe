"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useMutation, useQuery } from "@apollo/client";
import { Check, Copy, Eye, Loader2, ShieldCheck, Unplug } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LogoNG } from "@/components/LogoNG";
import { haySesion } from "@/lib/auth";
import { ENLACE_AYUDA } from "@/lib/ayuda";
import { URL_SITIO } from "@/lib/sitio";
import { aprobarSolicitud, rechazarSolicitud, verSolicitud } from "@/lib/conectar-mcp";
import { MIS_CONEXIONES_MCP, REVOCAR_CONEXION_MCP } from "@/graphql/operations";
import { EstadoConexion, type EstadoConexionMcp } from "@/components/conectar/EstadoConexionMcp";
import { TarjetaAprobar } from "@/components/conectar/TarjetaAprobar";

/** La guía de la wiki con los pasos para cada app: una sola fuente. */
const GUIA = `${URL_SITIO}${ENLACE_AYUDA}/conectar-chatgpt-claude`;

/**
 * Conectar Clipfine a ChatGPT o Claude (MCP, ng-creator-be#182).
 *
 * - Con `?solicitud=`: llega desde ChatGPT/Claude para aprobar el acceso, con
 *   la sesión de la web. Sin sesión, pasa por el login y vuelve.
 * - Sin solicitud: la URL del conector, cómo agregarlo y las apps conectadas.
 */
export default function ConectarPage() {
  return (
    <Suspense>
      <Conectar />
    </Suspense>
  );
}

function Conectar() {
  const solicitud = useSearchParams().get("solicitud");
  return solicitud ? <Aprobar solicitud={solicitud} /> : <Conexiones />;
}

function Aprobar({ solicitud }: { solicitud: string }) {
  const t = useTranslations("conectar");
  const router = useRouter();
  const [datos, setDatos] = useState<{ app: string; vuelveA: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<"si" | "no" | null>(null);

  useEffect(() => {
    if (!haySesion()) {
      router.replace(`/login?volverA=${encodeURIComponent(`/conectar?solicitud=${solicitud}`)}`);
      return;
    }
    verSolicitud(solicitud).then(setDatos, (e: unknown) => setError(e instanceof Error ? e.message : t("error")));
  }, [solicitud, router, t]);

  async function decidir(si: boolean) {
    setEnviando(si ? "si" : "no");
    setError(null);
    try {
      const r = await (si ? aprobarSolicitud(solicitud) : rechazarSolicitud(solicitud));
      window.location.href = r.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      setEnviando(null);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ng-hondo px-4 py-12">
      <div className="w-full max-w-md rounded-ng-xl border border-white/10 bg-ng-tarjeta/80 p-7">
        <div className="mb-5 flex justify-center">
          <LogoNG tamano={48} soloIcono />
        </div>
        {!datos && !error && (
          <p className="flex items-center justify-center gap-2 text-sm text-white/60">
            <Loader2 size={16} className="animate-spin" aria-hidden /> {t("cargando")}
          </p>
        )}
        {error && <p className="rounded-ng-md bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {datos && <TarjetaAprobar app={datos.app} vuelveA={datos.vuelveA} enviando={enviando} onDecidir={(si) => void decidir(si)} />}
      </div>
    </main>
  );
}

type Conexion = { _id: string; nombreApp: string; estado: EstadoConexionMcp; ultimoUso: string | null; createdAt: string };

function Conexiones() {
  const t = useTranslations("conectar");
  const formato = useFormatter();
  const q = useQuery<{ misConexionesMcp: Conexion[]; urlConectorMcp: string }>(MIS_CONEXIONES_MCP, { fetchPolicy: "cache-and-network" });
  const [revocar, { loading: revocando }] = useMutation(REVOCAR_CONEXION_MCP, { refetchQueries: [MIS_CONEXIONES_MCP] });
  const [copiada, setCopiada] = useState(false);
  const url = q.data?.urlConectorMcp;
  const conexiones = q.data?.misConexionesMcp ?? [];

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      // Sin permiso de portapapeles: la URL queda a la vista para copiarla a mano.
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 text-sm text-white/60">{t("bajada")}</p>
        </div>

        <section className="rounded-ng-lg border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold">{t("url.titulo")}</h2>
          <p className="mt-1 text-xs text-white/50">{t("url.texto")}</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-ng-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm">{url ?? "…"}</code>
            <button
              type="button"
              onClick={() => void copiar()}
              disabled={!url}
              className="flex shrink-0 items-center gap-1.5 rounded-ng-md bg-marca px-3 py-2.5 text-sm font-semibold text-ng-tinta disabled:opacity-50"
            >
              {copiada ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copiada ? t("url.copiada") : t("url.copiar")}
            </button>
          </div>
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-white/75">
            <li>{t("pasos.p1")}</li>
            <li>{t("pasos.p2")}</li>
            <li>{t("pasos.p3")}</li>
          </ol>
          <a href={GUIA} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-ng-celeste hover:underline">
            {t("guia")} →
          </a>
        </section>

        <section className="rounded-ng-lg border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold">{t("conectadas.titulo")}</h2>
          {q.loading && !q.data ? (
            <p className="mt-3 text-sm text-white/50">{t("cargando")}</p>
          ) : conexiones.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">{t("conectadas.ninguna")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/10">
              {conexiones.map((c) => (
                <li key={c._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{c.nombreApp}</span>
                      <EstadoConexion estado={c.estado} />
                    </p>
                    <p className="text-xs text-white/45">
                      {t("conectadas.desde", { fecha: formato.dateTime(new Date(c.createdAt), { dateStyle: "medium" }) })}
                      {c.ultimoUso && ` · ${t("conectadas.uso", { cuando: formato.relativeTime(new Date(c.ultimoUso)) })}`}
                    </p>
                    {c.estado !== "ACTIVA" && <p className="mt-1 text-xs text-white/40">{t(`estado.ayuda${c.estado}`)}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => void revocar({ variables: { id: c._id } })}
                    disabled={revocando}
                    className="flex shrink-0 items-center gap-1.5 rounded-ng-md border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-red-500/50 hover:text-red-300 disabled:opacity-50"
                  >
                    <Unplug size={14} aria-hidden /> {t("conectadas.desconectar")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-white/40">
          {t("soloLectura")} <Link href="/perfil" className="text-ng-celeste hover:underline">{t("volverPerfil")}</Link>
        </p>
      </div>
    </DashboardLayout>
  );
}
