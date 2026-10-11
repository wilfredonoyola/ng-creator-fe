import { useTranslations } from "next-intl";
import { Chip, Cuadro, Fila, Flecha, Pista, Resalta, Campo, Vista } from "./base";

/** Calidad y vista previa: las vistas previas de cada tarjeta. */

function Render() {
  const t = useTranslations("featuresCalidad.vistas.render");
  return (
    <Vista>
      <Fila>
        <Chip>{t("original")} · 60 fps</Chip>
        <Flecha />
        <Chip tono="amarillo">{t("clip")} · 60 fps</Chip>
      </Fila>
      <Fila>
        <Chip tono="ok">1080 × 1920</Chip>
        <Chip tono="ok">{t("sinRecomprimir")}</Chip>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Indicador() {
  const t = useTranslations("featuresCalidad.vistas.indicador");
  return (
    <Vista>
      <Fila>
        <Chip tono="amarillo">{t("excelente")}</Chip>
        <Chip tono="apagado">{t("buena")}</Chip>
        <Chip tono="apagado">{t("baja")}</Chip>
      </Fila>
      <Campo>
        {t("zoom")} <Resalta>{t("consejo")}</Resalta>
      </Campo>
    </Vista>
  );
}

function VistaPrevia() {
  const t = useTranslations("featuresCalidad.vistas.vistaPrevia");
  return (
    <Vista className="!flex-row !items-center !justify-center gap-5">
      <span className="relative block h-[140px] w-[80px] shrink-0 rounded-[10px] border border-[#3A3A36] bg-[repeating-linear-gradient(135deg,#2A2A27_0_6px,#232321_6px_12px)]">
        <span className="absolute right-1.5 top-[38%] flex flex-col gap-1.5">
          <span className="h-3 w-3 rounded-full bg-white/80" />
          <span className="h-3 w-3 rounded-full bg-white/80" />
          <span className="h-3 w-3 rounded-full bg-white/80" />
        </span>
        <span className="absolute inset-x-1.5 bottom-2 flex flex-col gap-1">
          <span className="h-1.5 w-3/4 rounded bg-white/70" />
          <span className="h-1.5 w-1/2 rounded bg-white/50" />
        </span>
        <span className="absolute inset-x-1.5 top-[20%] rounded-sm bg-[#FFD400] px-1 text-center text-[7px] font-bold text-[#0A0A0A]">{t("subtitulo")}</span>
      </span>
      <span className="flex flex-col gap-1.5">
        <Chip tono="amarillo">TikTok</Chip>
        <Chip tono="apagado">Reels</Chip>
        <Chip tono="apagado">Shorts</Chip>
        <Chip tono="apagado">Facebook</Chip>
      </span>
    </Vista>
  );
}

function VersionFacebook() {
  const t = useTranslations("featuresCalidad.vistas.versionFacebook");
  return (
    <Vista>
      <Fila>
        <span className="w-16 shrink-0">{t("clip")}</span>
        <Pista tramos={[[0, 1]]} />
        <span className="shrink-0">2:10</span>
      </Fila>
      <Fila>
        <span className="w-16 shrink-0">Facebook</span>
        <Pista tramos={[[0.18, 0.87]]} />
        <span className="shrink-0">1:30</span>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Descargar() {
  const t = useTranslations("featuresCalidad.vistas.descargar");
  return (
    <Vista>
      <Fila>
        <Cuadro />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-white">{t("archivo")}</span>
          <span>1080 × 1920 · MP4</span>
          <span className="self-start">
            <Chip tono="amarillo">{t("boton")}</Chip>
          </span>
        </span>
      </Fila>
    </Vista>
  );
}

export const VISTAS_CALIDAD = {
  render: Render,
  indicador: Indicador,
  vistaPrevia: VistaPrevia,
  versionFacebook: VersionFacebook,
  descargar: Descargar,
};
