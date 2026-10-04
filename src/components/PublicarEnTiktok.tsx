"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import {
  PROGRAMAR_PUBLICACION,
  PUBLICACIONES_DE_EXPEDIENTE,
  TIKTOK_CUENTAS,
  TIKTOK_INFO_CREADOR,
} from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { EN_CURSO, type Publicacion, aInputLocal } from "@/lib/publicaciones";
import type { CuentaTiktok } from "@/components/CuentasTiktok";
import { FilaPublicacion, Opcion } from "@/components/PublicarEnFacebook";

/** Las opciones de privacidad que conocemos; se dicen con `publicarTiktok.privacidades`. */
const PRIVACIDADES = ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"] as const;
type Privacidad = (typeof PRIVACIDADES)[number];
const esPrivacidad = (o: string): o is Privacidad => (PRIVACIDADES as readonly string[]).includes(o);

const TEXTO_MAX = 2200;
const MINUTOS_MINIMOS = 1;
const REFRESCO_MS = 5_000;

const MUSICA = "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";
const CONTENIDO_DE_MARCA = "https://www.tiktok.com/legal/page/global/bc-policy/en";

interface InfoCreador {
  usuario?: string | null;
  apodo?: string | null;
  opcionesDePrivacidad: string[];
  comentariosDeshabilitados: boolean;
  duoDeshabilitado: boolean;
  stitchDeshabilitado: boolean;
  duracionMaxSeg?: number | null;
}

/**
 * Publica un expediente en una cuenta de TikTok de la marca activa
 * (ng-creator-be#62), por la cola.
 *
 * La pantalla sigue los lineamientos de TikTok para Direct Post, que se revisan
 * en la auditoria de la app:
 * - se pide lo que la cuenta permite al abrirla, y se muestra a que cuenta va;
 * - la privacidad no tiene valor por defecto y sale de las opciones de la cuenta;
 * - comentarios, duo y stitch arrancan apagados, y grises si la cuenta no los permite;
 * - la declaracion de contenido comercial arranca apagada, y encendida exige
 *   elegir al menos una opcion;
 * - el texto de consentimiento cambia segun esa declaracion;
 * - se ve el video antes de publicar y se avisa si dura mas de lo permitido.
 */
