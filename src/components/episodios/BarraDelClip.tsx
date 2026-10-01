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
 * haciendo, si ya está terminado y qué pasó en las redes. Antes eran chips
 * sueltos ("Lo tenés vos", "Soltar", "Marcar listo", "Falló") y no se
 * entendía para qué era cada uno: acá cada bloque dice qué es, en qué está y
 * qué pasa al tocar su botón.
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

  return (
    <div className="mb-4">
      <div className="grid gap-px overflow-hidden rounded-ng-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        {/* ---- Quién lo hace ---- */}
        <Bloque
          icono={<UserRound size={16} aria-hidden />}
          etiqueta="Quién lo edita"
          estado={!tomadoPor ? "Nadie todavía" : mio ? "Vos" : tomadoPor.nombre}
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

        {/* ---- Terminado ---- */}
        <Bloque
          icono={listoPor ? <CheckCircle2 size={16} aria-hidden /> : <CircleDashed size={16} aria-hidden />}
          etiqueta="Estado"
          estado={listoPor ? `Terminado · ${listoPor.nombre}` : "En edición"}
          tono={listoPor ? "listo" : "tenue"}
          ayuda={
            listoPor
              ? "Ya aparece en el calendario, en “Listos para programar”."
              : tieneVideo
                ? "Cuando esté como querés, marcalo: el equipo lo ve para programarlo."
                : "Procesá el video (abajo, en Exportar) para poder marcarlo terminado."
          }
          accion={
            puedeOperar && (listoPor || tieneVideo)
              ? listoPor
                ? { texto: "Volver a editar", onClick: () => terminar(false), cargando: marcando }
                : { texto: "Marcar terminado", onClick: () => terminar(true), cargando: marcando, destacada: true }
              : undefined
          }
        />

        {/* ---- Redes ---- */}
        <Bloque
          icono={<CalendarClock size={16} aria-hidden />}
          etiqueta="En redes"
          estado={
            fallidas
              ? `Falló la publicación${fallidas > 1 ? ` (${fallidas})` : ""}`
              : programadas
                ? `Programado${proximaEn ? ` · ${diaYHora(new Date(proximaEn))}` : ""}`
                : publicadas
                  ? `Publicado en ${publicadas} ${publicadas === 1 ? "red" : "redes"}`
                  : "Sin programar"
          }
          tono={fallidas ? "error" : programadas || publicadas ? "listo" : "tenue"}
          ayuda={
            fallidas
              ? "Una red rechazó el video. Entrá a Programar para ver el motivo y reintentar."
              : programadas
                ? `${programadas > 1 ? `${programadas} publicaciones en camino.` : "Sale sola a esa hora."}${publicadas ? ` Ya salió en ${publicadas}.` : ""}`
                : publicadas
                  ? "Podés programarlo en otra red o a otra hora."
                  : tieneVideo
                    ? "Elegí redes y hora en Programar."
                    : "Primero procesá el video."
          }
        />

        {/* ---- Programar ---- */}
        <div className="flex items-center bg-ng-tarjeta p-4">
          {puedeOperar && tieneVideo ? (
            <Link
              href={hrefProgramar}
              className="inline-flex w-full items-center justify-center gap-2 rounded-ng-md bg-marca px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 lg:w-auto"
            >
              <Send size={15} aria-hidden /> {fallidas ? "Ver y reintentar" : "Programar"}
            </Link>
          ) : (
            <p className="text-xs text-ng-tenue lg:max-w-[9rem]">Para programar, primero procesá el video.</p>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

const TONOS = {
  tenue: "text-ng-secundario",
  marca: "text-ng-celeste",
  aviso: "text-amber-300",
  listo: "text-ng-teal",
  error: "text-red-400",
} as const;

function Bloque({
  icono,
  etiqueta,
  estado,
  tono,
  ayuda,
  accion,
}: {
  icono: ReactNode;
  etiqueta: string;
  estado: string;
  tono: keyof typeof TONOS;
  ayuda: string;
  accion?: { texto: string; onClick: () => void; cargando?: boolean; destacada?: boolean };
}) {
  return (
    <div className="flex flex-col gap-1 bg-ng-tarjeta p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ng-tenue">{etiqueta}</p>
      <div className="flex items-center justify-between gap-3">
        <p className={`flex min-w-0 items-center gap-1.5 text-sm font-semibold ${TONOS[tono]}`}>
          {icono}
          <span className="truncate">{estado}</span>
        </p>
        {accion && (
          <button
            onClick={accion.onClick}
            disabled={accion.cargando}
            className={`shrink-0 rounded-ng-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
              accion.destacada
                ? "bg-ng-teal/15 text-ng-teal hover:bg-ng-teal/25"
                : "border border-white/15 text-white/80 hover:bg-white/5"
            }`}
          >
            {accion.cargando ? "…" : accion.texto}
          </button>
        )}
      </div>
      <p className="text-xs leading-snug text-ng-tenue">{ayuda}</p>
    </div>
  );
}
