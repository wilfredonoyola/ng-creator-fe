import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Bloque, CUADRO, IconoRed, Interruptor, Maqueta, REDES, Rotulo, type Red } from "./base";

const NOMBRES: Record<Red, string> = { TikTok: "TikTok", YouTube: "Shorts", Instagram: "Reels", Facebook: "Facebook" };

const SEMANA: { dia: "lun" | "mar" | "mie" | "jue" | "vie"; posts: { red: Red; hora: string; publicada?: boolean }[] }[] = [
  { dia: "lun", posts: [{ red: "TikTok", hora: "09:00", publicada: true }, { red: "Instagram", hora: "12:30", publicada: true }] },
  { dia: "mar", posts: [{ red: "YouTube", hora: "10:00", publicada: true }] },
  { dia: "mie", posts: [{ red: "Facebook", hora: "08:30" }, { red: "TikTok", hora: "18:00" }] },
  { dia: "jue", posts: [{ red: "Instagram", hora: "11:00" }] },
  { dia: "vie", posts: [{ red: "YouTube", hora: "09:30" }, { red: "Facebook", hora: "16:00" }] },
];

/** Publicar y programar: las cuatro redes, la descripción y la semana. */
export function MaquetaPublicar() {
  const t = useTranslations("landingMockups.publicar");
  const tc = useTranslations("landingMockups.comun");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex flex-col gap-2">
        <Rotulo>{t("redes")}</Rotulo>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REDES.map((r) => (
            <span key={r} className="flex items-center justify-between gap-2 rounded-md bg-[#0A0A0A] px-2 py-2 shadow-[inset_0_0_0_1px_#2E2E2B]">
              <span className="flex min-w-0 items-center gap-1.5 text-[#D9D8D2]">
                <IconoRed red={r} tamano={13} />
                <span className="truncate">{NOMBRES[r]}</span>
              </span>
              <Interruptor />
            </span>
          ))}
        </div>
      </div>
      <Bloque className="flex flex-col gap-2">
        <div className="flex justify-between gap-2">
          <Rotulo>{t("descripcion")}</Rotulo>
          <span className="flex items-center gap-1 text-[10px]">
            <Check size={11} color="#3DDC84" />
            {t("largo")}
          </span>
        </div>
        <p className="font-[family-name:var(--font-archivo)] text-[13px] leading-snug text-white">
          {t("texto")} <span className="text-[#FFD400]">{t("hashtags")}</span>
        </p>
      </Bloque>
      <Bloque className="flex flex-col gap-2.5">
        <div className="flex justify-between">
          <span className="text-white">{t("semana")}</span>
          <span className="rounded-sm bg-[#FF4D3D] px-1.5 py-0.5 text-[9px] font-bold text-[#0A0A0A]">{t("programar")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {SEMANA.map((d, i) => (
            <div key={d.dia} className={`flex min-w-0 flex-col gap-1.5 ${i > 2 ? "max-sm:hidden" : ""}`}>
              <span className="text-[10px] text-[#8A8983]">{tc(`dias.${d.dia}`)}</span>
              {d.posts.map((p) => (
                <span key={p.red + p.hora} className="flex items-center gap-1.5 rounded bg-[#1C1C1A] px-1.5 py-[5px] text-[10px] text-[#D9D8D2]">
                  <span className={`${CUADRO} h-4 w-[9px] shrink-0 rounded-[1px]`} />
                  <IconoRed red={p.red} tamano={10} />
                  <span>{p.hora}</span>
                  {p.publicada && (
                    <span className="ml-auto flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#3DDC84]">
                      <Check size={8} strokeWidth={4} color="#0A0A0A" />
                    </span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Bloque>
    </Maqueta>
  );
}
