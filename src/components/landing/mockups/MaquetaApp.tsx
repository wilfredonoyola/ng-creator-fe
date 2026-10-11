import { useTranslations } from "next-intl";
import { BellRing, Download } from "lucide-react";
import { CUADRO, Maqueta, Rotulo } from "./base";

const CLIPS = [
  { clave: "c1", estado: "listo", puntaje: 92 },
  { clave: "c2", estado: "programado", puntaje: 87 },
  { clave: "c3", estado: "editando", puntaje: 81 },
] as const;

const ESTADO: Record<(typeof CLIPS)[number]["estado"], string> = {
  listo: "bg-[#FFD400] text-[#0A0A0A]",
  programado: "bg-white text-[#0A0A0A]",
  editando: "text-[#D9D8D2] shadow-[inset_0_0_0_1px_#4A4A45]",
};

/** App e idiomas: la lista de clips en un teléfono, un aviso y ES · EN. */
export function MaquetaApp() {
  const t = useTranslations("landingMockups.app");
  const tc = useTranslations("landingMockups.comun");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
        <div className="w-[230px] shrink-0 rounded-[34px] border border-[#3A3A36] bg-[#0A0A0A] p-2">
          <div className="relative flex h-[420px] flex-col overflow-hidden rounded-[27px] bg-[#141413] px-3 pb-3 pt-9">
            <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
            {/* El aviso del equipo que llega al teléfono. */}
            <span className="absolute inset-x-2 top-8 z-10 flex items-center gap-2 rounded-xl bg-white p-2 text-[10px] text-[#0A0A0A]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FFD400]">
                <BellRing size={12} color="#0A0A0A" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-bold">Clipfine</span>
                <span className="leading-tight">{t("aviso")}</span>
              </span>
            </span>
            <div className="mt-[62px] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#FFD400]" />
              <span className="text-[10px]">{tc("cliente", { letra: "A" })}</span>
            </div>
            <span className="mt-1 font-[family-name:var(--font-archivo)] text-xl font-extrabold text-white">{t("clips")}</span>
            <ul className="mt-3 flex flex-col gap-2">
              {CLIPS.map((c) => (
                <li key={c.clave} className="flex items-center gap-2 rounded-lg bg-[#1C1C1A] p-2">
                  <span className={`${CUADRO} h-11 w-[25px] shrink-0 rounded-sm`} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-[family-name:var(--font-archivo)] text-[11px] font-bold text-white">{t(`titulos.${c.clave}`)}</span>
                    <span className={`self-start rounded-sm px-1 py-px text-[8px] font-bold ${ESTADO[c.estado]}`}>{t(`estados.${c.estado}`)}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-bold text-white">{c.puntaje}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex justify-around border-t border-[#2E2E2B] pt-2.5 text-[9px]">
              <span>{t("nav.inicio")}</span>
              <span className="text-[#FFD400]">{t("nav.clips")}</span>
              <span>{t("nav.calendario")}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 sm:items-start">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Rotulo>{t("idioma")}</Rotulo>
            <span className="flex rounded-md bg-[#0A0A0A] p-1 text-[13px] font-bold shadow-[inset_0_0_0_1px_#2E2E2B]">
              <span className="rounded bg-[#FFD400] px-3 py-1 text-[#0A0A0A]">ES</span>
              <span className="px-3 py-1 text-[#D9D8D2]">EN</span>
            </span>
          </div>
          <span className="flex items-center gap-1.5 rounded bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#0A0A0A]">
            <Download size={12} />
            {t("fotos")}
          </span>
        </div>
      </div>
    </Maqueta>
  );
}
