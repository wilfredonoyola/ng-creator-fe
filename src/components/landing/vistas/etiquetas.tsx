import { useTranslations } from "next-intl";
import { Avatar, Campo, Chip, Fila, Flecha, Resalta, Vista } from "./base";

/** Etiquetas: las vistas previas de cada tarjeta. */

function Menciones() {
  const t = useTranslations("featuresEtiquetas.vistas.menciones");
  return (
    <Vista>
      <Campo>
        {t("texto")} <Resalta>@Ana Radio</Resalta>
      </Campo>
      <Fila>
        <Chip>Instagram</Chip>
        <Flecha />
        <span className="text-white">@ana.radio</span>
      </Fila>
      <Fila>
        <Chip>TikTok</Chip>
        <Flecha />
        <span className="text-white">@anaradio</span>
      </Fila>
    </Vista>
  );
}

function TresNiveles() {
  const t = useTranslations("featuresEtiquetas.vistas.tresNiveles");
  return (
    <Vista>
      <Fila>
        <Chip tono="amarillo">{t("elenco")}</Chip>
        <span className="text-white">Ana · Leo</span>
      </Fila>
      <Fila>
        <Chip>{t("global")}</Chip>
        <span className="text-white">Sofi · Martín · Cami</span>
      </Fila>
      <Fila>
        <Chip tono="apagado">{t("episodio")}</Chip>
        <span className="text-white">Dr. Pérez</span>
        <Flecha />
        <Chip>{t("global")}</Chip>
      </Fila>
    </Vista>
  );
}

function Verificar() {
  const t = useTranslations("featuresEtiquetas.vistas.verificar");
  return (
    <Vista>
      <Fila>
        <Chip tono="ok">@anaradio</Chip>
        <span>{t("existe")}</span>
      </Fila>
      <Fila>
        <Chip tono="error">@anaraido</Chip>
        <span>{t("noExiste")}</span>
      </Fila>
    </Vista>
  );
}

function Sugeridas() {
  const t = useTranslations("featuresEtiquetas.vistas.sugeridas");
  return (
    <Vista>
      <Campo>“{t("frase")}”</Campo>
      <Fila>
        <Avatar letra="P" />
        <span className="min-w-0 flex-1 truncate text-white">Dr. Pérez</span>
        <Chip tono="amarillo">+ {t("sumar")}</Chip>
      </Fila>
      <span>{t("motivo")}</span>
    </Vista>
  );
}

function Colaboradores() {
  const t = useTranslations("featuresEtiquetas.vistas.colaboradores");
  return (
    <Vista>
      <Fila>
        <Chip>Instagram</Chip>
        <Chip tono="amarillo">@cafe.luna</Chip>
      </Fila>
      <Fila>
        <Chip>Facebook</Chip>
        <Chip tono="amarillo">Café Luna</Chip>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Buscar() {
  const t = useTranslations("featuresEtiquetas.vistas.buscar");
  return (
    <Vista>
      <Campo>🔍 {t("busqueda")}</Campo>
      <Fila>
        <Avatar letra="J" color="#FFFFFF" />
        <span className="min-w-0 flex-1 truncate text-white">José Núñez</span>
        <Chip>{t("usada")}</Chip>
      </Fila>
    </Vista>
  );
}

export const VISTAS_ETIQUETAS = {
  menciones: Menciones,
  tresNiveles: TresNiveles,
  verificar: Verificar,
  sugeridas: Sugeridas,
  colaboradores: Colaboradores,
  buscar: Buscar,
};
