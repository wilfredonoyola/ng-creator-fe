import { useTranslations } from "next-intl";
import { ChevronDown, Hand, UserCheck } from "lucide-react";
import { Bloque, CUADRO, Maqueta, Rotulo } from "./base";

const PERSONAS = [
  { nombre: "Vale", rol: "propietario" },
  { nombre: "Ana", rol: "editor" },
  { nombre: "Leo", rol: "editor" },
  { nombre: "Tomi", rol: "lector" },
] as const;

const CLIENTES = [
  { letra: "A", punto: "#FFD400" },
  { letra: "B", punto: "#FF4D3D" },
  { letra: "C", punto: "#D9D8D2" },
] as const;

const ROL: Record<(typeof PERSONAS)[number]["rol"], string> = {
  propietario: "bg-[#FFD400] text-[#0A0A0A] font-bold",
  editor: "text-white shadow-[inset_0_0_0_1px_#8A8983]",
  lector: "text-[#A3A29C] shadow-[inset_0_0_0_1px_#3A3A36]",
};

/** Equipo y marcas: el selector de marcas, los roles y quién hizo qué. */
export function MaquetaEquipo() {
  const t = useTranslations("landingMockups.equipo");
  const tc = useTranslations("landingMockups.comun");
  return (
    <Maqueta alt={t("alt")}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex flex-col overflow-hidden rounded-md bg-[#0A0A0A] shadow-[inset_0_0_0_1px_#2E2E2B] sm:w-[42%]">
          {CLIENTES.map((c, i) => (
            <span
              key={c.letra}
              className={`flex items-center gap-2 px-3 py-2 text-[12px] ${i === 0 ? "bg-white font-semibold text-[#0A0A0A]" : "text-[#D9D8D2] max-sm:hidden"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c.punto }} />
              {tc("cliente", { letra: c.letra })}
              {i === 0 && <ChevronDown size={12} className="ml-auto" />}
            </span>
          ))}
        </div>
        <Bloque className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex justify-between">
            <Rotulo>{t("equipo")}</Rotulo>
            <span className="text-[#FFD400]">{t("invitar")}</span>
          </div>
          {PERSONAS.map((p) => (
            <div key={p.nombre} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2E2E2B] font-[family-name:var(--font-archivo)] text-[10px] font-bold text-white">
                {p.nombre[0]}
              </span>
              <span className="min-w-0 flex-1 truncate text-[#D9D8D2]">{p.nombre}</span>
              <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] ${ROL[p.rol]}`}>{t(`roles.${p.rol}`)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 border-t border-[#2E2E2B] pt-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[#4A4A45] text-[10px]">@</span>
            <span className="min-w-0 flex-1 truncate">sofi@agencia.com</span>
            <span className="shrink-0 text-[9px]">{t("invitada")}</span>
          </div>
        </Bloque>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-[#0A0A0A] p-3 shadow-[inset_0_0_0_1px_#FFD400]">
        <span className={`${CUADRO} h-14 w-8 shrink-0 rounded-sm`} />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-bold text-white">{t("clip")}</span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#FFD400]">
            <Hand size={11} />
            {t("tomado")}
          </span>
          <span className="flex items-center gap-1.5 text-[10px]">
            <UserCheck size={11} />
            <span className="truncate">{t("autoria")}</span>
          </span>
        </span>
      </div>
    </Maqueta>
  );
}
