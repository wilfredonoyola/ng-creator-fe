import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Bloque, CUADRO, Maqueta, Onda } from "./base";

const CLIPS = [
  { clave: "c1", puntaje: 92, desde: "12:04", hasta: "12:51" },
  { clave: "c2", puntaje: 87, desde: "31:40", hasta: "32:22" },
  { clave: "c3", puntaje: 81, desde: "58:15", hasta: "58:49" },
] as const;

/** Dónde caen los momentos en el episodio, en % de su largo. */
const MOMENTOS = [{ desde: 16, ancho: 3 }, { desde: 44, ancho: 3 }, { desde: 81, ancho: 2.5 }];

/** Clips con IA: el episodio y los clips sugeridos con su puntaje y su porqué. */
export function MaquetaIa() {
  const t = useTranslations("landingMockups.ia");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex justify-between gap-3">
        <span className="truncate">EP-142_full.mp4</span>
        <span>01:12:08</span>
      </div>
      <div className={`${CUADRO} flex aspect-video items-center justify-center rounded-md text-[#8A8983]`}>{t("episodio")}</div>
      <div className="relative h-7 rounded bg-[#0A0A0A] px-1">
        <Onda alto={18} />
        {MOMENTOS.map((m) => (
          <span
            key={m.desde}
            className="absolute inset-y-0 rounded-sm border-x-2 border-[#FFD400] bg-[#FFD400]/25"
            style={{ left: `${m.desde}%`, width: `${m.ancho}%` }}
          />
        ))}
      </div>
      <Bloque className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-white">
            <Sparkles size={12} color="#FFD400" />
            {t("sugeridos")}
          </span>
          <span>{t("puntaje")}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {CLIPS.map((c, i) => (
            <li key={c.clave} className={`flex items-center gap-3 rounded-md p-2 ${i === 0 ? "bg-[#1C1C1A] shadow-[inset_0_0_0_1px_#FFD400]" : "bg-[#1C1C1A]"}`}>
              <span className={`${CUADRO} h-12 w-[27px] shrink-0 rounded-sm`} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-bold text-white">{t(`clips.${c.clave}.titulo`)}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                  <span className="rounded-sm bg-[#2E2E2B] px-1.5 py-0.5 text-[#FFD400]">{t(`clips.${c.clave}.porque`)}</span>
                  <span>
                    {c.desde}–{c.hasta}
                  </span>
                </span>
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[15px] font-bold ${
                  i === 0 ? "bg-[#FFD400] text-[#0A0A0A]" : "text-white shadow-[inset_0_0_0_1.5px_#4A4A45]"
                }`}
              >
                {c.puntaje}
              </span>
            </li>
          ))}
        </ul>
      </Bloque>
    </Maqueta>
  );
}
