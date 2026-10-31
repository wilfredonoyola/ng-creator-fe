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

function PedirMomentos() {
  const t = useTranslations("featuresIa.vistas.pedirMomentos");
  return (
    <Vista className="gap-1.5">
      <Campo>
        <span className="text-[#FFD400]">✨</span> {t("pedido")}
      </Campo>
      {(["t1", "t2", "t3"] as const).map((k, i) => (
        <Fila key={k}>
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] bg-[#FFD400] text-[9px] text-[#0A0A0A]">✓</span>
          <span className="min-w-0 flex-1 truncate">{t(k)}</span>
          <span className="tabular-nums text-[#8A8983]">{["4:10", "18:32", "41:05"][i]}</span>
        </Fila>
      ))}
      <Fila>
        <Chip tono="amarillo">{t("crear")}</Chip>
      </Fila>
    </Vista>
  );
}

function DesdeChatgpt() {
  const t = useTranslations("featuresIa.vistas.desdeChatgpt");
  return (
    <Vista>
      <Fila className="justify-end">
        <span className="rounded-lg bg-white/10 px-2 py-1">{t("pregunta")}</span>
      </Fila>
      <Fila>
        <span className="rounded-lg border border-[#FFD400]/40 px-2 py-1">{t("respuesta")}</span>
      </Fila>
    </Vista>
  );
}

export const VISTAS_IA = {
  momentos: Momentos,
  puntaje: Puntaje,
  sugeridos: Sugeridos,
  aMano: AMano,
  pedirMomentos: PedirMomentos,
  desdeChatgpt: DesdeChatgpt,
};
