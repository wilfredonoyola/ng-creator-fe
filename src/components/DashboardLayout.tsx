"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { haySesion } from "@/lib/auth";
import { colorDePagina, usePaginaActiva } from "@/lib/pagina-activa";
import { Sidebar } from "./Sidebar";
import { NavInferior } from "./NavInferior";

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
  const { activa } = usePaginaActiva();

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

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0FED9D] text-[11px] font-bold text-black">
          NG
        </span>

        {/* Qué fan page está activa. En móvil el switch vive dentro del cajón,
            y sin este dato no hay forma de saber sobre cuál estás trabajando:
            el historial, los estados y el logo son distintos en cada una. */}
        <button
          onClick={() => setAbierto(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left transition active:bg-white/5"
        >
          {activa && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: colorDePagina(activa.pageId) }}
            />
          )}
          <span className="truncate text-sm font-medium">
            {activa?.nombre ?? "Creator Studio"}
          </span>
          <span className="text-[10px] text-white/30">▾</span>
        </button>
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
        {/* pb-24 en móvil: la barra inferior es fija y taparía el final del
            contenido, que suele ser justo el botón de la acción. */}
        <div className="min-h-screen p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          {children}
        </div>
      </main>

      <NavInferior onMas={() => setAbierto(true)} />
    </div>
  );
}
