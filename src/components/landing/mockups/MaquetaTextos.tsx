import { useTranslations } from "next-intl";
import { Megaphone, Pencil } from "lucide-react";
import { Bloque, CONDENSADA, CUADRO, Maqueta, Opcion, Rotulo, Silueta } from "./base";

const ESTILOS = ["pop", "karaoke", "bestia", "editorial", "keynote"] as const;

/** Textos y subtítulos: gancho en caja, subtítulo karaoke, estilos y CTA. */
export function MaquetaTextos() {
  const t = useTranslations("landingMockups.textos");
  return (
    <Maqueta alt={t("alt")}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div className={`${CUADRO} relative aspect-[9/16] overflow-hidden rounded-md`}>
          <Silueta color="#4A4A45" className="absolute bottom-0 left-1/2 w-[70%] -translate-x-1/2" />
          <div className="absolute inset-x-[10%] top-[12%] flex justify-center">
            <span className={`${CONDENSADA} rounded-sm bg-white px-2 py-1 text-center text-[clamp(14px,4.2vw,22px)] leading-none text-[#0A0A0A] lg:text-[22px]`}>
              {t("gancho")}
            </span>
          </div>
          <p className="absolute inset-x-2 bottom-[16%] text-center font-[family-name:var(--font-archivo)] text-[clamp(13px,3.8vw,19px)] font-black uppercase leading-tight text-white [-webkit-text-stroke:0.5px_#0A0A0A] lg:text-[19px]">
            {t("sub1")} <span className="rounded-sm bg-[#FFD400] px-1 text-[#0A0A0A] [-webkit-text-stroke:0]">{t("sub2")}</span> {t("sub3")}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Rotulo>{t("estilo")}</Rotulo>
            <div className="flex flex-wrap gap-1.5">
              {ESTILOS.map((e) => (
                <Opcion key={e} activa={e === "karaoke"}>
                  {t(`estilos.${e}`)}
                </Opcion>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Rotulo>{t("corregir")}</Rotulo>
            <span className="flex items-center justify-between gap-2 rounded bg-[#0A0A0A] px-2 py-1.5 text-white shadow-[inset_0_0_0_1px_#FFD400]">
              <span className="truncate">{t("sub2")}</span>
              <Pencil size={11} color="#FFD400" />
            </span>
          </div>
          <Bloque className="mt-auto flex flex-col gap-2">
            <span className="flex items-center gap-1.5">
              <Megaphone size={11} color="#FFD400" />
              {t("cta")}
            </span>
            <span className="rounded-sm bg-[#FFD400] px-2 py-1.5 text-center font-[family-name:var(--font-archivo)] text-[12px] font-extrabold text-[#0A0A0A]">
              {t("ctaTexto")}
            </span>
          </Bloque>
        </div>
      </div>
    </Maqueta>
  );
}
