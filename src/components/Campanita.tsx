"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { MARCAR_NOTIFICACIONES_LEIDAS, MIS_NOTIFICACIONES } from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { ESTILO_NOTIFICACION, rutaDeNotificacion, type Notificacion } from "@/lib/notificaciones";
import { REDES } from "@/lib/publicaciones";
import { fechaCompleta, tiempoRelativo, useAhora } from "@/lib/time";

/** De a cuántos avisos se trae la lista. */
const LIMITE = 20;
const ANCHO_PANEL = 384;

/**
 * La campanita: cuántos avisos sin leer hay en la marca activa y, al tocarla,
 * la lista.
 *
 * Hay una en la barra de arriba del teléfono y otra en el menú lateral, como
 * una fila más (`fila`), que en la tira de íconos queda en ícono; cada una se
 * muestra donde la otra no. El conteo llega
 * de afuera (DashboardLayout) para que las dos no pregunten por separado.
 *
 * El panel se monta en el body: la barra de arriba (backdrop-blur) y el menú
 * (translate) son contenedores de lo `fixed` que llevan adentro, y el panel
 * quedaría encerrado en ellos.
 */
export function Campanita({
  sinLeer,
  onCambio,
  abreHacia,
  fila = false,
  colapsado = false,
  className = "",
}: {
  sinLeer: number;
  /** Para volver a pedir el conteo después de marcar algo como leído. */
  onCambio: () => void;
  /** "abajo" desde la barra de arriba; "derecha" desde el menú, al lado de la columna. */
  abreHacia: "abajo" | "derecha";
  /** Con el aspecto de una fila del menú lateral, con el nombre al lado. */
  fila?: boolean;
  /** En la fila: desde md, solo el ícono (la tira del editor). */
  colapsado?: boolean;
  className?: string;
}) {
  const boton = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties | null>(null);

  const ubicar = useCallback(() => {
    const b = boton.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    // En el teléfono, de borde a borde debajo de la barra: 384px no entran.
    if (ancho < 640) {
      const top = r.bottom + 8;
      setPos({ top, left: 8, right: 8, maxHeight: alto - top - 8 });
      return;
    }
    if (abreHacia === "derecha") {
      // Pegado al borde de la columna del menú, no al botón: así no tapa la navegación.
      const borde = b.closest("aside")?.getBoundingClientRect().right ?? r.right;
      // A la altura de la fila, pero subiendo lo necesario para que la lista
      // tenga lugar en una pantalla baja.
      const top = Math.max(8, Math.min(r.top, alto - 560));
      setPos({ top, left: borde + 8, width: ANCHO_PANEL, maxHeight: alto - top - 16 });
      return;
    }
    const top = r.bottom + 8;
    const left = Math.min(Math.max(8, r.right - ANCHO_PANEL), ancho - ANCHO_PANEL - 8);
    setPos({ top, left, width: ANCHO_PANEL, maxHeight: alto - top - 16 });
  }, [abreHacia]);

  useLayoutEffect(() => {
    if (!abierto) return;
    ubicar();
    window.addEventListener("resize", ubicar);
    return () => window.removeEventListener("resize", ubicar);
  }, [abierto, ubicar]);

  // Escape cierra y devuelve el foco a la campanita.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const etiqueta = sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : "Notificaciones";
  const conteo = sinLeer > 99 ? "99+" : String(sinLeer);

  return (
    <>
      {fila ? (
        // Las mismas medidas que las filas de navegación del menú (BotonNav).
        <button
          ref={boton}
          onClick={() => setAbierto((a) => !a)}
          title={colapsado ? etiqueta : undefined}
          aria-label={etiqueta}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          className={`relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-all ${
            colapsado ? "md:justify-center md:px-0" : ""
          } ${abierto ? "bg-white/5 text-white" : "text-ng-secundario hover:bg-white/5 hover:text-white active:bg-white/10"} ${className}`}
        >
          <Bell size={18} strokeWidth={1.8} aria-hidden />
          <span className={`font-medium ${colapsado ? "md:hidden" : ""}`}>Notificaciones</span>
          {sinLeer > 0 && (
            <span
              className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-marca px-1.5 text-xs font-semibold leading-none text-white ${
                colapsado ? "md:absolute md:right-0.5 md:top-0.5 md:ml-0 md:px-1 md:ring-2 md:ring-ng-fondo" : ""
              }`}
            >
              {conteo}
            </span>
          )}
        </button>
      ) : (
        <button
          ref={boton}
          onClick={() => setAbierto((a) => !a)}
          title={etiqueta}
          aria-label={etiqueta}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ng-secundario transition hover:bg-white/10 hover:text-white ${
            abierto ? "bg-white/10 text-white" : ""
          } ${className}`}
        >
          <Bell size={20} strokeWidth={1.8} aria-hidden />
          {sinLeer > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-marca px-1 text-xs font-semibold leading-none text-white ring-2 ring-ng-fondo">
              {conteo}
            </span>
          )}
        </button>
      )}

      {abierto &&
        pos &&
        createPortal(
          <>
            {/* Tocar afuera cierra. Transparente: el panel es chico y no hace falta oscurecer. */}
            <div className="fixed inset-0 z-[60]" onClick={() => setAbierto(false)} aria-hidden />
            <PanelNotificaciones
              style={pos}
              sinLeer={sinLeer}
              onCambio={onCambio}
              onCerrar={() => setAbierto(false)}
            />
          </>,
          document.body,
        )}
    </>
  );
}

