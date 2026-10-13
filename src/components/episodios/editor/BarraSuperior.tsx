"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useMutation } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { CalendarCheck, ChevronDown, ChevronLeft, Download, Ellipsis, LoaderCircle, PencilLine, Redo2, Send, Undo2, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { diaYHora } from "@/lib/publicaciones";
import { SOLTAR_CLIP_EPISODIO, TOMAR_CLIP_EPISODIO } from "@/graphql/operations";
import { useSesion } from "@/lib/sesion";
import type { CalidadClip } from "@/lib/calidad";
import { Menu } from "@/components/Menu";
import { IndicadorCalidad } from "@/components/episodios/IndicadorCalidad";
import { EstadoGuardado, useDescargarMp4 } from "@/components/episodios/ExportarClip";
import type { Autoria } from "@/components/episodios/TomarClip";
import { PanelExportar } from "./PanelExportar";
import type { EstadoGuardado as Guardado } from "./useGuardado";

const ICONO = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-ng-md text-white transition hover:bg-ng-superficie disabled:cursor-not-allowed disabled:text-ng-tenue disabled:hover:bg-transparent";

/**
 * La barra de arriba del editor: volver al episodio, el título del clip, cómo
 * va el guardado (es automático: no hay botón Guardar), quién lo edita,
 * deshacer y rehacer, la calidad estimada, Descargar y Programar.
 *
 * Dos caminos, cada uno a un toque: hay quien solo quiere el clip y hay quien
 * lo programa desde acá.
 * - Descargar baja el MP4 si está al día; si no, lo exporta y baja solo al
 *   terminar. La flechita abre el panel del MP4 (exportar de nuevo, calidad,
 *   "Listo" para el equipo).
 * - Programar no espera al MP4: si falta o quedó viejo, se exporta solo antes
 *   de publicar (ng-creator-be, `esperaVideo`).
 *
 * En lo angosto, quién lo edita pasa al menú "···".
 */
