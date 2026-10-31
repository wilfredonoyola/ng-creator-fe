"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, BadgeCheck, ExternalLink, MoreHorizontal, Star } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import { NOMBRE_RED, RED_DE, REDES_PERSONA, fotoDe, urlPerfil, verificacionEn, type NivelPersona, type Persona } from "@/lib/etiquetas";

/** La cara de una persona: su foto (de la red que la verificó) o sus iniciales. */
export function AvatarPersona({ persona, tamano = 40 }: { persona: Persona; tamano?: number }) {
  const foto = fotoDe(persona);
  const iniciales = persona.nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toUpperCase())
    .join("");
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt="" width={tamano} height={tamano} className="shrink-0 rounded-full object-cover ring-1 ring-white/10" style={{ width: tamano, height: tamano }} />
  ) : (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E2E2B] to-[#1A1A18] font-bold text-white/80 ring-1 ring-white/10"
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.36 }}
    >
      {iniciales || "·"}
    </span>
  );
}

/**
 * Una persona en Etiquetas: quién es, dónde está (elenco, global o un
 * episodio), su usuario en cada red con lo que dijo la red al verificarlo, y
 * cuánto se la usa. Las acciones van en un menú para que la lista se lea.
 */
export function TarjetaPersona({
  persona: p,
  puede,
  onEditar,
  onNivel,
  onBorrar,
  onReverificar,
}: {
  persona: Persona;
  puede: boolean;
  onEditar: () => void;
  onNivel: (n: NivelPersona) => void;
  onBorrar: () => void;
  onReverificar: () => void;
}) {
  const t = useTranslations("etiquetas");
  const redes = REDES_PERSONA.filter((r) => p[r]);
  const fbSinId = Boolean(p.facebook) && !p.facebookPaginaId;
  return (
    <li className="group flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition hover:border-white/20 hover:bg-white/[0.05]">
      <AvatarPersona persona={p} tamano={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{p.nombre}</p>
          {p.nivel === "ELENCO" && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-marca/15 px-1.5 py-0.5 text-[10px] font-semibold text-marca">
              <Star size={10} aria-hidden /> {t("nivel.ELENCO")}
            </span>
          )}
          {p.nivel === "EPISODIO" && (
            <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">{t("tarjeta.deEpisodio")}</span>
          )}
        </div>
        {p.alias?.length ? <p className="truncate text-[11px] text-white/35">{p.alias.join(" · ")}</p> : null}
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {redes.map((r) => {
            const v = verificacionEn(p, r);
            const titulo =
              v?.estado === "EXISTE"
                ? `${t("tarjeta.verificada", { red: NOMBRE_RED[r] })}${v.nombre ? `: ${v.nombre}` : ""}`
                : v?.estado === "NO_EXISTE"
                  ? t("tarjeta.noEncontrada", { red: NOMBRE_RED[r] })
                  : v?.estado === "NO_ETIQUETABLE"
                    ? t("tarjeta.noEtiquetable", { red: NOMBRE_RED[r] })
                  : t("tarjeta.sinVerificar", { red: NOMBRE_RED[r] });
            return (
              <li key={r}>
                <a
                  href={urlPerfil(r, p[r]!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${titulo} · ${t("verificar.verPerfil")}`}
                  className={`inline-flex max-w-[14rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition hover:text-white ${
                    v?.estado === "NO_EXISTE"
                      ? "border-red-500/40 text-red-300"
                      : v?.estado === "NO_ETIQUETABLE"
                        ? "border-amber-400/40 text-amber-200"
                        : "border-white/10 text-white/60"
                  }`}
                >
                  <IconoRed red={RED_DE[r]} chico />
                  <span className="truncate">@{p[r]}</span>
                  {v?.estado === "EXISTE" ? <BadgeCheck size={12} className="shrink-0 text-ng-teal" aria-label={titulo} /> : null}
                  {v?.estado === "NO_EXISTE" || v?.estado === "NO_ETIQUETABLE" ? (
                    <AlertTriangle size={11} className="shrink-0" aria-label={titulo} />
                  ) : null}
                  <ExternalLink size={9} className="shrink-0 opacity-0 transition group-hover:opacity-60" aria-hidden />
                </a>
              </li>
            );
          })}
          {redes.length === 0 && <li className="text-[11px] text-amber-300/80">{t("tarjeta.sinUsuarios")}</li>}
        </ul>
        {fbSinId && <p className="mt-1 text-[11px] text-white/35">{t("tarjeta.fbSinId")}</p>}
        <p className="mt-1.5 text-[11px] text-white/35">{t("tarjeta.usos", { n: p.usos ?? 0 })}</p>
      </div>
      {puede && <MenuPersona persona={p} onEditar={onEditar} onNivel={onNivel} onBorrar={onBorrar} onReverificar={onReverificar} />}
    </li>
  );
}

function MenuPersona({
  persona: p,
  onEditar,
  onNivel,
  onBorrar,
  onReverificar,
}: {
  persona: Persona;
  onEditar: () => void;
  onNivel: (n: NivelPersona) => void;
  onBorrar: () => void;
  onReverificar: () => void;
}) {
  const t = useTranslations("etiquetas");
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  const opciones: { clave: string; texto: string; accion: () => void; peligro?: boolean }[] = [
    { clave: "editar", texto: t("tarjeta.editar"), accion: onEditar },
    ...(p.nivel === "EPISODIO" ? [{ clave: "global", texto: t("tarjeta.hacerGlobal"), accion: () => onNivel("GLOBAL") }] : []),
    ...(p.nivel !== "ELENCO" ? [{ clave: "elenco", texto: t("tarjeta.pasarAElenco"), accion: () => onNivel("ELENCO") }] : []),
    ...(p.nivel === "ELENCO" ? [{ clave: "aGlobal", texto: t("tarjeta.pasarAGlobal"), accion: () => onNivel("GLOBAL") }] : []),
    { clave: "verificar", texto: t("tarjeta.reverificar"), accion: onReverificar },
    { clave: "borrar", texto: t("tarjeta.borrar"), accion: onBorrar, peligro: true },
  ];
  return (
    <div ref={caja} className="relative shrink-0 self-start">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={t("tarjeta.acciones", { nombre: p.nombre })}
        className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 top-8 z-20 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A18] py-1 shadow-xl">
          {opciones.map((o) => (
            <button
              key={o.clave}
              type="button"
              role="menuitem"
              onClick={() => {
                setAbierto(false);
                o.accion();
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-white/5 ${o.peligro ? "text-red-400" : "text-white/80"}`}
            >
              {o.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
