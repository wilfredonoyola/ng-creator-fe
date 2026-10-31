import { useTranslations } from "next-intl";
import { UploadCloud } from "lucide-react";
import { Bloque, CUADRO, IconoRed, Maqueta, Rotulo } from "./base";

/** Las tarjetas de ejemplo: lo que se ve en Publicaciones → Subir clips. */
const CLIPS = [
  { clave: "c1", duracion: "0:42", etapa: "listo" },
  { clave: "c2", duracion: "1:15", etapa: "programado" },
  { clave: "c3", duracion: "0:28", etapa: "publicado" },
] as const;

const TONO = {
  listo: "bg-[#FFD400] text-[#0A0A0A]",
  programado: "bg-white text-[#0A0A0A]",
  publicado: "bg-[#2E2E2B] text-[#D9D8D2]",
} as const;

/**
 * Clips subidos (ng-creator-be#181): soltar lo que ya se editó en CapCut y
 * verlo listo para programar como cualquier otro clip.
 */
export function MaquetaClipsSubidos() {
  const t = useTranslations("landingMockups.clipsSubidos");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[#FFD400]/60 bg-[#FFD400]/5 px-4 py-5 text-center">
        <UploadCloud size={22} color="#FFD400" />
        <span className="font-[family-name:var(--font-archivo)] text-[15px] font-bold text-white">{t("soltar")}</span>
        <span className="text-[10px]">{t("acepta")}</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {CLIPS.map((c) => (
          <div key={c.clave} className="flex min-w-0 flex-col gap-1.5">
            <div className={`${CUADRO} relative aspect-[9/16] rounded-md`}>
              <span className={`absolute left-1.5 top-1.5 rounded-sm px-1.5 py-0.5 text-[8px] font-bold sm:text-[9px] ${TONO[c.etapa]}`}>
                {t(`etapas.${c.etapa}`)}
              </span>
              <span className="absolute bottom-1.5 right-1.5 rounded-sm bg-[#0A0A0A]/80 px-1 text-[9px] text-white">{c.duracion}</span>
            </div>
            <span className="truncate text-[10px] text-white">{t(`clips.${c.clave}`)}</span>
          </div>
        ))}
      </div>

      <Bloque className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1">
          <Rotulo>{t("sale")}</Rotulo>
          <span className="flex items-center gap-2">
            {(["TikTok", "Instagram", "YouTube", "Facebook"] as const).map((r) => (
              <IconoRed key={r} red={r} tamano={13} />
            ))}
          </span>
        </span>
        <span className="shrink-0 rounded bg-[#FFD400] px-2.5 py-1.5 text-[10px] font-bold text-[#0A0A0A]">{t("programar")}</span>
      </Bloque>
    </Maqueta>
  );
}
