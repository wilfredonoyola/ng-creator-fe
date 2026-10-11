import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { CUADRO, IconoRed, Maqueta, Silueta, type Red } from "./base";

const VISTAS: { red: Red; nombre: string }[] = [
  { red: "TikTok", nombre: "TikTok" },
  { red: "Instagram", nombre: "Reels" },
  { red: "YouTube", nombre: "Shorts" },
  { red: "Facebook", nombre: "Facebook" },
];

/** Lo que cada app pone encima del video: botones a la derecha y textos abajo. */
function Encima({ red, corta }: { red: Red; corta: string }) {
  const boton = "h-[9%] max-h-4 w-auto aspect-square rounded-full bg-white/70";
  return (
    <>
      <span className="absolute bottom-[14%] right-[6%] flex flex-col items-center gap-[6%]" style={{ height: "40%" }}>
        {(red === "Facebook" ? [0, 1, 2] : [0, 1, 2, 3]).map((i) => (
          <span key={i} className={boton} />
        ))}
      </span>
      <span className="absolute bottom-[5%] left-[6%] flex w-[62%] flex-col gap-[3px]">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/70" />
          <span className="h-1 w-[55%] rounded-full bg-white/70" />
          {red === "YouTube" && <span className="h-2 w-[30%] rounded-sm bg-white" />}
        </span>
        <span className="h-1 w-full rounded-full bg-white/45" />
        {red !== "Facebook" && <span className="h-1 w-[70%] rounded-full bg-white/45" />}
      </span>
      {red === "TikTok" && (
        <span className="absolute inset-x-0 top-[4%] flex justify-center gap-2">
          <span className="h-1 w-[18%] rounded-full bg-white/45" />
          <span className="h-1 w-[18%] rounded-full bg-white/80" />
        </span>
      )}
      {red === "Instagram" && <span className="absolute left-[6%] top-[4%] h-1 w-[30%] rounded-full bg-white/80" />}
      {red === "Facebook" && (
        <span className="absolute left-[6%] top-[4%] rounded-sm bg-[#FFD400] px-1 text-[8px] font-bold text-[#0A0A0A]">{corta}</span>
      )}
      {red === "Facebook" && <span className="absolute inset-x-[6%] bottom-[2%] h-0.5 bg-white/30"><span className="block h-full w-[64%] bg-white" /></span>}
    </>
  );
}

/** Calidad y vista previa: el mismo clip en cuatro redes y la etiqueta de calidad. */
export function MaquetaCalidad() {
  const t = useTranslations("landingMockups.calidad");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 rounded bg-[#0A0A0A] px-2 py-1 text-white shadow-[inset_0_0_0_1px_#2E2E2B]">
          <span className="h-2 w-2 rounded-full bg-[#FFD400]" />
          {t("calidad")}
        </span>
        <span>{t("fps")}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VISTAS.map((v) => (
          <div key={v.red} className="flex min-w-0 flex-col items-center gap-2">
            <div className="w-full rounded-[14px] border border-[#3A3A36] bg-[#0A0A0A] p-1">
              <div className={`${CUADRO} relative aspect-[9/16] overflow-hidden rounded-[10px]`}>
                <Silueta color="#4A4A45" className="absolute bottom-0 left-1/2 w-[70%] -translate-x-1/2" />
                <span className="absolute inset-x-[8%] top-[52%] text-center font-[family-name:var(--font-archivo)] text-[10px] font-black uppercase leading-tight text-white">
                  {t("sub")}
                </span>
                <Encima red={v.red} corta={t("corta")} />
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-[#D9D8D2]">
              <IconoRed red={v.red} tamano={12} />
              {v.nombre}
            </span>
          </div>
        ))}
      </div>
      <span className="flex items-center gap-1.5 self-start rounded bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#0A0A0A]">
        <Download size={12} />
        {t("descargar")}
      </span>
    </Maqueta>
  );
}
