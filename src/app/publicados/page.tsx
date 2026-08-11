"use client";

import { useQuery } from "@apollo/client";
import { PUBLICATIONS } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PublicarEnFacebook } from "@/components/PublicarEnFacebook";
import { ElegirPortada } from "@/components/ElegirPortada";
import { EstadoEnFacebook } from "@/components/EstadoEnFacebook";
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

/**
 * Los videos aprobados de la página activa, listos para salir a Facebook.
 *
 * Se filtra por la página activa y no se muestran todas juntas, aunque el
 * backend devuelva las de todas las páginas a las que se tiene acceso. Dos
 * razones: el resto de la aplicación trabaja siempre sobre un espacio de
 * trabajo, y sobre todo el panel de publicar manda SIEMPRE a la página activa,
 * asi que una tarjeta de otra página con un botón de publicar era una forma
 * silenciosa de sacar el video de una página en la otra.
 */
export default function PublicadosPage() {
  const { data, loading } = useQuery(PUBLICATIONS);
  const { activa, cargando: cargandoPagina } = usePaginaActiva();

  const todas: Publication[] = data?.publications ?? [];
  const publicaciones = activa
    ? todas.filter((p) => p.pageId === activa.pageId)
    : [];
  const enOtrasPaginas = todas.length - publicaciones.length;

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Listos para publicar</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/50">
          <span>
            {publicaciones.length} video
            {publicaciones.length !== 1 ? "s" : ""} aprobado
            {publicaciones.length !== 1 ? "s" : ""} en
          </span>
          {activa && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/80">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorDePagina(activa.pageId) }}
              />
              {activa.nombre}
            </span>
          )}
        </p>
        {/* Que existan videos en otras páginas es información útil: sin esto,
            alguien que espera ver uno concreto creería que se perdió. */}
        {enOtrasPaginas > 0 && (
          <p className="mt-1 text-xs text-white/30">
            Hay {enOtrasPaginas} más en tus otras páginas · cambiá de página
            para verlos
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-[9/16] animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      ) : publicaciones.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publicaciones.map((pub) => (
            <article
              key={pub._id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <div className="relative bg-black">
                {pub.videoFinalUrl ? (
                  // `poster` + `preload="none"`: la grilla muestra la portada
                  // elegida y no descarga un solo byte de video hasta que
                  // alguien le da play. Con decenas de tarjetas, precargar
                  // metadata de todas hacía que la pantalla tardara en asentarse.
                  <video
                    src={pub.videoFinalUrl}
                    poster={pub.posterUrl ?? undefined}
                    controls
                    preload="none"
                    className="aspect-[9/16] w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-[9/16] items-center justify-center text-sm text-white/30">
                    Sin video
                  </div>
                )}

                <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-[#0FED9D]">
                  #{pub.expedienteNum}
                </span>
                <span className="pointer-events-none absolute right-2 top-2">
                  <EstadoEnFacebook expedienteId={pub.expedienteId} />
                </span>
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between text-xs text-white/40">
                  {pub.publicadoEn ? (
                    <span title={fechaCompleta(pub.publicadoEn)}>
                      Aprobado {tiempoRelativo(pub.publicadoEn)}
                    </span>
                  ) : (
                    <span />
                  )}
                  {pub.videoFinalUrl && (
                    <a
                      href={pub.videoFinalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      title="Descargar el video"
                      className="rounded-lg px-2 py-1 transition hover:bg-white/10 hover:text-white"
                    >
                      ⬇
                    </a>
                  )}
                </div>

                {pub.videoFinalUrl && (
                  <ElegirPortada
                    expedienteId={pub.expedienteId}
                    videoUrl={pub.videoFinalUrl}
                    posterUrl={pub.posterUrl}
                  />
                )}

                <div className="mt-2">
                  <PublicarEnFacebook
                    expedienteId={pub.expedienteId}
                    tienePoster={!!pub.posterUrl}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Vacio
          icono="📺"
          titulo={`Todavía no hay videos aprobados en ${activa?.nombre ?? "esta página"}`}
          detalle="Los videos aparecen acá cuando se aprueban en la cola de revisión."
        />
      )}
    </DashboardLayout>
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
