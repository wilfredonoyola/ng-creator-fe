"use client";

import { useEffect, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useFormatter, useTranslations } from "next-intl";
import {
  CATALOGO_LEMON,
  CONECTAR_LEMON,
  CONFIGURACION_COBRO,
  CREAR_WEBHOOK_LEMON,
  GUARDAR_PLANES_LEMON,
  PROBAR_WEBHOOK_LEMON,
  WEBHOOKS_LEMON,
} from "@/graphql/operations";
import { mensajeDeError } from "@/lib/nombre";
import { GuiaConfiguracion } from "@/components/superadmin/GuiaConfiguracion";

type Origen = "superadmin" | "entorno" | null;
type ClavePlan = "STARTER_MENSUAL" | "STARTER_ANUAL" | "AGENCY_MENSUAL" | "AGENCY_ANUAL" | "AGENCY_PRO_MENSUAL" | "AGENCY_PRO_ANUAL";

interface Modo {
  prueba: boolean;
  origenClave: Origen;
  claveFinal: string | null;
  storeId: string | null;
  storeNombre: string | null;
  planes: { clave: ClavePlan; varianteId: string | null; origen: Origen }[];
  webhookUrl: string | null;
  origenWebhook: Origen;
  listo: boolean;
  cambios: { detalle: string; porEmail: string; en: string }[];
}

interface WebhookLemon {
  id: string;
  url: string;
  eventos: string[];
  prueba: boolean;
  creado: string | null;
  propio: boolean;
}

interface Variante {
  id: string;
  nombre: string;
  producto: string;
  intervalo: string | null;
  precioCentavos: number;
  estado: string;
}

/**
 * La conexión con Lemon Squeezy, sin variables de entorno (ng-creator-be#94):
 * un bloque por modo, de verdad y de prueba. Se pega la clave de API, se
 * confirma qué variante es cada plan y se crea el webhook. Las claves se
 * guardan cifradas y no vuelven a verse: solo sus últimos 4 caracteres.
 */
export default function CobroSuperadmin() {
  const t = useTranslations("cobroSuperadmin");
  const { data, loading, error } = useQuery<{ configuracionCobro: Modo[] }>(CONFIGURACION_COBRO, {
    fetchPolicy: "cache-and-network",
  });
  const modos = data?.configuracionCobro ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 max-w-3xl text-white/50">{t("subtitulo")}</p>
      </div>
      <GuiaConfiguracion
        titulo={t("guia.titulo")}
        pasosTitulo={t("guia.pasosTitulo")}
        pasos={t.raw("guia.pasos") as string[]}
        importanteTitulo={t("guia.importanteTitulo")}
        importante={t.raw("guia.importante") as string[]}
        abierta={!loading && modos.length > 0 && !modos.every((m) => m.listo)}
      />
      {error && <p className="mb-4 text-sm text-red-400">{error.message}</p>}
      {loading && !data ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {modos.map((m) => (
            <BloqueModo key={String(m.prueba)} modo={m} />
          ))}
        </div>
      )}
    </>
  );
}

