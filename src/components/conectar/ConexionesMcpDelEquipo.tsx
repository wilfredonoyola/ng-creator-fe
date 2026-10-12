"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { useFormatter, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { CONEXIONES_MCP_DE_MARCA } from "@/graphql/operations";
import type { RolPagina } from "@/lib/sesion";
import { EstadoConexion, type EstadoConexionMcp } from "./EstadoConexionMcp";

interface Fila {
  usuarioId: string;
  email: string;
  nombre?: string | null;
  rol: RolPagina;
  conexion: { _id: string; nombreApp: string; estado: EstadoConexionMcp; ultimoUso?: string | null; createdAt: string };
}

/**
 * Para el propietario: quién del equipo tiene ChatGPT o Claude conectado y,
 * con eso, puede preguntarles por los datos de esta marca. Solo se mira: la
 * conexión es de cada persona y vale para todas sus marcas; para cortarle esta
 * marca se la saca del equipo.
 */
export function ConexionesMcpDelEquipo({ marcaId }: { marcaId: string }) {
  const t = useTranslations("conectar");
  const formato = useFormatter();
  const { data, loading } = useQuery<{ conexionesMcpDeMarca: Fila[] }>(CONEXIONES_MCP_DE_MARCA, {
    variables: { marcaId },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });
  const filas = data?.conexionesMcpDeMarca ?? [];

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <Sparkles size={15} className="text-marca" aria-hidden /> {t("equipo.titulo")}
        </h2>
        <Link href="/conectar" className="text-xs text-ng-celeste hover:underline">
          {t("equipo.como")} →
        </Link>
      </div>
      <p className="mt-1 text-sm text-white/45">{t("equipo.texto")}</p>

      {loading && !data ? (
        <p className="mt-3 text-sm text-white/40">{t("equipo.cargando")}</p>
      ) : filas.length === 0 ? (
        <p className="mt-3 text-sm text-white/40">{t("equipo.ninguna")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10">
          {filas.map((f) => (
            <li key={f.conexion._id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm">
                  <span className="font-medium">{f.nombre || f.email}</span>
                  <span className="text-white/45"> · {f.conexion.nombreApp}</span>
                </p>
                <p className="text-xs text-white/40">
                  {f.conexion.ultimoUso
                    ? t("conectadas.uso", { cuando: formato.relativeTime(new Date(f.conexion.ultimoUso)) })
                    : t("conectadas.desde", { fecha: formato.dateTime(new Date(f.conexion.createdAt), { dateStyle: "medium" }) })}
                </p>
              </div>
              <EstadoConexion estado={f.conexion.estado} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/30">{t("equipo.nota")}</p>
    </section>
  );
}
