"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * Los cuatro destinos del trabajo diario. El resto vive detrás de "Más".
 *
 * Cuatro y no siete: en una pantalla de 375px, siete pestañas dan objetivos de
 * 53px con la etiqueta ilegible. Se eligen por frecuencia de uso, no por
 * jerarquía — Publicados, Creators e Integraciones se visitan de vez en cuando
 * y no merecen ocupar el pulgar.
 */
const TABS = [
  { href: "/", icon: "📊", label: "Inicio" },
  { href: "/crear", icon: "🎬", label: "Crear" },
  { href: "/revision", icon: "✅", label: "Revisión" },
  { href: "/revival", icon: "♻️", label: "Revival" },
];

/**
 * Navegación inferior, solo en móvil.
 *
 * Convive con el cajón en vez de reemplazarlo: la barra resuelve los saltos
 * frecuentes sin abrir nada, y el cajón sigue siendo donde están el resto de
 * las secciones, el switch de página y cerrar sesión.
 *
 * Va abajo porque es donde llega el pulgar. Una barra de navegación arriba
 * obliga a recolocar la mano en cada salto.
 */
export function NavInferior({ onMas }: { onMas: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((t) => {
        const activo = pathname === t.href;
        return (
          <button
            key={t.href}
            onClick={() => router.push(t.href)}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] transition ${
              activo ? "text-[#0FED9D]" : "text-white/45 active:bg-white/5"
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="font-medium">{t.label}</span>
            {/* Línea superior en vez de un punto: marca la pestaña sin robarle
                altura al objetivo tocable. */}
            <span
              className={`absolute top-0 h-0.5 w-10 rounded-full ${
                activo ? "bg-[#0FED9D]" : "bg-transparent"
              }`}
            />
          </button>
        );
      })}

      <button
        onClick={onMas}
        className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-white/45 transition active:bg-white/5"
      >
        <span className="text-lg leading-none">☰</span>
        <span className="font-medium">Más</span>
      </button>
    </nav>
  );
}
