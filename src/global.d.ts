import type { Idioma } from "@/i18n/idiomas";
import type { Mensajes } from "@/messages";

// Con esto, `t("clave")` de una clave que no existe no compila.
declare module "next-intl" {
  interface AppConfig {
    Locale: Idioma;
    Messages: Mensajes;
  }
}
