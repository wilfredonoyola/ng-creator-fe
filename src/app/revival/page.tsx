"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  CAMBIAR_ESTADO_POST,
  CONTEO_POR_ESTADO,
  ESTADO_POR_ANIO,
  HISTORIAL_DE_PAGINA,
  REFRESCAR_PROGRAMADAS,
  RESUMEN_HISTORIAL,
  SINCRONIZAR_ANIO,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  TarjetaRevival,
  type EstadoRevival,
  type PostRevival,
} from "@/components/TarjetaRevival";
import { PanelRevival } from "@/components/PanelRevival";
import { useMarcaActiva } from "@/lib/marca-activa";

type Orden = "SCORE" | "FECHA";

interface EstadoAnio {
  anio: number;
  posts: number;
  sincronizadoEn?: string | null;
  completo: boolean;
}

interface ConteoEstado {
  estado: EstadoRevival;
  total: number;
}

/** Orden de las pestañas: sigue el recorrido del flujo, no el alfabético. */
const ORDEN_ESTADOS: EstadoRevival[] = [
  "NUEVO",
  "PARA_TRABAJAR",
  "EN_TRABAJO",
  "EN_REVISION",
  "PROGRAMADO",
  "PUBLICADO",
  "DESCARTADO",
];

/**
 * Historial de la fan page: ranking, triage y galería.
 *
 * El ranking dice qué funcionó; la galería deja verlo de verdad y marcar qué
 * merece reciclarse. Sobre cientos de publicaciones, sin estado por post no hay
 * forma de saber qué ya se evaluó.
 */
