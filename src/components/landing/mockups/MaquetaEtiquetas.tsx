import { useTranslations } from "next-intl";
import { Bloque, IconoRed, Maqueta, Rotulo, type Red } from "./base";

const POR_RED: { red: Red; texto: string; etiqueta?: boolean }[] = [
  { red: "Instagram", texto: "@ana.radio", etiqueta: true },
  { red: "TikTok", texto: "@anaradio" },
  { red: "YouTube", texto: "@AnaRadioTV" },
  { red: "Facebook", texto: "Ana Radio" },
];

/** Etiquetas: la descripción con "@Ana" y cómo sale en cada red. */
export function MaquetaEtiquetas() {
  const t = useTranslations("landingMockups.etiquetas");
  return (
    <Maqueta alt={t("alt")}>
      <Bloque className="flex flex-col gap-2">
        <Rotulo>{t("descripcion")}</Rotulo>
        <p className="font-[family-name:var(--font-archivo)] text-[14px] leading-snug text-white">
          {t("texto")} <span className="rounded bg-[#5B8DFF]/25 px-1 text-white shadow-[0_0_0_1px_rgba(91,141,255,.5)]">@Ana Radio</span> {t("textoFin")}
        </p>
        <div className="mt-1 overflow-hidden rounded-md border border-[#2E2E2B] bg-[#141413]">
          {["Ana Radio", "Andrés Paz"].map((n, i) => (
            <span key={n} className={`flex items-center gap-2 px-2.5 py-1.5 ${i === 0 ? "bg-white/10 text-white" : ""}`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFD400] text-[9px] font-bold text-[#0A0A0A]">{n[0]}</span>
              <span className="flex-1">{n}</span>
              <span className="flex gap-1">
                {(["Instagram", "TikTok", "YouTube"] as Red[]).map((r) => (
                  <IconoRed key={r} red={r} tamano={10} color="#8A8983" />
                ))}
              </span>
            </span>
          ))}
        </div>
      </Bloque>
      <div className="grid grid-cols-2 gap-2">
        {POR_RED.map((x) => (
          <Bloque key={x.red} className="flex items-center gap-2 !p-2.5">
            <IconoRed red={x.red} tamano={13} />
            <span className="min-w-0 flex-1 truncate text-white">{x.texto}</span>
            {x.etiqueta && <span className="rounded-sm bg-[#FFD400] px-1 text-[9px] font-bold text-[#0A0A0A]">{t("etiqueta")}</span>}
          </Bloque>
        ))}
      </div>
      <span className="flex items-center gap-1.5 text-[10px] text-[#49D17D]">✓ {t("verificada")}</span>
    </Maqueta>
  );
}
