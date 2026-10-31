"use client";

import { useEffect, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useFormatter, useTranslations } from "next-intl";
import { AUDIENCIAS_MAILCHIMP, CONFIGURACION_MAILCHIMP, GUARDAR_MAILCHIMP } from "@/graphql/operations";
import { mensajeDeError } from "@/lib/nombre";

type Origen = "superadmin" | "entorno" | null;
const ESTADOS_JOURNEY = ["sending", "draft", "paused", "stopped"] as const;
type EstadoJourney = (typeof ESTADOS_JOURNEY)[number];
const estadoConocido = (e: string): e is EstadoJourney => (ESTADOS_JOURNEY as readonly string[]).includes(e);

interface Configuracion {
  activo: boolean;
  origenClave: Origen;
  claveFinal: string | null;
  audiencia: string | null;
  origenAudiencia: Origen;
  audienciaNombre: string | null;
  contactos: number | null;
  journeyRegistro: string | null;
  origenJourney: Origen;
  journeyNombre: string | null;
  journeyEstado: string | null;
  problema: string | null;
  cambios: { detalle: string; porEmail: string; en: string }[];
}

interface Audiencia {
  id: string;
  nombre: string;
  contactos: number;
}

interface Cambios {
  apiKey?: string;
  audiencia?: string;
  journeyRegistro?: string;
}

/**
 * La conexión con Mailchimp, como la de Lemon: sin variables de entorno. Se
 * pega la clave, se elige la audiencia a la que entra cada registro y el
 * journey de bienvenida ("API trigger") que arranca al confirmar la cuenta.
 * La clave se guarda cifrada y no vuelve a verse: solo sus últimos 4.
 * Lo que no se cargue acá sigue saliendo del .env del servidor.
 */
