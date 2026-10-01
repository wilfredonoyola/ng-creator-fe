"use client";

import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Clapperboard, House, Menu, Mic, MonitorPlay, type LucideIcon } from "lucide-react";
import { useSesion } from "@/lib/sesion";

/**
 * Los destinos del trabajo diario. El resto vive detrás de "Más".
 *
 * Pocos y no siete: en una pantalla de 375px, siete pestañas dan objetivos de
 * 53px con la etiqueta ilegible. Son los del flujo de episodios, el mismo
 * orden que el menú; "Crear" (videos de reacción) solo para quien lo ve en el
 * menú.
 */
interface Tab {
  href: string;
  icon: LucideIcon;
  label: string;
  tambien?: string[];
}

const TABS: Tab[] = [
  { href: "/panel", icon: House, label: "Inicio" },
  { href: "/episodios", icon: Mic, label: "Episodios" },
  { href: "/calendario", icon: CalendarDays, label: "Calendario" },
  { href: "/publicados", icon: MonitorPlay, label: "Publicaciones", tambien: ["/analisis"] },
];
const TAB_REACCION: Tab = { href: "/crear", icon: Clapperboard, label: "Crear" };

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
  const { esAdmin } = useSesion();
  const tabs = esAdmin ? [...TABS, TAB_REACCION] : TABS;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-white/10 bg-ng-fondo/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
    >
      {tabs.map((t) => {
        const activo = [t.href, ...(t.tambien ?? [])].some(
          (r) => pathname === r || pathname.startsWith(`${r}/`),
        );
        return (
          <button
            key={t.href}
            onClick={() => router.push(t.href)}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] transition ${
              activo ? "text-ng-celeste" : "text-ng-tenue active:bg-white/5"
            }`}
          >
            <t.icon size={20} strokeWidth={1.8} aria-hidden />
            <span className="font-medium">{t.label}</span>
            {/* Línea superior en vez de un punto: marca la pestaña sin robarle
                altura al objetivo tocable. */}
            <span
              className={`absolute top-0 h-0.5 w-10 rounded-full ${
                activo ? "bg-marca" : "bg-transparent"
              }`}
            />
          </button>
        );
      })}

      <button
        onClick={onMas}
        className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-white/45 transition active:bg-white/5"
      >
        <Menu size={20} strokeWidth={1.8} aria-hidden />
        <span className="font-medium">Más</span>
      </button>
    </nav>
  );
}
