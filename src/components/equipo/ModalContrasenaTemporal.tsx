"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, MessageCircle, X } from "lucide-react";

/**
 * La contraseña temporal recién creada, para mandarla a mano (WhatsApp o lo
 * que sea). No se guarda en ningún lado: si se cierra sin copiarla, hay que
 * crear otra. Se copia sola o con el mensaje listo para pegar.
 */
export function ModalContrasenaTemporal({
  email,
  nombre,
  password,
  marcaNombre,
  onCerrar,
}: {
  email: string;
  nombre?: string | null;
  password: string;
  marcaNombre?: string;
  onCerrar: () => void;
}) {
  const t = useTranslations("equipo.temporal");
  const [copiado, setCopiado] = useState<"password" | "mensaje" | null>(null);
  const url = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://app.clipfine.io/login";
  const saludo = nombre?.trim() ? ` ${nombre.trim()}` : "";
  const mensaje = t("mensaje", { saludo, marca: marcaNombre ?? "Clipfine", url, email, password });

  useEffect(() => {
    const conEsc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", conEsc);
    return () => window.removeEventListener("keydown", conEsc);
  }, [onCerrar]);

  async function copiar(que: "password" | "mensaje") {
    try {
      await navigator.clipboard.writeText(que === "password" ? password : mensaje);
      setCopiado(que);
      setTimeout(() => setCopiado((c) => (c === que ? null : c)), 2000);
    } catch {
      // Sin permiso del portapapeles: queda a la vista para copiarla a mano.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("titulo")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-ng-elevada p-5 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{t("titulo")}</h2>
            <p className="mt-0.5 truncate text-sm text-white/50">{nombre ? `${nombre} · ${email}` : email}</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label={t("cerrar")} className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-marca/40 bg-marca/[0.06] p-3">
          <code className="min-w-0 flex-1 select-all break-all font-mono text-lg tracking-wide text-white">{password}</code>
          <button
            type="button"
            onClick={() => void copiar("password")}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/5"
          >
            {copiado === "password" ? <Check className="h-3.5 w-3.5 text-ng-teal" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado === "password" ? t("copiada") : t("copiar")}
          </button>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-white/45">{t("mensajeTitulo")}</p>
          <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/70">{mensaje}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void copiar("mensaje")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-marca px-4 py-2.5 text-sm font-medium text-ng-tinta transition hover:brightness-110"
          >
            {copiado === "mensaje" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado === "mensaje" ? t("copiado") : t("copiarMensaje")}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/5"
          >
            <MessageCircle className="h-4 w-4" />
            {t("whatsapp")}
          </a>
        </div>

        <p className="text-xs text-white/40">{t("aviso")}</p>
      </div>
    </div>
  );
}
