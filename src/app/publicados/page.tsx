"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client";
import { FORMATOS_PUBLICADOS, PUBLICATIONS } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { colorDePagina, usePaginaActiva } from "@/lib/pagina-activa";
import { fechaCompleta, tiempoRelativo } from "@/lib/time";

interface Publication {
  _id: string;
  expedienteId: string;
  expedienteNum: number;
  pageId: string;
  publicadoEn?: string;
  videoFinalUrl?: string;
  posterUrl?: string;
}

type Pestana = "pendientes" | "publicados" | "todos";

const ETIQUETA_FORMATO: Record<string, string> = {
  REEL: "Reel",
  HISTORIA_VIDEO: "Historia",
  IMAGEN: "Imagen",
  HISTORIA_IMAGEN: "Historia img",
};

/**
 * Los videos aprobados de la página activa.
 *
 * Es una pantalla para ELEGIR cuál abrir, no para trabajar: la portada y la
 * publicación viven en el detalle de cada uno. Por eso las tarjetas son chicas
 * y muestran solo la portada, el número y si ya salió.
 *
 * Se filtra por la página activa aunque el backend devuelva las de todas las
 * páginas accesibles. Además de ser coherente con el resto de la aplicación,
 * evita un problema real: publicar manda SIEMPRE a la página activa, así que
 * una tarjeta de otra página era una forma silenciosa de sacar el video en el
 * lugar equivocado.
 */
export default function PublicadosPage() {
  const { data, loading } = useQuery(PUBLICATIONS);
  const { data: estadoData } = useQuery(FORMATOS_PUBLICADOS, {
    errorPolicy: "all",
  });
  const { activa, cargando: cargandoPagina } = usePaginaActiva();
  const [pestana, setPestana] = useState<Pestana>("pendientes");

  /** expedienteId -> formatos en los que ya salió. */
  const publicados = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const f of estadoData?.formatosPublicados ?? []) {
      mapa.set(f.expedienteId, f.formatos);
    }
    return mapa;
  }, [estadoData]);

  const todas: Publication[] = data?.publications ?? [];
  const deLaPagina = activa
    ? todas.filter((p) => p.pageId === activa.pageId)
    : [];
  const enOtrasPaginas = todas.length - deLaPagina.length;

  const pendientes = deLaPagina.filter((p) => !publicados.has(p.expedienteId));
  const yaSalieron = deLaPagina.filter((p) => publicados.has(p.expedienteId));

  const visibles =
    pestana === "pendientes"
      ? pendientes
      : pestana === "publicados"
        ? yaSalieron
        : deLaPagina;

  if (!cargandoPagina && !activa) {
    return (
      <DashboardLayout>
        <Vacio
          icono="🔗"
          titulo="No hay ninguna página activa"
          detalle="Los videos se organizan por página. Elegí una en el switch de la izquierda."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Videos aprobados</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/50">
          <span>en</span>
          {activa && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/80">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorDePagina(activa.pageId) }}
              />
              {activa.nombre}
            </span>
          )}
          {enOtrasPaginas > 0 && (
            <span className="text-xs text-white/30">
              · {enOtrasPaginas} en tus otras páginas
            </span>
          )}
        </p>
      </div>

      {/* Separar lo que falta sacar de lo que ya salió es la división que
          importa: la pregunta al entrar es "¿qué me queda por publicar?", y
          mezclado eso se responde revisando tarjeta por tarjeta. */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Tab
          activa={pestana === "pendientes"}
          onClick={() => setPestana("pendientes")}
        >
          Sin publicar
          <Contador n={pendientes.length} />
        </Tab>
        <Tab
          activa={pestana === "publicados"}
          onClick={() => setPestana("publicados")}
        >
          Ya publicados
          <Contador n={yaSalieron.length} />
        </Tab>
        <Tab activa={pestana === "todos"} onClick={() => setPestana("todos")}>
          Todos
          <Contador n={deLaPagina.length} />
        </Tab>
      </div>

      {loading ? (
        <Grilla>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-[9/16] animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </Grilla>
      ) : visibles.length > 0 ? (
        <Grilla>
          {visibles.map((pub) => (
            <Link
              key={pub._id}
              href={`/publicados/${pub.expedienteId}`}
              className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-[#0FED9D]/40"
            >
              <div className="relative bg-black">
                {/* La portada como imagen y no un <video>: la grilla no
                    reproduce nada, así no se descarga un byte de video. */}
                {pub.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pub.posterUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-[9/16] w-full object-cover transition group-hover:opacity-80"
                  />
                ) : (
                  <div className="flex aspect-[9/16] items-center justify-center text-xs text-white/25">
                    Sin portada
                  </div>
                )}

                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-[#0FED9D]">
                  #{pub.expedienteNum}
                </span>

                {publicados.has(pub.expedienteId) && (
                  <span className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1">
                    {publicados.get(pub.expedienteId)!.map((f) => (
                      <span
                        key={f}
                        className="rounded bg-[#0FED9D] px-1.5 py-0.5 text-[10px] font-semibold text-black"
                      >
                        {ETIQUETA_FORMATO[f] ?? f}
                      </span>
                    ))}
                  </span>
                )}
              </div>

              <div className="px-2 py-1.5 text-[11px] text-white/35">
                {pub.publicadoEn ? (
                  <span title={fechaCompleta(pub.publicadoEn)}>
                    {tiempoRelativo(pub.publicadoEn)}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </div>
            </Link>
          ))}
        </Grilla>
      ) : (
        <Vacio
          icono={pestana === "publicados" ? "📺" : "✅"}
          titulo={
            pestana === "publicados"
              ? "Todavía no publicaste ninguno"
              : pestana === "pendientes"
                ? "No te queda nada por publicar"
                : `Todavía no hay videos aprobados en ${activa?.nombre ?? "esta página"}`
          }
          detalle={
            pestana === "pendientes" && deLaPagina.length > 0
              ? "Todos los videos aprobados ya salieron a Facebook."
              : "Los videos aparecen acá cuando se aprueban en la cola de revisión."
          }
        />
      )}
    </DashboardLayout>
  );
}

/** Grilla densa: la tarjeta es para reconocer un video, no para mirarlo. */
function Grilla({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {children}
    </div>
  );
}

function Tab({
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
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        activa
          ? "bg-[#0FED9D] text-black"
          : "border border-white/10 text-white/60 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function Contador({ n }: { n: number }) {
  return (
    <span className="rounded bg-black/20 px-1.5 text-[11px] font-semibold">
      {n}
    </span>
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
      <div className="mb-3 text-4xl opacity-30">{icono}</div>
      <p className="font-medium text-white/70">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/40">{detalle}</p>
    </div>
  );
}
