"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, type DocumentNode } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  CANCELAR_PUBLICACION,
  PROGRAMAR_PUBLICACION,
  PUBLICACIONES_DE_EXPEDIENTE,
  PUBLICACIONES_POR_COLA,
  REPROGRAMAR_PUBLICACION,
} from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { fechaCompleta, tiempoRelativo } from "@/lib/time";
import {
  EN_CURSO,
  type Publicacion,
  aInputLocal,
} from "@/lib/publicaciones";

type Formato = "REEL" | "HISTORIA_VIDEO" | "IMAGEN" | "HISTORIA_IMAGEN";

/** Etiqueta y detalle de cada uno salen de `publicarFacebook.formatos.<valor>`. */
const FORMATOS: Array<{
  valor: Formato;
  necesitaPoster?: boolean;
}> = [
  { valor: "REEL" },
  { valor: "HISTORIA_VIDEO" },
  { valor: "IMAGEN", necesitaPoster: true },
  { valor: "HISTORIA_IMAGEN", necesitaPoster: true },
];

/** Los formatos que se nombran en el historial (de todas las redes). */
const FORMATOS_FILA = ["REEL", "HISTORIA_VIDEO", "IMAGEN", "HISTORIA_IMAGEN", "VIDEO", "SHORT"] as const;
const esFormatoFila = (f: string): f is (typeof FORMATOS_FILA)[number] =>
  (FORMATOS_FILA as readonly string[]).includes(f);

/**
 * Los formatos que se pueden programar.
 *
 * Las historias no: expiran a las 24 horas. Meta no las agenda, y aunque con
 * la cola propia se podría, una historia programada a ciegas es una que vence
 * antes de que alguien la vea. El backend lo rechaza igual, con este mismo
 * motivo.
 */
const PROGRAMABLES: Formato[] = ["REEL", "IMAGEN"];

/**
 * Anticipación mínima. Si la hora la tiene Meta, exige unos minutos; si la
 * tiene nuestra cola, alcanza con que sea en el futuro (se deja uno de margen
 * para que no quede en el pasado mientras se aprieta el botón).
 */
const MINUTOS_MINIMOS_META = 15;
const MINUTOS_MINIMOS_COLA = 1;

/** Mientras algo se está subiendo o está por salir, la lista se refresca sola. */
const REFRESCO_MS = 5_000;

/**
 * Publica o programa un expediente en la página de Facebook de la marca activa.
 *
 * El destino es el contexto elegido en la barra lateral, no un selector aparte:
 * si querés otra página, cambiás de marca. Así no hay dos lugares donde
 * decidir lo mismo.
 *
 * Todo pasa por la cola de publicaciones (ng-creator-be#59). Si el backend
 * todavía le deja la hora a Meta (PUBLICACIONES_POR_COLA apagada), la respuesta
 * llega igual con la misma forma, así que acá solo cambian los textos.
 */
