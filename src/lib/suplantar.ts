/**
 * Entrar como otra persona desde /superadmin (be: `x-suplantar`).
 *
 * Se guarda a quién en localStorage y el backend, al ver la cabecera, trata
 * cada pedido como de esa persona: sus marcas, sus roles. Las pantallas de
 * /superadmin no la mandan, para seguir siendo uno mismo ahí.
 *
 * Entrar y salir recargan la página entera: así no queda en pantalla nada
 * cacheado de la otra cuenta, ni la marca elegida de antes.
 */
export const CABECERA_SUPLANTAR = "x-suplantar";
const CLAVE = "suplantando";

export interface Suplantado {
  id: string;
  email: string;
}

export function suplantado(): Suplantado | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Suplantado) : null;
  } catch {
    return null;
  }
}

/** `{ "x-suplantar": id }` fuera de /superadmin si se está suplantando; si no, nada. */
export function cabeceraSuplantar(): Record<string, string> {
  if (typeof window === "undefined" || location.pathname.startsWith("/superadmin")) return {};
  const s = suplantado();
  return s ? { [CABECERA_SUPLANTAR]: s.id } : {};
}

export function entrarComo(persona: Suplantado): void {
  localStorage.setItem(CLAVE, JSON.stringify(persona));
  localStorage.removeItem("marcaActivaId");
  window.location.assign("/panel");
}

export function dejarDeSuplantar(): void {
  try {
    localStorage.removeItem(CLAVE);
    localStorage.removeItem("marcaActivaId");
  } catch {
    // Sin localStorage tampoco había suplantación.
  }
  window.location.assign("/superadmin/usuarios");
}
