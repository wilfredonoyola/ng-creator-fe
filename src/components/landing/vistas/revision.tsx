import { useTranslations } from "next-intl";
import { Avatar, Campo, Chip, Cuadro, Fila, Flecha, Interruptor, Onda, Resalta, Vista } from "./base";

/** Aprobación antes de publicar: las vistas previas de cada tarjeta. */

function PorRevisar() {
  const t = useTranslations("featuresRevision.vistas.porRevisar");
  return (
    <Vista>
      <Fila>
        <Cuadro />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-white">{t("clip")}</span>
          <span className="flex gap-1.5">
            <Chip tono="amarillo">{t("estado")}</Chip>
          </span>
        </span>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Aprobar() {
  const t = useTranslations("featuresRevision.vistas.aprobar");
  return (
    <Vista>
      <Fila>
        <Cuadro />
        <Flecha />
        <Chip tono="amarillo">{t("boton")}</Chip>
      </Fila>
      <Fila>
        <Chip tono="ok">TikTok</Chip>
        <Chip tono="ok">Reels</Chip>
        <Chip tono="ok">Shorts</Chip>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function PedirCambios() {
  const t = useTranslations("featuresRevision.vistas.pedirCambios");
  return (
    <Vista>
      <Fila>
        <Avatar letra="M" />
        <Campo className="min-w-0 flex-1">{t("comentario")}</Campo>
      </Fila>
      <Fila>
        <Chip tono="error">{t("estado")}</Chip>
        <Flecha />
        <Chip>{t("vuelve")}</Chip>
      </Fila>
    </Vista>
  );
}

function NotaVoz() {
  const t = useTranslations("featuresRevision.vistas.notaVoz");
  return (
    <Vista>
      <Fila>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFD400] text-[10px] text-[#0A0A0A]">▶</span>
        <span className="flex h-7 min-w-0 flex-1 items-center">
          <Onda color="#FFD400" alto={20} />
        </span>
        <span>0:14</span>
      </Fila>
      <Campo>
        <Resalta>{t("transcripcion")}</Resalta> {t("texto")}
      </Campo>
    </Vista>
  );
}

function ClienteRevisor() {
  const t = useTranslations("featuresRevision.vistas.clienteRevisor");
  return (
    <Vista>
      <Fila>
        <Avatar letra="C" color="#FFFFFF" />
        <span className="min-w-0 flex-1 truncate text-white">{t("cliente")}</span>
        <Chip tono="amarillo">{t("rol")}</Chip>
      </Fila>
      <Fila>
        <Chip tono="ok">{t("ve")}</Chip>
        <Chip tono="ok">{t("aprueba")}</Chip>
        <Chip tono="apagado">{t("noEdita")}</Chip>
      </Fila>
    </Vista>
  );
}

function Vencimiento() {
  const t = useTranslations("featuresRevision.vistas.vencimiento");
  return (
    <Vista>
      <Campo>
        <Resalta>{t("aviso")}</Resalta>
        <br />
        {t("detalle")}
      </Campo>
      <Fila className="justify-between">
        <span className="text-[#D9D8D2]">{t("publicarIgual")}</span>
        <Interruptor encendido={false} />
      </Fila>
    </Vista>
  );
}

function EditarVuelve() {
  const t = useTranslations("featuresRevision.vistas.editarVuelve");
  return (
    <Vista>
      <Fila>
        <Chip tono="ok">{t("aprobado")}</Chip>
        <Flecha />
        <Chip>{t("editado")}</Chip>
        <Flecha />
        <Chip tono="amarillo">{t("porRevisar")}</Chip>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function AvisosRevision() {
  const t = useTranslations("featuresRevision.vistas.avisosRevision");
  return (
    <Vista>
      <Campo>
        <span className="font-bold text-white">Clipfine</span>
        <br />
        {t("aviso")}
      </Campo>
      <Fila>
        <Chip>{t("app")}</Chip>
        <Chip>{t("push")}</Chip>
        <Chip>{t("correo")}</Chip>
      </Fila>
    </Vista>
  );
}

export const VISTAS_REVISION = {
  porRevisar: PorRevisar,
  aprobar: Aprobar,
  pedirCambios: PedirCambios,
  notaVoz: NotaVoz,
  clienteRevisor: ClienteRevisor,
  vencimiento: Vencimiento,
  editarVuelve: EditarVuelve,
  avisosRevision: AvisosRevision,
};
