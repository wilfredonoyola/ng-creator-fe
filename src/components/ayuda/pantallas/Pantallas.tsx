"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, Plus, TriangleAlert, Waypoints, X } from "lucide-react";
import { LogoIA } from "@/components/landing/LogosIA";
import { LogoNG } from "@/components/LogoNG";
import { TarjetaAprobar } from "@/components/conectar/TarjetaAprobar";
import { URL_MCP } from "@/lib/sitio";

/**
 * Las pantallas que muestra la guía de la wiki, hechas en HTML en vez de
 * capturas: salen en el idioma de quien lee y no hay imágenes que rehacer.
 * Las de ChatGPT copian su diseño con los textos que ChatGPT muestra en
 * inglés, como los nombran los pasos de la guía; la de Clipfine es la misma
 * tarjeta de /conectar.
 *
 * En el Markdown van como `<!-- pantalla:clave -->` (ver Markdown.tsx).
 */
const PANTALLAS: Record<string, () => React.ReactNode> = {
  "chatgpt-formulario": FormularioChatgpt,
  "chatgpt-conectar": ConectarChatgpt,
  "clipfine-permitir": PermitirClipfine,
};

/** La pantalla de esa clave; una que no existe no muestra nada. */
export function Pantalla({ clave }: { clave: string }) {
  const P = PANTALLAS[clave];
  return P ? <P /> : null;
}

/** El marco de cada pantalla en la guía: oscura, centrada y marcada como ilustración. */
function Marco({ children, ancho = "max-w-[420px]" }: { children: React.ReactNode; ancho?: string }) {
  const t = useTranslations("ayudaPantallas");
  return (
    <figure className={`not-prose my-5 ${ancho}`} aria-label={t("etiqueta")}>
      <div className="pointer-events-none select-none rounded-2xl bg-[#0D0D0D] p-3 text-white shadow-sm sm:p-4">{children}</div>
    </figure>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] text-white/85">{etiqueta}</p>
      {children}
    </div>
  );
}

const ENTRADA = "rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[13px]";

function FormularioChatgpt() {
  const t = useTranslations("ayudaPantallas");
  const f = useTranslations("ayudaPantallas.formulario");
  return (
    <Marco>
      <div className="space-y-3.5 rounded-xl bg-[#212121] p-4 font-sans">
        <div className="flex items-center justify-between">
          <p className="text-[17px] font-semibold">{f("titulo")}</p>
          <X size={16} className="text-white/50" aria-hidden />
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/15">
            <LogoNG tamano={28} soloIcono />
          </span>
          <div>
            <p className="text-[13px] font-medium">{f("icono")}</p>
            <p className="text-[11px] text-white/50">{f("iconoAyuda")}</p>
          </div>
        </div>
        <Campo etiqueta={f("nombre")}>
          <p className={ENTRADA}>{t("valorNombre")}</p>
        </Campo>
        <Campo etiqueta={f("descripcion")}>
          <p className={ENTRADA}>{t("valorDescripcion")}</p>
        </Campo>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-white/85">{f("conexion")}</p>
            <span className="flex rounded-full bg-black p-0.5 text-[11px]">
              <span className="rounded-full bg-[#2f2f2f] px-2.5 py-0.5">{f("serverUrl")}</span>
              <span className="px-2.5 py-0.5 text-white/50">{f("tunel")}</span>
            </span>
          </div>
          <p className={`${ENTRADA} border-[#FFD400]/70`}>{URL_MCP}</p>
        </div>
        <Campo etiqueta={f("autenticacion")}>
          <p className={ENTRADA}>OAuth</p>
        </Campo>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-white/40">
          <div className="min-w-0 flex-1">
            <p className="text-[13px]">{f("avanzado")}</p>
            <p className="truncate text-[11px]">{f("avanzadoAyuda")}</p>
          </div>
          <ChevronRight size={14} aria-hidden />
        </div>
        <p className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-[12px]">
          <TriangleAlert size={14} className="text-red-400" aria-hidden />
          {f("riesgo")}
        </p>
        <div className="flex gap-3 rounded-lg bg-black px-3 py-2.5">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#FFD400] bg-[#FFD400] text-[10px] font-bold text-black">✓</span>
          <div>
            <p className="text-[13px] font-medium">{f("entiendo")}</p>
            <p className="text-[11px] text-white/50">{f("entiendoAyuda")}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <span className="rounded-full border border-white/20 px-3.5 py-1.5 text-[13px]">{f("cancelar")}</span>
          <span className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-black ring-2 ring-[#FFD400] ring-offset-2 ring-offset-[#212121]">{f("crear")}</span>
        </div>
      </div>
    </Marco>
  );
}

function ConectarChatgpt() {
  const t = useTranslations("ayudaPantallas");
  return (
    <Marco ancho="max-w-[380px]">
      <div className="space-y-4 rounded-xl bg-[#212121] p-5 font-sans">
        <div className="flex items-center justify-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-black">
            <LogoIA app="ChatGPT" tamano={28} />
          </span>
          <span className="text-white/40">•••</span>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15">
            <Waypoints size={24} aria-hidden />
          </span>
        </div>
        <p className="text-center text-[17px] font-semibold">{t("conectar.titulo")}</p>
        <div className="space-y-2 rounded-lg border border-white/15 p-3 text-[11px] leading-relaxed text-white/70">
          <p>{t("conectar.aviso1")}</p>
          <p className="border-t border-white/10 pt-2">{t("conectar.aviso2")}</p>
        </div>
        <p className="rounded-full bg-white py-2 text-center text-[13px] font-medium text-black ring-2 ring-[#FFD400] ring-offset-2 ring-offset-[#212121]">
          {t("conectar.continuar")} ↗
        </p>
      </div>
    </Marco>
  );
}

function PermitirClipfine() {
  return (
    <Marco>
      <div className="rounded-ng-xl border border-white/10 bg-ng-tarjeta/80 p-6">
        <div className="mb-5 flex justify-center">
          <LogoNG tamano={40} soloIcono />
        </div>
        <TarjetaAprobar app="ChatGPT" vuelveA="chatgpt.com" />
      </div>
    </Marco>
  );
}
