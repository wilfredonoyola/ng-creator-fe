"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { Hash, ListChecks, Clapperboard, SlidersHorizontal } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MenuSecciones, useSeccionHash } from "@/components/MenuSecciones";
import { AjustesPublicacionMarca } from "@/components/AjustesPublicacionMarca";
import { AjustesRevisionMarca } from "@/components/revision/AjustesRevisionMarca";
import { SeccionNumeracion } from "@/components/SeccionNumeracion";
import { Interruptor } from "@/components/Interruptor";
import { MIEMBROS_DE_PAGINA } from "@/graphql/operations";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { useFuncion } from "@/lib/funciones";

/**
 * Lo que se prende y se apaga en la marca, en un solo lugar y con el menú de
 * Brand Kit: lo que se precarga al publicar, la revisión antes de publicar,
 * la numeración y (para el admin) las funciones del menú. Cada sección se
 * guarda con su botón, como antes; acá solo se juntaron.
 */
const SECCIONES = [
  { id: "por-defecto", grupo: "publicacion", icono: SlidersHorizontal },
  { id: "revision", grupo: "publicacion", icono: ListChecks },
  { id: "numeracion", grupo: "publicacion", icono: Hash },
  { id: "funciones", grupo: "funciones", icono: Clapperboard },
] as const;
type IdSeccion = (typeof SECCIONES)[number]["id"];
const IDS = SECCIONES.map((x) => x.id);

export default function AjustesPage() {
  const t = useTranslations("ajustesMarca");
  const router = useRouter();
  const { activa } = useMarcaActiva();
  const { esAdmin, puedeOperar } = useSesion();
  const marcaId = activa?._id;
  const [seccion, elegir] = useSeccionHash<IdSeccion>(IDS, "por-defecto");
  const [videosReaccion, setVideosReaccion] = useFuncion("videosReaccion");
  const miembrosQ = useQuery(MIEMBROS_DE_PAGINA, { variables: { marcaId }, skip: !marcaId, errorPolicy: "all" });

  if (!activa || !marcaId) {
    return (
      <DashboardLayout>
        <p className="text-sm text-white/50">{t("sinMarca")}</p>
      </DashboardLayout>
    );
  }

  // Funciones es del admin: el resto no ve esa sección.
  const visibles = SECCIONES.filter((x) => x.grupo !== "funciones" || esAdmin);
  const actual = visibles.some((x) => x.id === seccion) ? seccion : "por-defecto";

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-white/50">
          <span>{t("deLaMarca")}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-sm text-white/80">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorDeMarca(activa) }} />
            {activa.nombre}
          </span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <MenuSecciones
          secciones={visibles.map((x) => ({ ...x, etiqueta: t(`nav.${x.id}`) }))}
          grupos={[
            { id: "publicacion", etiqueta: t("nav.grupos.publicacion") },
            { id: "funciones", etiqueta: t("nav.grupos.funciones") },
          ]}
          actual={actual}
          onElegir={elegir}
          titulo={t("nav.titulo")}
        />

        {/* Todas quedan montadas: cambiar de sección no pierde lo que se estaba editando. */}
        <div className="min-w-0 max-w-3xl [&_section]:mb-0">
          <div hidden={actual !== "por-defecto"}>
            <AjustesPublicacionMarca />
          </div>
          <div hidden={actual !== "revision"}>
            <AjustesRevisionMarca
              miembros={miembrosQ.loading ? null : (miembrosQ.data?.miembrosDePagina ?? [])}
              verEquipo={() => router.push("/admin/equipo#equipo-con-acceso")}
            />
          </div>
          <div hidden={actual !== "numeracion"}>
            <SeccionNumeracion marcaId={marcaId} opera={puedeOperar(marcaId)} />
          </div>
          {esAdmin && (
            <div hidden={actual !== "funciones"}>
              <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="font-semibold">{t("funciones.titulo")}</h2>
                <p className="mt-0.5 text-xs text-white/45">{t("funciones.ayuda")}</p>
                <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t("funciones.videosReaccion")}</p>
                    <p className="mt-0.5 text-xs text-white/45">{t("funciones.videosReaccionAyuda")}</p>
                  </div>
                  <Interruptor
                    valor={videosReaccion}
                    onCambio={setVideosReaccion}
                    etiqueta={videosReaccion ? t("funciones.visible") : t("funciones.oculta")}
                  />
                </div>
                <p className="mt-3 text-xs text-white/35">{t("funciones.soloEsteNavegador")}</p>
              </section>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