export function PublicarEnFacebook({
  expedienteId,
  marcaIdDelVideo,
  tienePoster,
}: {
  expedienteId: string;
  /** La marca del expediente: de ahí se leen sus publicaciones. */
  marcaIdDelVideo: string;
  tienePoster?: boolean;
}) {
  const t = useTranslations("publicarFacebook");
  const { activa: marca } = useMarcaActiva();
  const activa = marca?.paginaFacebook ?? null;
  const [formato, setFormato] = useState<Formato>("REEL");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: modo } = useQuery(PUBLICACIONES_POR_COLA, {
    errorPolicy: "all",
  });
  const porCola: boolean = modo?.publicacionesPorCola ?? false;

  const variables = { marcaId: marcaIdDelVideo, expedienteId };
  const { data, startPolling, stopPolling } = useQuery(
    PUBLICACIONES_DE_EXPEDIENTE,
    { variables, errorPolicy: "all" },
  );
  // Las de las otras redes tienen su propio recuadro (PublicarEnYoutube).
  const previas: Publicacion[] = (data?.publicacionesDeExpediente ?? []).filter(
    (p: Publicacion) => p.red === "FACEBOOK",
  );
  const refetchQueries = [{ query: PUBLICACIONES_DE_EXPEDIENTE, variables }];

  // Con la cola, publicar ya no espera a Meta dentro de la petición: vuelve al
  // instante y lo que pasa después se ve acá. Por eso se refresca mientras
  // haya algo en camino, y se deja de hacerlo cuando no.
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

  const publicadas = previas.filter((p) => p.estado === "PUBLICADA");
  const yaEnEsteFormato = publicadas.some((p) => p.formato === formato);

  const [cuando, setCuando] = useState<"ahora" | "despues">("ahora");
  const [fecha, setFecha] = useState("");
  const sePuedeProgramar = PROGRAMABLES.includes(formato);

  const minutosMinimos = porCola ? MINUTOS_MINIMOS_COLA : MINUTOS_MINIMOS_META;
  const minimo = aInputLocal(new Date(Date.now() + minutosMinimos * 60_000));
  const faltaFecha = cuando === "despues" && !fecha;

  async function enviar() {
    setError(null);
    try {
      await programar({
        variables: {
          input: {
            marcaId: marca!._id,
            red: "FACEBOOK",
            cuentaId: activa!.pageId,
            expedienteId,
            formato,
            descripcion: descripcion.trim() || null,
            // El input da hora local; `new Date` la convierte a un instante.
            // Mandar el instante evita razonar sobre zonas acá.
            publicarEn:
              cuando === "despues" && fecha ? new Date(fecha) : null,
          },
        },
      });
      setDescripcion("");
      setFecha("");
      setCuando("ahora");
    } catch (e: any) {
      setError(e?.message ?? t("errorPublicar"));
    }
  }

  if (!activa || !marca) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-3 text-xs text-white/40">
        {t("sinPagina")}
      </div>
    );
  }

  const textoBoton = loading
    ? cuando === "despues"
      ? t("agendando")
      : porCola
        ? t("encolando")
        : t("publicando")
    : cuando === "despues"
      ? t("programarEnFacebook")
      : t("publicarEnFacebook");

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">
          {t.rich("publicarEn", {
            nombre: activa.nombre,
            n: (c) => <span className="font-medium text-white/80">{c}</span>,
          })}
        </p>
        {publicadas.length > 0 && (
          <span className="rounded bg-ng-teal/15 px-2 py-0.5 text-[10px] font-medium text-ng-teal">
            {t("publicadas", { n: publicadas.length })}
          </span>
        )}
      </div>

      {/* Formato */}
      <div className="grid grid-cols-2 gap-2">
        {FORMATOS.map((f) => {
          const bloqueado = f.necesitaPoster && !tienePoster;
          const seleccionado = formato === f.valor;
          return (
            <button
              key={f.valor}
              onClick={() => !bloqueado && setFormato(f.valor)}
              disabled={bloqueado}
              title={
                bloqueado
                  ? t("sinPoster")
                  : t(`formatos.${f.valor}.detalle`)
              }
              className={`rounded-lg border px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                seleccionado
                  ? "border-ng-azul/50 bg-ng-teal/10"
                  : "border-white/10 hover:bg-white/5"
              }`}
            >
              <span
                className={`block text-xs font-medium ${
                  seleccionado ? "text-ng-teal" : "text-white/80"
                }`}
              >
                {t(`formatos.${f.valor}.etiqueta`)}
              </span>
              <span className="block text-[10px] text-white/35">{t(`formatos.${f.valor}.detalle`)}</span>
            </button>
          );
        })}
      </div>

      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder={t("descripcionPlaceholder")}
        rows={2}
        className="w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs outline-none placeholder:text-white/25 focus:border-ng-azul/50"
      />

      {yaEnEsteFormato && (
        <p className="text-[11px] text-yellow-400/80">
          {t("yaEnEsteFormato")}
        </p>
      )}

      {sePuedeProgramar ? (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <Opcion activa={cuando === "ahora"} onClick={() => setCuando("ahora")}>
              {t("ahora")}
            </Opcion>
            <Opcion
              activa={cuando === "despues"}
              onClick={() => setCuando("despues")}
            >
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
              {/* Quién tiene la hora cambia lo que hay que esperar de esto, y
                  no se puede prometer lo mismo en los dos casos. */}
              <p className="text-[10px] text-white/30">
                {porCola
                  ? t("ayudaCola")
                  : t("ayudaMeta", { min: MINUTOS_MINIMOS_META })}
              </p>
            </>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-white/30">
          {t("historiasNo")}
        </p>
      )}

      <button
        onClick={enviar}
        disabled={loading || faltaFecha}
        className="w-full rounded-lg bg-[#1877F2] py-2.5 text-sm font-medium text-white transition hover:bg-[#1877F2]/90 disabled:opacity-50"
      >
        {textoBoton}
      </button>

      {error && (
        <p className="break-words rounded-lg bg-red-500/10 p-2 text-[11px] text-red-400">
          {error}
        </p>
      )}

      {/* Historial: los intentos fallidos también, que es donde se diagnostica */}
      {previas.length > 0 && (
        <div className="space-y-1.5 border-t border-white/10 pt-2.5">
          {previas.map((p) => (
            <FilaPublicacion
              key={p._id}
              p={p}
              refetchQueries={refetchQueries}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const ICONO: Record<string, string> = {
  PUBLICADA: "✓",
  FALLIDA: "✗",
  CANCELADA: "–",
  PROGRAMADA: "🕒",
  AGENDADA_EN_RED: "🕒",
};

const COLOR: Record<string, string> = {
  PUBLICADA: "text-ng-teal",
  FALLIDA: "text-red-400",
  CANCELADA: "text-white/30",
};

/**
 * Una publicación del historial, con lo que se puede hacer con ella.
 *
 * Cancelar y cambiar la hora solo aparecen en lo PROGRAMADA de nuestra cola.
 * Lo agendado en Meta (AGENDADA_EN_RED) sale solo y no se toca desde acá: el
 * backend lo rechazaría, así que no se ofrece.
 */
export function FilaPublicacion({
  p,
  refetchQueries,
}: {
  p: Publicacion;
  refetchQueries: Array<{ query: DocumentNode; variables: Record<string, string> }>;
}) {
  const t = useTranslations("publicarFacebook");
  const locale = useLocale();
  const [moviendo, setMoviendo] = useState(false);
  const [nuevaHora, setNuevaHora] = useState(() =>
    aInputLocal(new Date(p.publicarEn)),
  );
  const [error, setError] = useState<string | null>(null);

  const [cancelar, { loading: cancelando }] = useMutation(
    CANCELAR_PUBLICACION,
    { refetchQueries },
  );
  const [reprogramar, { loading: guardando }] = useMutation(
    REPROGRAMAR_PUBLICACION,
    { refetchQueries },
  );

  const programada = p.estado === "PROGRAMADA";
  const esperando = programada || p.estado === "AGENDADA_EN_RED";
  // Una PROGRAMADA con error es una que falló por algo pasajero y espera su
  // reintento: se muestra como aviso, no como fallo.
  const reintentando = programada && p.intentos > 0 && !!p.error;

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      setMoviendo(false);
    } catch (e: any) {
      setError(e?.message ?? t("fila.noSePudo"));
    }
  }

  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className={COLOR[p.estado] ?? "text-yellow-400"}>
        {ICONO[p.estado] ?? "⋯"}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-white/60">
          {esFormatoFila(p.formato)
            ? t(`fila.formatos.${p.formato}`)
            : p.formato.replace("_", " ").toLowerCase()}
        </span>
        {esperando && (
          <span
            className="ml-1.5 text-indigo-300/80"
            title={fechaCompleta(p.publicarEn, locale)}
          >
            {t("fila.sale", { cuando: tiempoRelativo(p.publicarEn, Date.now(), locale) })}
            {p.estado === "AGENDADA_EN_RED" && t("fila.agendadaEnFacebook")}
          </span>
        )}
        {p.estado === "SUBIENDO" && (
          <span className="ml-1.5 text-yellow-400/80">{t("fila.subiendo")}</span>
        )}
        {p.estado === "PROCESANDO" && (
          <span className="ml-1.5 text-yellow-400/80">{t("fila.publicando")}</span>
        )}
        {p.estado === "CANCELADA" && (
          <span className="ml-1.5 text-white/30">
            {p.canceladoPor?.nombre
              ? t("fila.canceladaPor", { nombre: p.canceladoPor.nombre })
              : t("fila.cancelada")}
          </span>
        )}
        {p.publicadaEn && (
          <span
            className="ml-1.5 text-white/30"
            title={fechaCompleta(p.publicadaEn, locale)}
          >
            {tiempoRelativo(p.publicadaEn, Date.now(), locale)}
          </span>
        )}
        {/* Quién la mandó. Sin autor no se escribe nada: las
            publicaciones anteriores al registro no lo tienen. */}
        {p.creadoPor?.nombre && (
          <span className="ml-1.5 text-white/30">
            {t.rich("fila.por", {
              nombre: p.creadoPor.nombre,
              n: (c) => <span className="text-white/50">{c}</span>,
            })}
          </span>
        )}
        {p.error && (
          <span
            className={`block break-words ${
              reintentando ? "text-amber-400/70" : "text-red-400/70"
            }`}
          >
            {p.error}
          </span>
        )}
        {/* Solo se avisa cuando la portada NO se pudo poner: que salga
            bien es lo esperado y no merece una linea en cada fila. */}
        {p.portadaAplicada === false && (
          <span
            className="block break-words text-amber-400/70"
            title={p.portadaError ?? undefined}
          >
            {t("fila.portadaDeMeta")}
          </span>
        )}

        {programada && !moviendo && (
          <span className="mt-1 flex gap-3">
            <button
              onClick={() => setMoviendo(true)}
              className="text-white/50 underline-offset-2 hover:text-white hover:underline"
            >
              {t("fila.cambiarHora")}
            </button>
            <button
              disabled={cancelando}
              onClick={() =>
                accion(() =>
                  cancelar({ variables: { marcaId: p.marcaId, id: p._id } }),
                )
              }
              className="text-red-400/70 underline-offset-2 hover:text-red-400 hover:underline disabled:opacity-50"
            >
              {cancelando ? t("fila.cancelando") : t("fila.cancelar")}
            </button>
          </span>
        )}
        {programada && moviendo && (
          <span className="mt-1 flex items-center gap-2">
            <input
              type="datetime-local"
              value={nuevaHora}
              min={aInputLocal(new Date(Date.now() + MINUTOS_MINIMOS_COLA * 60_000))}
              onChange={(e) => setNuevaHora(e.target.value)}
              className="rounded border border-white/10 bg-black/40 px-1.5 py-1 text-[11px] outline-none focus:border-ng-azul/50"
            />
            <button
              disabled={guardando || !nuevaHora}
              onClick={() =>
                accion(() =>
                  reprogramar({
                    variables: {
                      marcaId: p.marcaId,
                      id: p._id,
                      publicarEn: new Date(nuevaHora),
                    },
                  }),
                )
              }
              className="text-ng-teal hover:underline disabled:opacity-50"
            >
              {guardando ? t("fila.guardando") : t("fila.guardar")}
            </button>
            <button
              onClick={() => setMoviendo(false)}
              className="text-white/40 hover:text-white"
            >
              {t("fila.volver")}
            </button>
          </span>
        )}
        {error && (
          <span className="block break-words text-red-400">{error}</span>
        )}
      </div>
      {p.permalink && (
        <a
          href={p.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-ng-teal hover:underline"
        >
          {t("fila.ver")}
        </a>
      )}
    </div>
  );
}

export function Opcion({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
        activa
          ? "bg-white/15 text-white"
          : "border border-white/10 text-white/50 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
