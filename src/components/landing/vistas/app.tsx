import { useTranslations } from "next-intl";
import { ArrowLeftRight, Laptop, Smartphone } from "lucide-react";
import { Barra, Chip, Cuadro, Fila, Flecha, Onda, Vista } from "./base";

/** La app de Clipfine: las vistas previas de cada tarjeta. */

/** Un teléfono chico, recortado abajo por la vista. */
function Telefono({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-1/2 top-4 flex h-[200px] w-[120px] -translate-x-1/2 flex-col gap-1.5 rounded-[20px] border border-[#3A3A36] bg-[#0A0A0A] px-2 pb-2 pt-6">
      <span className="absolute left-1/2 top-2 h-2.5 w-10 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_#2E2E2B]" />
      {children}
    </span>
  );
}

function App() {
  const t = useTranslations("featuresApp.vistas.app");
  return (
    <Vista>
      <Telefono>
        <span className="text-[9px]">{t("cliente")}</span>
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-extrabold text-white">{t("clips")}</span>
        {[0, 1, 2].map((n) => (
          <span key={n} className="flex items-center gap-1.5 rounded-md bg-[#1C1C1A] p-1">
            <span className="h-6 w-3.5 shrink-0 rounded-[2px] bg-[repeating-linear-gradient(135deg,#2A2A27_0_4px,#232321_4px_8px)]" />
            <span className="h-1.5 flex-1 rounded-full bg-[#3A3A36]" />
          </span>
        ))}
      </Telefono>
    </Vista>
  );
}

function Sincronizado() {
  const t = useTranslations("featuresApp.vistas.sincronizado");
  return (
    <Vista className="items-center">
      <Fila className="gap-4">
        <Laptop size={34} color="#FFFFFF" strokeWidth={1.5} />
        <ArrowLeftRight size={20} color="#FFD400" />
        <Smartphone size={28} color="#FFFFFF" strokeWidth={1.5} />
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function EditarCelular() {
  const t = useTranslations("featuresApp.vistas.editarCelular");
  return (
    <Vista>
      <Telefono>
        <span className="mx-auto h-[70px] w-[40px] rounded-[3px] bg-[repeating-linear-gradient(135deg,#2A2A27_0_5px,#232321_5px_10px)]" />
        <span className="flex h-4 items-center">
          <Onda color="#6B6A64" alto={12} />
        </span>
        <span className="flex flex-wrap justify-center gap-1 text-[8px]">
          <span className="rounded bg-[#FFD400] px-1 font-bold text-[#0A0A0A]">{t("recortar")}</span>
          <span className="rounded px-1 text-[#D9D8D2] shadow-[inset_0_0_0_1px_#2E2E2B]">{t("audio")}</span>
          <span className="rounded px-1 text-[#D9D8D2] shadow-[inset_0_0_0_1px_#2E2E2B]">{t("texto")}</span>
        </span>
      </Telefono>
    </Vista>
  );
}

function AprobarCelular() {
  const t = useTranslations("featuresApp.vistas.aprobarCelular");
  return (
    <Vista>
      <Telefono>
        <span className="mx-auto h-[70px] w-[40px] rounded-[3px] bg-[repeating-linear-gradient(135deg,#2A2A27_0_5px,#232321_5px_10px)]" />
        <span className="rounded bg-[#FFD400] py-1 text-center text-[9px] font-bold text-[#0A0A0A]">{t("aprobar")}</span>
        <span className="rounded py-1 text-center text-[9px] text-[#D9D8D2] shadow-[inset_0_0_0_1px_#2E2E2B]">{t("cambios")}</span>
      </Telefono>
    </Vista>
  );
}

function Push() {
  const t = useTranslations("featuresApp.vistas.push");
  return (
    <Vista>
      <span className="flex items-center gap-2 rounded-xl bg-white p-2.5 text-[11px] text-[#0A0A0A]">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FFD400] font-bold">C</span>
        <span className="flex min-w-0 flex-col">
          <span className="font-bold">Clipfine</span>
          <span className="leading-tight">{t("aviso")}</span>
        </span>
      </span>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Fotos() {
  const t = useTranslations("featuresApp.vistas.fotos");
  return (
    <Vista>
      <Fila>
        <Cuadro />
        <Flecha />
        <Chip tono="amarillo">{t("guardar")}</Chip>
      </Fila>
      <Fila>
        <span className="whitespace-nowrap">{t("guardando")}</span>
        <Barra lleno={0.8} />
      </Fila>
    </Vista>
  );
}

export const VISTAS_APP = {
  app: App,
  sincronizado: Sincronizado,
  editarCelular: EditarCelular,
  aprobarCelular: AprobarCelular,
  push: Push,
  fotos: Fotos,
};
