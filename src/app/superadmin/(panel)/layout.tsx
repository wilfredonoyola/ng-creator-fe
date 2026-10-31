"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Compass, CreditCard, House, KeyRound, LayoutDashboard, LifeBuoy, LogOut, Music, Users, type LucideIcon } from "lucide-react";
import { LogoNG } from "@/components/LogoNG";
import { BotonNav, Titulo } from "@/components/Sidebar";
import { cerrarSesion, haySesion } from "@/lib/auth";
import { useSesion } from "@/lib/sesion";
import { useSoySuperadmin } from "@/lib/superadmin";

type ClaveSeccion = "inicio" | "clientes" | "suscripciones" | "cobro" | "soporte" | "usuarios" | "origenes" | "sonidos";

/** Las secciones, agrupadas como en el menú del panel: un título y sus filas. */
const GRUPOS: { clave: "general" | "clientes" | "operacion"; secciones: { href: string; clave: ClaveSeccion; icon: LucideIcon }[] }[] = [
  { clave: "general", secciones: [{ href: "/superadmin", clave: "inicio", icon: LayoutDashboard }] },
  {
    clave: "clientes",
    secciones: [
      { href: "/superadmin/clientes", clave: "clientes", icon: Building2 },
      { href: "/superadmin/suscripciones", clave: "suscripciones", icon: CreditCard },
      { href: "/superadmin/usuarios", clave: "usuarios", icon: Users },
      { href: "/superadmin/origenes", clave: "origenes", icon: Compass },
    ],
  },
  {
    clave: "operacion",
    secciones: [
      { href: "/superadmin/soporte", clave: "soporte", icon: LifeBuoy },
      { href: "/superadmin/sonidos", clave: "sonidos", icon: Music },
      { href: "/superadmin/cobro", clave: "cobro", icon: KeyRound },
    ],
  },
];

const activa = (href: string, pathname: string) =>
  href === "/superadmin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/**
 * El marco de /superadmin: aparte del panel de los clientes, con su propio
 * menú a la izquierda, como el del panel (be#219): fijo desde lg y un cajón
 * que se abre desde la barra de arriba en pantallas chicas. Sin sesión va a
 * /superadmin/login; con una sesión que no es de superadmin, lo dice y ofrece
 * entrar con otra cuenta.
 */
export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("superadmin");
  const router = useRouter();
  const pathname = usePathname();
  const { soy, cargando } = useSoySuperadmin();
  const { usuario } = useSesion();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!haySesion()) router.replace("/superadmin/login");
  }, [router]);

  // Navegar cierra el cajón, y con el cajón abierto el fondo no se desplaza (como en el panel).
  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  async function salir() {
    await cerrarSesion();
    router.replace("/superadmin/login");
  }

  if (cargando || (!soy && !usuario)) {
    return <main className="min-h-screen bg-ng-fondo" />;
  }

  if (!soy) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ng-fondo px-4 text-center">
        <p className="text-white/70">{t("noEsSuperadmin", { email: usuario?.email ?? "" })}</p>
        <div className="flex gap-3">
          <Link href="/panel" className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5">{t("volverAlPanel")}</Link>
          <button onClick={salir} className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta">{t("otraCuenta")}</button>
        </div>
      </main>
    );
  }

  const seccion = GRUPOS.flatMap((g) => g.secciones).find((s) => activa(s.href, pathname));

  return (
    <div className="min-h-screen bg-ng-fondo">
      {/* Barra de arriba: solo en pantallas chicas, abre el menú. */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-ng-fondo/95 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => setAbierto(true)}
          aria-label={t("abrirMenu")}
          className="-ml-1 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
        </button>
        <LogoNG tamano={24} soloIcono />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{seccion ? t(`secciones.${seccion.clave}`) : "Superadmin"}</span>
        <Insignia />
      </header>

      {abierto && <div onClick={() => setAbierto(false)} className="fixed inset-0 z-40 bg-black/70 lg:hidden" aria-hidden />}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-64 flex-col border-r border-white/10 bg-ng-fondo transition-transform duration-200 lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Link href="/superadmin" className="flex min-w-0 flex-1 items-center gap-2">
            <LogoNG tamano={30} soloIcono />
            <Insignia />
          </Link>
          <button
            onClick={() => setAbierto(false)}
            aria-label={t("cerrarMenu")}
            className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {GRUPOS.map((g) => (
            <div key={g.clave}>
              <Titulo>{t(`grupos.${g.clave}`)}</Titulo>
              {g.secciones.map((s) => (
                <BotonNav
                  key={s.href}
                  icon={s.icon}
                  label={t(`secciones.${s.clave}`)}
                  activo={activa(s.href, pathname)}
                  onClick={() => router.push(s.href)}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <p className="truncate px-1 text-xs text-white/40" title={usuario?.email}>
            {usuario?.email}
          </p>
          <Link
            href="/panel"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <House size={14} aria-hidden />
            {t("irAlPanel")}
          </Link>
          <button
            onClick={salir}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-xs text-white/50 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={14} aria-hidden />
            {t("salir")}
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

function Insignia() {
  return <span className="rounded-full bg-marca px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ng-tinta">Superadmin</span>;
}
