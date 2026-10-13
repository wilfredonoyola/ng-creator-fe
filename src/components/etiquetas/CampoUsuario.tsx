"use client";

import { useEffect } from "react";
import { useLazyQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { IconoRed } from "@/components/IconoRed";
import { VERIFICAR_USUARIO_RED } from "@/graphql/operations";
import { NOMBRE_RED, RED_DE, urlPerfil, type EstadoUsuario, type RedPersona } from "@/lib/etiquetas";

interface Verificacion {
  estado: EstadoUsuario;
  usuario: string;
  url: string;
  nombre?: string | null;
  foto?: string | null;
  motivo?: string | null;
}

/**
 * Un usuario de una red que se verifica solo un momento después de dejar de
 * escribir. No frena el guardado: si la red dice que no existe, avisa; si no
 * se puede saber (Facebook, Instagram personal), pide mirarlo en el perfil.
 */
export function CampoUsuario({
  red,
  valor,
  onCambio,
  marcaId,
}: {
  red: RedPersona;
  valor: string;
  onCambio: (v: string) => void;
  marcaId?: string | null;
}) {
  const t = useTranslations("etiquetas");
  const [verificar, { data, loading, error, variables }] = useLazyQuery<{ verificarUsuarioRed: Verificacion }>(VERIFICAR_USUARIO_RED, {
    fetchPolicy: "cache-first",
  });
  const limpio = valor.trim();
  useEffect(() => {
    if (!marcaId || limpio.length < 2) return;
    const espera = setTimeout(() => void verificar({ variables: { marcaId, red: RED_DE[red], usuario: limpio } }), 600);
    return () => clearTimeout(espera);
  }, [marcaId, red, limpio, verificar]);

  // La respuesta puede ser de lo que había escrito antes: solo vale si es de esto.
  const v = !error && variables?.usuario === limpio ? data?.verificarUsuarioRed : undefined;
  const nombreRed = NOMBRE_RED[red];
  const tono =
    v?.estado === "EXISTE" ? "border-ng-teal/50" : v?.estado === "NO_EXISTE" ? "border-red-500/60" : "border-white/15";

  return (
    <div>
      <label className={`flex items-center gap-2 rounded-lg border bg-black/30 px-2.5 transition focus-within:border-ng-azul ${limpio ? tono : "border-white/15"}`}>
        <IconoRed red={RED_DE[red]} chico />
        <span className="text-sm text-white/35">@</span>
        <input
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder={t(`form.usuario.${red}`)}
          aria-label={t(`form.usuario.${red}`)}
          maxLength={160}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-white/30"
        />
        {loading && limpio ? <Loader2 size={13} className="shrink-0 animate-spin text-white/40" aria-label={t("verificar.verificando", { red: nombreRed })} /> : null}
        {!loading && v?.estado === "EXISTE" ? <CheckCircle2 size={14} className="shrink-0 text-ng-teal" aria-hidden /> : null}
        {!loading && v?.estado === "NO_EXISTE" ? <AlertTriangle size={14} className="shrink-0 text-red-400" aria-hidden /> : null}
      </label>
      {limpio && !loading && (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[11px]" aria-live="polite">
          {v?.estado === "EXISTE" && (
            <span className="inline-flex min-w-0 items-center gap-1 text-ng-teal">
              {v.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.foto} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
              ) : null}
              <span className="truncate">{t("verificar.existe", { nombre: v.nombre || `@${v.usuario}` })}</span>
            </span>
          )}
          {v?.estado === "NO_EXISTE" && (
            <span className="text-red-400">
              {v.motivo === "noExisteOPrivada" ? t("verificar.noExisteOPrivada", { red: nombreRed }) : t("verificar.noExiste", { red: nombreRed })}
            </span>
          )}
          {v?.estado === "SIN_VERIFICAR" && (
            <span className="text-white/45">
              {v.motivo === "instagramPersonalONoExiste"
                ? t("verificar.instagramPersonal")
                : v.motivo === "facebookSinId" || red === "facebook"
                  ? t("verificar.facebookSinId")
                  : t("verificar.sinVerificar", { red: nombreRed })}
            </span>
          )}
          <a
            href={v?.url || urlPerfil(red, limpio)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-ng-celeste hover:underline"
          >
            {t("verificar.verPerfil")} <ExternalLink size={10} aria-hidden />
          </a>
        </p>
      )}
    </div>
  );
}
