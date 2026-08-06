"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { haySesion } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

/**
 * Estructura del dashboard, pensada primero para el teléfono.
 *
 * En pantallas chicas la navegación es un cajón que se abre desde la barra de
 * arriba; a partir de `lg` la barra desaparece y la navegación queda fija a la
 * izquierda. Una barra lateral de 256px siempre visible dejaba el contenido en
 * una franja inservible en un teléfono.
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!haySesion()) router.push("/login");
  }, [router]);

  // Navegar cierra el cajón. Sin esto queda tapando la pantalla a la que
  // acabás de entrar.
  useEffect(() => setAbierto(false), [pathname]);

  // Con el cajón abierto el fondo no debe desplazarse: en el teléfono se siente
  // como que la página "se escapa" detrás del menú.
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Barra superior: solo en pantallas chicas */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="-ml-1 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {/* Tres barras dibujadas, para no depender de una librería de iconos */}
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
        </button>

        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0FED9D] text-[11px] font-bold text-black">
            NG
          </span>
          <span className="text-sm font-bold tracking-wide">Creator Studio</span>
        </div>
      </header>

      {/* Fondo oscuro que cierra el cajón al tocarlo */}
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          aria-hidden
        />
      )}

      <Sidebar abierto={abierto} onCerrar={() => setAbierto(false)} />

      <main className="lg:pl-64">
        <div
          className="min-h-screen p-4 sm:p-6 lg:p-8"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
