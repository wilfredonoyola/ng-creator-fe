"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ENLACE_EMPEZAR } from "@/components/landing/Marco";
import { PLANES, PRUEBA_HORAS } from "@/components/landing/planes";

const INCLUYE = ["momentos", "editor", "brandKit", "calendario", "analisis", "app"] as const;

const ETIQUETA = "font-[family-name:var(--font-grotesk)]";
const TITULO_PLAN = "text-[40px] font-black uppercase leading-[.95] [font-stretch:75%]";
const PRECIO = "text-[64px] font-black leading-none [font-stretch:75%]";
const BOTON_BORDE =
  "mt-auto flex h-[52px] items-center justify-center rounded-md px-6 font-bold shadow-[inset_0_0_0_2px_#0A0A0A] hover:bg-[#0A0A0A] hover:text-white active:translate-y-px focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#0A0A0A]";
const BOTON_CORAL =
  "mt-auto flex h-[52px] items-center justify-center rounded-md bg-[#FF4D3D] px-6 font-bold text-[#0A0A0A] shadow-[inset_0_0_0_1.5px_#0A0A0A] hover:bg-[#E8392A] active:translate-y-px active:bg-[#D63323] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#0A0A0A]";

function Punto({ texto }: { texto: string }) {
  return (
    <p className="flex items-center gap-3 font-semibold">
      <span aria-hidden className="h-2 w-2 shrink-0 bg-[#0A0A0A]" />
      {texto}
    </p>
  );
}

export function Precios({ enlaceDemo }: { enlaceDemo: string }) {
  const t = useTranslations("landing.precios");
  const [anual, setAnual] = useState(true);

  const opcion = (activo: boolean) =>
    `flex h-10 items-center gap-2 rounded-full px-[18px] text-sm font-bold ${ETIQUETA} focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#FFD400] ${
      activo ? "bg-[#FFD400] text-[#0A0A0A]" : "text-white"
    }`;

  return (
    <section id="precios" className="mx-auto flex max-w-[1440px] scroll-mt-20 flex-col gap-12 px-4 py-20 sm:px-8 lg:px-16 lg:py-28">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="max-w-[900px] text-[44px] font-black uppercase leading-[.95] [font-stretch:75%] [text-wrap:balance] sm:text-[76px]">
          {t("titulo")}
        </h2>
        <div role="group" aria-label={t("periodo")} className="flex shrink-0 gap-1 self-start rounded-full bg-[#0A0A0A] p-1 lg:self-auto">
          <button type="button" aria-pressed={!anual} onClick={() => setAnual(false)} className={opcion(!anual)}>
            {t("mensual")}
          </button>
          <button type="button" aria-pressed={anual} onClick={() => setAnual(true)} className={opcion(anual)}>
            {t("anual")}
            <span className="rounded-full bg-[#FF4D3D] px-[7px] py-0.5 text-[11px] uppercase tracking-[.06em] text-[#0A0A0A]">{t("ahorro")}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-6 rounded-xl bg-white p-8 shadow-[inset_0_0_0_1.5px_#D9D8D2]">
            <div className="flex min-h-[76px] flex-col gap-2.5">
              <h3 className={TITULO_PLAN}>{t("planes.prueba.nombre")}</h3>
              <p className="text-[15px] leading-snug text-[#3A3935]">{t("planes.prueba.para")}</p>
            </div>
            <div className="flex flex-col gap-1.5 border-t-[1.5px] border-[#0A0A0A] pt-6">
              <p className="flex items-baseline gap-1.5">
                <span className={PRECIO}>$0</span>
                <span className={`${ETIQUETA} text-[15px] font-medium text-[#3A3935]`}>{t("porMes")}</span>
              </p>
              <p className={`${ETIQUETA} text-[13px] font-medium text-[#3A3935]`}>{t("planes.prueba.nota")}</p>
            </div>
            <Punto texto={t("horas", { n: PRUEBA_HORAS })} />
            <Link href={ENLACE_EMPEZAR} className={BOTON_BORDE}>
              {t("empezarPrueba")}
            </Link>
          </div>

          {PLANES.map((p) => (
            <div
              key={p.clave}
              className={`flex flex-col gap-6 rounded-xl p-8 ${p.destacado ? "bg-[#FFD400]" : "bg-white shadow-[inset_0_0_0_1.5px_#D9D8D2]"}`}
            >
              <div className="flex min-h-[76px] flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={TITULO_PLAN}>{t(`planes.${p.clave}.nombre`)}</h3>
                  {p.destacado && (
                    <span className={`${ETIQUETA} whitespace-nowrap rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-[#FFD400]`}>
                      {t("recomendado")}
                    </span>
                  )}
                </div>
                <p className={`text-[15px] leading-snug ${p.destacado ? "text-[#0A0A0A]" : "text-[#3A3935]"}`}>{t(`planes.${p.clave}.para`)}</p>
              </div>
              <div className="flex flex-col gap-1.5 border-t-[1.5px] border-[#0A0A0A] pt-6">
                <p className="flex items-baseline gap-1.5">
                  <span className={PRECIO}>${anual ? p.anual : p.mensual}</span>
                  <span className={`${ETIQUETA} text-[15px] font-medium`}>{t("porMes")}</span>
                </p>
                <p className={`${ETIQUETA} text-[13px] font-medium`}>{t(anual ? "cobroAnual" : "cobroMensual")}</p>
              </div>
              <Punto texto={t("horasMes", { n: p.horas })} />
              <Link href={ENLACE_EMPEZAR} data-track="start-free" className={p.destacado ? BOTON_CORAL : BOTON_BORDE}>
                {t("empezar")}
              </Link>
            </div>
          ))}
        </div>

        <div className="grid items-center gap-6 rounded-xl bg-[#0A0A0A] p-8 text-white md:grid-cols-[minmax(0,1fr)_auto] md:gap-12 md:px-10">
          <div className="flex flex-col gap-2">
            <h3 className={TITULO_PLAN}>{t("custom.nombre")}</h3>
            <p className="text-[15px] leading-snug text-[#D9D8D2]">{t("custom.texto")}</p>
          </div>
          <a
            href={enlaceDemo}
            className="flex h-[52px] items-center justify-center rounded-md px-7 font-bold shadow-[inset_0_0_0_2px_#FFFFFF] hover:bg-white hover:text-[#0A0A0A] active:translate-y-px focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#FFD400]"
          >
            {t("custom.boton")}
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[15px] text-[#3A3935]">
        <span className={`${ETIQUETA} text-[13px] font-bold uppercase tracking-[.12em] text-[#0A0A0A]`}>{t("incluyen")}</span>
        {INCLUYE.map((clave) => (
          <span key={clave} className="flex items-center gap-2.5">
            <span aria-hidden className="h-2 w-2 shrink-0 bg-[#0A0A0A]" />
            {t(`incluye.${clave}`)}
          </span>
        ))}
      </div>
    </section>
  );
}
