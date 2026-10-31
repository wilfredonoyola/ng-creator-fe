"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, AtSign, ExternalLink, Plus, Sparkles, Users, X } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import {
  MAXIMO_COLABORADORES_FACEBOOK,
  MAXIMO_COLABORADORES_INSTAGRAM,
  MAXIMO_ETIQUETADOS_INSTAGRAM,
  NOMBRE_RED,
  RED_DE,
  REDES_PERSONA,
  datosDe,
  noEtiquetableEnInstagram,
  urlPerfil,
  usuarioEn,
  type DatosPersona,
  type Persona,
  type Sugerida,
} from "@/lib/etiquetas";
import { AvatarPersona } from "./TarjetaPersona";
import { BuscadorPersonas } from "./BuscadorPersonas";
import { FormPersona } from "./FormPersona";

const reloj = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * "Etiquetar" al programar. Arriba las sugeridas para este clip (invitados del
 * episodio, el elenco y a quién se nombra en lo que se dice), después las
 * etiquetadas, y un buscador para sumar a cualquiera de la marca o crear un
 * invitado. Quien se menciona con @ en la descripción ya queda etiquetado.
 *
 * Colaboradores: en Instagram (hasta 3, por usuario) y en Facebook (hasta 10,
 * solo páginas con su id): el Reel sale también en su perfil o su página si
 * aceptan la invitación.
 */
