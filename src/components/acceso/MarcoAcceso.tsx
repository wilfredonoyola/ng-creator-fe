"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogoNG } from "@/components/LogoNG";
import { SelectorIdiomaCompacto } from "@/components/SelectorIdiomaCompacto";
import { useRedirigirSiHaySesion } from "@/components/landing/RedirigirSiHaySesion";
import { PREFIJO_SITIO } from "@/lib/sitio";

/**
 * A donde volver despues de entrar.
 *
 * Se valida que sea una ruta interna: si se aceptara cualquier valor, un enlace
 * preparado podria mandar a alguien a otro sitio despues de escribir su
 * contraseña, que es el momento en que menos mira la barra de direcciones.
 */
export function destinoSeguro(): string {
  if (typeof window === "undefined") return "/panel";
  const v = new URLSearchParams(window.location.search).get("volverA");
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/panel";
  return v;
}

/** `?volverA=…` tal como vino, para pasarlo entre /login y /registro. */
export function conVolverA(ruta: string): string {
  if (typeof window === "undefined") return ruta;
  const v = new URLSearchParams(window.location.search).get("volverA");
  return v ? `${ruta}?volverA=${encodeURIComponent(v)}` : ruta;
}

/**
 * El marco de /login y /registro: fondo, "← Volver" a la landing y la tarjeta
 * con el logo (que también lleva a la landing).
 *
 * Quien ya tiene sesión no ve ninguna de las dos: va al panel. Hasta saberlo
 * no se pinta la tarjeta, para que el formulario no aparezca y se vaya.
 */
export function MarcoAcceso({
  titulo,
  subtitulo,
  onSubmit,
  children,
}: {
  titulo: string;
  subtitulo: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("login");
  const sinSesion = useRedirigirSiHaySesion();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ng-hondo px-4 py-16">
      <Link
        href={`${PREFIJO_SITIO}/`}
        className="absolute left-4 top-4 text-xs text-white/40 transition hover:text-white sm:left-6 sm:top-6"
      >
        {t("volverAlInicio")}
      </Link>
      {sinSesion && (
        <form
          onSubmit={onSubmit}
          className="relative w-full max-w-sm rounded-ng-xl border border-white/10 bg-ng-tarjeta/80 p-8 backdrop-blur"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <Link href={`${PREFIJO_SITIO}/`} aria-label={t("inicio")}>
              <LogoNG tamano={56} soloIcono />
            </Link>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">{titulo}</h1>
            <p className="mt-1 text-sm text-ng-secundario">{subtitulo}</p>
          </div>

          {children}

          {/* Enlaces públicos: Meta espera encontrarlos accesibles sin sesión. */}
          <div className="mt-6 flex items-center justify-center gap-4 border-t border-white/10 pt-4 text-xs">
            <a href={`${PREFIJO_SITIO}/privacidad`} className="text-white/40 hover:text-ng-celeste">
              {t("privacidad")}
            </a>
            <a href={`${PREFIJO_SITIO}/terminos`} className="text-white/40 hover:text-ng-celeste">
              {t("terminos")}
            </a>
            <SelectorIdiomaCompacto />
          </div>
        </form>
      )}
    </main>
  );
}
