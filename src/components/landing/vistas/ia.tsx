import { useTranslations } from "next-intl";
import { Barra, Campo, Chip, Cifra, Fila, Pista, Resalta, Vista } from "./base";

/** Clips con IA: las vistas previas de cada tarjeta. */

function Momentos() {
  const t = useTranslations("featuresIa.vistas.momentos");
  return (
    <Vista>
      <span>{t("episodio")}</span>
      <Fila>
        <Pista tramos={[[0.06, 0.12], [0.21, 0.27], [0.38, 0.43], [0.55, 0.62], [0.71, 0.76], [0.86, 0.92]]} />
      </Fila>
      <Fila>
        <Chip tono="amarillo">{t("listos")}</Chip>
        <span>{t("pie")}</span>
      </Fila>
    </Vista>
  );
}

function Puntaje() {
  const t = useTranslations("featuresIa.vistas.puntaje");
  return (
    <Vista>
      <Fila className="gap-4">
        <Cifra className="text-[#FFD400]">92</Cifra>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Barra lleno={0.92} />
          <span>{t("escala")}</span>
        </span>
      </Fila>
      <Fila className="flex-wrap">
        <Chip tono="amarillo">{t("motivo")}</Chip>
        <Chip>{t("otro")}</Chip>
      </Fila>
    </Vista>
  );
}

function Sugeridos() {
  const t = useTranslations("featuresIa.vistas.sugeridos");
  return (
    <Vista>
      <Campo>
        <span className="text-[#8A8983]">{t("tituloEtiqueta")}</span> {t("titulo")}
      </Campo>
      <Campo>
        <span className="text-[#8A8983]">{t("ganchoEtiqueta")}</span> <Resalta>{t("gancho")}</Resalta>
      </Campo>
    </Vista>
  );
}

function AMano() {
  const t = useTranslations("featuresIa.vistas.aMano");
  return (
    <Vista>
      <Campo>
        {t("antes")} <span className="rounded-sm bg-[#FFD400] px-0.5 text-[#0A0A0A]">{t("elegido")}</span> {t("despues")}
      </Campo>
      <Fila>
        <Chip>12:04</Chip>
        <span className="text-[#FFD400]">→</span>
        <Chip>12:51</Chip>
        <Chip tono="amarillo">{t("crear")}</Chip>
      </Fila>
    </Vista>
  );
}

export const VISTAS_IA = {
  momentos: Momentos,
  puntaje: Puntaje,
  sugeridos: Sugeridos,
  aMano: AMano,
};
