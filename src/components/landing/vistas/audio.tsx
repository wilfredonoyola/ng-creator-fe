import { useTranslations } from "next-intl";
import { Barra, Chip, Fila, Interruptor, Onda, Vista } from "./base";

/** Audio y música: las vistas previas de cada tarjeta. */

function VolumenVoz() {
  const t = useTranslations("featuresAudio.vistas.volumenVoz");
  return (
    <Vista>
      <span className="h-7">
        <Onda color="#FFD400" alto={26} />
      </span>
      <Fila>
        <span className="w-10 shrink-0">{t("voz")}</span>
        <Barra lleno={0.44} perilla />
        <span className="w-10 shrink-0 text-right text-white">175%</span>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function Musica() {
  const t = useTranslations("featuresAudio.vistas.musica");
  return (
    <Vista>
      <Fila className="justify-between rounded-md bg-[#0A0A0A] px-2.5 py-2 shadow-[inset_0_0_0_1px_#FFD400]">
        <span className="truncate text-white">♪ {t("pista1")}</span>
        <span className="shrink-0 text-[10px]">{t("libre")}</span>
      </Fila>
      <Fila className="justify-between rounded-md bg-[#0A0A0A] px-2.5 py-2 shadow-[inset_0_0_0_1px_#2E2E2B]">
        <span className="truncate text-white">♪ {t("pista2")}</span>
        <span className="shrink-0 text-[10px]">{t("tuya")}</span>
      </Fila>
      <Fila>
        <span className="shrink-0">{t("volumen")}</span>
        <Barra lleno={0.25} perilla />
        <span className="shrink-0 text-white">25%</span>
      </Fila>
    </Vista>
  );
}

/** Lo alto de la música en cada tramo: baja donde hay voz. */
const MUSICA = [1, 1, 0.35, 0.35, 0.35, 0.35, 1, 1, 0.35, 0.35, 0.35, 1];
const VOZ = [0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0];

function BajarAlHablar() {
  const t = useTranslations("featuresAudio.vistas.bajarAlHablar");
  return (
    <Vista>
      <Fila>
        <span className="w-12 shrink-0">{t("voz")}</span>
        <span className="flex h-5 flex-1 items-end gap-[2px]">
          {VOZ.map((v, i) => (
            <span key={i} className="flex-1 rounded-[1px] bg-white" style={{ height: v ? "100%" : "10%" }} />
          ))}
        </span>
      </Fila>
      <Fila>
        <span className="w-12 shrink-0">{t("musica")}</span>
        <span className="flex h-5 flex-1 items-end gap-[2px]">
          {MUSICA.map((m, i) => (
            <span key={i} className="flex-1 rounded-[1px] bg-[#FFD400]" style={{ height: `${m * 100}%` }} />
          ))}
        </span>
      </Fila>
      <Fila className="justify-between">
        <span className="text-[#D9D8D2]">{t("opcion")}</span>
        <Interruptor />
      </Fila>
    </Vista>
  );
}

function Efectos() {
  const t = useTranslations("featuresAudio.vistas.efectos");
  return (
    <Vista>
      <Fila className="flex-wrap">
        <Chip tono="amarillo">{t("tambor")}</Chip>
        <Chip>{t("whoosh")}</Chip>
        <Chip>{t("aplauso")}</Chip>
      </Fila>
      <span className="relative block h-7 rounded-sm bg-[#0A0A0A] shadow-[inset_0_0_0_1px_#2E2E2B]">
        {[0.1, 0.42, 0.78].map((x, i) => (
          <span key={x} className={`absolute top-1 h-5 w-5 rounded ${i === 0 ? "bg-[#FFD400]" : "bg-white"}`} style={{ left: `${x * 100}%` }} />
        ))}
        <span className="absolute inset-y-0 left-[30%] w-px bg-[#FF4D3D]" />
      </span>
      <span>{t("pie")}</span>
    </Vista>
  );
}

export const VISTAS_AUDIO = {
  volumenVoz: VolumenVoz,
  musica: Musica,
  bajarAlHablar: BajarAlHablar,
  efectos: Efectos,
};
