import { useTranslations } from "next-intl";
import { Barra, Chip, Cuadro, Fila, Vista } from "./base";

/** Traer episodios: las vistas previas de cada tarjeta. */

function Subir() {
  const t = useTranslations("featuresImportar.vistas.subir");
  return (
    <Vista>
      <div className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-[#4A4A45] px-3 py-3 text-center">
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-bold text-white">{t("soltar")}</span>
        <span>{t("formatos")}</span>
      </div>
      <Fila>
        <span className="truncate">{t("archivo")}</span>
        <Barra lleno={0.42} />
        <span>42%</span>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Restream() {
  const t = useTranslations("featuresImportar.vistas.restream");
  return (
    <Vista>
      <Fila>
        <Cuadro vertical={false} className="!h-[30px] !w-[52px]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-white">{t("live1")}</span>
          <span>1:24:10</span>
        </span>
        <Chip tono="amarillo">{t("traer")}</Chip>
      </Fila>
      <Fila>
        <Cuadro vertical={false} className="!h-[30px] !w-[52px]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-white">{t("live2")}</span>
          <span>58:42</span>
        </span>
        <Chip tono="ok">{t("traido")}</Chip>
      </Fila>
    </Vista>
  );
}

export const VISTAS_IMPORTAR = {
  subir: Subir,
  restream: Restream,
};
