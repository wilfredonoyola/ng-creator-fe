"use client";

import { usePathname, useRouter } from "next/navigation";
import { cerrarSesion } from "@/lib/auth";
import { useSesion } from "@/lib/sesion";
import { PageSwitcher } from "./PageSwitcher";

const navItems = [
  { href: "/", icon: "📊", label: "Dashboard" },
  { href: "/crear", icon: "🎬", label: "Crear Video" },
  { href: "/revision", icon: "✅", label: "Revisión" },
  { href: "/publicados", icon: "📺", label: "Publicados" },
  { href: "/revival", icon: "♻️", label: "Revival" },
  { href: "/creators", icon: "👤", label: "Creators" },
];

/** Solo visible con rol ADMIN. */
const navAdmin = [
  { href: "/admin/facebook", icon: "🔗", label: "Integraciones" },
];

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
  const { usuario, esAdmin } = useSesion();

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
      className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-64 flex-col border-r border-white/10 bg-[#0a0a0a] transition-transform duration-200 lg:translate-x-0 ${
        abierto ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0FED9D]">
          <span className="text-lg font-bold text-black">NG</span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold tracking-wide">NG VIDEO</h1>
          <p className="truncate text-xs text-white/50">Creator Studio</p>
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
        <PageSwitcher />
      </div>

      {/* Navegacion. Scrollea sola si no entra, sin arrastrar el resto. */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => (
          <BotonNav
            key={item.href}
            {...item}
            activo={pathname === item.href}
            onClick={() => ir(item.href)}
          />
        ))}

        {esAdmin && (
          <>
            <div className="px-4 pb-1 pt-4 text-[10px] uppercase tracking-wider text-white/25">
              Administración
            </div>
            {navAdmin.map((item) => (
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
            <p className="truncate text-xs text-white/40">
              {esAdmin ? "Administrador" : "Miembro"}
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

function BotonNav({
  icon,
  label,
  activo,
  onClick,
}: {
  icon: string;
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
          ? "bg-[#0FED9D]/10 text-[#0FED9D]"
          : "text-white/60 hover:bg-white/5 hover:text-white active:bg-white/10"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
      {activo && <div className="ml-auto h-2 w-2 rounded-full bg-[#0FED9D]" />}
    </button>
  );
}
