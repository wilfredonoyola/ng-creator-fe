"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@apollo/client";
import { Check, ChevronDown, ChevronLeft, Download, Ellipsis, LoaderCircle, RefreshCw, Send, Undo2, Clapperboard, X } from "lucide-react";
import { MARCAR_CLIP_LISTO, SOLTAR_CLIP_EPISODIO, TOMAR_CLIP_EPISODIO } from "@/graphql/operations";
import { diaYHora } from "@/lib/publicaciones";
import { useSesion } from "@/lib/sesion";
import { Menu, type OpcionMenu } from "@/components/Menu";
import { EstadoGuardado, estadoDelMp4, useDescargarMp4, type EstadoRender } from "./ExportarClip";
import type { Autoria } from "./TomarClip";
import type { ResumenPublicacionClip } from "./ListoClip";

/** Todos los botones de la barra, iguales: mismo alto, radio y espaciado. */
const BOTON = "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const SECUNDARIO = `${BOTON} border border-white/15 bg-white/[0.04] text-white/90 hover:bg-white/10`;
const PRIMARIO = `${BOTON} bg-marca text-white hover:brightness-110`;

const TONOS = {
  tenue: "text-ng-secundario",
  marca: "text-ng-celeste",
  aviso: "text-amber-300",
  listo: "text-ng-teal",
  error: "text-red-400",
  proceso: "text-ng-celeste",
} as const;

/**
 * La barra de arriba del editor, como la de un editor de video: a la izquierda
 * volver, el episodio y el título del clip, quién lo edita y en qué está el
 * MP4; a la derecha, en un solo grupo, guardado, Listo, Exportar y Programar.
 *
 * Exportar y programar están siempre a la vista: antes estaban debajo de la
 * vista previa y había que bajar a buscarlos. En lo angosto, el título se
 * achica primero, y después Listo y Exportar pasan al menú "···"; Programar no
 * se esconde nunca.
 */
