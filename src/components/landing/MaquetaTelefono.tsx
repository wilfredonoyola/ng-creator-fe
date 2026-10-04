import { Play, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * La app dibujada en un teléfono, con HTML como la maqueta de la portada: dos
 * pantallas que existen hoy en la app (el clip con su puntaje y lo que se
 * dice, y la lista de episodios).
 */
export function MaquetaTelefono({ pantalla = "clip", className = "" }: { pantalla?: "clip" | "episodios"; className?: string }) {
  return (
    <div className={`relative mx-auto w-[260px] shrink-0 ${className}`}>
      <div
        aria-hidden
        className="absolute -inset-12 -z-10 rounded-full opacity-60 blur-3xl"
        style={{ background: "transparent" }}
      />
      <div className="rounded-[42px] border border-white/15 bg-[#05070d] p-2.5 shadow-2xl">
        <div className="relative h-[520px] overflow-hidden rounded-[34px] bg-ng-hondo">
          <div aria-hidden className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          {pantalla === "clip" ? <PantallaClip /> : <PantallaEpisodios />}
        </div>
      </div>
    </div>
  );
}

function PantallaClip() {
  const t = useTranslations("landingMaquetaTelefono");
  return (
    <div className="flex h-full flex-col px-3 pb-3 pt-10">
      <div className="relative aspect-[9/16] max-h-[300px] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#262624] via-[#1C1C1A] to-[#0A0A0A]">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <Play size={18} className="ml-0.5 text-white" aria-hidden />
          </span>
        </div>
        <p className="absolute inset-x-3 bottom-8 text-center text-[15px] font-extrabold uppercase leading-tight text-white [text-shadow:0_2px_6px_rgba(0,0,0,.9)]">
          {t.rich("pregunta", { r: (c) => <span className="text-[#FACC15]">{c}</span> })}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-ng-tarjeta px-3 py-2">
        <span className="text-[11px] text-ng-secundario">{t("potencialViral")}</span>
        <span className="text-lg font-bold">85</span>
      </div>
      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-ng-tenue">{t("loQueSeDice")}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ng-secundario">
        {t.rich("cita", { b: (c) => <span className="text-white">{c}</span> })}
      </p>
    </div>
  );
}

const EPISODIOS = [
  { numero: 18, clips: 11 },
  { numero: 17, clips: 9 },
  { numero: 19, clips: null },
];

function PantallaEpisodios() {
  const t = useTranslations("landingMaquetaTelefono");
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-11">
      <p className="text-[11px] text-ng-tenue">Atlanta Sin Filtro</p>
      <p className="text-xl font-bold">{t("proyectos")}</p>
      <ul className="mt-4 space-y-2.5">
        {EPISODIOS.map((e) => (
          <li key={e.numero} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ng-tarjeta p-2.5">
            <div className="h-10 w-16 shrink-0 rounded-md bg-gradient-to-br from-[#262624] to-[#0A0A0A]" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{t("programa", { n: e.numero })}</p>
              <p className={`mt-0.5 flex items-center gap-1 text-[11px] ${e.clips !== null ? "text-ng-teal" : "text-ng-celeste"}`}>
                {e.clips !== null && <Sparkles size={10} aria-hidden />}{" "}
                {e.clips !== null ? t("clips", { n: e.clips }) : t("transcribiendo")}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex justify-around border-t border-white/10 pt-3 text-[10px] text-ng-tenue">
        <span>{t("inicio")}</span>
        <span className="text-ng-celeste">{t("proyectos")}</span>
        <span>{t("perfil")}</span>
      </div>
    </div>
  );
}
