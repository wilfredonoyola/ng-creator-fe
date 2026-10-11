import { useTranslations } from "next-intl";
import { Mail, Sparkles } from "lucide-react";
import { CONDENSADA, FOCO } from "@/components/landing/Publica";
import { CONTACTO } from "@/lib/legal";

/** El final de /ayuda y de cada artículo: escribirnos, y lo que viene con ChatGPT y Claude. */
export function ContactoAyuda() {
  const t = useTranslations("ayuda");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-xl bg-[#FFD400] p-6 sm:p-8">
        <h2 className={`${CONDENSADA} text-[32px] leading-[.95] sm:text-[40px]`}>{t("contacto.titulo")}</h2>
        <p className="text-lg leading-normal">{t("contacto.texto")}</p>
        <a
          href={`mailto:${CONTACTO}`}
          className={`mt-auto flex h-12 w-fit items-center gap-2 rounded-md bg-[#0A0A0A] px-5 font-bold text-white hover:bg-[#2A2926] ${FOCO} focus-visible:outline-[#0A0A0A]`}
        >
          <Mail size={18} aria-hidden /> {t("contacto.boton")}
        </a>
      </div>
      <div className="flex flex-col gap-4 rounded-xl bg-[#0A0A0A] p-6 text-white sm:p-8">
        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFD400]">
          <Sparkles size={20} color="#0A0A0A" />
        </span>
        <h2 className="text-2xl font-extrabold leading-tight">{t("conIa.titulo")}</h2>
        <p className="leading-relaxed text-[#D9D8D2]">{t("conIa.texto")}</p>
      </div>
    </div>
  );
}