export function BarraSuperior({
  clipId,
  marcaId,
  hrefVolver,
  episodio,
  titulo,
  onCambiarTitulo,
  tomadoPor,
  puedeOperar,
  guardado,
  deshacer,
  calidad,
  exportar,
  hrefProgramar,
}: {
  clipId: string;
  marcaId: string;
  hrefVolver: string;
  episodio: string;
  titulo: string;
  onCambiarTitulo: (t: string) => void;
  tomadoPor?: Autoria | null;
  puedeOperar: boolean;
  guardado: Guardado;
  deshacer: { puede: boolean; puedeRehacer: boolean; deshacer: () => void; rehacer: () => void };
  /** La calidad estimada con el encuadre de ahora (null si no se sabe la fuente). */
  calidad: CalidadClip | null;
  exportar: Omit<ComponentProps<typeof PanelExportar>, "clipId" | "marcaId" | "puedeOperar" | "bajada" | "bajarAlTerminar">;
  hrefProgramar: string;
}) {
  const t = useTranslations("editorBarra");
  const th = useTranslations("editorHerramientas");
  const { usuario } = useSesion();
  const [tomar, { loading: tomando }] = useMutation(TOMAR_CLIP_EPISODIO);
  const [soltar, { loading: soltando }] = useMutation(SOLTAR_CLIP_EPISODIO);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const mio = Boolean(tomadoPor && tomadoPor.usuarioId === usuario?._id);
  const { render } = exportar;
  const procesando = render.estado === "EN_COLA" || render.estado === "RENDERIZANDO" || render.pidiendo;
  const alDia = render.estado === "LISTO" && Boolean(render.urlVideo) && !render.desactualizado;
  const bajada = useDescargarMp4(render.urlVideo, titulo);
  const [bajarAlTerminar, setBajarAlTerminar] = useState(false);
  const { fallidas = 0, programadas = 0, proximaEn } = exportar.publicacion ?? {};
  const locale = useLocale();

  // Se pidió "Descargar" sin el MP4 al día: baja solo en cuanto termina. Un
  // FALLIDO de antes no cuenta: solo el del render que se pidió ahora.
  const vioProceso = useRef(false);
  useEffect(() => {
    if (!bajarAlTerminar) return;
    if (procesando) {
      vioProceso.current = true;
      return;
    }
    if (render.estado === "FALLIDO" && vioProceso.current) {
      vioProceso.current = false;
      setBajarAlTerminar(false);
      return;
    }
    if (!alDia) return;
    vioProceso.current = false;
    setBajarAlTerminar(false);
    void bajada.descargar();
  }, [bajarAlTerminar, procesando, alDia, render.estado, bajada]);

  function descargar() {
    if (alDia && !procesando) {
      void bajada.descargar();
      return;
    }
    if (!procesando) exportar.onExportar();
    setBajarAlTerminar(true);
    setAbierto(true);
  }

  // El panel de Exportar se cierra al tocar afuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("pointerdown", afuera);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", afuera);
      window.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  async function correr(accion: () => Promise<unknown>, falla: string) {
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(e instanceof Error ? e.message : falla);
    }
  }
  const tomarlo = () => {
    if (tomadoPor && !mio && !window.confirm(t("confirmarTomar", { nombre: tomadoPor.nombre }))) return;
    void correr(() => tomar({ variables: { id: clipId, marcaId } }), t("errores.tomar"));
  };
  const liberarlo = () => void correr(() => soltar({ variables: { id: clipId, marcaId } }), t("errores.liberar"));

  const quien = !tomadoPor ? t("tomado.nadie") : mio ? t("tomado.mio") : t("tomado.otro", { nombre: tomadoPor.nombre });
  const pista = !tomadoPor ? t("tomado.pistaNadie") : mio ? t("tomado.pistaMio") : t("tomado.pistaOtro");
  const opcionTomar = puedeOperar
    ? {
        texto: mio ? t("tomado.liberar") : tomadoPor ? t("tomado.tomarIgual") : t("tomado.tomar"),
        detalle: pista,
        icono: mio ? <UserMinus size={16} /> : <UserPlus size={16} />,
        deshabilitada: tomando || soltando,
        onClick: mio ? liberarlo : tomarlo,
      }
    : null;
  const chipQuien = (
    <span className="inline-flex items-center gap-1.5">
      {tomando || soltando ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <UserCheck size={14} aria-hidden />}
      <span className="max-w-[10rem] truncate">{quien}</span>
    </span>
  );

  return (
    <div className="relative flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 px-2 py-2 md:flex-nowrap md:px-4">
      <Link
        href={hrefVolver}
        aria-label={t("volverA", { episodio })}
        title={t("volverA", { episodio })}
        className="inline-flex h-10 shrink-0 items-center gap-1 rounded-ng-md pl-1 pr-2 text-sm text-ng-secundario transition hover:bg-ng-superficie hover:text-white"
      >
        <ChevronLeft size={18} aria-hidden />
        <span className="hidden max-w-[10rem] truncate lg:inline">{episodio}</span>
      </Link>

      <input
        value={titulo}
        onChange={(e) => onCambiarTitulo(e.target.value)}
        disabled={!puedeOperar}
        aria-label={t("tituloDelClip")}
        title={titulo}
        className="min-w-0 flex-1 truncate rounded-md bg-transparent px-1 text-[15px] font-semibold outline-none focus:bg-ng-superficie disabled:opacity-100 md:max-w-md"
      />
      <EstadoGuardado guardando={guardado.guardando} sinGuardar={guardado.sinGuardar} error={Boolean(guardado.error)} detalle={guardado.error} />

      <div className="hidden flex-1 md:block" />

      {/* Quién lo edita: chip desde md; más angosto, en el "···". */}
      <div className="hidden md:block">
        {opcionTomar ? (
          <Menu
            etiqueta={quien}
            claseBoton={`inline-flex h-9 items-center rounded-full border border-ng-superficie px-3 text-xs hover:bg-ng-superficie ${
              !tomadoPor ? "text-ng-secundario" : mio ? "text-ng-secundario" : "text-amber-300"
            }`}
            boton={chipQuien}
            encabezado={<p className="text-white/55">{pista}</p>}
            opciones={[opcionTomar]}
          />
        ) : (
          <span className="inline-flex h-9 items-center rounded-full border border-ng-superficie px-3 text-xs text-ng-secundario">{chipQuien}</span>
        )}
      </div>

      <div className="flex items-center">
        <button type="button" onClick={deshacer.deshacer} disabled={!puedeOperar || !deshacer.puede} aria-label={th("barra.deshacer")} title={th("barra.deshacerAtajo")} className={ICONO}>
          <Undo2 size={20} aria-hidden />
        </button>
        <button type="button" onClick={deshacer.rehacer} disabled={!puedeOperar || !deshacer.puedeRehacer} aria-label={th("barra.rehacer")} title={th("barra.rehacerAtajo")} className={ICONO}>
          <Redo2 size={20} aria-hidden />
        </button>
      </div>

      {calidad && (
        <span className="hidden sm:inline-flex">
          <IndicadorCalidad calidad={calidad} lado="abajo-derecha" />
        </span>
      )}

      {opcionTomar && (
        <div className="md:hidden">
          <Menu
            etiqueta={t("masAcciones")}
            claseBoton={ICONO}
            encabezado={<p className="text-white/70">{quien}</p>}
            opciones={[opcionTomar]}
            boton={<Ellipsis size={20} aria-hidden />}
          />
        </div>
      )}

      <div ref={caja} className="relative flex items-center gap-2">
        <div className="flex h-10 items-stretch overflow-hidden rounded-ng-md border border-white/20">
          <button
            type="button"
            onClick={descargar}
            disabled={bajada.bajando || (!puedeOperar && !alDia)}
            title={alDia ? t("descargar.mp4") : th("exportar.bajaAlTerminar")}
            className="inline-flex items-center gap-2 px-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
          >
            {procesando || bajada.bajando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />}
            <span className="hidden tabular-nums sm:inline">
              {procesando && render.estado === "RENDERIZANDO"
                ? th("barra.exportando", { n: render.progreso })
                : bajada.bajando
                  ? t("descargar.bajando")
                  : th("barra.descargar")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            aria-haspopup="dialog"
            aria-label={th("barra.opcionesVideo")}
            title={th("barra.opcionesVideo")}
            className="inline-flex w-8 items-center justify-center border-l border-white/20 text-white/80 transition hover:bg-white/5"
          >
            <ChevronDown size={16} aria-hidden />
          </button>
        </div>
        {/* Ya programado: se ve acá, y el botón lleva a editar lo programado. */}
        {programadas > 0 && (
          <Link
            href={hrefProgramar}
            title={t("programar.verProgramado")}
            className="hidden h-10 items-center gap-1.5 rounded-ng-md border border-ng-teal/30 bg-ng-teal/10 px-3 text-xs font-semibold text-ng-teal lg:inline-flex"
          >
            <CalendarCheck size={14} aria-hidden />
            {proximaEn
              ? t("programar.programadoEl", { cuando: diaYHora(new Date(proximaEn), locale), n: programadas })
              : t("programar.programado", { n: programadas })}
          </Link>
        )}
        {puedeOperar && (
          <Link
            href={hrefProgramar}
            title={alDia ? undefined : th("exportar.seExportaSolo")}
            className="inline-flex h-10 items-center gap-2 rounded-ng-md bg-ng-azul px-4 text-sm font-bold text-ng-tinta transition hover:brightness-110"
          >
            {programadas > 0 ? <PencilLine size={16} aria-hidden /> : <Send size={16} aria-hidden />}
            {fallidas ? t("programar.reintentar") : programadas > 0 ? t("programar.editar") : t("programar.programar")}
          </Link>
        )}
        {abierto && (
          <div
            role="dialog"
            aria-label={th("barra.opcionesVideo")}
            className="absolute right-0 top-full z-40 mt-2 max-h-[80vh] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-ng-lg border border-white/10 bg-ng-elevada p-4 shadow-2xl"
          >
            <PanelExportar clipId={clipId} marcaId={marcaId} puedeOperar={puedeOperar} bajada={bajada} bajarAlTerminar={bajarAlTerminar} {...exportar} />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="absolute right-2 top-full z-30 mt-1 flex max-w-sm items-start gap-2 rounded-lg border border-red-400/30 bg-ng-elevada px-3 py-2 text-xs text-red-300 shadow-xl">
          <span className="min-w-0 break-words">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label={t("cerrar")} className="shrink-0 text-red-300/70 hover:text-red-200">
            <X size={14} aria-hidden />
          </button>
        </p>
      )}
    </div>
  );
}
