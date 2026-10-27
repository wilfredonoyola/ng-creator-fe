"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, CircleHelp, LogOut, Mail, UserRound } from "lucide-react";
import { cerrarSesion } from "@/lib/auth";
import { ENLACE_AYUDA } from "@/lib/ayuda";
import { CONTACTO } from "@/lib/legal";
import { URL_SITIO } from "@/lib/sitio";
import { useSesion } from "@/lib/sesion";
import { useMarcaActiva } from "@/lib/marca-activa";

/** Las iniciales del nombre (o la primera letra del correo) para el avatar. */
function iniciales(nombre: string): string {
  const partes = nombre.replace(/@.*/, "").trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * La cuenta de quien entró, arriba a la derecha: el avatar abre un menú con
 * su nombre y su rol en la marca activa, Perfil, Ayuda, Soporte y Cerrar
 * sesión. Antes vivía al pie del menú lateral y le quitaba lugar.
 *
 * `conNombre`: en escritorio, el nombre al lado del avatar; en el teléfono,
 * solo el avatar.
 */
export function MenuUsuario({ conNombre = false }: { conNombre?: boolean }) {
  const t = useTranslations("marcoSidebar");
  const tRol = useTranslations("marcoRoles");
  const router = useRouter();
  const { usuario, esAdmin, rolEn } = useSesion();
  const { activa } = useMarcaActiva();
  const rolAqui = rolEn(activa?._id);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  // Un clic afuera o Escape lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("mousedown", alClic);
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClic);
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const nombre = usuario?.nombre || usuario?.email || "…";
  const rol = rolAqui
    ? t("rolDe", { rol: tRol(`${rolAqui}.etiqueta`), marca: activa?.nombre ?? t("laPagina") })
    : esAdmin
      ? t("administrador")
      : t("sinAcceso");

  const ir = (href: string) => {
    setAbierto(false);
    router.push(href);
  };
  const item = "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/75 transition hover:bg-white/5 hover:text-white";

  return (
    <div ref={caja} className="relative">
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={t("perfilDe", { nombre })}
        className={`flex items-center gap-2 rounded-full transition hover:bg-white/10 ${conNombre ? "py-1 pl-1 pr-2.5" : "p-1"} ${abierto ? "bg-white/10" : ""}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marca text-xs font-bold text-ng-tinta">
          {iniciales(nombre)}
        </span>
        {conNombre && (
          <>
            <span className="max-w-[10rem] truncate text-sm font-medium">{nombre}</span>
            <ChevronDown size={14} className={`text-white/40 transition ${abierto ? "rotate-180" : ""}`} aria-hidden />
          </>
        )}
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-white/10 bg-ng-tinta p-2 shadow-2xl"
        >
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca text-sm font-bold text-ng-tinta">
              {iniciales(nombre)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{nombre}</p>
              {usuario?.nombre && usuario.email && <p className="truncate text-xs text-white/45">{usuario.email}</p>}
              <p className="truncate text-xs text-white/45">{rol}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-white/10" />
          <button role="menuitem" type="button" onClick={() => ir("/perfil")} className={item}>
            <UserRound size={16} className="text-white/45" aria-hidden />
            {t("perfil")}
          </button>
          {/* La wiki vive en el sitio público: se abre aparte para no perder lo que se está haciendo. */}
          <a role="menuitem" href={`${URL_SITIO}${ENLACE_AYUDA}`} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setAbierto(false)}>
            <CircleHelp size={16} className="text-white/45" aria-hidden />
            {t("ayuda")}
          </a>
          <a role="menuitem" href={`mailto:${CONTACTO}`} className={item} onClick={() => setAbierto(false)}>
            <Mail size={16} className="text-white/45" aria-hidden />
            <span className="min-w-0 flex-1">
              {t("soporte")}
              <span className="block truncate text-xs text-ng-celeste">{CONTACTO}</span>
            </span>
          </a>
          <div className="my-1 h-px bg-white/10" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              cerrarSesion();
              router.push("/login");
            }}
            className={`${item} hover:bg-red-500/10 hover:text-red-400`}
          >
            <LogOut size={16} className="text-white/45" aria-hidden />
            {t("cerrarSesion")}
          </button>
        </div>
      )}
    </div>
  );
}
