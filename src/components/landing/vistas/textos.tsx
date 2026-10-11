import { useTranslations } from "next-intl";
import { Campo, Chip, Fila, Flecha, Pista, Resalta, Vista } from "./base";

/** Textos y subtítulos: las vistas previas de cada tarjeta. */

/** Un cuadro vertical oscuro, para poner textos encima. */
function Pantalla({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative flex h-[146px] w-[84px] shrink-0 flex-col items-center overflow-hidden rounded-md border border-[#3A3A36] bg-[repeating-linear-gradient(135deg,#2A2A27_0_6px,#232321_6px_12px)] p-1.5 ${className}`}>
      {children}
    </span>
  );
}

function Subtitulos() {
  const t = useTranslations("featuresTextos.vistas.subtitulos");
  return (
    <Vista>
      <Fila className="gap-4">
        <Pantalla className="justify-end pb-5">
          <span className="text-center font-[family-name:var(--font-archivo)] text-[10px] font-black uppercase leading-tight text-white">
            {t("antes")} <span className="text-[#FFD400]">{t("palabra")}</span> {t("despues")}
          </span>
        </Pantalla>
        <span className="flex min-w-0 flex-col gap-1.5">
          <span>{t("arrastrar")}</span>
          <Chip tono="ok">{t("transcripcion")}</Chip>
        </span>
      </Fila>
    </Vista>
  );
}

function Corregir() {
  const t = useTranslations("featuresTextos.vistas.corregir");
  return (
    <Vista>
      <Campo>
        {t("frase")} <span className="text-[#FF4D3D] line-through">Clipfain</span> <Resalta>Clipfine</Resalta>
      </Campo>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Estilos() {
  const t = useTranslations("featuresTextos.vistas.estilos");
  return (
    <Vista>
      <span>{t("viral")}</span>
      <Fila className="flex-wrap">
        <Chip tono="amarillo">Pop</Chip>
        <Chip>Karaoke</Chip>
        <Chip>Bestia</Chip>
      </Fila>
      <span>{t("profesional")}</span>
      <Fila className="flex-wrap">
        <Chip>Editorial</Chip>
        <Chip>Keynote</Chip>
        <Chip>Minimo</Chip>
      </Fila>
    </Vista>
  );
}

function TextosDiseno() {
  const t = useTranslations("featuresTextos.vistas.textosDiseno");
  return (
    <Vista>
      <span className="self-start rounded bg-[#FFD400] px-2 py-1 font-[family-name:var(--font-archivo)] text-[15px] font-black uppercase text-[#0A0A0A]">
        {t("texto")}
      </span>
      <Fila className="flex-wrap">
        <Chip>Anton</Chip>
        <Chip>{t("contorno")}</Chip>
        <Chip tono="amarillo">{t("caja")}</Chip>
        <Chip>{t("sombra")}</Chip>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Gancho() {
  const t = useTranslations("featuresTextos.vistas.gancho");
  return (
    <Vista>
      <Fila className="gap-4">
        <Pantalla>
          <span className="mt-3 rounded-sm bg-[#FFD400] px-1 text-center font-[family-name:var(--font-archivo)] text-[11px] font-black uppercase leading-tight text-[#0A0A0A]">
            {t("frase")}
          </span>
        </Pantalla>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span>{t("cuando")}</span>
          <Pista tramos={[[0, 0.18]]} />
        </span>
      </Fila>
    </Vista>
  );
}

function Cta() {
  const t = useTranslations("featuresTextos.vistas.cta");
  return (
    <Vista>
      <Fila className="gap-4">
        <Pantalla className="justify-center">
          <span className="rounded-sm bg-[#FFD400] px-1.5 py-1 text-center text-[9px] font-bold leading-tight text-[#0A0A0A]">{t("texto")}</span>
        </Pantalla>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span>{t("cuando")}</span>
          <Pista tramos={[[0.85, 1]]} />
          <Fila>
            <Flecha />
            <span>{t("color")}</span>
          </Fila>
        </span>
      </Fila>
    </Vista>
  );
}

export const VISTAS_TEXTOS = {
  subtitulos: Subtitulos,
  corregir: Corregir,
  estilos: Estilos,
  textosDiseno: TextosDiseno,
  gancho: Gancho,
  cta: Cta,
};
