import { useTranslations } from "next-intl";
import { Barra, Chip, Cifra, Fila, Vista } from "./base";

/** Métricas: las vistas previas de cada tarjeta. */

function MetricasClip() {
  const t = useTranslations("featuresMetricas.vistas.metricasClip");
  const datos = [
    { k: "vistas", v: "48,2k" },
    { k: "likes", v: "3,1k" },
    { k: "compartidos", v: "412" },
    { k: "seguidores", v: "+186" },
  ] as const;
  return (
    <Vista>
      <div className="grid grid-cols-2 gap-1.5">
        {datos.map((d) => (
          <span key={d.k} className="flex flex-col gap-0.5 rounded-md bg-[#0A0A0A] px-2.5 py-1.5 shadow-[inset_0_0_0_1px_#2E2E2B]">
            <span className="text-[10px]">{t(d.k)}</span>
            <span className="font-[family-name:var(--font-archivo)] text-[17px] font-extrabold leading-none text-white">{d.v}</span>
          </span>
        ))}
      </div>
      <Fila>
        <Chip tono="ok">TikTok</Chip>
        <Chip tono="ok">Reels</Chip>
        <Chip tono="ok">Shorts</Chip>
      </Fila>
    </Vista>
  );
}

/** Una curva chica en SVG: puntos de 0 a 1 en x y en y (1 arriba). */
function Curva({ puntos, relleno = false }: { puntos: [number, number][]; relleno?: boolean }) {
  const d = puntos.map(([x, y], i) => `${i ? "L" : "M"}${(x * 260).toFixed(1)},${((1 - y) * 80 + 4).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 260 88" className="h-[88px] w-full" preserveAspectRatio="none">
      <line x1="0" y1="84" x2="260" y2="84" stroke="#2E2E2B" strokeWidth="1" />
      {relleno && <path d={`${d} L260,84 L0,84 Z`} fill="#FFD400" fillOpacity="0.15" />}
      <path d={d} fill="none" stroke="#FFD400" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Crecimiento() {
  const t = useTranslations("featuresMetricas.vistas.crecimiento");
  return (
    <Vista>
      <Curva relleno puntos={[[0, 0.02], [0.08, 0.2], [0.2, 0.45], [0.35, 0.68], [0.55, 0.82], [0.75, 0.9], [1, 0.95]]} />
      <span className="flex justify-between text-[10px]">
        <span>1 h</span>
        <span>24 h</span>
        <span>7 {t("dias")}</span>
        <span>30 {t("dias")}</span>
        <span>90 {t("dias")}</span>
      </span>
    </Vista>
  );
}

function Retencion() {
  const t = useTranslations("featuresMetricas.vistas.retencion");
  return (
    <Vista>
      <Curva puntos={[[0, 1], [0.06, 0.66], [0.2, 0.55], [0.5, 0.46], [0.8, 0.4], [1, 0.36]]} />
      <Fila className="justify-between">
        <Chip tono="error">{t("seVan")} 34%</Chip>
        <Chip tono="ok">{t("completo")} 36%</Chip>
      </Fila>
    </Vista>
  );
}

function IaVsRealidad() {
  const t = useTranslations("featuresMetricas.vistas.iaVsRealidad");
  const filas = [
    { tipo: "gancho", ia: 92, vistas: 0.9 },
    { tipo: "humor", ia: 81, vistas: 0.62 },
    { tipo: "opinion", ia: 87, vistas: 0.35 },
  ] as const;
  return (
    <Vista>
      <span className="flex justify-between text-[10px]">
        <span>{t("ia")}</span>
        <span>{t("vistas")}</span>
      </span>
      {filas.map((f) => (
        <Fila key={f.tipo}>
          <span className="w-6 shrink-0 font-bold text-white">{f.ia}</span>
          <span className="w-16 shrink-0 truncate">{t(f.tipo)}</span>
          <Barra lleno={f.vistas} />
        </Fila>
      ))}
    </Vista>
  );
}

function ResumenPrograma() {
  const t = useTranslations("featuresMetricas.vistas.resumenPrograma");
  return (
    <Vista>
      <span>{t("cliente")}</span>
      <Fila className="items-end">
        <Cifra>312k</Cifra>
        <span className="pb-0.5 font-bold text-[#49D17D]">▲ 34% {t("contraAnterior")}</span>
      </Fila>
      <Fila>
        <Chip>{t("mejorHora")} 18:00</Chip>
        <Chip tono="ok">{t("mejorClip")}</Chip>
      </Fila>
    </Vista>
  );
}

function Exportar() {
  const t = useTranslations("featuresMetricas.vistas.exportar");
  return (
    <Vista>
      <span>{t("titulo")}</span>
      <Fila>
        <Chip tono="amarillo">PDF</Chip>
        <Chip>CSV</Chip>
        <Chip>Markdown</Chip>
      </Fila>
      <span>{t("pie")}</span>
    </Vista>
  );
}

function SeActualiza() {
  const t = useTranslations("featuresMetricas.vistas.seActualiza");
  const marcas = ["1h", "6h", "24h", "48h", "72h", "7d", "14d", "30d", "60d", "90d"];
  return (
    <Vista>
      <span className="relative flex items-center justify-between">
        <span className="absolute inset-x-0 top-1/2 h-px bg-[#2E2E2B]" />
        {marcas.map((m, i) => (
          <span key={m} className={`relative h-2.5 w-2.5 rounded-full ${i < 6 ? "bg-[#FFD400]" : "bg-[#3A3A36]"}`} />
        ))}
      </span>
      <span className="flex justify-between text-[10px]">
        <span>1 h</span>
        <span>7 d</span>
        <span>90 d</span>
      </span>
      <span>{t("pie")}</span>
    </Vista>
  );
}

export const VISTAS_METRICAS = {
  metricasClip: MetricasClip,
  crecimiento: Crecimiento,
  retencion: Retencion,
  iaVsRealidad: IaVsRealidad,
  resumenPrograma: ResumenPrograma,
  exportar: Exportar,
  seActualiza: SeActualiza,
};
