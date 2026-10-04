"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import {
  PROGRAMAR_PUBLICACION,
  PUBLICACIONES_DE_EXPEDIENTE,
  YOUTUBE_CANALES,
} from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { EN_CURSO, type Publicacion, aInputLocal } from "@/lib/publicaciones";
import type { CanalYoutube } from "@/components/CanalesYoutube";
import { FilaPublicacion, Opcion } from "@/components/PublicarEnFacebook";

type Visibilidad = "public" | "unlisted" | "private";

/** Se dicen con `publicarYoutube.visibilidades.<valor>`. */
const VISIBILIDADES: Visibilidad[] = ["public", "unlisted", "private"];

/** Lo mismo que valida el backend, para no enterarse al apretar el botón. */
const TITULO_MAX = 100;
const MINUTOS_MINIMOS = 1;
const REFRESCO_MS = 5_000;

/**
 * Sube un expediente como Short a un canal de YouTube de la marca activa
 * (ng-creator-be#61).
 *
 * Siempre por la cola: la hora la tenemos nosotros, igual que en las otras
 * redes, aunque YouTube podría agendar de su lado.
 */
export function PublicarEnYoutube({
  expedienteId,
  marcaIdDelVideo,
}: {
  expedienteId: string;
  marcaIdDelVideo: string;
}) {
  const t = useTranslations("publicarYoutube");
  const { activa: marca } = useMarcaActiva();
  const marcaId = marca?._id;

  const { data: dataCanales } = useQuery(YOUTUBE_CANALES, {
    variables: { marcaId },
    skip: !marcaId,
    errorPolicy: "all",
  });
  const canales: CanalYoutube[] = (dataCanales?.youtubeCanales ?? []).filter(
    (c: CanalYoutube) => c.activa && !c.requiereReconexion,
  );
  const [canalId, setCanalId] = useState<string | null>(null);
  const canal = canales.find((c) => c.canalId === canalId) ?? canales[0] ?? null;

  const variables = { marcaId: marcaIdDelVideo, expedienteId };
  const { data, startPolling, stopPolling } = useQuery(
    PUBLICACIONES_DE_EXPEDIENTE,
    { variables, errorPolicy: "all" },
  );
  const previas: Publicacion[] = (data?.publicacionesDeExpediente ?? []).filter(
    (p: Publicacion) => p.red === "YOUTUBE",
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

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [visibilidad, setVisibilidad] = useState<Visibilidad>("public");
  const [paraNinos, setParaNinos] = useState(false);
  const [cuando, setCuando] = useState<"ahora" | "despues">("ahora");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);

  const publicadas = previas.filter((p) => p.estado === "PUBLICADA");
  const tituloFinal = titulo.trim() || descripcion.trim().split("\n")[0];
  const faltaTitulo = !tituloFinal;
  const tituloLargo = tituloFinal.length > TITULO_MAX;
  const faltaFecha = cuando === "despues" && !fecha;
  const minimo = aInputLocal(new Date(Date.now() + MINUTOS_MINIMOS * 60_000));

  async function enviar() {
    if (!canal || !marcaId) return;
    setError(null);
    try {
      await programar({
        variables: {
          input: {
            marcaId,
            red: "YOUTUBE",
            cuentaId: canal.canalId,
            expedienteId,
            formato: "SHORT",
            descripcion: descripcion.trim() || null,
            ajustes: {
              titulo: titulo.trim() || undefined,
              etiquetas: etiquetas
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean),
              visibilidad,
              paraNinos,
            },
            publicarEn: cuando === "despues" && fecha ? new Date(fecha) : null,
          },
        },
      });
      setTitulo("");
      setDescripcion("");
      setEtiquetas("");
      setFecha("");
      setCuando("ahora");
    } catch (e: any) {
      setError(e?.message ?? t("errorPublicar"));
    }
  }

  if (!canal || !marca) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-white/40">
        {t("sinCanal")}
        {previas.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
            {previas.map((p) => (
              <FilaPublicacion key={p._id} p={p} refetchQueries={refetchQueries} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs outline-none placeholder:text-white/25 focus:border-ng-azul/50";

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        {canales.length > 1 ? (
          <select
            value={canal.canalId}
            onChange={(e) => setCanalId(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs outline-none"
          >
            {canales.map((c) => (
              <option key={c.canalId} value={c.canalId}>
                {c.nombre}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-white/50">
            {t.rich("shortEn", {
              nombre: canal.nombre,
              n: (c) => <span className="font-medium text-white/80">{c}</span>,
            })}
          </p>
        )}
        {publicadas.length > 0 && (
          <span className="rounded bg-ng-teal/15 px-2 py-0.5 text-[10px] font-medium text-ng-teal">
            {t("publicadas", { n: publicadas.length })}
          </span>
        )}
      </div>

      <div>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={t("tituloPlaceholder")}
          className={input}
        />
        {tituloLargo && (
          <p className="mt-1 text-[10px] text-red-400">
            {t("tituloLargo", { largo: tituloFinal.length, max: TITULO_MAX })}
          </p>
        )}
      </div>

      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder={t("descripcionPlaceholder")}
        rows={2}
        className={input}
      />

      <input
        value={etiquetas}
        onChange={(e) => setEtiquetas(e.target.value)}
        placeholder={t("etiquetasPlaceholder")}
        className={input}
      />

      <div className="flex gap-1.5">
        {VISIBILIDADES.map((v) => (
          <Opcion
            key={v}
            activa={visibilidad === v}
            onClick={() => setVisibilidad(v)}
          >
            {t(`visibilidades.${v}`)}
          </Opcion>
        ))}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-white/60">
        <input
          type="checkbox"
          checked={paraNinos}
          onChange={(e) => setParaNinos(e.target.checked)}
        />
        {t("paraNinos")}
      </label>

      {publicadas.length > 0 && (
        <p className="text-[11px] text-yellow-400/80">
          {t("yaSubido")}
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
              {t("ayudaCola")}
            </p>
          </>
        )}
      </div>

      <button
        onClick={enviar}
        disabled={loading || faltaFecha || faltaTitulo || tituloLargo}
        title={faltaTitulo ? t("exigeTitulo") : undefined}
        className="w-full rounded-lg bg-[#FF0000] py-2.5 text-sm font-medium text-white transition hover:bg-[#FF0000]/90 disabled:opacity-50"
      >
        {loading
          ? cuando === "despues"
            ? t("agendando")
            : t("encolando")
          : cuando === "despues"
            ? t("programarEnYoutube")
            : t("subirAYoutube")}
      </button>

      {error && (
        <p className="break-words rounded-lg bg-red-500/10 p-2 text-[11px] text-red-400">
          {error}
        </p>
      )}

      {previas.length > 0 && (
        <div className="space-y-1.5 border-t border-white/10 pt-2.5">
          {previas.map((p) => (
            <FilaPublicacion key={p._id} p={p} refetchQueries={refetchQueries} />
          ))}
        </div>
      )}
    </div>
  );
}
