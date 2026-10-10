"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  ChartColumnIncreasing,
  Clapperboard,
  House,
  Link2,
  Megaphone,
  Tags,
  ListChecks,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Stamp,
  Mic,
  MonitorPlay,
  Scissors,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cerrarSesion } from "@/lib/auth";
import { LogoNG } from "./LogoNG";
import { useSesion } from "@/lib/sesion";
import { useMarcaActiva } from "@/lib/marca-activa";
import { SelectorDeMarca } from "./SelectorDeMarca";
import { FotoMarca } from "./FotoMarca";
import { Campanita } from "./Campanita";

// Íconos de Lucide, de contorno y a un solo tamaño: la guía de marca pide una
// sola familia de íconos, no emojis.
type ClaveNav =
  | "inicio"
  | "episodios"
  | "calendario"
  | "publicaciones"
  | "metricas"
  | "crearVideo"
  | "montaje"
  | "revision"
  | "creators"
  | "equipo"
  | "brandKit"
  | "redesConectadas"
  | "comoNosConocieron"
  | "marcas";

interface ItemNav {
  href: string;
  icon: LucideIcon;
  /** La clave de su nombre en `marcoSidebar.nav`. */
  clave: ClaveNav;
  /** Otras rutas que cuentan como esta sección (las pestañas de adentro). */
  tambien?: string[];
}

/**
 * Lo que se vende: del episodio a la publicación. Va primero y es lo único que
 * ve un cliente de podcast.
 */
export const NAV_PRINCIPAL: ItemNav[] = [
  { href: "/panel", icon: House, clave: "inicio" },
  { href: "/episodios", icon: Mic, clave: "episodios" },
  { href: "/calendario", icon: CalendarDays, clave: "calendario" },
  { href: "/publicados", icon: MonitorPlay, clave: "publicaciones", tambien: ["/analisis"] },
  // Cómo le fue a lo publicado, en todas las redes (ng-creator-be#119): es lo
  // que la agencia le muestra al cliente, así que va a la vista y no adentro.
  { href: "/metricas", icon: ChartColumnIncreasing, clave: "metricas" },
];

/**
 * El flujo de videos de reacción: clip de un creator + narración. Es el
 * negocio propio de NG, no lo que compra un podcast, así que por ahora solo lo
 * ve el admin; con los planes (ng-creator-be#89) pasa a verse en las marcas
 * del plan Interno. Revisión está acá porque hoy revisa estos videos; cuando
 * exista la revisión de clips (#70) sube a la principal.
 */
export const NAV_REACCION: ItemNav[] = [
  { href: "/crear", icon: Clapperboard, clave: "crearVideo" },
  { href: "/montaje", icon: Scissors, clave: "montaje" },
  { href: "/revision", icon: ListChecks, clave: "revision" },
  { href: "/creators", icon: UserRound, clave: "creators" },
];

/**
 * Administración de la marca activa. "Equipo" lo ve cualquiera que tenga
 * acceso a la marca (adentro, quien no es propietario solo mira); "Redes
 * conectadas" es de ADMIN, porque es donde se suman cuentas nuevas.
 */
const navEquipo: ItemNav = { href: "/admin/equipo", icon: Users, clave: "equipo" };
/** El logo y la llamada a la acción de los clips de la marca (be#117). Como Equipo: quien no opera, solo mira. */
const navPlantilla: ItemNav = { href: "/admin/plantilla", icon: Stamp, clave: "brandKit" };
const navAdmin: ItemNav[] = [
  { href: "/admin/facebook", icon: Link2, clave: "redesConectadas" },
  { href: "/admin/marcas", icon: Tags, clave: "marcas" },
  { href: "/admin/origenes", icon: Megaphone, clave: "comoNosConocieron" },
];

