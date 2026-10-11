import { useTranslations } from "next-intl";
import { Radio, Upload } from "lucide-react";
import { Bloque, CUADRO, Maqueta } from "./base";

/** Traer episodios: subir el archivo o traer el live de Restream. */
export function MaquetaImportar() {
  const t = useTranslations("landingMockups.importar");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[#4A4A45] px-4 py-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FFD400]">
          <Upload size={20} color="#0A0A0A" />
        </span>
        <span className="font-[family-name:var(--font-archivo)] text-[15px] font-bold text-white">{t("soltar")}</span>
        <span>{t("formatos")}</span>
        <span className="rounded bg-white px-3 py-1.5 text-[10px] font-bold text-[#0A0A0A]">{t("elegir")}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#2E2E2B]" />
        <span>{t("o")}</span>
        <span className="h-px flex-1 bg-[#2E2E2B]" />
      </div>
      <Bloque className="flex flex-col gap-3">
        <span className="flex items-center gap-1.5 text-white">
          <Radio size={13} color="#FFD400" />
          {t("restream")}
        </span>
        <div className="flex items-center gap-3">
          <span className={`${CUADRO} aspect-video w-20 shrink-0 rounded-sm`} />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex justify-between gap-2">
              <span className="truncate text-[#D9D8D2]">{t("live")}</span>
              <span className="shrink-0">01:24:10</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-[#2E2E2B]">
              <span className="block h-full w-[64%] rounded-full bg-[#FFD400]" />
            </span>
            <span className="text-[10px] text-[#FFD400]">{t("trayendo")}</span>
          </span>
        </div>
      </Bloque>
      <span className="text-[10px]">{t("siguiente")}</span>
    </Maqueta>
  );
}
