import { useTranslations } from "next-intl";
import { Bloque, CONDENSADA, CUADRO, Interruptor, Maqueta, Rotulo, Silueta } from "./base";

/** Imágenes: el diseño Horizontal con dos personas recortadas tipo sticker. */
export function MaquetaImagenes() {
  const t = useTranslations("landingMockups.imagenes");
  return (
    <Maqueta alt={t("alt")}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div className="relative flex aspect-[9/16] flex-col overflow-hidden rounded-md border border-[#33332F] bg-[#0A0A0A]">
          <p className={`${CONDENSADA} px-3 pt-[14%] text-center text-[clamp(14px,4vw,22px)] leading-[1.02] text-white lg:text-[22px]`}>{t("titulo")}</p>
          <div className={`${CUADRO} mt-[10%] aspect-video w-full`} />
          <div className="relative mt-auto flex h-[34%] items-end justify-center gap-1">
            <Silueta color="#8A8983" contorno className="w-[40%] translate-y-[3%]" />
            <Silueta color="#D9D8D2" contorno className="w-[40%] translate-y-[3%]" />
            {/* El recuadro de la imagen elegida, como en la vista previa. */}
            <span className="absolute bottom-0 right-[8%] h-[92%] w-[44%] border border-dashed border-[#FFD400]">
              <span className="absolute -right-1 -top-1 h-2 w-2 bg-[#FFD400]" />
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Rotulo>{t("imagenes")}</Rotulo>
            <span className="rounded-sm bg-[#FFD400] px-1.5 py-0.5 text-[9px] font-bold text-[#0A0A0A]">{t("diseno")}</span>
          </div>
          {[1, 2].map((n) => (
            <Bloque key={n} className={`flex flex-col gap-2.5 ${n === 2 ? "shadow-[inset_0_0_0_1px_#FFD400]" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-end justify-center overflow-hidden rounded-sm bg-[#2E2E2B]">
                  <Silueta color={n === 1 ? "#8A8983" : "#D9D8D2"} contorno className="w-6" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-white">{t("imagen", { n })}</span>
                  <span className="truncate text-[9px]">{t("cuando")}</span>
                </span>
              </div>
              <span className="flex items-center justify-between gap-2 text-[10px] text-[#D9D8D2]">
                <span className="truncate">{t("quitarFondo")}</span>
                <Interruptor />
              </span>
              <span className="flex items-center justify-between gap-2 text-[10px] text-[#D9D8D2]">
                <span className="truncate">{t("contorno")}</span>
                <Interruptor />
              </span>
            </Bloque>
          ))}
        </div>
      </div>
    </Maqueta>
  );
}
