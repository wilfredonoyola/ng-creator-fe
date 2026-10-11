import { useTranslations } from "next-intl";
import { Campo, Chip, Cuadro, Fila, Onda, Pista, Vista } from "./base";

/** Edición: las vistas previas de cada tarjeta. */

function Editor() {
  const t = useTranslations("featuresEdicion.vistas.editor");
  return (
    <Vista>
      <Fila>
        <Chip>↶ {t("deshacer")}</Chip>
        <Chip>↷ {t("rehacer")}</Chip>
      </Fila>
      <Fila>
        <span className="w-12 shrink-0">{t("video")}</span>
        <Pista tramos={[[0.05, 0.95]]} />
      </Fila>
      <Fila>
        <span className="w-12 shrink-0">{t("textos")}</span>
        <Pista tramos={[[0.05, 0.3], [0.6, 0.8]]} />
      </Fila>
      <Fila>
        <span className="w-12 shrink-0">{t("audio")}</span>
        <span className="h-6 flex-1">
          <Onda alto={18} />
        </span>
      </Fila>
    </Vista>
  );
}

function Guardado() {
  const t = useTranslations("featuresEdicion.vistas.guardado");
  return (
    <Vista>
      <Fila>
        <Chip tono="ok">{t("estado")}</Chip>
        <span>{t("cuando")}</span>
      </Fila>
      <Campo>{t("cambio")}</Campo>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Tramo() {
  const t = useTranslations("featuresEdicion.vistas.tramo");
  return (
    <Vista>
      <span className="relative block h-8 rounded-sm bg-[#0A0A0A] shadow-[inset_0_0_0_1px_#2E2E2B]">
        <span className="absolute inset-y-0 left-[22%] right-[30%] rounded-sm bg-[#FFD400]/80" />
        <span className="absolute inset-y-[-3px] left-[22%] w-1.5 -translate-x-1/2 rounded bg-white" />
        <span className="absolute inset-y-[-3px] right-[30%] w-1.5 translate-x-1/2 rounded bg-white" />
      </span>
      <Fila>
        <Chip>{t("antes")}</Chip>
        <Chip tono="amarillo">{t("despues")}</Chip>
      </Fila>
    </Vista>
  );
}

function Cortes() {
  const t = useTranslations("featuresEdicion.vistas.cortes");
  return (
    <Vista>
      <Pista tramos={[[0, 1]]} cortes={[[0.36, 0.52]]} />
      <Campo>
        {t("antes")} <span className="text-[#FF4D3D] line-through">{t("cortado")}</span> {t("despues")}
      </Campo>
    </Vista>
  );
}

function Silencios() {
  const t = useTranslations("featuresEdicion.vistas.silencios");
  return (
    <Vista>
      <span className="relative block h-8">
        <Onda alto={26} />
        {[0.18, 0.55, 0.82].map((x) => (
          <span
            key={x}
            className="absolute inset-y-0 w-[7%] bg-[repeating-linear-gradient(135deg,#FF4D3D_0_3px,transparent_3px_6px)] opacity-80"
            style={{ left: `${x * 100}%` }}
          />
        ))}
      </span>
      <Fila>
        <Chip tono="amarillo">{t("marcados")}</Chip>
        <span>{t("pie")}</span>
      </Fila>
    </Vista>
  );
}

function AutoEncuadre() {
  const t = useTranslations("featuresEdicion.vistas.autoEncuadre");
  return (
    <Vista>
      <Fila>
        <span className="relative h-[58px] w-[104px] shrink-0 rounded-[4px] border border-[#3A3A36] bg-[repeating-linear-gradient(135deg,#2A2A27_0_6px,#232321_6px_12px)]">
          <span className="absolute inset-y-1 left-[58%] w-[32%] rounded-[3px] border-2 border-[#FFD400]" />
        </span>
        <span className="text-base text-[#FFD400]">→</span>
        <Cuadro />
      </Fila>
      <Fila className="flex-wrap">
        <Chip tono="amarillo">{t("habla")}</Chip>
        <Chip>{t("labios")}</Chip>
      </Fila>
    </Vista>
  );
}

function EncuadreManual() {
  const t = useTranslations("featuresEdicion.vistas.encuadreManual");
  return (
    <Vista>
      <span className="relative mx-auto h-[86px] w-[152px] rounded-[4px] border border-[#3A3A36] bg-[repeating-linear-gradient(135deg,#2A2A27_0_6px,#232321_6px_12px)]">
        <span className="absolute inset-y-2 left-[18%] w-[30%] rounded-[3px] border-2 border-dashed border-[#FFD400]" />
        <span className="absolute bottom-1 left-[44%] h-2.5 w-2.5 rounded-sm bg-[#FFD400]" />
      </span>
      <span className="text-center">{t("pie")}</span>
    </Vista>
  );
}

function Formatos() {
  return (
    <Vista>
      <Fila className="items-end justify-center gap-5">
        <span className="flex flex-col items-center gap-1.5">
          <span className="block h-[72px] w-[41px] rounded-[4px] border-2 border-[#FFD400] bg-[#2A2A27]" />
          <span className="text-white">9:16</span>
        </span>
        <span className="flex flex-col items-center gap-1.5">
          <span className="block h-[56px] w-[56px] rounded-[4px] border border-[#3A3A36] bg-[#2A2A27]" />
          <span>1:1</span>
        </span>
        <span className="flex flex-col items-center gap-1.5">
          <span className="block h-[45px] w-[80px] rounded-[4px] border border-[#3A3A36] bg-[#2A2A27]" />
          <span>16:9</span>
        </span>
      </Fila>
    </Vista>
  );
}

function Disenos() {
  const t = useTranslations("featuresEdicion.vistas.disenos");
  return (
    <Vista>
      <Fila className="justify-center gap-3">
        <span className="flex h-[72px] w-[41px] flex-col gap-[3px] rounded-[4px] border-2 border-[#FFD400] p-[3px]">
          <span className="flex-1 rounded-[2px] bg-[#3A3A36]" />
          <span className="flex-1 rounded-[2px] bg-[#55554F]" />
        </span>
        <span className="flex flex-col gap-1.5">
          <Fila className="flex-wrap gap-1.5">
            <Chip>{t("uno")}</Chip>
            <Chip tono="amarillo">{t("dividido")}</Chip>
          </Fila>
          <Fila className="flex-wrap gap-1.5">
            <Chip>{t("horizontal")}</Chip>
            <Chip>{t("centrado")}</Chip>
          </Fila>
        </span>
      </Fila>
    </Vista>
  );
}

function Fondo() {
  const t = useTranslations("featuresEdicion.vistas.fondo");
  return (
    <Vista>
      <Fila className="justify-center gap-6">
        <span className="flex flex-col items-center gap-1.5">
          <span className="flex h-[78px] w-[44px] flex-col overflow-hidden rounded-[4px] border border-[#3A3A36]">
            <span className="flex-1 bg-[#4A4A45] blur-[2px]" />
            <span className="h-[26px] bg-[repeating-linear-gradient(135deg,#2A2A27_0_6px,#232321_6px_12px)]" />
            <span className="flex-1 bg-[#4A4A45] blur-[2px]" />
          </span>
          <span>{t("desenfocado")}</span>
        </span>
        <span className="flex flex-col items-center gap-1.5">
          <span className="flex h-[78px] w-[44px] flex-col overflow-hidden rounded-[4px] border border-[#3A3A36]">
            <span className="flex flex-1 items-center justify-center bg-black text-[7px] text-white">Aa</span>
            <span className="h-[26px] bg-[repeating-linear-gradient(135deg,#2A2A27_0_6px,#232321_6px_12px)]" />
            <span className="flex-1 bg-black" />
          </span>
          <span>{t("negro")}</span>
        </span>
      </Fila>
    </Vista>
  );
}

function Velocidad() {
  const t = useTranslations("featuresEdicion.vistas.velocidad");
  return (
    <Vista>
      <Fila className="flex-wrap gap-1.5">
        {["0.5x", "0.75x", "1x", "1.25x", "1.5x", "2x"].map((v) => (
          <Chip key={v} tono={v === "1.25x" ? "amarillo" : "normal"}>
            {v}
          </Chip>
        ))}
      </Fila>
      <Campo>
        {t("dura")} <span className="text-[#FFD400]">0:50 → 0:40</span>
      </Campo>
      <span>{t("pie")}</span>
    </Vista>
  );
}

export const VISTAS_EDICION = {
  editor: Editor,
  guardado: Guardado,
  tramo: Tramo,
  cortes: Cortes,
  silencios: Silencios,
  autoEncuadre: AutoEncuadre,
  encuadreManual: EncuadreManual,
  formatos: Formatos,
  disenos: Disenos,
  fondo: Fondo,
  velocidad: Velocidad,
};
