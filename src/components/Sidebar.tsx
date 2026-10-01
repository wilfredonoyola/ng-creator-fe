"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Clapperboard,
  House,
  Link2,
  ListChecks,
  Mic,
  MonitorPlay,
  Scissors,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cerrarSesion } from "@/lib/auth";
import { LogoNG } from "./LogoNG";
import { ESTILO_ROL, useSesion } from "@/lib/sesion";
import { useMarcaActiva } from "@/lib/marca-activa";
import { SelectorDeMarca } from "./SelectorDeMarca";

// Íconos de Lucide, de contorno y a un solo tamaño: la guía de marca pide una
// sola familia de íconos, no emojis.
interface ItemNav {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Otras rutas que cuentan como esta sección (las pestañas de adentro). */
  tambien?: string[];
}

/**
 * Lo que se vende: del episodio a la publicación. Va primero y es lo único que
 * ve un cliente de podcast.
 */
export const NAV_PRINCIPAL: ItemNav[] = [
  { href: "/panel", icon: House, label: "Inicio" },
  { href: "/episodios", icon: Mic, label: "Episodios" },
  { href: "/calendario", icon: CalendarDays, label: "Calendario" },
  { href: "/publicados", icon: MonitorPlay, label: "Publicaciones", tambien: ["/analisis"] },
];

/**
 * El flujo de videos de reacción: clip de un creator + narración. Es el
 * negocio propio de NG, no lo que compra un podcast, así que por ahora solo lo
 * ve el admin; con los planes (ng-creator-be#89) pasa a verse en las marcas
 * del plan Interno. Revisión está acá porque hoy revisa estos videos; cuando
 * exista la revisión de clips (#70) sube a la principal.
 *
 * Revival salió del menú: no se usa. La ruta sigue, por si vuelve.
 */
export const NAV_REACCION: ItemNav[] = [
  { href: "/crear", icon: Clapperboard, label: "Crear video" },
  { href: "/montaje", icon: Scissors, label: "Montaje" },
  { href: "/revision", icon: ListChecks, label: "Revisión" },
  { href: "/creators", icon: UserRound, label: "Creators" },
];

/**
 * Administración de la marca activa. "Equipo" lo ve cualquiera que tenga
 * acceso a la marca (adentro, quien no es propietario solo mira); "Redes
 * conectadas" es de ADMIN, porque es donde se suman cuentas nuevas.
 */
const navEquipo: ItemNav = { href: "/admin/equipo", icon: Users, label: "Equipo" };
const navAdmin: ItemNav[] = [{ href: "/admin/facebook", icon: Link2, label: "Redes conectadas" }];

export function esActivo(item: ItemNav, pathname: string): boolean {
  return [item.href, ...(item.tambien ?? [])].some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * Navegación principal.
 *
 * Es un cajón deslizable en pantallas chicas y una columna fija a partir de
 * `lg`. Se monta siempre y se mueve con `translate` en vez de desmontarse: así
 * la transición se ve, y el switch de página no se vuelve a montar (ni a
 * consultar) cada vez que se abre el menú.
 */
export function Sidebar({
  abierto = false,
  onCerrar,
}: {
  abierto?: boolean;
  onCerrar?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, esAdmin, rolEn } = useSesion();
  const { activa } = useMarcaActiva();
  const rolAqui = rolEn(activa?._id);

  function handleLogout() {
    cerrarSesion();
    router.push("/login");
  }

  function ir(href: string) {
    router.push(href);
    onCerrar?.();
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-64 flex-col border-r border-white/10 bg-ng-fondo transition-transform duration-200 lg:translate-x-0 ${
        abierto ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0 flex-1">
          <LogoNG tamano={34} lema />
        </div>
        <button
          onClick={onCerrar}
          aria-label="Cerrar menú"
          className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white lg:hidden"
        >
          ✕
        </button>
      </div>

      {/* Contexto de pagina */}
      <div className="pt-4">
        <SelectorDeMarca />
      </div>

      {/* Navegacion. Scrollea sola si no entra, sin arrastrar el resto. */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV_PRINCIPAL.map((item) => (
          <BotonNav key={item.href} {...item} activo={esActivo(item, pathname)} onClick={() => ir(item.href)} />
        ))}

        {esAdmin && (
          <>
            <Titulo>Videos de reacción</Titulo>
            {NAV_REACCION.map((item) => (
              <BotonNav key={item.href} {...item} activo={esActivo(item, pathname)} onClick={() => ir(item.href)} />
            ))}
          </>
        )}

        {(esAdmin || rolAqui) && (
          <>
            <Titulo>Administración</Titulo>
            {rolAqui && (
              <BotonNav
                {...navEquipo}
                activo={pathname.startsWith(navEquipo.href)}
                onClick={() => ir(navEquipo.href)}
              />
            )}
            {esAdmin &&
              navAdmin.map((item) => (
                <BotonNav
                  key={item.href}
                  {...item}
                  activo={pathname.startsWith(item.href)}
                  onClick={() => ir(item.href)}
                />
              ))}
          </>
        )}
      </nav>

      {/* Usuario */}
      <div
        className="border-t border-white/10 p-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <span className="text-sm">👤</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {usuario?.nombre || usuario?.email || "…"}
            </p>
            {/* El rol que importa es el de la página activa: el mismo usuario
                puede ser propietario de una y lector de otra. */}
            <p className="truncate text-xs text-white/40">
              {rolAqui
                ? `${ESTILO_ROL[rolAqui].etiqueta} de ${activa?.nombre ?? "la página"}`
                : esAdmin
                  ? "Administrador"
                  : "Sin acceso a páginas"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-xs text-white/50 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
        >
          <span>🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pb-1 pt-4 text-[10px] uppercase tracking-wider text-white/25">{children}</div>;
}

function BotonNav({
  icon: Icono,
  label,
  activo,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      // py-3 en vez de py-2: en un teléfono el objetivo tiene que ser cómodo de
      // tocar, y 44px es el mínimo razonable.
      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-all ${
        activo
          ? "bg-ng-azul/10 text-white"
          : "text-ng-secundario hover:bg-white/5 hover:text-white active:bg-white/10"
      }`}
    >
      <Icono size={18} strokeWidth={1.8} className={activo ? "text-ng-celeste" : ""} aria-hidden />
      <span className="font-medium">{label}</span>
      {activo && <div className="ml-auto h-2 w-2 rounded-full bg-marca" />}
    </button>
  );
}