export function esActivo(item: ItemNav, pathname: string): boolean {
  return [item.href, ...(item.tambien ?? [])].some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * Navegación principal.
 *
 * Es un cajón deslizable en pantallas chicas y una columna fija a partir de
 * `lg`. Se monta siempre y se mueve con `translate` en vez de desmontarse: así
 * la transición se ve, y el switch de página no se vuelve a montar (ni a
 * consultar) cada vez que se abre el menú.
 *
 * `colapsado` (desde md, en las pantallas que lo ofrecen) lo deja en una tira de íconos de 64px, con el
 * mismo orden y el nombre de cada uno al pasar el mouse: lo usan las pantallas
 * que necesitan el ancho, como el editor de clips. El botón de abajo lo
 * expande o lo vuelve a colapsar. En el cajón del teléfono no cambia nada.
 */
export function Sidebar({
  abierto = false,
  onCerrar,
  colapsado = false,
  onAlternarColapso,
  avisos,
}: {
  abierto?: boolean;
  onCerrar?: () => void;
  colapsado?: boolean;
  /** Sin esto no hay botón para colapsar: la pantalla no lo ofrece. */
  onAlternarColapso?: () => void;
  /**
   * El conteo de avisos sin leer, que pide DashboardLayout. La campanita del
   * menú se ve solo cuando el menú está fijo; en el cajón del teléfono no hace
   * falta, porque la barra de arriba ya tiene la suya.
   */
  avisos?: { sinLeer: number; refrescar: () => void };
}) {
  const t = useTranslations("marcoSidebar");
  const tRol = useTranslations("marcoRoles");
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, esAdmin, rolEn, veMetricas } = useSesion();
  const { activa } = useMarcaActiva();
  const rolAqui = rolEn(activa?._id);

  function handleLogout() {
    cerrarSesion();
    router.push("/login");
  }

  const c = colapsado;
  // Las pantallas que lo colapsan (el editor) lo fijan desde md: con la tira
  // de íconos, una tablet ya tiene el ancho para la herramienta.
  const fijoDesdeMd = Boolean(onAlternarColapso);
  // Lo que en la tira de íconos no va (solo desde lg; el cajón del teléfono queda igual).
  const sinTexto = c ? "md:hidden" : "";

  function ir(href: string) {
    router.push(href);
    onCerrar?.();
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-64 flex-col border-r border-white/10 bg-ng-fondo transition-[transform,width] duration-200 lg:translate-x-0 ${fijoDesdeMd ? "md:translate-x-0" : ""} ${c ? "md:w-16" : ""} ${
        abierto ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 border-b border-white/10 px-5 py-4 ${c ? "md:justify-center md:px-0" : ""}`}>
        <div className={`min-w-0 flex-1 ${sinTexto}`}>
          <LogoNG tamano={34} lema />
        </div>
        {c && (
          <div className="hidden md:block">
            <LogoNG tamano={30} soloIcono />
          </div>
        )}
        <button
          onClick={onCerrar}
          aria-label={t("cerrarMenu")}
          className={`rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white lg:hidden ${fijoDesdeMd ? "md:hidden" : ""}`}
        >
          ✕
        </button>
      </div>

      {/* Contexto de pagina */}
      <div className={`pt-4 ${sinTexto}`}>
        <SelectorDeMarca />
      </div>
      {/* Colapsado: la marca activa, chica; tocarla expande el menú para cambiarla. */}
      {c && (
        <div className="hidden justify-center pb-2 pt-4 md:flex">
          <button
            onClick={onAlternarColapso}
            title={t("trabajandoEnTitulo", { marca: activa?.nombre ?? "…" })}
            aria-label={t("trabajandoEnEtiqueta", { marca: activa?.nombre ?? "…" })}
            className="rounded-lg p-1.5 transition hover:bg-white/10"
          >
            <FotoMarca
              nombre={activa?.nombre}
              logoUrl={activa?.logoUrl}
              pageId={activa?.paginaFacebook?.pageId}
              fotoUrl={activa?.paginaFacebook?.fotoUrl}
              className="h-8 w-8"
            />
          </button>
        </div>
      )}

      {/* Navegacion. Scrollea sola si no entra, sin arrastrar el resto. */}
      <nav className={`flex-1 space-y-1 overflow-y-auto px-3 pb-4 ${c ? "md:px-2" : ""}`}>
        {NAV_PRINCIPAL.filter((item) => item.clave !== "metricas" || veMetricas(activa?._id)).map((item) => (
          <BotonNav key={item.href} {...item} label={t(`nav.${item.clave}`)} colapsado={c} activo={esActivo(item, pathname)} onClick={() => ir(item.href)} />
        ))}
        {/* Una fila más del menú, que abre la lista al costado: así entra igual
            en la tira de íconos que en el menú abierto. */}
        {avisos && (
          <div className={`hidden ${fijoDesdeMd ? "md:block" : "lg:block"}`}>
            <Campanita sinLeer={avisos.sinLeer} onCambio={avisos.refrescar} abreHacia="derecha" fila colapsado={c} />
          </div>
        )}

        {esAdmin && (
          <>
            <Titulo colapsado={c}>{t("videosReaccion")}</Titulo>
            {NAV_REACCION.map((item) => (
              <BotonNav key={item.href} {...item} label={t(`nav.${item.clave}`)} colapsado={c} activo={esActivo(item, pathname)} onClick={() => ir(item.href)} />
            ))}
          </>
        )}

        {(esAdmin || rolAqui) && (
          <>
            <Titulo colapsado={c}>{t("administracion")}</Titulo>
            {rolAqui && (
              <BotonNav
                {...navEquipo}
                label={t(`nav.${navEquipo.clave}`)}
                colapsado={c}
                activo={pathname.startsWith(navEquipo.href)}
                onClick={() => ir(navEquipo.href)}
              />
            )}
            {rolAqui && (
              <BotonNav
                {...navPlantilla}
                label={t(`nav.${navPlantilla.clave}`)}
                colapsado={c}
                activo={pathname.startsWith(navPlantilla.href)}
                onClick={() => ir(navPlantilla.href)}
              />
            )}
            {esAdmin &&
              navAdmin.map((item) => (
                <BotonNav
                  key={item.href}
                  {...item}
                  label={t(`nav.${item.clave}`)}
                  colapsado={c}
                  activo={pathname.startsWith(item.href)}
                  onClick={() => ir(item.href)}
                />
              ))}
          </>
        )}
      </nav>

      {/* Usuario */}
      <div
        className={`border-t border-white/10 p-4 ${c ? "md:hidden" : ""}`}
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {/* Lleva al perfil: ahí están los datos de la cuenta y eliminarla (be#95). */}
        <button
          onClick={() => ir("/perfil")}
          className={`mb-3 flex w-full items-center gap-3 rounded-lg p-1 text-left transition hover:bg-white/5 ${
            pathname.startsWith("/perfil") ? "bg-white/5" : ""
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <span className="text-sm">👤</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {usuario?.nombre || usuario?.email || "…"}
            </p>
            {/* El rol que importa es el de la página activa: el mismo usuario
                puede ser propietario de una y lector de otra. */}
            <p className="truncate text-xs text-white/40">
              {rolAqui
                ? t("rolDe", { rol: tRol(`${rolAqui}.etiqueta`), marca: activa?.nombre ?? t("laPagina") })
                : esAdmin
                  ? t("administrador")
                  : t("sinAcceso")}
            </p>
          </div>
          <span className="shrink-0 text-xs text-white/30">{t("perfil")}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-xs text-white/50 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
        >
          <span>🚪</span>
          {t("cerrarSesion")}
        </button>
      </div>

      {/* Colapsado: perfil y salir como íconos. */}
      {c && (
        <div className="hidden flex-col items-center gap-1 border-t border-white/10 py-3 md:flex">
          <button
            onClick={() => ir("/perfil")}
            title={t("perfilDe", { nombre: usuario?.nombre || usuario?.email || "" })}
            aria-label={t("perfil")}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-white/10 ${pathname.startsWith("/perfil") ? "bg-white/5" : ""}`}
          >
            <UserRound size={18} strokeWidth={1.8} className="text-ng-secundario" aria-hidden />
          </button>
          <button
            onClick={handleLogout}
            title={t("cerrarSesion")}
            aria-label={t("cerrarSesion")}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ng-secundario transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      )}

      {onAlternarColapso && (
        <div className={`hidden border-t border-white/10 p-2 md:flex ${c ? "justify-center" : "justify-end"}`}>
          <button
            onClick={onAlternarColapso}
            title={c ? t("expandir") : t("colapsar")}
            aria-label={c ? t("expandir") : t("colapsar")}
            aria-expanded={!c}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ng-secundario transition hover:bg-white/10 hover:text-white"
          >
            {c ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          </button>
        </div>
      )}
    </aside>
  );
}

function Titulo({ children, colapsado }: { children: React.ReactNode; colapsado?: boolean }) {
  return (
    <>
      <div className={`px-4 pb-1 pt-4 text-[10px] uppercase tracking-wider text-white/25 ${colapsado ? "md:hidden" : ""}`}>{children}</div>
      {/* En la tira de íconos, el grupo es una raya. */}
      {colapsado && <div aria-hidden className="mx-3 my-2 hidden h-px bg-white/10 md:block" />}
    </>
  );
}

function BotonNav({
  icon: Icono,
  label,
  activo,
  onClick,
  colapsado = false,
}: {
  icon: LucideIcon;
  label: string;
  activo: boolean;
  onClick: () => void;
  colapsado?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={colapsado ? label : undefined}
      aria-label={colapsado ? label : undefined}
      aria-current={activo ? "page" : undefined}
      // py-3 en vez de py-2: en un teléfono el objetivo tiene que ser cómodo de
      // tocar, y 44px es el mínimo razonable.
      className={`relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-all ${colapsado ? "md:justify-center md:px-0" : ""} ${
        activo
          ? "bg-ng-azul/10 text-white"
          : "text-ng-secundario hover:bg-white/5 hover:text-white active:bg-white/10"
      }`}
    >
      <Icono size={18} strokeWidth={1.8} className={activo ? "text-ng-celeste" : ""} aria-hidden />
      <span className={`font-medium ${colapsado ? "md:hidden" : ""}`}>{label}</span>
      {activo && <div className={`ml-auto h-2 w-2 rounded-full bg-marca ${colapsado ? "md:absolute md:right-1 md:top-1 md:h-1.5 md:w-1.5" : ""}`} />}
    </button>
  );
}