export function EtiquetarPublicacion({
  sugeridas,
  personas,
  etiquetadas,
  enTexto,
  onAgregar,
  onQuitar,
  colaboradoresIg,
  onColaboradorIg,
  conInstagram,
  colaboradoresFb,
  onColaboradorFb,
  conFacebook,
  onNuevoInvitado,
  guardando,
  marcaId,
}: {
  sugeridas: Sugerida[];
  /** Todas las que se pueden sumar: elenco, global e invitados del episodio. */
  personas: Persona[];
  etiquetadas: Persona[];
  /** Ids de quienes están mencionados en la descripción: se quitan borrando la mención. */
  enTexto: Set<string>;
  onAgregar: (p: Persona) => void;
  onQuitar: (p: Persona) => void;
  colaboradoresIg: Set<string>;
  onColaboradorIg: (id: string) => void;
  conInstagram: boolean;
  colaboradoresFb: Set<string>;
  onColaboradorFb: (id: string) => void;
  conFacebook: boolean;
  /** Sin esto (sin permiso), no se crean invitados. */
  onNuevoInvitado?: (d: DatosPersona) => Promise<unknown>;
  guardando?: boolean;
  marcaId?: string | null;
}) {
  const t = useTranslations("etiquetas");
  const [nuevo, setNuevo] = useState<string | null>(null);
  const ids = new Set(etiquetadas.map((p) => p._id));
  const porSugerir = sugeridas.filter((s) => !ids.has(s.persona._id));
  const conIg = etiquetadas.filter((p) => usuarioEn("INSTAGRAM", p) && !noEtiquetableEnInstagram(p));
  const conPagina = etiquetadas.filter((p) => p.facebookPaginaId);
  const deMas = conIg.filter((p) => !colaboradoresIg.has(p._id)).length > MAXIMO_ETIQUETADOS_INSTAGRAM;

  const motivo = (s: Sugerida) =>
    s.motivo === "mencionado"
      ? s.segundo != null
        ? t("publicar.motivo.mencionado", { segundo: reloj(s.segundo) })
        : t("publicar.motivo.mencionadoSinSegundo")
      : t(`publicar.motivo.${s.motivo}`);

  return (
    <div className="space-y-3">
      {porSugerir.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs text-white/55">
            <Sparkles size={12} className="text-marca" aria-hidden /> {t("publicar.sugeridas")}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {porSugerir.map((s) => (
              <li key={s.persona._id}>
                <button
                  type="button"
                  onClick={() => onAgregar(s.persona)}
                  className="flex items-center gap-2 rounded-full border border-dashed border-white/20 py-1 pl-1 pr-3 text-left transition hover:border-marca/60 hover:bg-marca/5"
                >
                  <AvatarPersona persona={s.persona} tamano={24} />
                  <span className="leading-tight">
                    <span className="block text-xs text-white">{s.persona.nombre}</span>
                    <span className="block text-[10px] text-white/40">{motivo(s)}</span>
                  </span>
                  <Plus size={13} className="text-white/50" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs text-white/55">{t("publicar.etiquetadas")}</p>
        {etiquetadas.length === 0 ? (
          <p className="text-xs text-white/40">{t("publicar.ninguna")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {etiquetadas.map((p) => (
              <li key={p._id} className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-1.5">
                <AvatarPersona persona={p} tamano={22} />
                <span className="text-xs text-white">{p.nombre}</span>
                <span className="flex items-center gap-0.5">
                  {/* Cada red, un enlace al perfil: para mirar antes de publicar que la cuenta exista y sea pública. */}
                  {REDES_PERSONA.filter((r) => p[r]).map((r) => (
                    <a
                      key={r}
                      href={urlPerfil(r, p[r]!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("publicar.verPerfilEn", { red: NOMBRE_RED[r], usuario: p[r]! })}
                      className="rounded-full transition hover:scale-110 hover:opacity-80"
                    >
                      <IconoRed red={RED_DE[r]} chico />
                    </a>
                  ))}
                  {noEtiquetableEnInstagram(p) ? (
                    <span title={t("publicar.noEtiquetableIg")} className="text-amber-300">
                      <AlertTriangle size={12} aria-label={t("publicar.noEtiquetableIg")} />
                    </span>
                  ) : null}
                </span>
                {enTexto.has(p._id) ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-ng-azul/20 px-1.5 text-[10px] text-ng-celeste" title={t("publicar.enTexto")}>
                    <AtSign size={9} aria-hidden />
                    {t("publicar.enTexto")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onQuitar(p)}
                    aria-label={t("publicar.quitar", { nombre: p.nombre })}
                    className="rounded-full p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
                  >
                    <X size={12} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {nuevo !== null && onNuevoInvitado ? (
        <FormPersona
          titulo={t("publicar.nuevoInvitado")}
          inicial={{ ...datosDe(null, "EPISODIO"), nombre: nuevo }}
          marcaId={marcaId}
          enEpisodio
          guardando={guardando}
          onCancelar={() => setNuevo(null)}
          onGuardar={async (d) => {
            await onNuevoInvitado(d);
            setNuevo(null);
          }}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <BuscadorPersonas personas={personas} excluir={ids} onElegir={onAgregar} onCrear={onNuevoInvitado ? (n) => setNuevo(n) : undefined} />
          {onNuevoInvitado && (
            <button
              type="button"
              onClick={() => setNuevo("")}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 px-3 py-2 text-xs text-white/70 hover:border-white/40 hover:text-white"
            >
              <Plus size={13} aria-hidden /> {t("publicar.nuevoInvitado")}
            </button>
          )}
        </div>
      )}

      {conInstagram && conIg.length > 0 && (
        <Colaboradores
          titulo={t("publicar.colaboradorIg")}
          ayuda={t("publicar.colaboradorIgAyuda", { max: MAXIMO_COLABORADORES_INSTAGRAM })}
          lleno={t("publicar.maximoColaboradores", { max: MAXIMO_COLABORADORES_INSTAGRAM })}
          icono={<Users size={13} aria-hidden />}
          personas={conIg}
          etiqueta={(p) => `@${usuarioEn("INSTAGRAM", p)}`}
          perfil={(p) => urlPerfil("instagram", usuarioEn("INSTAGRAM", p)!)}
          verPerfil={t("publicar.verPerfil")}
          elegidos={colaboradoresIg}
          maximo={MAXIMO_COLABORADORES_INSTAGRAM}
          onAlternar={onColaboradorIg}
        />
      )}
      {conFacebook && conPagina.length > 0 && (
        <Colaboradores
          titulo={t("publicar.colaboradorFb")}
          ayuda={t("publicar.colaboradorFbAyuda", { max: MAXIMO_COLABORADORES_FACEBOOK })}
          lleno={t("publicar.maximoColaboradoresFb", { max: MAXIMO_COLABORADORES_FACEBOOK })}
          icono={<IconoRed red="FACEBOOK" chico />}
          personas={conPagina}
          etiqueta={(p) => p.nombre}
          perfil={(p) => urlPerfil("facebook", p.facebookPaginaId ?? p.facebook ?? "")}
          verPerfil={t("publicar.verPerfil")}
          elegidos={colaboradoresFb}
          maximo={MAXIMO_COLABORADORES_FACEBOOK}
          onAlternar={onColaboradorFb}
        />
      )}
      {deMas && <p className="text-xs text-amber-300">{t("publicar.maximoEtiquetas", { max: MAXIMO_ETIQUETADOS_INSTAGRAM })}</p>}
      <p className="text-[11px] text-white/40">
        {t("publicar.comoSale")}{" "}
        <Link href="/etiquetas" className="text-ng-celeste hover:underline">
          {t("publicar.verTodas")}
        </Link>
      </p>
    </div>
  );
}

function Colaboradores({
  titulo,
  ayuda,
  lleno,
  icono,
  personas,
  etiqueta,
  perfil,
  verPerfil,
  elegidos,
  maximo,
  onAlternar,
}: {
  titulo: string;
  ayuda: string;
  lleno: string;
  icono: React.ReactNode;
  personas: Persona[];
  etiqueta: (p: Persona) => string;
  /** El perfil en esa red, para revisar que la cuenta exista y acepte colaboraciones. */
  perfil: (p: Persona) => string;
  verPerfil: string;
  elegidos: Set<string>;
  maximo: number;
  onAlternar: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border border-white/10 px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-white/60">
        {icono} {titulo}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {personas.map((p) => {
          const on = elegidos.has(p._id);
          const tope = !on && elegidos.size >= maximo;
          return (
            <span
              key={p._id}
              className={`inline-flex items-center rounded-full border text-[11px] transition ${
                on ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/10 text-white/50"
              } ${tope ? "opacity-40" : ""}`}
            >
              <button
                type="button"
                onClick={() => onAlternar(p._id)}
                disabled={tope}
                aria-pressed={on}
                title={tope ? lleno : undefined}
                className="py-0.5 pl-2.5 pr-1 hover:text-white disabled:cursor-not-allowed"
              >
                {etiqueta(p)}
              </button>
              <a
                href={perfil(p)}
                target="_blank"
                rel="noopener noreferrer"
                title={`${verPerfil} · ${etiqueta(p)}`}
                aria-label={`${verPerfil} · ${etiqueta(p)}`}
                className="rounded-r-full py-1 pl-0.5 pr-2 text-white/40 hover:text-ng-celeste"
              >
                <ExternalLink size={11} aria-hidden />
              </a>
            </span>
          );
        })}
      </div>
      <p className="text-[11px] text-white/35">{ayuda}</p>
    </div>
  );
}
