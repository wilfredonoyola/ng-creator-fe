"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { EXPEDIENTE } from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PublicarEnFacebook } from "@/components/PublicarEnFacebook";
import { PublicarEnYoutube } from "@/components/PublicarEnYoutube";
import { PublicarEnTiktok } from "@/components/PublicarEnTiktok";
import { ElegirPortada } from "@/components/ElegirPortada";
import { EstadoEnFacebook } from "@/components/EstadoEnFacebook";
import { SelloDeAutoria } from "@/components/SelloDeAutoria";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import { metaPropiaApagada, useProveedores } from "@/lib/upload-post";

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
  const t = useTranslations("publicadosDetalle");
  const { id } = params;
  const { activa, marcas } = useMarcaActiva();
  const sinMetaPropia = metaPropiaApagada(useProveedores());

  const { data, loading } = useQuery(EXPEDIENTE, {
    variables: { id },
    errorPolicy: "all",
  });
  const exp = data?.expediente;

  const marcaDelVideo = marcas.find((m) => m._id === exp?.marcaId);
  const nombrePagina = marcaDelVideo?.nombre ?? exp?.marcaId;

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
          <p className="font-medium text-white/70">{t("noEncontrado")}</p>
          <p className="mt-1 text-sm text-white/40">
            {t("sinAcceso")}
          </p>
          <Link
            href="/publicados"
            className="mt-4 inline-block text-sm text-ng-teal hover:underline"
          >
            {t("volverLista")}
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Publicar manda siempre a la marca activa. Si el video es de otra, avisar
  // antes de que alguien saque el video de una marca en la otra sin notarlo.
  // (El backend además lo rechaza desde #58.)
  const enOtraPagina = !!activa && exp.marcaId !== activa._id;

  return (
    <DashboardLayout>
      <Link
        href="/publicados"
        className="mb-4 inline-block text-sm text-white/40 transition hover:text-white"
      >
        {t("listos")}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {exp.numero ? t("expediente", { numero: exp.numero }) : t("sinNumerar")}
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-sm text-white/70">
          <span
            className="h-2 w-2 rounded-full bg-white/30"
            style={
              marcaDelVideo
                ? { backgroundColor: colorDeMarca(marcaDelVideo) }
                : undefined
            }
          />
          {nombrePagina}
        </span>
        <EstadoEnFacebook expedienteId={exp._id} marcaIdDelVideo={exp.marcaId} />
      </div>

      {enOtraPagina && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-300">
            {t("otraPagina", { pagina: nombrePagina ?? "", activa: activa?.nombre ?? "" })}
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
              {t("sinVideo")}
            </div>
          )}

          <div className="mt-3 space-y-1 text-xs text-white/40">
            <p>{exp.tipoDeValor}</p>
            {exp.regeneraciones > 0 && (
              <p>{t("regeneraciones", { n: exp.regeneraciones })}</p>
            )}
            <SelloDeAutoria accion={t("sello.creado")} autoria={exp.creadoPor} />
            <SelloDeAutoria accion={t("sello.aprobado")} autoria={exp.revisadoPor} />
          </div>

          {exp.videoFinalUrl && (
            <a
              href={exp.videoFinalUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="mt-3 block rounded-lg border border-white/10 py-2 text-center text-sm text-white/60 transition hover:bg-white/5"
            >
              {t("descargar")}
            </a>
          )}
        </div>

        <div className="space-y-4">
          <Seccion
            titulo={t("portada.titulo")}
            detalle={t("portada.detalle")}
          >
            {exp.videoFinalUrl ? (
              <ElegirPortada
                expedienteId={exp._id}
                videoUrl={exp.videoFinalUrl}
                posterUrl={exp.posterUrl}
              />
            ) : (
              <p className="text-sm text-white/40">
                {t("portada.sinVideo")}
              </p>
            )}
          </Seccion>

          <Seccion
            titulo={t("facebook.titulo")}
            detalle={
              sinMetaPropia
                ? undefined
                : activa
                  ? t("facebook.destino", { pagina: activa.nombre })
                  : t("facebook.elegi")
            }
          >
            <PublicarEnFacebook
              expedienteId={exp._id}
              marcaIdDelVideo={exp.marcaId}
              tienePoster={!!exp.posterUrl}
            />
          </Seccion>

          <Seccion
            titulo={t("youtube.titulo")}
            detalle={t("youtube.detalle")}
          >
            <PublicarEnYoutube
              expedienteId={exp._id}
              marcaIdDelVideo={exp.marcaId}
            />
          </Seccion>

          <Seccion
            titulo={t("tiktok.titulo")}
            detalle={t("tiktok.detalle")}
          >
            <PublicarEnTiktok
              expedienteId={exp._id}
              marcaIdDelVideo={exp.marcaId}
              videoUrl={exp.videoFinalUrl}
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
