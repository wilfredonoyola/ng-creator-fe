import { useTranslations } from "next-intl";
import { Barra, Chip, Fila, Interruptor, Vista } from "./base";

/** Brand Kit: las vistas previas de cada tarjeta. */

function Logo() {
  const t = useTranslations("featuresMarca.vistas.logo");
  return (
    <Vista>
      <Fila className="gap-4">
        <span className="relative h-[110px] w-[64px] shrink-0 rounded-md border border-[#3A3A36] bg-[repeating-linear-gradient(135deg,#2A2A27_0_6px,#232321_6px_12px)]">
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-sm bg-[#FFD400] text-[8px] font-black text-[#0A0A0A]">B</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="grid grid-cols-2 gap-1">
            <Chip tono="apagado">↖</Chip>
            <Chip tono="amarillo">↗</Chip>
            <Chip tono="apagado">↙</Chip>
            <Chip tono="apagado">↘</Chip>
          </span>
          <Fila>
            <span className="w-14 shrink-0">{t("opacidad")}</span>
            <Barra lleno={0.9} perilla />
          </Fila>
        </span>
      </Fila>
    </Vista>
  );
}

function Colores() {
  const t = useTranslations("featuresMarca.vistas.colores");
  return (
    <Vista>
      <Fila className="gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white text-[18px] font-black text-[#2B59FF]">B</span>
        <span className="flex gap-1.5">
          {["#2B59FF", "#FF8A00", "#0A0A0A", "#FFFFFF"].map((c) => (
            <span key={c} className="h-8 w-8 rounded-md shadow-[inset_0_0_0_1px_#3A3A36]" style={{ background: c }} />
          ))}
        </span>
      </Fila>
      <Chip tono="amarillo">{t("usar")}</Chip>
    </Vista>
  );
}

function EstiloMarca() {
  const t = useTranslations("featuresMarca.vistas.estiloMarca");
  return (
    <Vista>
      {[
        { cliente: "A", estilo: "Karaoke", color: "#FFD400" },
        { cliente: "B", estilo: "Editorial", color: "#2B59FF" },
        { cliente: "C", estilo: "Bestia", color: "#FF4D3D" },
      ].map((f) => (
        <Fila key={f.cliente} className="justify-between rounded-md bg-[#0A0A0A] px-2.5 py-1.5 shadow-[inset_0_0_0_1px_#2E2E2B]">
          <Fila>
            <span className="h-2 w-2 rounded-full" style={{ background: f.color }} />
            <span className="text-white">{t("cliente", { letra: f.cliente })}</span>
          </Fila>
          <Chip>{f.estilo}</Chip>
        </Fila>
      ))}
    </Vista>
  );
}

function AplicaSolo() {
  const t = useTranslations("featuresMarca.vistas.aplicaSolo");
  return (
    <Vista>
      <Fila>
        <Chip tono="ok">{t("clip1")}</Chip>
        <Chip tono="ok">{t("clip2")}</Chip>
      </Fila>
      <Fila className="justify-between rounded-md bg-[#0A0A0A] px-2.5 py-2 shadow-[inset_0_0_0_1px_#2E2E2B]">
        <span className="text-white">{t("logo")}</span>
        <Interruptor encendido={false} />
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

export const VISTAS_MARCA = {
  logo: Logo,
  colores: Colores,
  estiloMarca: EstiloMarca,
  aplicaSolo: AplicaSolo,
};