function PanelNotificaciones({
  style,
  sinLeer,
  onCambio,
  onCerrar,
}: {
  style: React.CSSProperties;
  sinLeer: number;
  onCambio: () => void;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const { activa } = useMarcaActiva();
  const ahora = useAhora();
  const [agotado, setAgotado] = useState(false);
  const [trayendoMas, setTrayendoMas] = useState(false);

  // Fresca cada vez que se abre: los avisos llegan mientras tanto.
  const { data, loading, error, fetchMore } = useQuery(MIS_NOTIFICACIONES, {
    variables: { marcaId: activa?._id, limite: LIMITE },
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
  });
  const lista: Notificacion[] = data?.misNotificaciones ?? [];

  const [marcar, { loading: marcando }] = useMutation(MARCAR_NOTIFICACIONES_LEIDAS);

  /**
   * Marca como leídos en el servidor y en la caché. La caché se toca a mano
   * porque la mutación solo devuelve cuántos cambió, no los avisos.
   */
  async function marcarLeidas(ids?: string[]) {
    const cuales = ids ?? lista.filter((n) => !n.leida).map((n) => n._id);
    await marcar({
      variables: { ids, marcaId: activa?._id },
      update(cache) {
        for (const id of cuales) {
          cache.modify({
            id: cache.identify({ __typename: "Notificacion", _id: id }),
            fields: { leida: () => true },
          });
        }
      },
    });
    onCambio();
  }

  function abrir(n: Notificacion) {
    // Sin esperar: la navegación no tiene por qué depender de esto, y si falla
    // el aviso solo queda sin leer.
    if (!n.leida) marcarLeidas([n._id]).catch(() => {});
    onCerrar();
    router.push(rutaDeNotificacion(n));
  }

  async function verMas() {
    const ultimo = lista[lista.length - 1];
    if (!ultimo) return;
    setTrayendoMas(true);
    try {
      const { data: mas } = await fetchMore({
        variables: { antesDe: ultimo.createdAt },
        updateQuery: (prev, { fetchMoreResult }) => ({
          misNotificaciones: [...(prev.misNotificaciones ?? []), ...(fetchMoreResult?.misNotificaciones ?? [])],
        }),
      });
      if ((mas?.misNotificaciones?.length ?? 0) < LIMITE) setAgotado(true);
    } finally {
      setTrayendoMas(false);
    }
  }

  const hayMas = !agotado && lista.length >= LIMITE;

  return (
    <div
      role="dialog"
      aria-label="Notificaciones"
      style={style}
      className="fixed z-[61] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ng-elevada shadow-2xl shadow-black/50"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Notificaciones</h2>
          {activa && <p className="truncate text-xs text-white/40">{activa.nombre}</p>}
        </div>
        <button
          onClick={() => marcarLeidas().catch(() => {})}
          disabled={sinLeer === 0 || marcando}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-ng-celeste transition hover:bg-white/5 disabled:cursor-default disabled:text-white/30 disabled:hover:bg-transparent"
        >
          <CheckCheck size={14} aria-hidden />
          Marcar todas como leídas
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && !lista.length ? (
          <p className="px-4 py-8 text-center text-sm text-white/50">Cargando…</p>
        ) : error && !lista.length ? (
          <p className="px-4 py-8 text-center text-sm text-red-400">No pudimos traer las notificaciones. Probá de nuevo en un rato.</p>
        ) : !lista.length ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <BellOff size={28} strokeWidth={1.6} className="text-white/25" aria-hidden />
            <p className="mt-3 text-sm font-medium">No tenés notificaciones</p>
            <p className="mt-1 text-xs text-white/45">
              Te avisamos acá cuando haya clips listos para editar o cuando alguien del equipo tome, programe o publique uno.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {lista.map((n) => (
              <ItemNotificacion key={n._id} n={n} ahora={ahora} onAbrir={() => abrir(n)} />
            ))}
          </ul>
        )}

        {hayMas && (
          <div className="border-t border-white/5 p-2">
            <button
              onClick={verMas}
              disabled={trayendoMas}
              className="w-full rounded-lg py-2 text-xs text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              {trayendoMas ? "Cargando…" : "Ver más"}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-2.5">
        <button
          onClick={() => {
            onCerrar();
            router.push("/perfil#notificaciones");
          }}
          className="text-xs text-white/50 transition hover:text-white"
        >
          Elegí qué avisos recibir y por dónde
        </button>
      </div>
    </div>
  );
}

function ItemNotificacion({ n, ahora, onAbrir }: { n: Notificacion; ahora: number; onAbrir: () => void }) {
  const estilo = ESTILO_NOTIFICACION[n.tipo];
  const Icono = estilo?.icono ?? Bell;
  // Solo las que la red ya devolvió con enlace: sin url no hay adónde ir.
  const publicadas = (n.enlace.publicadas ?? []).filter((p) => p.url);

  return (
    <li className={n.leida ? "" : "bg-ng-azul/[0.07]"}>
      <button onClick={onAbrir} className={`flex w-full gap-3 px-4 pt-3 text-left ${publicadas.length ? "pb-2" : "pb-3"} transition hover:bg-white/5`}>
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${estilo?.clase ?? "bg-white/10"}`}>
          <Icono size={16} strokeWidth={1.8} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm ${n.leida ? "text-white/70" : "font-medium text-white"}`}>{n.titulo}</span>
          <span className="mt-0.5 block text-xs text-white/55">{n.cuerpo}</span>
          <span className="mt-1 block text-xs text-white/35" title={fechaCompleta(n.createdAt)}>
            {tiempoRelativo(n.createdAt, ahora)}
          </span>
        </span>
        {!n.leida && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-marca" aria-label="Sin leer" />}
      </button>
      {/* Fuera del botón: un enlace adentro de otro elemento tocable no es válido. */}
      {publicadas.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pb-3 pl-[60px] pr-4">
          {publicadas.map((p) => (
            <a
              key={p.red}
              href={p.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ng-celeste hover:underline"
            >
              Ver en {REDES[p.red]?.nombre ?? p.red}
            </a>
          ))}
        </div>
      )}
    </li>
  );
}
