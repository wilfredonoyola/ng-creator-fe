"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { EXPEDIENTE } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PublicarEnFacebook } from "@/components/PublicarEnFacebook";
import { ElegirPortada } from "@/components/ElegirPortada";
import { EstadoEnFacebook } from "@/components/EstadoEnFacebook";
import { SelloDeAutoria } from "@/components/SelloDeAutoria";
import { colorDePagina, usePaginaActiva } from "@/lib/pagina-activa";

/**
 * Un video y todo lo que hay que decidir antes de sacarlo.
 *
 * Vive en su propia ruta y no en un modal: publicar lleva su tiempo, y una URL
 * propia sobrevive a recargar la página, se puede compartir con quien tenga que
 * mirarlo, y el botón de volver del navegador funciona como se espera.
 *
 * La grilla queda para elegir; acá se trabaja. Antes cada tarjeta arrastraba el
 * video, la portada y el panel de publicar uno debajo del otro, así que en tres
 * columnas era una tira ilegible y no se podía comparar nada.
 */
export default function DetalleVideoPage({
  params,
}: {
  // Objeto plano, no promesa: en Next 14 los params llegan resueltos. Envolverlos
  // con `use()` —que es la forma de Next 15— hace que la pagina reviente en el
  // navegador con un error generico de cliente.
  params: { id: string };
}) {
  const { id } = params;
  const { activa, paginas } = usePaginaActiva();

  const { data, loading } = useQuery(EXPEDIENTE, {
    variables: { id },
    errorPolicy: "all",
  });
  const exp = data?.expediente;

  const nombrePagina =
    paginas.find((p) => p.pageId === exp?.pageId)?.nombre ?? exp?.pageId;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </DashboardLayout>
    );
  }

  if (!exp) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="mb-3 text-4xl opacity-30">🔍</div>
          <p className="font-medium text-white/70">No encontramos ese video</p>
          <p className="mt-1 text-sm text-white/40">
            Puede ser de una página a la que no tenés acceso.
          </p>
          <Link
            href="/publicados"
            className="mt-4 inline-block text-sm text-[#0FED9D] hover:underline"
          >
            ← Volver a la lista
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Publicar manda siempre a la página activa. Si el video es de otra, avisar
  // antes de que alguien saque el video de una página en la otra sin notarlo.
  const enOtraPagina = !!activa && exp.pageId !== activa.pageId;

  return (
    <DashboardLayout>
      <Link
        href="/publicados"
        className="mb-4 inline-block text-sm text-white/40 transition hover:text-white"
      >
        ← Listos para publicar
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {exp.numero ? `Expediente #${exp.numero}` : "Sin numerar"}
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-sm text-white/70">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: colorDePagina(exp.pageId) }}
          />
          {nombrePagina}
        </span>
        <EstadoEnFacebook expedienteId={exp._id} />
      </div>

      {enOtraPagina && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-300">
            Este video es de {nombrePagina}, pero estás trabajando en{" "}
            {activa?.nombre}. Si publicás ahora, va a salir en{" "}
            {activa?.nombre}.
          </p>
        </div>
      )}

      {/* Dos columnas en pantalla grande: el video queda a la vista mientras se
          decide la portada y el destino, que es lo que uno mira al decidir. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div>
          {exp.videoFinalUrl ? (
            <video
              src={exp.videoFinalUrl}
              poster={exp.posterUrl ?? undefined}
              controls
              preload="none"
              className="w-full rounded-2xl bg-black"
            />
          ) : (
            <div className="flex aspect-[9/16] items-center justify-center rounded-2xl bg-black/50 text-sm text-white/30">
              Sin video
            </div>
          )}

          <div className="mt-3 space-y-1 text-xs text-white/40">
            <p>{exp.tipoDeValor}</p>
            {exp.regeneraciones > 0 && (
              <p>{exp.regeneraciones} regeneración(es)</p>
            )}
            <SelloDeAutoria accion="creado" autoria={exp.creadoPor} />
            <SelloDeAutoria accion="aprobado" autoria={exp.revisadoPor} />
          </div>

          {exp.videoFinalUrl && (
            <a
              href={exp.videoFinalUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="mt-3 block rounded-lg border border-white/10 py-2 text-center text-sm text-white/60 transition hover:bg-white/5"
            >
              ⬇ Descargar el video
            </a>
          )}
        </div>

        <div className="space-y-4">
          <Seccion
            titulo="Portada"
            detalle="Es la cubierta del Reel y lo que sale si publicás como imagen."
          >
            {exp.videoFinalUrl ? (
              <ElegirPortada
                expedienteId={exp._id}
                videoUrl={exp.videoFinalUrl}
                posterUrl={exp.posterUrl}
              />
            ) : (
              <p className="text-sm text-white/40">
                Sin video no hay de dónde sacar la portada.
              </p>
            )}
          </Seccion>

          <Seccion
            titulo="Publicar en Facebook"
            detalle={
              activa
                ? `El destino es ${activa.nombre}, la página activa.`
                : "Elegí una página activa para publicar."
            }
          >
            <PublicarEnFacebook
              expedienteId={exp._id}
              tienePoster={!!exp.posterUrl}
            />
          </Seccion>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Seccion({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {detalle && <p className="mt-0.5 text-xs text-white/35">{detalle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