export function PublicarEnTiktok({
  expedienteId,
  marcaIdDelVideo,
  videoUrl,
}: {
  expedienteId: string;
  marcaIdDelVideo: string;
  videoUrl?: string | null;
}) {
  const t = useTranslations("publicarTiktok");
  const { activa: marca } = useMarcaActiva();
  const marcaId = marca?._id;

  const { data: dataCuentas } = useQuery(TIKTOK_CUENTAS, {
    variables: { marcaId },
    skip: !marcaId,
    errorPolicy: "all",
  });
  const cuentas: CuentaTiktok[] = (dataCuentas?.tiktokCuentas ?? []).filter(
    (c: CuentaTiktok) => c.activa && !c.requiereReconexion,
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const cuenta = cuentas.find((c) => c.openId === openId) ?? cuentas[0] ?? null;

  // Siempre de la red: TikTok pide lo de HOY, no lo que quedo en cache.
  const { data: dataInfo, error: errorInfo, loading: cargandoInfo } = useQuery(
    TIKTOK_INFO_CREADOR,
    {
      variables: { marcaId, openId: cuenta?.openId },
      skip: !marcaId || !cuenta,
      fetchPolicy: "network-only",
    },
  );
  const info: InfoCreador | null = dataInfo?.tiktokInfoCreador ?? null;

  const variables = { marcaId: marcaIdDelVideo, expedienteId };
  const { data, startPolling, stopPolling } = useQuery(
    PUBLICACIONES_DE_EXPEDIENTE,
    { variables, errorPolicy: "all" },
  );
  const previas: Publicacion[] = (data?.publicacionesDeExpediente ?? []).filter(
    (p: Publicacion) => p.red === "TIKTOK",
  );
  const refetchQueries = [{ query: PUBLICACIONES_DE_EXPEDIENTE, variables }];

  const hayEnCamino = previas.some(
    (p) =>
      EN_CURSO.includes(p.estado) ||
      (p.estado === "PROGRAMADA" &&
        new Date(p.publicarEn).getTime() - Date.now() < 2 * 60_000),
  );
  useEffect(() => {
    if (hayEnCamino) startPolling(REFRESCO_MS);
    else stopPolling();
    return () => stopPolling();
  }, [hayEnCamino, startPolling, stopPolling]);

  const [programar, { loading }] = useMutation(PROGRAMAR_PUBLICACION, {
    refetchQueries,
  });

  const [texto, setTexto] = useState("");
  const [privacidad, setPrivacidad] = useState("");
  const [comentarios, setComentarios] = useState(false);
  const [duo, setDuo] = useState(false);
  const [stitch, setStitch] = useState(false);
  const [comercial, setComercial] = useState(false);
  const [marcaPropia, setMarcaPropia] = useState(false);
  const [deTerceros, setDeTerceros] = useState(false);
  const [esIA, setEsIA] = useState(false);
  const [duracion, setDuracion] = useState<number | null>(null);
  const [cuando, setCuando] = useState<"ahora" | "despues">("ahora");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);

  // El contenido de marca no puede ser "Solo yo": si estaba elegido, se suelta
  // para que la persona elija otra, en vez de cambiarla por ella.
  useEffect(() => {
    if (comercial && deTerceros && privacidad === "SELF_ONLY") setPrivacidad("");
  }, [comercial, deTerceros, privacidad]);

  const publicadas = previas.filter((p) => p.estado === "PUBLICADA");
  const faltaComercial = comercial && !marcaPropia && !deTerceros;
  const muyLargo = !!info?.duracionMaxSeg && duracion != null && duracion > info.duracionMaxSeg;
  const faltaFecha = cuando === "despues" && !fecha;
  const bloqueado =
    loading ||
    !info ||
    !privacidad ||
    faltaComercial ||
    muyLargo ||
    faltaFecha ||
    texto.length > TEXTO_MAX;
  const minimo = aInputLocal(new Date(Date.now() + MINUTOS_MINIMOS * 60_000));

  function contenidoComercial(): string {
    if (!comercial) return "NINGUNO";
    if (marcaPropia && deTerceros) return "AMBOS";
    return deTerceros ? "DE_TERCEROS" : "MARCA_PROPIA";
  }

  async function enviar() {
    if (!cuenta || !marcaId) return;
    setError(null);
    try {
      await programar({
        variables: {
          input: {
            marcaId,
            red: "TIKTOK",
            cuentaId: cuenta.openId,
            expedienteId,
            formato: "VIDEO",
            descripcion: texto.trim() || null,
            ajustes: {
              privacidad,
              permitirComentarios: comentarios,
              permitirDuo: duo,
              permitirStitch: stitch,
              contenidoComercial: contenidoComercial(),
              esIA,
            },
            publicarEn: cuando === "despues" && fecha ? new Date(fecha) : null,
          },
        },
      });
      setTexto("");
      setPrivacidad("");
      setFecha("");
      setCuando("ahora");
    } catch (e: any) {
      setError(e?.message ?? t("errorPublicar"));
    }
  }

  const historial = previas.length > 0 && (
    <div className="space-y-1.5 border-t border-white/10 pt-2.5">
      {previas.map((p) => (
        <FilaPublicacion key={p._id} p={p} refetchQueries={refetchQueries} />
      ))}
    </div>
  );

  if (!cuenta || !marca) {
    return (
      <div className="space-y-2 rounded-xl border border-dashed border-white/15 p-3 text-xs text-white/40">
        <p>
          {t("sinCuenta")}
        </p>
        {historial}
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs outline-none placeholder:text-white/25 focus:border-ng-azul/50";

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        {cuentas.length > 1 ? (
          <select
            value={cuenta.openId}
            onChange={(e) => setOpenId(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
          >
            {cuentas.map((c) => (
              <option key={c.openId} value={c.openId}>
                {c.nombre}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-white/50">
            {t.rich("publicarEn", {
              nombre: info?.apodo ?? cuenta.nombre,
              n: (c) => <span className="font-medium text-white/80">{c}</span>,
            })}
            {(info?.usuario ?? cuenta.usuario) && (
              <span className="ml-1 text-white/35">@{info?.usuario ?? cuenta.usuario}</span>
            )}
          </p>
        )}
        {publicadas.length > 0 && (
          <span className="rounded bg-ng-teal/15 px-2 py-0.5 text-[10px] font-medium text-ng-teal">
            {t("publicadas", { n: publicadas.length })}
          </span>
        )}
      </div>

      {cargandoInfo && <p className="text-[11px] text-white/40">{t("consultando")}</p>}
      {errorInfo && (
        <p className="break-words rounded-lg bg-red-500/10 p-2 text-[11px] text-red-400">
          {errorInfo.message}
        </p>
      )}

      {videoUrl && (
        <video
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => setDuracion(e.currentTarget.duration)}
          className="mx-auto max-h-64 rounded-lg bg-black"
        />
      )}
      {muyLargo && (
        <p className="text-[11px] text-red-400">
          {t("muyLargo", { dura: Math.round(duracion!), max: info!.duracionMaxSeg! })}
        </p>
      )}

      <div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("textoPlaceholder")}
          rows={3}
          className={input}
        />
        {texto.length > TEXTO_MAX && (
          <p className="mt-1 text-[10px] text-red-400">
            {t("textoLargo", { largo: texto.length, max: TEXTO_MAX })}
          </p>
        )}
      </div>

      <label className="block text-[11px] text-white/60">
        {t("quienPuedeVerlo")}
        <select
          value={privacidad}
          onChange={(e) => setPrivacidad(e.target.value)}
          disabled={!info}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs outline-none disabled:opacity-50"
        >
          <option value="" disabled>
            {t("elegiOpcion")}
          </option>
          {(info?.opcionesDePrivacidad ?? []).map((o) => {
            const noPermitida = o === "SELF_ONLY" && comercial && deTerceros;
            return (
              <option key={o} value={o} disabled={noPermitida}>
                {esPrivacidad(o) ? t(`privacidades.${o}`) : o}
                {noPermitida ? t("noDisponibleMarca") : ""}
              </option>
            );
          })}
        </select>
      </label>

      <div className="space-y-1.5">
        <p className="text-[11px] text-white/60">{t("permitir")}</p>
        <Casilla
          etiqueta={t("comentar")}
          valor={comentarios}
          onCambio={setComentarios}
          deshabilitada={!info || info.comentariosDeshabilitados}
        />
        <Casilla
          etiqueta={t("duo")}
          valor={duo}
          onCambio={setDuo}
          deshabilitada={!info || info.duoDeshabilitado}
        />
        <Casilla
          etiqueta={t("stitch")}
          valor={stitch}
          onCambio={setStitch}
          deshabilitada={!info || info.stitchDeshabilitado}
        />
      </div>

      <div className="space-y-1.5 rounded-lg border border-white/10 p-2.5">
        <Casilla
          etiqueta={t("comercial.etiqueta")}
          detalle={t("comercial.detalle")}
          valor={comercial}
          onCambio={(v) => {
            setComercial(v);
            if (!v) {
              setMarcaPropia(false);
              setDeTerceros(false);
            }
          }}
        />
        {comercial && (
          <div className="space-y-1.5 pl-5">
            <Casilla
              etiqueta={t("comercial.tuMarca")}
              detalle={t("comercial.tuMarcaDetalle")}
              valor={marcaPropia}
              onCambio={setMarcaPropia}
            />
            <Casilla
              etiqueta={t("comercial.deMarca")}
              detalle={t("comercial.deMarcaDetalle")}
              valor={deTerceros}
              onCambio={setDeTerceros}
            />
            {faltaComercial && (
              <p className="text-[10px] text-amber-400/80">
                {t("comercial.falta")}
              </p>
            )}
          </div>
        )}
      </div>

      <Casilla
        etiqueta={t("ia.etiqueta")}
        detalle={t("ia.detalle")}
        valor={esIA}
        onCambio={setEsIA}
      />

      {publicadas.length > 0 && (
        <p className="text-[11px] text-yellow-400/80">
          {t("yaPublicado")}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex gap-1.5">
          <Opcion activa={cuando === "ahora"} onClick={() => setCuando("ahora")}>
            {t("ahora")}
          </Opcion>
          <Opcion activa={cuando === "despues"} onClick={() => setCuando("despues")}>
            {t("programar")}
          </Opcion>
        </div>
        {cuando === "despues" && (
          <>
            <input
              type="datetime-local"
              value={fecha}
              min={minimo}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs outline-none focus:border-ng-azul/50"
            />
            <p className="text-[10px] text-white/30">
              {t("noPrograma")}
            </p>
          </>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-white/40">
        {t.rich(comercial && deTerceros ? "consentimientoMarca" : "consentimiento", {
          politica: (c) => <Enlace href={CONTENIDO_DE_MARCA}>{c}</Enlace>,
          musica: (c) => <Enlace href={MUSICA}>{c}</Enlace>,
        })}{" "}
        {t("tardaEnAparecer")}
      </p>

      <button
        onClick={enviar}
        disabled={bloqueado}
        title={
          !privacidad
            ? t("ayudaPrivacidad")
            : faltaComercial
              ? t("ayudaComercial")
              : undefined
        }
        className="w-full rounded-lg bg-[#FE2C55] py-2.5 text-sm font-medium text-white transition hover:bg-[#FE2C55]/90 disabled:opacity-50"
      >
        {loading
          ? cuando === "despues"
            ? t("agendando")
            : t("encolando")
          : cuando === "despues"
            ? t("programarEnTiktok")
            : t("publicarEnTiktok")}
      </button>

      {error && (
        <p className="break-words rounded-lg bg-red-500/10 p-2 text-[11px] text-red-400">
          {error}
        </p>
      )}

      {historial}
    </div>
  );
}

function Casilla({
  etiqueta,
  detalle,
  valor,
  onCambio,
  deshabilitada,
}: {
  etiqueta: string;
  detalle?: string;
  valor: boolean;
  onCambio: (v: boolean) => void;
  deshabilitada?: boolean;
}) {
  const t = useTranslations("publicarTiktok");
  return (
    <label
      className={`flex items-start gap-2 text-[11px] ${
        deshabilitada ? "cursor-not-allowed text-white/25" : "text-white/70"
      }`}
      title={deshabilitada ? t("deshabilitadaEnTiktok") : undefined}
    >
      <input
        type="checkbox"
        checked={valor && !deshabilitada}
        disabled={deshabilitada}
        onChange={(e) => onCambio(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        {etiqueta}
        {detalle && <span className="block text-[10px] text-white/35">{detalle}</span>}
      </span>
    </label>
  );
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-white/60 underline">
      {children}
    </a>
  );
}
