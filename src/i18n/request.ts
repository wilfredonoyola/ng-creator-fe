import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { mensajes } from "@/messages";
import { COOKIE_IDIOMA, esIdioma, idiomaDelNavegador } from "./idiomas";

/**
 * El idioma de cada pedido, sin rutas por idioma (/en/...): el elegido en
 * Perfil (cookie) o el del navegador. Ver i18n/idiomas.ts y docs/IDIOMAS.md.
 */
export default getRequestConfig(async () => {
  const elegido = cookies().get(COOKIE_IDIOMA)?.value;
  const locale = esIdioma(elegido) ? elegido : idiomaDelNavegador(headers().get("accept-language"));
  return { locale, messages: mensajes[locale] };
});
