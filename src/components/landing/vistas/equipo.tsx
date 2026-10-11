import { useTranslations } from "next-intl";
import { Avatar, Campo, Chip, Cuadro, Fila, Flecha, Resalta, Vista } from "./base";

/** Equipo y marcas: las vistas previas de cada tarjeta. */

const CLIENTES = [
  { letra: "A", color: "#FFD400" },
  { letra: "B", color: "#FF4D3D" },
  { letra: "C", color: "#FFFFFF" },
];

function Marcas() {
  const t = useTranslations("featuresEquipo.vistas.marcas");
  return (
    <Vista>
      {CLIENTES.map((c) => (
        <Fila key={c.letra}>
          <Avatar letra={c.letra} color={c.color} />
          <span className="min-w-0 flex-1 truncate text-white">{t("cliente", { letra: c.letra })}</span>
          <span>{t("detalle")}</span>
        </Fila>
      ))}
    </Vista>
  );
}

function Roles() {
  const t = useTranslations("featuresEquipo.vistas.roles");
  return (
    <Vista>
      <Fila>
        <Avatar letra="A" />
        <span className="min-w-0 flex-1 truncate text-white">Ana</span>
        <Chip tono="amarillo">{t("propietario")}</Chip>
      </Fila>
      <Fila>
        <Avatar letra="L" color="#FFFFFF" />
        <span className="min-w-0 flex-1 truncate text-white">Leo</span>
        <Chip>{t("editor")}</Chip>
      </Fila>
      <Fila>
        <Avatar letra="M" color="#FF4D3D" />
        <span className="min-w-0 flex-1 truncate text-white">Marta</span>
        <Chip>{t("revisor")}</Chip>
      </Fila>
    </Vista>
  );
}

function Invitaciones() {
  const t = useTranslations("featuresEquipo.vistas.invitaciones");
  return (
    <Vista>
      <Campo>leo@agencia.com</Campo>
      <Fila>
        <Chip>{t("rol")}</Chip>
        <Chip>{t("marca")}</Chip>
        <Flecha />
        <Chip tono="amarillo">{t("invitar")}</Chip>
      </Fila>
    </Vista>
  );
}

function Tomar() {
  const t = useTranslations("featuresEquipo.vistas.tomar");
  return (
    <Vista>
      <Fila>
        <Cuadro />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-white">{t("clip")}</span>
          <span className="flex items-center gap-1.5">
            <Avatar letra="L" color="#FFFFFF" />
            <span>{t("deQuien")}</span>
          </span>
        </span>
      </Fila>
      <Campo>
        <Resalta>{t("aviso")}</Resalta>
      </Campo>
    </Vista>
  );
}

function Listos() {
  const t = useTranslations("featuresEquipo.vistas.listos");
  return (
    <Vista>
      <Fila>
        <Cuadro />
        <Chip tono="ok">{t("terminado")}</Chip>
        <Flecha />
        <Chip tono="amarillo">{t("calendario")}</Chip>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Autoria() {
  const t = useTranslations("featuresEquipo.vistas.autoria");
  return (
    <Vista>
      <Fila>
        <Avatar letra="A" />
        <span>{t("edito")}</span>
      </Fila>
      <Fila>
        <Avatar letra="L" color="#FFFFFF" />
        <span>{t("termino")}</span>
      </Fila>
      <Fila>
        <Avatar letra="M" color="#FF4D3D" />
        <span>{t("programo")}</span>
      </Fila>
    </Vista>
  );
}

function Avisos() {
  const t = useTranslations("featuresEquipo.vistas.avisos");
  return (
    <Vista>
      <Campo>
        <span className="font-bold text-white">{t("listo")}</span>
        <br />
        {t("listoDetalle")}
      </Campo>
      <Campo>
        <span className="font-bold text-white">{t("publicado")}</span>
        <br />
        {t("publicadoDetalle")}
      </Campo>
    </Vista>
  );
}

function Idiomas() {
  const t = useTranslations("featuresEquipo.vistas.idiomas");
  return (
    <Vista>
      <span>{t("rotulo")}</span>
      <span className="flex self-start rounded-md bg-[#0A0A0A] p-1 text-[13px] font-bold shadow-[inset_0_0_0_1px_#2E2E2B]">
        <span className="rounded bg-[#FFD400] px-3 py-1 text-[#0A0A0A]">ES</span>
        <span className="px-3 py-1 text-[#D9D8D2]">EN</span>
      </span>
      <span>{t("pie")}</span>
    </Vista>
  );
}

export const VISTAS_EQUIPO = {
  marcas: Marcas,
  roles: Roles,
  invitaciones: Invitaciones,
  tomar: Tomar,
  listos: Listos,
  autoria: Autoria,
  avisos: Avisos,
  idiomas: Idiomas,
};