export function BarraDelClip({
  clipId,
  marcaId,
  hrefVolver,
  episodio,
  titulo,
  onCambiarTitulo,
  tomadoPor,
  listoPor,
  publicacion,
  puedeOperar,
  hrefProgramar,
  guardado,
  render,
  onProcesar,
}: {
  clipId: string;
  marcaId: string;
  hrefVolver: string;
  /** El nombre del episodio, chico arriba del título. */
  episodio: string;
  titulo: string;
  onCambiarTitulo: (t: string) => void;
  tomadoPor?: Autoria | null;
  listoPor?: Autoria | null;
  publicacion?: ResumenPublicacionClip | null;
  puedeOperar: boolean;
  hrefProgramar: string;
  guardado: { guardando: boolean; sinGuardar: boolean; error: boolean };
  render: {
    estado: EstadoRender | string | null;
    progreso: number;
    error?: string | null;
    urlVideo?: string | null;
    /** Hay cambios que el MP4 no tiene. */
    desactualizado: boolean;
    pidiendo: boolean;
  };
  onProcesar: () => void;
}) {
  const { usuario } = useSesion();
  const [tomar, { loading: tomando }] = useMutation(TOMAR_CLIP_EPISODIO);
  const [soltar, { loading: soltando }] = useMutation(SOLTAR_CLIP_EPISODIO);
  const [marcar, { loading: marcando }] = useMutation(MARCAR_CLIP_LISTO, { refetchQueries: ["ClipsListosSinProgramar"] });
  const [error, setError] = useState<string | null>(null);
  const mio = Boolean(tomadoPor && tomadoPor.usuarioId === usuario?._id);
  const bajada = useDescargarMp4(render.urlVideo, titulo);
  const mp4 = estadoDelMp4(render);
  // Sin un MP4 procesado no se puede terminar ni programar (el backend lo rechaza igual).
  const tieneVideo = render.estado === "LISTO" && Boolean(render.urlVideo);

  async function correr(accion: () => Promise<unknown>, falla: string) {
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(e instanceof Error ? e.message : falla);
    }
  }
  const tomarlo = () => {
    if (tomadoPor && !mio && !window.confirm(`Lo está editando ${tomadoPor.nombre}. ¿Tomarlo igual?`)) return;
    void correr(() => tomar({ variables: { id: clipId, marcaId } }), "No se pudo tomar el clip");
  };
  const liberarlo = () => void correr(() => soltar({ variables: { id: clipId, marcaId } }), "No se pudo liberar el clip");
  const terminar = (listo: boolean) =>
    void correr(() => marcar({ variables: { id: clipId, marcaId, listo } }), "No se pudo cambiar el estado");

  const { programadas = 0, publicadas = 0, fallidas = 0, proximaEn } = publicacion ?? {};
  const redes = fallidas
    ? { texto: "Falló en redes", tono: "error" as const, ayuda: "Una red rechazó la publicación. Entrá a Programar para ver el motivo y reintentar." }
    : programadas
      ? {
          texto: `Programado${proximaEn ? ` · ${diaYHora(new Date(proximaEn))}` : ""}`,
          tono: "listo" as const,
          ayuda: programadas > 1 ? `${programadas} publicaciones en camino.` : "Sale sola a esa hora.",
        }
      : publicadas
        ? { texto: `Publicado en ${publicadas} ${publicadas === 1 ? "red" : "redes"}`, tono: "listo" as const, ayuda: "Podés programarlo en otra red o a otra hora." }
        : null;

  // ---- Las opciones de Exportar y de Listo, para su menú o para el "···" ----
  const opcionProcesar: OpcionMenu | null = puedeOperar
    ? {
        texto: mp4.procesando
          ? mp4.texto
          : render.estado === "FALLIDO"
            ? "Intentar de nuevo"
            : mp4.listo
              ? "Volver a procesar"
              : "Procesar video",
        detalle: mp4.procesando
          ? mp4.detalle
          : mp4.listo && render.desactualizado
            ? "Con los cambios que el MP4 todavía no tiene."
            : mp4.listo
              ? "Ya está al día: solo si querés rehacerlo."
              : undefined,
        icono: mp4.procesando ? <LoaderCircle size={16} className="animate-spin" /> : mp4.listo ? <RefreshCw size={16} /> : <Clapperboard size={16} />,
        deshabilitada: mp4.procesando,
        onClick: onProcesar,
      }
    : null;
  const opcionDescargar: OpcionMenu | null = mp4.listo
    ? {
        texto: bajada.bajando ? "Descargando…" : render.desactualizado ? "Descargar el anterior" : "Descargar MP4",
        detalle: render.desactualizado ? "Sin los últimos cambios." : undefined,
        icono: <Download size={16} />,
        deshabilitada: bajada.bajando,
        onClick: () => void bajada.descargar(),
      }
    : null;
  const opcionListo: OpcionMenu | null = !puedeOperar
    ? null
    : listoPor
      ? { texto: "Volver a editar", detalle: "Sale de “Listos para programar”.", icono: <Undo2 size={16} />, onClick: () => terminar(false) }
      : {
          texto: "Marcar listo",
          detalle: tieneVideo ? "Lo ve el equipo en el calendario, para programarlo." : "Primero procesá el video.",
          icono: <Check size={16} />,
          deshabilitada: !tieneVideo || marcando,
          onClick: () => terminar(true),
        };

  const encabezadoExportar = (
    <>
      <p className={`font-medium ${TONOS[mp4.tono]}`}>{mp4.texto}</p>
      <p className="mt-0.5 break-words text-white/45">{mp4.detalle}</p>
    </>
  );

  return (
    <div className="relative flex h-full min-w-0 items-center gap-2 sm:gap-3">
      <Link
        href={hrefVolver}
        aria-label={`Volver a ${episodio}`}
        title={`Volver a ${episodio}`}
        className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft size={18} aria-hidden />
      </Link>

      {/* ---- El clip: se achica primero ---- */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-ng-secundario">
          <span className="truncate">{episodio}</span>
          <span aria-hidden className="text-white/20">·</span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 ${!tomadoPor ? "" : mio ? TONOS.marca : TONOS.aviso}`}
            title={
              !tomadoPor
                ? "Tomalo para que el equipo sepa que lo estás haciendo vos."
                : mio
                  ? "El equipo ve que es tuyo. Liberalo si otra persona lo va a terminar."
                  : "Si lo tomás, pasa a tu nombre y así lo ve todo el equipo."
            }
          >
            {!tomadoPor ? "Nadie lo tomó" : mio ? "Lo editás vos" : `Lo edita ${tomadoPor.nombre}`}
          </span>
          {puedeOperar && (
            <button
              onClick={mio ? liberarlo : tomarlo}
              disabled={tomando || soltando}
              className="shrink-0 text-ng-celeste underline-offset-2 hover:underline disabled:opacity-50"
            >
              {tomando || soltando ? "…" : mio ? "Liberar" : tomadoPor ? "Tomarlo igual" : "Tomarlo"}
            </button>
          )}
          <span aria-hidden className="hidden text-white/20 sm:inline">·</span>
          <span className={`hidden shrink-0 sm:inline ${TONOS[mp4.tono]}`} title={mp4.detalle}>
            {mp4.etiqueta}
          </span>
        </div>
        <input
          value={titulo}
          onChange={(e) => onCambiarTitulo(e.target.value)}
          disabled={!puedeOperar}
          aria-label="Título del clip"
          className="block w-full min-w-0 truncate bg-transparent text-[15px] font-semibold leading-6 outline-none focus:underline disabled:opacity-100"
        />
      </div>

      {/* Los errores de la barra, debajo de ella: en la fila no entran. */}
      {(error || bajada.error) && (
        <p
          role="alert"
          className="absolute right-0 top-full z-10 mt-1 flex max-w-sm items-start gap-2 rounded-lg border border-red-400/30 bg-ng-elevada px-3 py-2 text-xs text-red-300 shadow-xl"
        >
          <span className="min-w-0 break-words">
            {error ?? (
              <>
                {bajada.error}.{" "}
                <a href={render.urlVideo ?? "#"} target="_blank" rel="noreferrer" className="underline">
                  Abrilo en otra pestaña
                </a>{" "}
                y guardalo desde ahí.
              </>
            )}
          </span>
          <button
            onClick={() => {
              setError(null);
              bajada.limpiarError();
            }}
            aria-label="Cerrar"
            className="shrink-0 text-red-300/70 hover:text-red-200"
          >
            <X size={14} aria-hidden />
          </button>
        </p>
      )}

      {/* ---- Las acciones, en un solo grupo a la derecha ---- */}
      <div className="flex shrink-0 items-center gap-2">
        <EstadoGuardado {...guardado} />

        {/* Listo y Exportar: botones desde md; más angosto, en el "···". */}
        {puedeOperar && (
          <div className="hidden md:block">
            {listoPor ? (
              <Menu
                etiqueta={`Listo · ${listoPor.nombre}`}
                claseBoton={`${SECUNDARIO} border-ng-teal/30 text-ng-teal`}
                boton={
                  <>
                    <Check size={16} aria-hidden />
                    <span className="max-w-[9rem] truncate">Listo · {listoPor.nombre}</span>
                    <ChevronDown size={14} aria-hidden className="opacity-60" />
                  </>
                }
                encabezado={<p className="text-white/55">Desde {new Date(listoPor.en).toLocaleString("es")}. Ya está en “Listos para programar”.</p>}
                opciones={[opcionListo]}
              />
            ) : (
              <button
                onClick={() => terminar(true)}
                disabled={!tieneVideo || marcando}
                title={tieneVideo ? "Ya se puede programar: lo ve todo el equipo en el calendario" : "Procesá el video para poder marcarlo listo"}
                className={SECUNDARIO}
              >
                {marcando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
                Listo
              </button>
            )}
          </div>
        )}

        {(opcionProcesar || opcionDescargar) && (
          <div className="hidden md:block">
            <Menu
              etiqueta="Exportar"
              claseBoton={SECUNDARIO}
              encabezado={encabezadoExportar}
              opciones={[opcionProcesar, opcionDescargar]}
              boton={
                <>
                  {mp4.procesando ? (
                    <LoaderCircle size={16} className="animate-spin" aria-hidden />
                  ) : (
                    <span className="relative">
                      <Download size={16} aria-hidden />
                      {(mp4.tono === "aviso" || mp4.tono === "error") && (
                        <span
                          aria-hidden
                          className={`absolute -right-1 -top-1 h-2 w-2 rounded-full ring-2 ring-ng-fondo ${mp4.tono === "error" ? "bg-red-400" : "bg-amber-300"}`}
                        />
                      )}
                    </span>
                  )}
                  <span className="tabular-nums">{mp4.procesando ? `Procesando ${mp4.corto}` : "Exportar"}</span>
                  <ChevronDown size={14} aria-hidden className="opacity-60" />
                </>
              }
            />
          </div>
        )}

        {/* En lo angosto, Listo y Exportar juntos acá. */}
        {(opcionListo || opcionProcesar || opcionDescargar) && (
          <div className="md:hidden">
            <Menu
              etiqueta="Más acciones"
              claseBoton={`${SECUNDARIO} w-9 px-0`}
              encabezado={encabezadoExportar}
              opciones={[opcionListo, opcionProcesar, opcionDescargar]}
              boton={mp4.procesando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Ellipsis size={16} aria-hidden />}
            />
          </div>
        )}

        {redes && (
          <span className={`hidden max-w-[11rem] truncate text-[11px] leading-tight xl:inline ${TONOS[redes.tono]}`} title={redes.ayuda}>
            {redes.texto}
          </span>
        )}

        {puedeOperar &&
          (tieneVideo ? (
            <Link href={hrefProgramar} className={PRIMARIO} title={redes ? `${redes.texto}. ${redes.ayuda}` : "Elegí redes y hora"}>
              <Send size={16} aria-hidden />
              {fallidas ? "Reintentar" : "Programar"}
            </Link>
          ) : (
            <button disabled className={PRIMARIO} title="Primero procesá el video (en Exportar)">
              <Send size={16} aria-hidden />
              Programar
            </button>
          ))}
      </div>
    </div>
  );
}
