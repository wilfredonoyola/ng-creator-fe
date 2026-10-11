import { useTranslations } from "next-intl";
import { Alerta, Barra, Campo, Chip, Cuadro, Fila, Flecha, Resalta, Semana, Vista } from "./base";

/** Publicar y programar: las vistas previas de cada tarjeta. */

function CuatroRedes() {
  const t = useTranslations("featuresPublicar.vistas.cuatroRedes");
  return (
    <Vista>
      <Fila>
        <Cuadro />
        <Flecha />
        <span className="grid grid-cols-2 gap-1.5">
          <Chip tono="ok">TikTok</Chip>
          <Chip tono="ok">Reels</Chip>
          <Chip tono="ok">Shorts</Chip>
          <Chip tono="ok">Facebook</Chip>
        </span>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function SinExportar() {
  const t = useTranslations("featuresPublicar.vistas.sinExportar");
  return (
    <Vista>
      <Fila>
        <Chip>{t("editor")}</Chip>
        <Flecha />
        <Chip tono="amarillo">{t("programar")}</Chip>
      </Fila>
      <Fila>
        <span className="whitespace-nowrap">{t("armando")}</span>
        <Barra lleno={0.68} />
        <span>68%</span>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function PorDefecto() {
  const t = useTranslations("featuresPublicar.vistas.porDefecto");
  return (
    <Vista>
      <span>{t("marca")}</span>
      <Campo>
        {t("descripcion")}
        <br />
        <Resalta>#podcast #emprendedores #clienteB</Resalta>
      </Campo>
      <Fila>
        <Chip tono="ok">@clienteb</Chip>
        <Chip tono="ok">Cliente B TV</Chip>
      </Fila>
    </Vista>
  );
}

function Portada() {
  const t = useTranslations("featuresPublicar.vistas.portada");
  return (
    <Vista>
      <Fila>
        <Cuadro className="!h-[50px] !w-[30px]" />
        <Cuadro className="!h-[50px] !w-[30px]" marcado />
        <Cuadro className="!h-[50px] !w-[30px]" />
        <Cuadro className="!h-[50px] !w-[30px]" />
        <Cuadro className="!h-[50px] !w-[30px]" />
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function ComoSale() {
  const t = useTranslations("featuresPublicar.vistas.comoSale");
  return (
    <Vista>
      <Campo>
        {t("descripcion")} <Alerta>2.312 / 2.200</Alerta>
      </Campo>
      <Fila>
        <Chip tono="error">{t("sePasa")}</Chip>
        <Chip tono="ok">Reels</Chip>
      </Fila>
    </Vista>
  );
}

function Calendario() {
  const t = useTranslations("featuresPublicar.vistas.calendario");
  return (
    <Vista>
      <Semana
        dias={[
          { nombre: t("lun"), eventos: "ab" },
          { nombre: t("mar"), eventos: "c" },
          { nombre: t("mie"), eventos: "a-b" },
          { nombre: t("jue"), eventos: "b" },
          { nombre: t("vie"), eventos: "ac" },
        ]}
      />
    </Vista>
  );
}

function EditarAgendada() {
  const t = useTranslations("featuresPublicar.vistas.editarAgendada");
  return (
    <Vista>
      <Campo>
        {t("antes")} → <Resalta>{t("despues")}</Resalta>
        <br />
        {t("quitar")}
      </Campo>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Reintentar() {
  const t = useTranslations("featuresPublicar.vistas.reintentar");
  return (
    <Vista>
      <Fila>
        <Chip tono="ok">TikTok</Chip>
        <Chip tono="ok">Reels</Chip>
        <Chip tono="error">Facebook</Chip>
      </Fila>
      <Campo>
        {t("motivo")} <Resalta>{t("accion")}</Resalta>
      </Campo>
    </Vista>
  );
}

export const VISTAS_PUBLICAR = {
  cuatroRedes: CuatroRedes,
  sinExportar: SinExportar,
  porDefecto: PorDefecto,
  portada: Portada,
  comoSale: ComoSale,
  calendario: Calendario,
  editarAgendada: EditarAgendada,
  reintentar: Reintentar,
};
