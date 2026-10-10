/**
 * La señal de "hay sesión" que comparten la landing y el panel.
 *
 * La sesión vive en el localStorage del panel (app.clipfine.io), y la landing
 * (www.clipfine.io) no lo puede leer: es otro origen. Para que la landing
 * muestre "Ir a la app" en vez de "Entrar", el panel deja una cookie en todo
 * clipfine.io que dice solo eso, que hay sesión. No lleva ningún token: si
 * alguien la copia no entra a nada, y si miente, el panel pide login igual.
 */
const NOMBRE = "clipfine_sesion";

/** Lo que dura la de Cognito sin entrar: el refresh token vence a los 30 días. */
const DURA_SEG = 30 * 24 * 60 * 60;

/** En producción, para todo clipfine.io; en local y en previews, solo ese host. */
function atributos(): string {
  const dominio = location.hostname.endsWith("clipfine.io") ? "; domain=.clipfine.io" : "";
  const segura = location.protocol === "https:" ? "; Secure" : "";
  return `; path=/; SameSite=Lax${dominio}${segura}`;
}

export function marcarSesion(): void {
  try {
    document.cookie = `${NOMBRE}=1; max-age=${DURA_SEG}${atributos()}`;
  } catch {
    // Sin cookies: la landing muestra "Entrar", que también lleva al panel.
  }
}

export function desmarcarSesion(): void {
  try {
    document.cookie = `${NOMBRE}=; max-age=0${atributos()}`;
  } catch {
    // Ver arriba.
  }
}

/**
 * Si este navegador tiene sesión en el panel. También mira el localStorage
 * propio: en local la landing y el panel son el mismo origen.
 */
export function hayMarcaDeSesion(): boolean {
  try {
    if (document.cookie.split("; ").includes(`${NOMBRE}=1`)) return true;
    return Boolean(localStorage.getItem("refreshToken") && localStorage.getItem("tokenExpiresAt"));
  } catch {
    return false;
  }
}
