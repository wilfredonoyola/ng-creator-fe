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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, esAdmin } = useSesion();

  function handleLogout() {
    cerrarSesion();
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0a0a0a]">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0FED9D]">
          <span className="text-lg font-bold text-black">NG</span>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wide">NG VIDEO</h1>
          <p className="text-xs text-white/50">Creator Studio</p>
        </div>
      </div>

      {/* Contexto de pagina */}
      <div className="pt-4">
        <PageSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 pb-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-all ${
                isActive
                  ? "bg-[#0FED9D]/10 text-[#0FED9D]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto h-2 w-2 rounded-full bg-[#0FED9D]" />
              )}
            </button>
          );
        })}

        {esAdmin && (
          <>
            <div className="px-4 pb-1 pt-4 text-[10px] uppercase tracking-wider text-white/25">
              Administración
            </div>
            {navAdmin.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-all ${
                    isActive
                      ? "bg-[#0FED9D]/10 text-[#0FED9D]"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-[#0FED9D]" />
                  )}
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <span className="text-sm">👤</span>
          </div>
          <div className="flex-1 truncate">
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
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs text-white/50 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
        >
          <span>🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
