import { useTranslations } from "next-intl";
import { Pipette } from "lucide-react";
import { Bloque, CONDENSADA, CUADRO, Maqueta, Opcion, Rotulo, Silueta } from "./base";

/** Los colores de un cliente de ejemplo, tomados de su logo. */
const PALETA = ["#FF4D3D", "#0A0A0A", "#FFFFFF", "#FFD400"];

/** El logo del cliente de ejemplo: una forma simple, no una marca real. */
function LogoCliente({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center rounded-full bg-[#FF4D3D] font-[family-name:var(--font-archivo)] font-black text-white ${className}`}>
      A
    </span>
  );
}

/** Brand Kit: logo, colores, estilo y un clip con todo aplicado. */
export function MaquetaMarca() {
  const t = useTranslations("landingMockups.marca");
  const tc = useTranslations("landingMockups.comun");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex items-center gap-2 border-b border-[#2E2E2B] pb-3">
        <span className="h-2 w-2 rounded-full bg-[#FF4D3D]" />
        <span className="text-[12px] text-white">Brand Kit · {tc("cliente", { letra: "A" })}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <Bloque className="flex items-center gap-3">
            <LogoCliente className="h-11 w-11 shrink-0 text-xl" />
            <span className="flex min-w-0 flex-col gap-1.5">
              <Rotulo>{t("esquina")}</Rotulo>
              <span className="grid w-8 grid-cols-2 gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-3 rounded-[1px] ${i === 1 ? "bg-[#FFD400]" : "bg-[#3A3A36]"}`} />
                ))}
              </span>
              <span className="truncate text-[9px]">{t("opacidad")}</span>
            </span>
          </Bloque>
          <Bloque className="flex flex-col gap-2">
            <Rotulo>{t("colores")}</Rotulo>
            <div className="flex gap-1.5">
              {PALETA.map((c) => (
                <span key={c} className="h-7 flex-1 rounded-sm shadow-[inset_0_0_0_1px_#4A4A45]" style={{ background: c }} />
              ))}
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-[#D9D8D2]">
              <Pipette size={11} color="#FFD400" />
              <span className="truncate">{t("tomar")}</span>
            </span>
          </Bloque>
          <Bloque className="flex flex-col gap-2">
            <Rotulo>{t("estilo")}</Rotulo>
            <div className="flex flex-wrap gap-1.5">
              <Opcion activa>{t("estiloNombre")}</Opcion>
              <Opcion>Pop</Opcion>
            </div>
          </Bloque>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className={`${CUADRO} relative aspect-[9/16] overflow-hidden rounded-md`}>
            <Silueta color="#4A4A45" className="absolute bottom-0 left-1/2 w-[72%] -translate-x-1/2" />
            <LogoCliente className="absolute right-2 top-2 h-6 w-6 text-[11px] opacity-90" />
            <p className={`${CONDENSADA} absolute inset-x-2 top-[22%] text-center text-[clamp(13px,3.6vw,19px)] leading-[1.05] text-white lg:text-[19px]`}>
              {t("gancho1")} <span className="bg-[#FF4D3D] px-1">{t("gancho2")}</span>
            </p>
          </div>
          <span className="text-center text-[9px] text-[#D9D8D2]">{t("aplica")}</span>
        </div>
      </div>
    </Maqueta>
  );
}
