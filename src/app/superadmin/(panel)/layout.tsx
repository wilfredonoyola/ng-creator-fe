"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogoNG } from "@/components/LogoNG";
import { cerrarSesion, haySesion } from "@/lib/auth";
import { useSesion } from "@/lib/sesion";
import { useSoySuperadmin } from "@/lib/superadmin";

const SECCIONES = [
  { href: "/superadmin/clientes", clave: "clientes" },
  { href: "/superadmin/usuarios", clave: "usuarios" },
  { href: "/superadmin/origenes", clave: "origenes" },
] as const;

/**
 * El marco de /superadmin: aparte del panel de los clientes, con su propia
 * barra. Sin sesión va a /superadmin/login; con una sesión que no es de
 * superadmin, lo dice y ofrece entrar con otra cuenta.
 */
export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("superadmin");
  const router = useRouter();
  const pathname = usePathname();
  const { soy, cargando } = useSoySuperadmin();
  const { usuario } = useSesion();

  useEffect(() => {
    if (!haySesion()) router.replace("/superadmin/login");
  }, [router]);

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

  return (
    <div className="min-h-screen bg-ng-fondo">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ng-fondo/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/superadmin/clientes" className="flex items-center gap-2">
            <LogoNG tamano={26} soloIcono />
            <span className="rounded-full bg-marca px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ng-tinta">Superadmin</span>
          </Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {SECCIONES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                  pathname.startsWith(s.href) ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {t(`secciones.${s.clave}`)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-white/50">
            <span className="hidden truncate md:inline">{usuario?.email}</span>
            <Link href="/panel" className="hover:text-white">{t("irAlPanel")}</Link>
            <button onClick={salir} className="hover:text-white">{t("salir")}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
