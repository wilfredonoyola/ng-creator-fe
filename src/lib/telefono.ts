import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

/**
 * El teléfono, con la misma regla que el backend (ng-creator-be#289): válido
 * para su país según libphonenumber y que pueda recibir WhatsApp o SMS (los
 * fijos no; donde no se distingue fijo de celular, como EE. UU. o México,
 * se acepta).
 */
export type ProblemaTelefono = "invalido" | "fijo";

export function validarTelefono(pais: CountryCode, nacional: string): { numero: string } | { problema: ProblemaTelefono } {
  const digitos = nacional.replace(/[^\d+]/g, "");
  const p = digitos.startsWith("+") ? parsePhoneNumberFromString(digitos) : parsePhoneNumberFromString(digitos, pais);
  if (!p?.isValid()) return { problema: "invalido" };
  const tipo = p.getType();
  if (tipo && tipo !== "MOBILE" && tipo !== "FIXED_LINE_OR_MOBILE") return { problema: "fijo" };
  return { numero: p.number };
}

/** Un número guardado (+50370000000) separado en país y número nacional, para el formulario. */
export function separarTelefono(e164: string | null | undefined): { pais: CountryCode; nacional: string } | null {
  const p = e164 ? parsePhoneNumberFromString(e164) : undefined;
  return p?.country ? { pais: p.country, nacional: p.formatNational() } : null;
}

/** El país del navegador (es-SV → SV); si no se sabe, El Salvador. */
export function paisPorDefecto(): CountryCode {
  if (typeof navigator !== "undefined") {
    for (const idioma of navigator.languages ?? [navigator.language]) {
      const region = idioma?.split("-")[1]?.toUpperCase();
      if (region && (getCountries() as string[]).includes(region)) return region as CountryCode;
    }
  }
  return "SV";
}

/** La bandera con los dos indicadores regionales. */
const bandera = (pais: string) => String.fromCodePoint(...[...pais].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/** Todos los países con su código, ordenados por nombre en el idioma de la página. */
export function paises(locale: string): { pais: CountryCode; etiqueta: string }[] {
  let nombres: Intl.DisplayNames | null = null;
  try {
    nombres = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    nombres = null;
  }
  return getCountries()
    .map((pais) => {
      const nombre = nombres?.of(pais) ?? pais;
      return { pais, nombre, etiqueta: `${bandera(pais)} ${nombre} (+${getCountryCallingCode(pais)})` };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, locale))
    .map(({ pais, etiqueta }) => ({ pais, etiqueta }));
}

export function codigoDe(pais: CountryCode): string {
  return `+${getCountryCallingCode(pais)}`;
}

export type { CountryCode };
