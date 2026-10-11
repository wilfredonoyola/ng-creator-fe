import { useTranslations } from "next-intl";
import { ScanFace, VolumeX } from "lucide-react";
import { Bloque, CUADRO, Maqueta, Onda, Opcion, Rotulo, Silueta } from "./base";

const DISENOS = ["uno", "dividido", "horizontal", "centrado"] as const;

/** El dibujito de cada diseño: cómo se reparte el cuadro vertical. */
function IconoDiseno({ diseno }: { diseno: (typeof DISENOS)[number] }) {
  const caja = "absolute rounded-[1px] bg-current";
  return (
    <span className="relative h-4 w-[9px] rounded-[2px] border border-current opacity-80">
      {diseno === "uno" && <span className={`${caja} inset-[1px]`} />}
      {diseno === "dividido" && (
        <>
          <span className={`${caja} inset-x-[1px] top-[1px] h-[5px]`} />
          <span className={`${caja} inset-x-[1px] bottom-[1px] h-[5px]`} />
        </>
      )}
      {diseno === "horizontal" && <span className={`${caja} inset-x-[1px] top-1/2 h-[4px] -translate-y-1/2`} />}
      {diseno === "centrado" && <span className={`${caja} left-[1px] right-[1px] top-1/2 h-[5px] -translate-y-1/2`} />}
    </span>
  );
}

/** Edición: el encuadre, el formato, el diseño y la línea de tiempo con un corte. */
export function MaquetaEdicion() {
  const t = useTranslations("landingMockups.edicion");
  return (
    <Maqueta alt={t("alt")}>
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4">
        <div className={`${CUADRO} relative aspect-[9/16] overflow-hidden rounded-md`}>
          <Silueta color="#4A4A45" className="absolute bottom-0 left-[8%] w-[46%]" />
          <Silueta color="#6B6A64" className="absolute bottom-0 right-[4%] w-[46%]" />
          {/* El recuadro sigue a quien habla. */}
          <span className="absolute bottom-[6%] right-[2%] top-[38%] w-[52%] rounded-sm border-2 border-[#FFD400]" />
          <span className="absolute right-[2%] top-[30%] rounded-sm bg-[#FFD400] px-1 text-[9px] font-bold text-[#0A0A0A]">{t("habla")}</span>
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-sm bg-[#0A0A0A]/80 px-1.5 py-0.5 text-[9px] text-white">
            <ScanFace size={10} color="#FFD400" />
            {t("autoEncuadre")}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Rotulo>{t("formato")}</Rotulo>
            <div className="flex flex-wrap gap-1.5">
              <Opcion activa>9:16</Opcion>
              <Opcion>1:1</Opcion>
              <Opcion>16:9</Opcion>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Rotulo>{t("diseno")}</Rotulo>
            <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2">
              {DISENOS.map((d) => (
                <Opcion key={d} activa={d === "uno"}>
                  <IconoDiseno diseno={d} />
                  <span className="truncate">{t(`disenos.${d}`)}</span>
                </Opcion>
              ))}
            </div>
          </div>
          <span className="mt-auto flex items-center gap-1.5 text-[10px] text-[#D9D8D2]">
            <VolumeX size={12} color="#FFD400" />
            {t("silencios")}
          </span>
        </div>
      </div>
      <Bloque className="flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-white">{t("tramo")}</span>
          <span>00:42 → 00:38</span>
        </div>
        <div className="relative h-10 rounded bg-[#1C1C1A] px-1">
          <Onda alto={26} />
          {/* El tramo elegido, con sus bordes. */}
          <span className="absolute inset-y-0 left-[14%] right-[18%] rounded-sm border-x-[5px] border-y-2 border-[#FFD400]" />
          {/* Un corte en el medio, tachado. */}
          <span className="absolute inset-y-1 left-[47%] w-[11%] rounded-sm border border-[#FF4D3D] bg-[repeating-linear-gradient(135deg,#FF4D3D_0_2px,transparent_2px_6px)]" />
          <span className="absolute left-[38%] top-1/2 h-px w-[29%] -rotate-[8deg] bg-[#FF4D3D]" />
          {/* Dónde está la reproducción. */}
          <span className="absolute -inset-y-1 left-[30%] w-0.5 bg-white" />
        </div>
        <div className="relative h-3 text-[9px]">
          <span className="absolute left-[14%]">00:12</span>
          <span className="absolute left-[46%] text-[#FF4D3D] line-through">{t("corte")}</span>
          <span className="absolute right-[18%]">00:54</span>
        </div>
      </Bloque>
    </Maqueta>
  );
}
