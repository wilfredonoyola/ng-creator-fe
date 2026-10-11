import { useTranslations } from "next-intl";
import { Check, Mic, Play } from "lucide-react";
import { Bloque, CUADRO, Maqueta, Rotulo } from "./base";

/** Las barras de la nota de voz, fijas para que la maqueta no cambie entre renders. */
const ONDA = [6, 10, 14, 9, 16, 12, 7, 13, 18, 11, 8, 15, 10, 6, 12, 9, 14, 7, 11, 5];

/**
 * Revisión antes de publicar (ng-creator-be#178): un clip "Por revisar", la
 * nota de voz del cliente con su transcripción, y aprobar o pedir cambios.
 */
export function MaquetaRevision() {
  const t = useTranslations("landingMockups.revision");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex items-center gap-3 rounded-lg bg-[#0A0A0A] p-3 shadow-[inset_0_0_0_1px_#2E2E2B]">
        <span className={`${CUADRO} h-14 w-8 shrink-0 rounded-sm`} />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-bold text-white">{t("clip")}</span>
          <span className="truncate text-[10px]">{t("sale")}</span>
        </span>
        <span className="shrink-0 rounded-sm bg-[#FFD400]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#FFD400]">{t("porRevisar")}</span>
      </div>

      <Bloque className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <Rotulo>{t("revision")}</Rotulo>
          <span className="text-[9px]">{t("revisor")}</span>
        </div>
        <div className="flex flex-col gap-2 rounded-md bg-[#1C1C1A] p-2.5">
          <span className="text-[10px] text-white">{t("quien")}</span>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFD400]">
              <Play size={11} fill="#0A0A0A" color="#0A0A0A" />
            </span>
            <span className="flex h-5 flex-1 items-center gap-[2px]">
              {ONDA.map((h, i) => (
                <span key={i} className={`flex-1 rounded-[1px] ${i < 7 ? "bg-[#FFD400]" : "bg-[#4A4A45]"}`} style={{ height: h }} />
              ))}
            </span>
            <span className="shrink-0 text-[10px]">0:12</span>
          </div>
          <span className="text-[10px] italic text-[#D9D8D2]">“{t("transcripcion")}”</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex min-w-[120px] flex-1 items-center gap-1.5 rounded px-2 py-1.5 text-[10px] text-[#D9D8D2] shadow-[inset_0_0_0_1px_#33332F]">
            <Mic size={11} />
            {t("grabar")}
          </span>
          <span className="rounded px-2 py-1.5 text-[10px] text-[#D9D8D2] shadow-[inset_0_0_0_1px_#33332F]">{t("pedirCambios")}</span>
          <span className="flex items-center gap-1 rounded bg-[#FFD400] px-2 py-1.5 text-[10px] font-bold text-[#0A0A0A]">
            <Check size={11} strokeWidth={3} />
            {t("aprobar")}
          </span>
        </div>
      </Bloque>
    </Maqueta>
  );
}
