import { useTranslations } from "next-intl";
import { Drum, Music, Volume2 } from "lucide-react";
import { Bloque, Interruptor, Onda, Rotulo, Maqueta } from "./base";

/** Una barra de volumen como la del editor, llena hasta `lleno` (0 a 1). */
function Barra({ lleno }: { lleno: number }) {
  return (
    <span className="relative h-1.5 flex-1 rounded-full bg-[#2E2E2B]">
      <span className="absolute inset-y-0 left-0 rounded-full bg-[#FFD400]" style={{ width: `${lleno * 100}%` }} />
      <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${lleno * 100}%` }} />
    </span>
  );
}

/** Audio y música (Tanda 2): voz, música que baja al hablar y efectos en la línea de tiempo. */
export function MaquetaAudio() {
  const t = useTranslations("landingMockups.audio");
  return (
    <Maqueta alt={t("alt")}>
      <Bloque className="flex flex-col gap-3">
        <Rotulo>{t("voz")}</Rotulo>
        <span className="flex items-center gap-3">
          <Volume2 size={14} color="#FFD400" />
          <Barra lleno={0.44} />
          <span className="w-10 shrink-0 text-right text-white">175%</span>
        </span>
      </Bloque>
      <Bloque className="flex flex-col gap-3">
        <Rotulo>{t("musica")}</Rotulo>
        <span className="flex items-center gap-2 text-white">
          <Music size={13} color="#FFD400" />
          <span className="min-w-0 flex-1 truncate">{t("pista")}</span>
          <span className="shrink-0 text-[10px] text-[#8A8983]">{t("libre")}</span>
        </span>
        <span className="flex items-center gap-3">
          <Barra lleno={0.25} />
          <span className="w-10 shrink-0 text-right text-white">25%</span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="text-[#D9D8D2]">{t("bajar")}</span>
          <Interruptor />
        </span>
      </Bloque>
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <span className="w-12 shrink-0">{t("pistaVoz")}</span>
          <span className="h-6 flex-1 rounded-sm bg-[#0A0A0A] px-1">
            <Onda color="#6B6A64" alto={18} />
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-12 shrink-0">{t("pistaMusica")}</span>
          <span className="h-4 flex-1 rounded-sm bg-[#FFD400]/25" />
        </span>
        <span className="flex items-center gap-2">
          <span className="w-12 shrink-0">{t("pistaEfectos")}</span>
          <span className="relative h-5 flex-1">
            {[0.12, 0.47, 0.81].map((x) => (
              <span key={x} className="absolute top-0 flex h-5 w-5 items-center justify-center rounded bg-[#FFD400]" style={{ left: `${x * 100}%` }}>
                <Drum size={11} color="#0A0A0A" />
              </span>
            ))}
          </span>
        </span>
      </div>
      <span className="text-[10px]">{t("vista")}</span>
    </Maqueta>
  );
}
