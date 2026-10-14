/**
 * Eventos para Google Tag Manager (GTM-WVH7H299, cargado en el layout).
 *
 * Nunca con datos personales: ni correo ni nombre. Sin GTM (local, previews)
 * el push queda en un arreglo que nadie lee.
 */
type EventoDataLayer = { event: "signup_form_submit"; method: "email" | "google" };

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function empujarEvento(evento: EventoDataLayer): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(evento);
}
