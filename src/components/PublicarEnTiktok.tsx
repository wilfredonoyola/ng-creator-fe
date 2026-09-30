"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
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

const PRIVACIDADES: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Todos",
  MUTUAL_FOLLOW_FRIENDS: "Amigos",
  FOLLOWER_OF_CREATOR: "Seguidores",
  SELF_ONLY: "Solo yo",
};

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
      setError(e?.message ?? "No se pudo publicar");
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
          Sin cuenta de TikTok habilitada para esta marca. El propietario la
          conecta en Redes conectadas.
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
            Publicar en{" "}
            <span className="font-medium text-white/80">
              {info?.apodo ?? cuenta.nombre}
            </span>
            {(info?.usuario ?? cuenta.usuario) && (
              <span className="ml-1 text-white/35">@{info?.usuario ?? cuenta.usuario}</span>
            )}
          </p>
        )}
        {publicadas.length > 0 && (
          <span className="rounded bg-ng-teal/15 px-2 py-0.5 text-[10px] font-medium text-ng-teal">
            {publicadas.length} publicada{publicadas.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {cargandoInfo && <p className="text-[11px] text-white/40">Consultando la cuenta en TikTok…</p>}
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
          El video dura {Math.round(duracion!)}s y esta cuenta admite hasta{" "}
          {info!.duracionMaxSeg}s en TikTok.
        </p>
      )}

      <div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Texto del video, con #hashtags y @menciones (opcional)"
          rows={3}
          className={input}
        />
        {texto.length > TEXTO_MAX && (
          <p className="mt-1 text-[10px] text-red-400">
            {texto.length}/{TEXTO_MAX}: TikTok no admite más.
          </p>
        )}
      </div>

      <label className="block text-[11px] text-white/60">
        Quién puede verlo
        <select
          value={privacidad}
          onChange={(e) => setPrivacidad(e.target.value)}
          disabled={!info}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs outline-none disabled:opacity-50"
        >
          <option value="" disabled>
            Elegí una opción
          </option>
          {(info?.opcionesDePrivacidad ?? []).map((o) => {
            const noPermitida = o === "SELF_ONLY" && comercial && deTerceros;
            return (
              <option key={o} value={o} disabled={noPermitida}>
                {PRIVACIDADES[o] ?? o}
                {noPermitida ? " (no disponible para contenido de marca)" : ""}
              </option>
            );
          })}
        </select>
      </label>

      <div className="space-y-1.5">
        <p className="text-[11px] text-white/60">Permitir a los usuarios</p>
        <Casilla
          etiqueta="Comentar"
          valor={comentarios}
          onCambio={setComentarios}
          deshabilitada={!info || info.comentariosDeshabilitados}
        />
        <Casilla
          etiqueta="Dúo"
          valor={duo}
          onCambio={setDuo}
          deshabilitada={!info || info.duoDeshabilitado}
        />
        <Casilla
          etiqueta="Stitch"
          valor={stitch}
          onCambio={setStitch}
          deshabilitada={!info || info.stitchDeshabilitado}
        />
      </div>

      <div className="space-y-1.5 rounded-lg border border-white/10 p-2.5">
        <Casilla
          etiqueta="Divulgar contenido comercial"
          detalle="Si el video promociona una marca, un producto o un servicio"
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
              etiqueta="Tu marca"
              detalle='Promocionás tu propio negocio. Se etiqueta como "Contenido promocional".'
              valor={marcaPropia}
              onCambio={setMarcaPropia}
            />
            <Casilla
              etiqueta="Contenido de marca"
              detalle='Promocionás a un tercero. Se etiqueta como "Colaboración pagada".'
              valor={deTerceros}
              onCambio={setDeTerceros}
            />
            {faltaComercial && (
              <p className="text-[10px] text-amber-400/80">
                Elegí al menos una opción para declarar el contenido comercial.
              </p>
            )}
          </div>
        )}
      </div>

      <Casilla
        etiqueta="Contenido generado con IA"
        detalle="TikTok le agrega la etiqueta correspondiente"
        valor={esIA}
        onCambio={setEsIA}
      />

      {publicadas.length > 0 && (
        <p className="text-[11px] text-yellow-400/80">
          Ya se publicó en TikTok. Publicar otra vez crea un video nuevo.
        </p>
      )}

      <div className="space-y-2">
        <div className="flex gap-1.5">
          <Opcion activa={cuando === "ahora"} onClick={() => setCuando("ahora")}>
            Ahora
          </Opcion>
          <Opcion activa={cuando === "despues"} onClick={() => setCuando("despues")}>
            Programar
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
              TikTok no programa: queda en nuestra cola y sale a esa hora. Si el
              servidor está caído a esa hora, sale cuando vuelva.
            </p>
          </>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-white/40">
        {comercial && deTerceros ? (
          <>
            Al publicar, aceptás la{" "}
            <Enlace href={CONTENIDO_DE_MARCA}>Política de contenido de marca</Enlace> y la{" "}
            <Enlace href={MUSICA}>Confirmación de uso de música</Enlace> de TikTok.
          </>
        ) : (
          <>
            Al publicar, aceptás la{" "}
            <Enlace href={MUSICA}>Confirmación de uso de música</Enlace> de TikTok.
          </>
        )}{" "}
        Después de publicar, el video puede tardar unos minutos en aparecer en
        la cuenta.
      </p>

      <button
        onClick={enviar}
        disabled={bloqueado}
        title={
          !privacidad
            ? "Elegí quién puede verlo"
            : faltaComercial
              ? "Completá la declaración de contenido comercial"
              : undefined
        }
        className="w-full rounded-lg bg-[#FE2C55] py-2.5 text-sm font-medium text-white transition hover:bg-[#FE2C55]/90 disabled:opacity-50"
      >
        {loading
          ? cuando === "despues"
            ? "Agendando…"
            : "Encolando…"
          : cuando === "despues"
            ? "Programar en TikTok"
            : "Publicar en TikTok"}
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
  return (
    <label
      className={`flex items-start gap-2 text-[11px] ${
        deshabilitada ? "cursor-not-allowed text-white/25" : "text-white/70"
      }`}
      title={deshabilitada ? "La cuenta lo tiene deshabilitado en TikTok" : undefined}
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