function BloqueModo({ modo }: { modo: Modo }) {
  const t = useTranslations("cobroSuperadmin");
  const formato = useFormatter();
  const refetchQueries = [{ query: CONFIGURACION_COBRO }];
  const [conectar, { loading: conectando }] = useMutation(CONECTAR_LEMON, { refetchQueries });
  const [guardar, { loading: guardando }] = useMutation(GUARDAR_PLANES_LEMON, { refetchQueries });
  const [crearWebhook, { loading: creando }] = useMutation(CREAR_WEBHOOK_LEMON, { refetchQueries });
  const [pedirCatalogo, catalogo] = useLazyQuery<{ catalogoLemon: Variante[] }>(CATALOGO_LEMON, { fetchPolicy: "network-only" });
  const [pedirWebhooks, webhooks] = useLazyQuery<{ webhooksLemon: WebhookLemon[] }>(WEBHOOKS_LEMON, { fetchPolicy: "network-only" });
  const [probarWebhook, { loading: probando }] = useMutation<{
    probarWebhookLemon: { ok: boolean; estado: number | null; url: string };
  }>(PROBAR_WEBHOOK_LEMON);
  const [apiKey, setApiKey] = useState("");
  const [storeId, setStoreId] = useState("");
  const [elegidas, setElegidas] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const conectadoAca = modo.origenClave === "superadmin";
  const { prueba } = modo;
  useEffect(() => {
    if (conectadoAca) void pedirCatalogo({ variables: { prueba } });
  }, [conectadoAca, prueba, pedirCatalogo, modo.storeId]);
  // Los de Lemon se vuelven a pedir cuando cambia el webhook de Clipfine.
  useEffect(() => {
    if (conectadoAca) void pedirWebhooks({ variables: { prueba } });
  }, [conectadoAca, prueba, pedirWebhooks, modo.storeId, modo.webhookUrl, modo.cambios.length]);
  useEffect(() => {
    setElegidas(Object.fromEntries(modo.planes.map((p) => [p.clave, p.varianteId ?? ""])));
  }, [modo.planes]);

  async function hacer(fn: () => Promise<unknown>, ok: string) {
    setMensaje(null);
    try {
      await fn();
      setMensaje({ ok: true, texto: ok });
    } catch (e) {
      setMensaje({ ok: false, texto: mensajeDeError(e) });
    }
  }

  const variantes = catalogo.data?.catalogoLemon ?? [];
  const precio = (v: Variante) =>
    `${formato.number(v.precioCentavos / 100, { style: "currency", currency: "USD" })}${v.intervalo ? ` / ${t(`intervalos.${v.intervalo === "year" ? "year" : "month"}`)}` : ""}`;
  const cambiaronPlanes = modo.planes.some((p) => (p.varianteId ?? "") !== (elegidas[p.clave] ?? ""));
  const campo = "w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul";
  const boton = "rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-40";

  return (
    <section className={`rounded-xl border p-5 ${prueba ? "border-amber-400/30" : "border-white/10"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{prueba ? t("modoPrueba") : t("modoVivo")}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            modo.listo ? "bg-emerald-400/15 text-emerald-300" : "border border-white/15 text-white/60"
          }`}
        >
          {modo.listo ? t("listo") : t("falta")}
        </span>
      </div>
      <p className="mt-1 text-xs text-white/50">{prueba ? t("ayudaPrueba") : t("ayudaVivo")}</p>

      {/* 1. La clave */}
      <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-white/50">{t("clave.titulo")}</h3>
      <p className="mt-1 text-sm">
        {modo.origenClave === "superadmin"
          ? t("clave.cargada", { final: modo.claveFinal ?? "····" })
          : modo.origenClave === "entorno"
            ? t("clave.entorno")
            : t("clave.sin")}
        {modo.storeNombre || modo.storeId ? (
          <span className="block text-xs text-white/45">{t("clave.tienda", { nombre: modo.storeNombre ?? "—", id: modo.storeId ?? "—" })}</span>
        ) : null}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={modo.origenClave ? t("clave.reemplazar") : t("clave.pegar")}
          aria-label={t("clave.titulo")}
          className={campo}
        />
        <input
          value={storeId}
          onChange={(e) => setStoreId(e.target.value.replace(/\D/g, ""))}
          placeholder={t("clave.tiendaOpcional")}
          aria-label={t("clave.tiendaOpcional")}
          className={`${campo} sm:w-40`}
        />
        <button
          type="button"
          disabled={conectando || apiKey.trim().length < 20}
          onClick={() =>
            void hacer(async () => {
              await conectar({ variables: { input: { prueba, apiKey: apiKey.trim(), storeId: storeId || null } } });
              setApiKey("");
            }, t("clave.ok"))
          }
          className="shrink-0 rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
        >
          {conectando ? t("conectando") : t("conectar")}
        </button>
      </div>

      {/* 2. Los planes */}
      <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-white/50">{t("planes.titulo")}</h3>
      {!conectadoAca && <p className="mt-1 text-xs text-white/45">{t("planes.antes")}</p>}
      <ul className="mt-2 space-y-2">
        {modo.planes.map((p) => (
          <li key={p.clave} className="grid grid-cols-[8.5rem_1fr] items-center gap-2 text-sm">
            <span className="text-white/70">{t(`planes.nombres.${p.clave}`)}</span>
            {conectadoAca ? (
              <select
                value={elegidas[p.clave] ?? ""}
                onChange={(e) => setElegidas((x) => ({ ...x, [p.clave]: e.target.value }))}
                className={campo}
              >
                <option value="">{t("planes.ninguna")}</option>
                {/* La que ya está guardada aunque no venga en el catálogo (se borró en Lemon). */}
                {p.varianteId && !variantes.some((v) => v.id === p.varianteId) && <option value={p.varianteId}>#{p.varianteId}</option>}
                {variantes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.producto} · {v.nombre} · {precio(v)}
                    {v.estado !== "published" ? ` (${v.estado})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-white/50">
                {p.varianteId ? `#${p.varianteId}` : t("planes.ninguna")}
                {p.origen === "entorno" && ` · ${t("deEntorno")}`}
              </span>
            )}
          </li>
        ))}
      </ul>
      {conectadoAca && (
        <button
          type="button"
          disabled={guardando || !cambiaronPlanes}
          onClick={() =>
            void hacer(
              () =>
                guardar({
                  variables: {
                    input: { prueba, planes: modo.planes.map((p) => ({ clave: p.clave, varianteId: elegidas[p.clave] || null })) },
                  },
                }),
              t("planes.ok"),
            )
          }
          className={`${boton} mt-3`}
        >
          {guardando ? t("guardando") : t("planes.guardar")}
        </button>
      )}

      {/* 3. El webhook */}
      <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-white/50">{t("webhook.titulo")}</h3>
      <p className="mt-1 text-sm">
        {modo.origenWebhook === "superadmin"
          ? t("webhook.creado", { url: modo.webhookUrl ?? "" })
          : modo.origenWebhook === "entorno"
            ? t("webhook.entorno")
            : t("webhook.sin")}
      </p>
      {conectadoAca && (
        <button
          type="button"
          disabled={creando}
          onClick={() => {
            if (modo.origenWebhook && !window.confirm(t("webhook.confirmarRehacer"))) return;
            void hacer(() => crearWebhook({ variables: { prueba } }), t("webhook.ok"));
          }}
          className={`${boton} mt-2`}
        >
          {creando ? t("creando") : modo.origenWebhook === "superadmin" ? t("webhook.rehacer") : t("webhook.crear")}
        </button>
      )}
      {conectadoAca && modo.origenWebhook === "superadmin" && (
        <button
          type="button"
          disabled={probando}
          onClick={() => {
            setMensaje(null);
            void probarWebhook({ variables: { prueba } })
              .then(({ data }) => {
                const r = data?.probarWebhookLemon;
                if (!r) return;
                setMensaje(
                  r.ok
                    ? { ok: true, texto: t("webhook.pruebaOk") }
                    : { ok: false, texto: r.estado ? t("webhook.pruebaFallo", { estado: r.estado }) : t("webhook.pruebaSinRespuesta") },
                );
              })
              .catch((e: unknown) => setMensaje({ ok: false, texto: mensajeDeError(e) }));
          }}
          className={`${boton} mt-2 ml-2`}
        >
          {probando ? t("webhook.probando") : t("webhook.probar")}
        </button>
      )}
      {conectadoAca && (webhooks.data?.webhooksLemon.length ?? 0) > 0 && (
        <div className="mt-3">
          <p className="text-xs text-white/50">{t("webhook.enLemon")}</p>
          <ul className="mt-1 space-y-1.5">
            {webhooks.data!.webhooksLemon.map((w) => (
              <li key={w.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs">
                <span className="block break-all text-white/80">{w.url}</span>
                <span className="text-white/45">
                  {w.propio ? t("webhook.propio") : t("webhook.ajeno")} · {w.prueba ? t("webhook.dePrueba") : t("webhook.deVerdad")} ·{" "}
                  {t("webhook.eventos", { n: w.eventos.length })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {conectadoAca && webhooks.error && <p className="mt-2 text-xs text-red-400">{mensajeDeError(webhooks.error)}</p>}

      {mensaje && <p className={`mt-3 text-sm ${mensaje.ok ? "text-emerald-400" : "text-red-400"}`}>{mensaje.texto}</p>}

      {modo.cambios.length > 0 && (
        <>
          <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-white/50">{t("historial")}</h3>
          <ul className="mt-2 space-y-1.5 text-xs text-white/60">
            {modo.cambios.map((c, i) => (
              <li key={i}>
                {c.detalle}
                <span className="block text-white/35">
                  {c.porEmail} · {formato.dateTime(new Date(c.en), { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
