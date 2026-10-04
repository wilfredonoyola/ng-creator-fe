/**
 * Los idiomas de la interfaz. Sale del navegador (Accept-Language) salvo que la
 * persona haya elegido uno en Perfil, que queda en la cookie `idioma`. Lo que
 * no es español ni inglés va en inglés. La app hace lo mismo con el sistema.
 */
export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const COOKIE_IDIOMA = "idioma";

/** Para todo lo que no es español. */
export const IDIOMA_POR_DEFECTO: Idioma = "en";

/** Cuando el pedido no dice ningún idioma. */
export const SIN_IDIOMA_PEDIDO: Idioma = "es";

export function esIdioma(v: unknown): v is Idioma {
  return typeof v === "string" && (IDIOMAS as readonly string[]).includes(v);
}

/**
 * El idioma que pide el navegador, por orden de preferencia: el primero que
 * sea español o inglés (es-CO, en-US, …). "fr, en;q=0.8" da inglés.
 */
export function idiomaDelNavegador(acceptLanguage: string | null | undefined): Idioma {
  // Sin Accept-Language no es una persona sino un crawler (Google, la vista
  // previa de WhatsApp): va en español, que es como estaba indexado todo.
  if (!acceptLanguage?.trim()) return SIN_IDIOMA_PEDIDO;
  const pedidos = (acceptLanguage ?? "")
    .split(",")
    .map((parte) => {
      const [etiqueta, ...params] = parte.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { base: etiqueta.trim().toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((p) => p.base && p.q > 0)
    .sort((a, b) => b.q - a.q);
  return pedidos.map((p) => p.base).find(esIdioma) ?? IDIOMA_POR_DEFECTO;
}
