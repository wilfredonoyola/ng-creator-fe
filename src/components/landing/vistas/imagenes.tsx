import { useTranslations } from "next-intl";
import { Chip, Cuadro, Fila, Flecha, Vista } from "./base";

/** Imágenes: las vistas previas de cada tarjeta. */

/** Una persona recortada: cabeza y hombros, con o sin contorno de sticker. */
function Recorte({ contorno = false, fondo = false }: { contorno?: boolean; fondo?: boolean }) {
  const borde = contorno ? { stroke: "#FFFFFF", strokeWidth: 5, paintOrder: "stroke" as const, strokeLinejoin: "round" as const } : {};
  return (
    <span
      className={`flex h-[84px] w-[70px] shrink-0 items-end justify-center overflow-hidden rounded-md ${
        fondo ? "bg-[repeating-linear-gradient(45deg,#3A3A36_0_5px,#2A2A27_5px_10px)]" : "bg-[#0A0A0A] shadow-[inset_0_0_0_1px_#2E2E2B]"
      }`}
    >
      <svg viewBox="0 0 60 64" className="h-[70px] w-[60px]">
        <circle cx="30" cy="20" r="12" fill="#FFD400" {...borde} />
        <path d="M6 64c0-15 10.5-25 24-25s24 10 24 25z" fill="#FFD400" {...borde} />
      </svg>
    </span>
  );
}

function HastaTres() {
  const t = useTranslations("featuresImagenes.vistas.hastaTres");
  return (
    <Vista>
      <Fila className="gap-3">
        <Cuadro className="!h-[92px] !w-[54px]" />
        <span className="flex min-w-0 flex-col gap-1.5">
          <Fila>
            <Chip tono="ok">{t("foto")}</Chip>
            <Chip tono="ok">{t("logo")}</Chip>
            <Chip tono="apagado">{t("libre")}</Chip>
          </Fila>
          <span>{t("cuando")}</span>
        </span>
      </Fila>
    </Vista>
  );
}

function QuitarFondo() {
  const t = useTranslations("featuresImagenes.vistas.quitarFondo");
  return (
    <Vista>
      <Fila className="gap-3">
        <Recorte fondo />
        <Flecha />
        <Recorte />
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Contorno() {
  const t = useTranslations("featuresImagenes.vistas.contorno");
  return (
    <Vista>
      <Fila className="gap-3">
        <Recorte />
        <Flecha />
        <Recorte contorno />
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

export const VISTAS_IMAGENES = {
  hastaTres: HastaTres,
  quitarFondo: QuitarFondo,
  contorno: Contorno,
};