export default function RevivalPage() {
  const t = useTranslations("revival");
  const tEstado = useTranslations("revivalTarjeta");
  const locale = useLocale();
  const { activa } = useMarcaActiva();
  const [orden, setOrden] = useState<Orden>("SCORE");
  const [anioFiltro, setAnioFiltro] = useState<number | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoRevival | null>(null);
  const [soloSinHistoria, setSoloSinHistoria] = useState(false);
  const [aniosAbierto, setAniosAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sincronizandoAnio, setSincronizandoAnio] = useState<number | null>(null);
  const [postOcupado, setPostOcupado] = useState<string | null>(null);
  const [postAbierto, setPostAbierto] = useState<string | null>(null);

  // El historial es de la pagina de Facebook de la marca, no de la marca.
  const pageId = activa?.paginaFacebook?.pageId;

  const { data, loading, refetch } = useQuery(HISTORIAL_DE_PAGINA, {
    variables: {
      pageId,
      orden,
      limite: 120,
      anio: anioFiltro,
      estado: soloSinHistoria ? null : estadoFiltro,
      sinHistoria: soloSinHistoria || null,
    },
    skip: !pageId,
  });

  const { data: dataAnios, refetch: refetchAnios } = useQuery(ESTADO_POR_ANIO, {
    variables: { pageId },
    skip: !pageId,
  });

  const { data: dataConteo, refetch: refetchConteo } = useQuery(
    CONTEO_POR_ESTADO,
    { variables: { pageId }, skip: !pageId },
  );

  const { data: dataResumen, refetch: refetchResumen } = useQuery(
    RESUMEN_HISTORIAL,
    { variables: { pageId }, skip: !pageId },
  );

  const [sincronizar] = useMutation(SINCRONIZAR_ANIO, {
    onCompleted: (res) => {
      const r = res.sincronizarAnio;
      setSincronizandoAnio(null);
      setAviso(t(r.completo ? "sincronizado" : "incompleto", { anio: r.anio, n: r.posts }));
      refetch();
      refetchAnios();
      refetchConteo();
      refetchResumen();
    },
    onError: (err) => {
      setSincronizandoAnio(null);
      setAviso(t("error", { mensaje: err.message }));
    },
  });

  const [cambiarEstado] = useMutation(CAMBIAR_ESTADO_POST, {
    onCompleted: () => {
      setPostOcupado(null);
      refetch();
      refetchConteo();
    },
    onError: (err) => {
      setPostOcupado(null);
      setAviso(t("error", { mensaje: err.message }));
    },
  });

  // Meta no avisa cuando publica algo agendado. Se le pregunta al abrir la
  // seccion: el desfase es solo de la etiqueta, el post sale igual, asi que no
  // hace falta un cron vigilando.
  const [refrescarProgramadas] = useMutation(REFRESCAR_PROGRAMADAS, {
    onCompleted: (res) => {
      if (res.refrescarProgramadas > 0) {
        setAviso(t("yaSalieron", { n: res.refrescarProgramadas }));
        refetch();
        refetchConteo();
      }
    },
    // Si falla no se muestra nada: es una puesta al día en segundo plano, no
    // algo que el usuario haya pedido.
    onError: () => {},
  });

  useEffect(() => {
    if (pageId) refrescarProgramadas({ variables: { pageId } });
  }, [pageId, refrescarProgramadas]);

  const posts: PostRevival[] = data?.historialDePagina ?? [];
  const anios: EstadoAnio[] = dataAnios?.estadoPorAnio ?? [];
  const conteos: ConteoEstado[] = dataConteo?.conteoPorEstado ?? [];
  const resumen = dataResumen?.resumenHistorial;

  const numero = (n: number) => n.toLocaleString(locale);
  const totalPosts = conteos.reduce((s, c) => s + c.total, 0);

  // Se abre sola mientras no haya nada traído: ahí sincronizar es la única
  // acción posible y esconderla dejaría la pantalla sin salida.
  const aniosSincronizados = anios.filter((a) => a.sincronizadoEn).length;
  const mostrarAnios = aniosAbierto || aniosSincronizados === 0;

  function moverPost(postId: string, estado: EstadoRevival) {
    setPostOcupado(postId);
    cambiarEstado({ variables: { postId, estado } });
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 text-white/50">
          {t("subtitulo", { pagina: activa ? activa.nombre : t("tuFanPage") })}
        </p>
        <p className="mt-1 text-xs text-white/30">
          {resumen?.total
            ? t("guardadas", { n: numero(resumen.total) })
            : t("ningunAnio")}
        </p>
      </div>

      {aviso && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {aviso}
        </div>
      )}

      {!pageId ? (
        <Vacio
          icono="🔗"
          titulo={t("sinPagina.titulo")}
          detalle={t("sinPagina.detalle")}
        />
      ) : (
        <>
          {/* Sincronización por año.
              Colapsada salvo que no haya nada sincronizado. Ocupaba el tramo
              más valioso de la pantalla con diez tarjetas, y es lo que menos se
              toca: una vez traído un año, no se vuelve hasta el mes siguiente.
              Cuando la página está vacía sí conviene abierta, porque ahí es la
              única acción posible. */}
          <div className="mb-6">
            <button
              onClick={() => setAniosAbierto(!aniosAbierto)}
              className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-left transition hover:bg-white/5"
            >
              <span className="text-xs uppercase tracking-wider text-white/40">
                {t("porAnio")}
              </span>
              <span className="text-xs text-white/25">
                {aniosSincronizados > 0
                  ? t("aniosDe", { n: aniosSincronizados, total: anios.length })
                  : t("sinSincronizar")}
              </span>
              <span
                className={`ml-auto text-[10px] text-white/30 transition-transform ${
                  mostrarAnios ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>
          </div>

          <div className={`mb-8 ${mostrarAnios ? "" : "hidden"}`}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {anios.map((a) => {
                const activo = sincronizandoAnio === a.anio;
                const seleccionado = anioFiltro === a.anio;
                return (
                  <div
                    key={a.anio}
                    className={`rounded-xl border p-3 transition ${
                      seleccionado
                        ? "border-ng-azul/50 bg-ng-teal/5"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() =>
                          setAnioFiltro(seleccionado ? null : a.anio)
                        }
                        disabled={!a.posts}
                        className="text-left text-lg font-bold disabled:cursor-default disabled:text-white/30"
                      >
                        {a.anio}
                      </button>
                      <button
                        onClick={() => {
                          setAviso(null);
                          setSincronizandoAnio(a.anio);
                          sincronizar({ variables: { pageId, anio: a.anio } });
                        }}
                        disabled={sincronizandoAnio !== null}
                        title={t("sincronizarAnio", { anio: a.anio })}
                        className="rounded-md px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-ng-celeste disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        {activo ? (
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ng-azul border-t-transparent" />
                        ) : (
                          "↻"
                        )}
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-white/50">
                      {a.posts ? t("posts", { n: numero(a.posts) }) : t("sinDatos")}
                    </p>
                    <p className="text-[10px] text-white/25">
                      {activo
                        ? t("trayendo")
                        : a.sincronizadoEn
                          ? new Date(a.sincronizadoEn).toLocaleDateString(locale, {
                              day: "numeric",
                              month: "short",
                            })
                          : t("nunca")}
                      {!a.completo && (
                        <span className="text-amber-400/70">{t("incompletoCorto")}</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {resumen && resumen.total > 0 && resumen.conMetricas === 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/80">
              {t.rich("sinInsights", { code: (c) => <code>{c}</code> })}
            </div>
          )}

          {/* Pestañas de estado */}
          {/* Siete pestañas envueltas ocupan tres filas en un teléfono. Se
              desplazan en horizontal, que es lo que se espera en móvil, y los
              márgenes negativos las dejan sangrar hasta el borde. */}
          <div className="mb-4 -mx-4 flex gap-1 overflow-x-auto border-b border-white/10 px-4 pb-2 sm:mx-0 sm:px-0">
            <Pestana
              activa={estadoFiltro === null}
              onClick={() => setEstadoFiltro(null)}
              texto={t("todos")}
              total={totalPosts}
            />
            {ORDEN_ESTADOS.map((e) => {
              const c = conteos.find((x) => x.estado === e);
              return (
                <Pestana
                  key={e}
                  activa={estadoFiltro === e}
                  onClick={() => setEstadoFiltro(e)}
                  texto={tEstado(`estados.${e}`)}
                  total={c?.total ?? 0}
                />
              );
            })}
          </div>

          {/* Orden y filtro de año */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["SCORE", "FECHA"] as const).map((valor) => (
              <button
                key={valor}
                onClick={() => setOrden(valor)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  orden === valor
                    ? "bg-ng-teal/10 text-ng-teal"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t(`ordenes.${valor}`)}
              </button>
            ))}

            {/* Lo publicado a lo que le falta la historia. Es la tarea que
                queda pendiente después de publicar y la más fácil de olvidar,
                porque la historia es una subida aparte. */}
            {resumen?.sinHistoria > 0 && (
              <button
                onClick={() => setSoloSinHistoria(!soloSinHistoria)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  soloSinHistoria
                    ? "bg-amber-500/20 text-amber-200"
                    : "text-amber-300/70 hover:bg-amber-500/10"
                }`}
              >
                {t("sinHistoria")}
                <span className="ml-1.5 opacity-70">{resumen.sinHistoria}</span>
              </button>
            )}

            {anioFiltro && (
              <button
                onClick={() => setAnioFiltro(null)}
                className="ml-auto rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10"
              >
                {t("quitarAnio", { anio: anioFiltro })}
              </button>
            )}
          </div>

          {/* Galería */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ng-azul border-t-transparent" />
            </div>
          ) : posts.length === 0 ? (
            <Vacio
              icono="♻️"
              titulo={
                totalPosts === 0
                  ? t("vacio.titulo")
                  : t("sinResultados.titulo")
              }
              detalle={
                totalPosts === 0
                  ? t("vacio.detalle")
                  : t("sinResultados.detalle")
              }
            />
          ) : (
            // Dos columnas ya en el teléfono. A una sola, cada tarjeta ocupa
            // media pantalla y revisar 120 publicaciones se vuelve un scroll
            // interminable: acá se viene a comparar y descartar rápido.
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {posts.map((p) => (
                <TarjetaRevival
                  key={p._id}
                  post={p}
                  ocupado={postOcupado === p.postId}
                  onCambiarEstado={moverPost}
                  onAbrirPanel={(x) => setPostAbierto(x.postId)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* El post se relee de la lista para que el panel refleje lo que devuelven
          las mutaciones sin tener que duplicar su estado aca. */}
      {postAbierto &&
        pageId &&
        (() => {
          const p = posts.find((x) => x.postId === postAbierto);
          return p ? (
            <PanelRevival
              post={p}
              pageId={pageId}
              onCerrar={() => setPostAbierto(null)}
              onCambio={() => {
                refetch();
                refetchConteo();
              }}
            />
          ) : null;
        })()}
    </DashboardLayout>
  );
}

function Pestana({
  activa,
  onClick,
  texto,
  total,
}: {
  activa: boolean;
  onClick: () => void;
  texto: string;
  total: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${
        activa
          ? "bg-ng-teal/10 text-ng-teal"
          : "text-white/45 hover:bg-white/5 hover:text-white"
      }`}
    >
      {texto}
      <span className="ml-1.5 text-[10px] opacity-60">{total}</span>
    </button>
  );
}

function Vacio({
  icono,
  titulo,
  detalle,
}: {
  icono: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
      <div className="mb-4 text-5xl opacity-30">{icono}</div>
      <p className="text-lg font-medium text-white/60">{titulo}</p>
      <p className="mt-1 text-sm text-white/40">{detalle}</p>
    </div>
  );
}