export default function MailchimpSuperadmin() {
  const t = useTranslations("mailchimpSuperadmin");
  const formato = useFormatter();
  const { data, loading, error } = useQuery<{ configuracionMailchimp: Configuracion }>(CONFIGURACION_MAILCHIMP, {
    fetchPolicy: "cache-and-network",
  });
  const [guardar, { loading: guardando }] = useMutation(GUARDAR_MAILCHIMP, {
    refetchQueries: [{ query: CONFIGURACION_MAILCHIMP }],
  });
  const [pedirAudiencias, audiencias] = useLazyQuery<{ audienciasMailchimp: Audiencia[] }>(AUDIENCIAS_MAILCHIMP, {
    fetchPolicy: "network-only",
  });
  const [apiKey, setApiKey] = useState("");
  const [audiencia, setAudiencia] = useState("");
  const [journey, setJourney] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const c = data?.configuracionMailchimp;
  const hayClave = !!c?.origenClave;
  const claveFinal = c?.claveFinal;
  useEffect(() => {
    if (hayClave) void pedirAudiencias();
  }, [hayClave, claveFinal, pedirAudiencias]);
  useEffect(() => setAudiencia(c?.audiencia ?? ""), [c?.audiencia]);

  async function hacer(cambios: Cambios, ok: string, despues?: () => void) {
    setMensaje(null);
    try {
      await guardar({ variables: { input: cambios } });
      despues?.();
      setMensaje({ ok: true, texto: ok });
    } catch (e) {
      setMensaje({ ok: false, texto: mensajeDeError(e) });
    }
  }

  const campo = "w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul";
  const principal =
    "shrink-0 rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-40";
  const secundario = "shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-40";
  const subtitulo = "mt-6 text-xs font-medium uppercase tracking-wide text-white/50";
  const deDonde = (o: Origen) => (o === "entorno" ? ` · ${t("deEntorno")}` : "");
  const lista = audiencias.data?.audienciasMailchimp ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 max-w-3xl text-white/50">{t("subtitulo")}</p>
      </div>
      {error && <p className="mb-4 text-sm text-red-400">{error.message}</p>}
      {loading && !c ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : c ? (
        <section className="max-w-2xl rounded-xl border border-white/10 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Mailchimp</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                c.activo ? "bg-emerald-400/15 text-emerald-300" : "border border-white/15 text-white/60"
              }`}
            >
              {c.activo ? t("activo") : t("apagado")}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/50">{c.activo ? t("ayudaActivo") : t("ayudaApagado")}</p>
          {c.problema && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{c.problema}</p>}

          {/* 1. La clave */}
          <h3 className={subtitulo}>{t("clave.titulo")}</h3>
          <p className="mt-1 text-sm">
            {c.origenClave ? t("clave.cargada", { final: c.claveFinal ?? "····" }) + deDonde(c.origenClave) : t("clave.sin")}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={c.origenClave ? t("clave.reemplazar") : t("clave.pegar")}
              aria-label={t("clave.titulo")}
              className={campo}
            />
            <button
              type="button"
              disabled={guardando || apiKey.trim().length < 10}
              onClick={() => void hacer({ apiKey: apiKey.trim() }, t("clave.ok"), () => setApiKey(""))}
              className={principal}
            >
              {guardando ? t("guardando") : t("guardar")}
            </button>
          </div>
          <p className="mt-1 text-xs text-white/40">{t("clave.donde")}</p>

          {/* 2. La audiencia */}
          <h3 className={subtitulo}>{t("audiencia.titulo")}</h3>
          <p className="mt-1 text-sm">
            {c.audiencia
              ? t("audiencia.actual", {
                  nombre: c.audienciaNombre ?? c.audiencia,
                  id: c.audiencia,
                  contactos: c.contactos ?? 0,
                }) + deDonde(c.origenAudiencia)
              : t("audiencia.sin")}
          </p>
          {hayClave && (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select value={audiencia} onChange={(e) => setAudiencia(e.target.value)} aria-label={t("audiencia.titulo")} className={campo}>
                <option value="">{t("audiencia.elegir")}</option>
                {c.audiencia && !lista.some((a) => a.id === c.audiencia) && <option value={c.audiencia}>{c.audiencia}</option>}
                {lista.map((a) => (
                  <option key={a.id} value={a.id}>
                    {t("audiencia.opcion", { nombre: a.nombre, contactos: a.contactos })}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={guardando || !audiencia || audiencia === c.audiencia}
                onClick={() => void hacer({ audiencia }, t("audiencia.ok"))}
                className={principal}
              >
                {guardando ? t("guardando") : t("guardar")}
              </button>
            </div>
          )}

          {/* 3. El journey de bienvenida */}
          <h3 className={subtitulo}>{t("journey.titulo")}</h3>
          <p className="mt-1 text-xs text-white/50">{t("journey.ayuda")}</p>
          <p className="mt-2 text-sm">
            {c.journeyRegistro ? (
              <>
                {t("journey.actual", { nombre: c.journeyNombre ?? "—", id: c.journeyRegistro })}
                {deDonde(c.origenJourney)}
                {c.journeyEstado && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      c.journeyEstado === "sending" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"
                    }`}
                  >
                    {estadoConocido(c.journeyEstado) ? t(`journey.estados.${c.journeyEstado}`) : c.journeyEstado}
                  </span>
                )}
              </>
            ) : (
              t("journey.sin")
            )}
          </p>
          {c.journeyEstado && c.journeyEstado !== "sending" && (
            <p className="mt-1 text-xs text-amber-300/80">{t("journey.noActivo")}</p>
          )}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={journey}
              onChange={(e) => setJourney(e.target.value)}
              placeholder={t("journey.pegar")}
              aria-label={t("journey.titulo")}
              className={campo}
            />
            <button
              type="button"
              disabled={guardando || !hayClave || !journey.trim()}
              onClick={() => void hacer({ journeyRegistro: journey.trim() }, t("journey.ok"), () => setJourney(""))}
              className={principal}
            >
              {guardando ? t("guardando") : t("guardar")}
            </button>
            {c.origenJourney === "superadmin" && (
              <button
                type="button"
                disabled={guardando}
                onClick={() => {
                  if (window.confirm(t("journey.confirmarQuitar"))) void hacer({ journeyRegistro: "" }, t("journey.quitado"));
                }}
                className={secundario}
              >
                {t("quitar")}
              </button>
            )}
          </div>

          {mensaje && <p className={`mt-4 text-sm ${mensaje.ok ? "text-emerald-400" : "text-red-400"}`}>{mensaje.texto}</p>}

          {c.cambios.length > 0 && (
            <>
              <h3 className={subtitulo}>{t("historial")}</h3>
              <ul className="mt-2 space-y-1.5 text-xs text-white/60">
                {c.cambios.map((x, i) => (
                  <li key={i}>
                    {x.detalle}
                    <span className="block text-white/35">
                      {x.porEmail} · {formato.dateTime(new Date(x.en), { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
