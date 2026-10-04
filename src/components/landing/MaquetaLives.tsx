import { Radio, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Lo que viene para quien transmite desde la computadora: OBS mandando el live
 * a TikTok y, a la vez, a NG Creator, que lo graba; al terminar, los clips.
 * Dibujado con HTML, como las otras maquetas de la landing.
 */
const DESTINOS = [
  { nombre: "TikTok LIVE", grabando: false, tono: "text-red-400", punto: "bg-red-500" },
  { nombre: "NG Creator", grabando: true, tono: "text-ng-teal", punto: "bg-ng-teal" },
];

const CLIPS = ["dinero", "pregunta", "rieron"] as const;

export function MaquetaLives() {
  const t = useTranslations("landingMaquetaLives");
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full opacity-60 blur-3xl"
        style={{ background: "transparent" }}
      />
      <div className="rounded-ng-xl border border-white/10 bg-ng-tarjeta/90 p-4 shadow-2xl backdrop-blur">
        <p className="text-[11px] text-ng-tenue">{t("transmitiendo")}</p>
        <ul className="mt-2 space-y-2">
          {DESTINOS.map((d) => (
            <li key={d.nombre} className="flex items-center justify-between rounded-ng-lg border border-white/10 bg-ng-superficie/60 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Radio size={15} className="text-ng-tenue" aria-hidden /> {d.nombre}
              </span>
              <span className={`flex items-center gap-1.5 text-xs ${d.tono}`}>
                <span className={`h-2 w-2 animate-pulse rounded-full ${d.punto}`} /> {d.grabando ? t("grabando", { tiempo: "1:42:10" }) : t("enVivo")}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[11px] text-ng-tenue">{t("termino")}</p>
        <div className="mt-2 rounded-ng-lg border border-ng-azul/60 bg-ng-superficie/60 p-3 brillo-marca">
          <p className="flex items-center gap-1.5 text-xs text-ng-teal">
            <Sparkles size={12} aria-hidden /> {t("sugeridos", { n: 12 })}
          </p>
          <ul className="mt-2 space-y-1.5">
            {CLIPS.map((c) => (
              <li key={c} className="truncate text-sm font-medium">
                {t(`clips.${c}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
