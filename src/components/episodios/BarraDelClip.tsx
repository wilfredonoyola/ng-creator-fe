"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useMutation } from "@apollo/client";
import { CalendarClock, CheckCircle2, CircleDashed, Send, UserRound } from "lucide-react";
import { MARCAR_CLIP_LISTO, SOLTAR_CLIP_EPISODIO, TOMAR_CLIP_EPISODIO } from "@/graphql/operations";
import { diaYHora } from "@/lib/publicaciones";
import { useSesion } from "@/lib/sesion";
import type { Autoria } from "./TomarClip";
import type { ResumenPublicacionClip } from "./ListoClip";

/**
 * El camino del clip en el equipo, arriba del editor (#70): quién lo está
 * haciendo, si ya está terminado y qué pasó en las redes, en una sola línea
 * fina para que lo principal sean las herramientas. Cada parte dice en qué
 * está, y al pasar el mouse, qué significa y qué hace su botón.
 */
export function BarraDelClip({
  clipId,
  marcaId,
  tomadoPor,
  listoPor,
  publicacion,
  tieneVideo,
  puedeOperar,
  hrefProgramar,
}: {
  clipId: string;
  marcaId: string;
  tomadoPor?: Autoria | null;
  listoPor?: Autoria | null;
  publicacion?: ResumenPublicacionClip | null;
  /** Si ya hay un MP4 procesado: sin eso no se puede terminar ni programar. */
  tieneVideo: boolean;
  puedeOperar: boolean;
  hrefProgramar: string;
}) {
  const { usuario } = useSesion();
  const [tomar, { loading: tomando }] = useMutation(TOMAR_CLIP_EPISODIO);
  const [soltar, { loading: soltando }] = useMutation(SOLTAR_CLIP_EPISODIO);
  const [marcar, { loading: marcando }] = useMutation(MARCAR_CLIP_LISTO, { refetchQueries: ["ClipsListosSinProgramar"] });
  const [error, setError] = useState<string | null>(null);
  const mio = Boolean(tomadoPor && tomadoPor.usuarioId === usuario?._id);

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

  // Una sola línea fina: lo principal del editor son las herramientas, no
  // esto. Lo que significa cada parte y qué hace su botón va en el título.
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
        : { texto: "Sin programar", tono: "tenue" as const, ayuda: tieneVideo ? "Elegí redes y hora en Programar." : "Primero procesá el video." };

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs">
        <Dato
          icono={<UserRound size={13} aria-hidden />}
          texto={!tomadoPor ? "Nadie lo tomó" : mio ? "Lo editás vos" : `Lo edita ${tomadoPor.nombre}`}
          tono={!tomadoPor ? "tenue" : mio ? "marca" : "aviso"}
          ayuda={
            !tomadoPor
              ? "Tomalo para que el equipo sepa que lo estás haciendo vos."
              : mio
                ? "El equipo ve que es tuyo. Liberalo si otra persona lo va a terminar."
                : "Si lo tomás, pasa a tu nombre y así lo ve todo el equipo."
          }
          accion={
            puedeOperar
              ? mio
                ? { texto: "Liberar", onClick: liberarlo, cargando: soltando }
                : { texto: tomadoPor ? "Tomarlo igual" : "Tomarlo", onClick: tomarlo, cargando: tomando }
              : undefined
          }
        />
        <Separador />
        <Dato
          icono={listoPor ? <CheckCircle2 size={13} aria-hidden /> : <CircleDashed size={13} aria-hidden />}
          texto={listoPor ? `Terminado · ${listoPor.nombre}` : "En edición"}
          tono={listoPor ? "listo" : "tenue"}
          ayuda={
            listoPor
              ? "Ya aparece en el calendario, en “Listos para programar”."
              : tieneVideo
                ? "Cuando esté como querés, marcalo: el equipo lo ve para programarlo."
                : "Procesá el video (en Exportar) para poder marcarlo terminado."
          }
          accion={
            puedeOperar && (listoPor || tieneVideo)
              ? listoPor
                ? { texto: "Volver a editar", onClick: () => terminar(false), cargando: marcando }
                : { texto: "Marcar terminado", onClick: () => terminar(true), cargando: marcando }
              : undefined
          }
        />
        <Separador />
        <Dato icono={<CalendarClock size={13} aria-hidden />} texto={redes.texto} tono={redes.tono} ayuda={redes.ayuda} />
        {puedeOperar && tieneVideo && (
          <Link
            href={hrefProgramar}
            className="ml-auto inline-flex items-center gap-1.5 rounded-ng-md bg-marca px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
          >
            <Send size={13} aria-hidden /> {fallidas ? "Ver y reintentar" : "Programar"}
          </Link>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Separador() {
  return <span className="mx-1.5 h-3 w-px bg-white/15" aria-hidden />;
}

const TONOS = {
  tenue: "text-ng-secundario",
  marca: "text-ng-celeste",
  aviso: "text-amber-300",
  listo: "text-ng-teal",
  error: "text-red-400",
} as const;

function Dato({
  icono,
  texto,
  tono,
  ayuda,
  accion,
}: {
  icono: ReactNode;
  texto: string;
  tono: keyof typeof TONOS;
  ayuda: string;
  accion?: { texto: string; onClick: () => void; cargando?: boolean };
}) {
  return (
    <span className="inline-flex items-center gap-1.5" title={ayuda}>
      <span className={`inline-flex items-center gap-1 ${TONOS[tono]}`}>
        {icono}
        {texto}
      </span>
      {accion && (
        <button
          onClick={accion.onClick}
          disabled={accion.cargando}
          title={ayuda}
          className="rounded px-1 text-ng-celeste underline-offset-2 hover:underline disabled:opacity-50"
        >
          {accion.cargando ? "…" : accion.texto}
        </button>
      )}
    </span>
  );
}
