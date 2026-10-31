import { useTranslations } from "next-intl";
import { Barra, Chip, Cifra, Cuadro, Fila, Flecha, Interruptor, Semana, Vista } from "./base";

/** Subir clips ya editados (ng-creator-be#181): las vistas previas de cada tarjeta. */

function SoltarVarios() {
  const t = useTranslations("featuresSubirClips.vistas.soltarVarios");
  return (
    <Vista>
      <div className="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed border-[#FFD400]/60 px-3 py-2 text-center">
        <span className="font-[family-name:var(--font-archivo)] text-[13px] font-bold text-white">{t("soltar")}</span>
        <span>MP4 · MOV</span>
      </div>
      {(["a1", "a2"] as const).map((a, i) => (
        <Fila key={a}>
          <span className="w-[110px] truncate">{t(a)}</span>
          <Barra lleno={i === 0 ? 1 : 0.55} />
          <span>{i === 0 ? "100%" : "55%"}</span>
        </Fila>
      ))}
    </Vista>
  );
}

function TalCual() {
  const t = useTranslations("featuresSubirClips.vistas.talCual");
  return (
    <Vista>
      <Fila className="justify-center">
        <Cuadro className="!h-[72px] !w-[40px]" />
        <Flecha />
        <Cuadro className="!h-[72px] !w-[40px]" marcado />
      </Fila>
      <Fila className="justify-center">
        <Chip>{t("exportado")}</Chip>
        <span>=</span>
        <Chip tono="ok">{t("publicado")}</Chip>
      </Fila>
    </Vista>
  );
}

function Retocar() {
  const t = useTranslations("featuresSubirClips.vistas.retocar");
  return (
    <Vista>
      {(["subtitulos", "plantilla", "gancho"] as const).map((k, i) => (
        <Fila key={k} className="justify-between">
          <span className={i === 0 ? "text-white" : ""}>{t(k)}</span>
          <Interruptor encendido={i === 0} />
        </Fila>
      ))}
      <span>{t("pie")}</span>
    </Vista>
  );
}

function ProgramarSubido() {
  const t = useTranslations("featuresSubirClips.vistas.programarSubido");
  return (
    <Vista>
      <Semana
        dias={(["lun", "mar", "mie", "jue", "vie"] as const).map((d, i) => ({ nombre: t(d), eventos: ["ab", "a", "b-", "aa", "a"][i] }))}
      />
      <span>{t("pie")}</span>
    </Vista>
  );
}

function RevisarSubido() {
  const t = useTranslations("featuresSubirClips.vistas.revisarSubido");
  return (
    <Vista>
      <Fila>
        <Cuadro className="!h-[44px] !w-[26px]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-white">{t("clip")}</span>
          <span>{t("cliente")}</span>
        </span>
        <Chip tono="amarillo">{t("porRevisar")}</Chip>
      </Fila>
      <Fila className="justify-end">
        <Chip>{t("cambios")}</Chip>
        <Chip tono="ok">{t("aprobar")}</Chip>
      </Fila>
    </Vista>
  );
}

function MedirSubido() {
  const t = useTranslations("featuresSubirClips.vistas.medirSubido");
  return (
    <Vista>
      <Fila className="justify-between">
        <span className="flex flex-col">
          <Cifra>12,4k</Cifra>
          <span>{t("vistas")}</span>
        </span>
        <span className="flex flex-col">
          <Cifra>68%</Cifra>
          <span>{t("retencion")}</span>
        </span>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function SinHoras() {
  const t = useTranslations("featuresSubirClips.vistas.sinHoras");
  return (
    <Vista>
      <Fila className="justify-between">
        <span className="text-white">{t("plan")}</span>
        <span>14 / 20 h</span>
      </Fila>
      <Fila>
        <Barra lleno={0.7} />
      </Fila>
      <Fila className="justify-between">
        <span>{t("subidos")}</span>
        <Chip tono="ok">0 h</Chip>
      </Fila>
    </Vista>
  );
}

function DesdeCelular() {
  const t = useTranslations("featuresSubirClips.vistas.desdeCelular");
  return (
    <Vista className="items-center">
      <div className="flex h-[150px] w-[84px] flex-col gap-1.5 rounded-[14px] border-2 border-[#3A3A36] bg-[#0A0A0A] p-1.5">
        <span className="text-center text-[8px] text-white">{t("galeria")}</span>
        <div className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <Cuadro key={i} className="!h-[34px] !w-full" marcado={i < 2} />
          ))}
        </div>
        <span className="mt-auto rounded bg-[#FFD400] py-0.5 text-center text-[8px] font-bold text-[#0A0A0A]">{t("subir")}</span>
      </div>
    </Vista>
  );
}

export const VISTAS_SUBIR_CLIPS = {
  soltarVarios: SoltarVarios,
  talCual: TalCual,
  retocar: Retocar,
  programarSubido: ProgramarSubido,
  revisarSubido: RevisarSubido,
  medirSubido: MedirSubido,
  sinHoras: SinHoras,
  desdeCelular: DesdeCelular,
};
